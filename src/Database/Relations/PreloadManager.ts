import type { Model } from '../Model'
import type { PreloadCallback } from './types'
import { groupBy, chunk } from '../utils/groupBy'
import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore'
import { db } from '../Database'

/**
 * Preload 配置
 */
interface PreloadConfig {
  relation: string
  callback?: PreloadCallback<any>
}

/**
 * 預載入管理器
 * 負責批量載入關聯資料，避免 N+1 查詢問題
 */
export class PreloadManager {
  private preloads: PreloadConfig[] = []

  /**
   * 註冊要預載入的關聯
   * @param relation - 關聯名稱
   * @param callback - 自定義查詢回調
   */
  register(relation: string, callback?: PreloadCallback<any>): void {
    this.preloads.push({ relation, callback })
  }

  /**
   * 檢查是否有註冊的預載入
   */
  hasPreloads(): boolean {
    return this.preloads.length > 0
  }

  /**
   * 執行所有預載入
   * @param models - 要載入關聯的 models
   */
  async execute<T extends Model>(models: T[]): Promise<void> {
    if (models.length === 0 || this.preloads.length === 0) {
      return
    }

    for (const preloadConfig of this.preloads) {
      await this.loadRelation(models, preloadConfig)
    }
  }

  /**
   * 載入單一關聯
   */
  private async loadRelation<T extends Model>(
    models: T[],
    config: PreloadConfig
  ): Promise<void> {
    const ModelClass = models[0].constructor as any
    const relationMethod = ModelClass[config.relation]

    if (!relationMethod) {
      throw new Error(`Relation "${config.relation}" not defined on ${ModelClass.name}`)
    }

    // 調用靜態方法獲取工廠函數，然後用 parent 調用工廠函數獲取關聯實例
    const relationFactory = relationMethod.call(ModelClass)
    const sampleRelation = relationFactory(models[0])
    const relationType = sampleRelation.constructor.name

    switch (relationType) {
      case 'BelongsTo':
        await this.loadBelongsTo(models, config, sampleRelation)
        break
      case 'HasMany':
        await this.loadHasMany(models, config, sampleRelation)
        break
      case 'ManyToMany':
        await this.loadManyToMany(models, config, sampleRelation)
        break
      default:
        throw new Error(`Unknown relation type: ${relationType}`)
    }
  }

  /**
   * 批量載入 BelongsTo 關聯
   */
  private async loadBelongsTo<T extends Model>(
    models: T[],
    config: PreloadConfig,
    sampleRelation: any
  ): Promise<void> {
    const relationConfig = sampleRelation.getConfig()
    const foreignKey = relationConfig.foreignKey
    const ownerKey = relationConfig.ownerKey || 'id'

    // 收集所有外鍵值（去重）
    const foreignKeyValues = [...new Set(
      models
        .map(m => (m as any)[foreignKey])
        .filter(v => v != null && v !== '')
    )]

    if (foreignKeyValues.length === 0) {
      // 全部設為 null
      models.forEach(m => {
        m.$relations[config.relation] = null
        m.$loadedRelations.add(config.relation)
      })
      return
    }

    // 批量查詢（Firestore whereIn 限制 10 個值）
    const RelatedModelClass = sampleRelation.getRelatedModel() as any
    const chunks = chunk(foreignKeyValues, 10)
    const allRelated: any[] = []

    for (const chunkValues of chunks) {
      let queryBuilder = RelatedModelClass.query().whereIn(ownerKey, chunkValues)

      // 應用自定義查詢
      if (config.callback) {
        config.callback(queryBuilder)
      }

      const related = await queryBuilder.get()
      allRelated.push(...related)
    }

    // 建立索引
    const relatedById = new Map<any, any>()
    allRelated.forEach(r => relatedById.set((r as any)[ownerKey], r))

    // 附加到 models
    models.forEach(model => {
      const fkValue = (model as any)[foreignKey]
      model.$relations[config.relation] = relatedById.get(fkValue) || null
      model.$loadedRelations.add(config.relation)
    })
  }

  /**
   * 批量載入 HasMany 關聯
   */
  private async loadHasMany<T extends Model>(
    models: T[],
    config: PreloadConfig,
    sampleRelation: any
  ): Promise<void> {
    const relationConfig = sampleRelation.getConfig()
    if (relationConfig.type === 'foreignKey') {
      await this.loadHasManyForeignKey(models, config, sampleRelation)
    } else {
      await this.loadHasManySubcollection(models, config, sampleRelation)
    }
  }

  /**
   * 載入 HasMany（外鍵方式）
   */
  private async loadHasManyForeignKey<T extends Model>(
    models: T[],
    config: PreloadConfig,
    sampleRelation: any
  ): Promise<void> {
    const relationConfig = sampleRelation.getConfig()
    const foreignKey = relationConfig.foreignKey
    const localKey = relationConfig.localKey || 'id'

    // 收集所有本地 key 值
    const localKeyValues = models.map(m => (m as any)[localKey]).filter(v => v != null)

    if (localKeyValues.length === 0) {
      models.forEach(m => {
        m.$relations[config.relation] = []
        m.$loadedRelations.add(config.relation)
      })
      return
    }

    // 批量查詢
    const RelatedModelClass = sampleRelation.getRelatedModel() as any
    const chunks = chunk(localKeyValues, 10)
    const allRelated: any[] = []

    for (const chunkValues of chunks) {
      let queryBuilder = RelatedModelClass.query().whereIn(foreignKey, chunkValues)

      // 應用自定義查詢
      if (config.callback) {
        config.callback(queryBuilder)
      }

      const related = await queryBuilder.get()
      allRelated.push(...related)
    }

    // 按外鍵分組
    const relatedByFk = groupBy(allRelated, foreignKey)

    // 附加到 models
    models.forEach(model => {
      const localKeyValue = (model as any)[localKey]
      model.$relations[config.relation] = relatedByFk[localKeyValue] || []
      model.$loadedRelations.add(config.relation)
    })
  }

  /**
   * 載入 HasMany（子集合方式）
   * 注意：Firestore 不支援跨子集合查詢，必須逐個查詢
   */
  private async loadHasManySubcollection<T extends Model>(
    models: T[],
    config: PreloadConfig,
    _sampleRelation: any
  ): Promise<void> {
    // 並行查詢所有子集合
    await Promise.all(
      models.map(async (model) => {
        const ModelClass = model.constructor as any
        const relationFactory = ModelClass[config.relation]
        const relation = relationFactory.call(ModelClass, model)

        let queryBuilder = relation.query()

        // 應用自定義查詢
        if (config.callback) {
          config.callback(queryBuilder)
        }

        const related = await queryBuilder.get()
        model.$relations[config.relation] = related
        model.$loadedRelations.add(config.relation)
      })
    )
  }

  /**
   * 批量載入 ManyToMany 關聯
   */
  private async loadManyToMany<T extends Model>(
    models: T[],
    config: PreloadConfig,
    sampleRelation: any
  ): Promise<void> {
    const relationConfig = sampleRelation.getConfig()
    const foreignKey = relationConfig.foreignKey
    const relatedKey = relationConfig.relatedKey
    const localKey = relationConfig.localKey || 'id'
    const relatedLocalKey = relationConfig.relatedLocalKey || 'id'
    const pivotCollection = relationConfig.pivotCollection

    // 收集所有本地 key 值
    const localKeyValues = models.map(m => (m as any)[localKey]).filter(v => v != null)

    if (localKeyValues.length === 0) {
      models.forEach(m => {
        m.$relations[config.relation] = []
        m.$loadedRelations.add(config.relation)
      })
      return
    }

    // 1. 批量查詢 pivot
    const firestore = db.getFirestore()
    const pivotRef = collection(firestore, pivotCollection)
    const chunks = chunk(localKeyValues, 10)
    const allPivots: any[] = []

    for (const chunkValues of chunks) {
      const q = query(pivotRef, where(foreignKey, 'in', chunkValues))
      const snapshot = await getDocs(q)
      snapshot.docs.forEach(doc => {
        allPivots.push({ id: doc.id, ...doc.data() })
      })
    }

    if (allPivots.length === 0) {
      models.forEach(m => {
        m.$relations[config.relation] = []
        m.$loadedRelations.add(config.relation)
      })
      return
    }

    // 2. 提取所有關聯 IDs（去重）
    const relatedIds = [...new Set(allPivots.map(p => p[relatedKey]))]

    // 3. 批量載入關聯 models
    const RelatedModelClass = sampleRelation.getRelatedModel() as any
    const relatedChunks = chunk(relatedIds, 10)
    const allRelated: any[] = []

    for (const chunkIds of relatedChunks) {
      let queryBuilder = RelatedModelClass.query().whereIn(relatedLocalKey, chunkIds)

      // 應用自定義查詢
      if (config.callback) {
        config.callback(queryBuilder)
      }

      const related = await queryBuilder.get()
      allRelated.push(...related)
    }

    // 4. 按本地 key 分組 pivots
    const pivotsByLocalKey = groupBy(allPivots, foreignKey)

    // 5. 建立關聯 ID 到 model 的映射
    const relatedById = new Map<string, any>()
    allRelated.forEach(r => relatedById.set((r as any)[relatedLocalKey], r))

    // 6. 附加到 models
    models.forEach(model => {
      const localKeyValue = (model as any)[localKey]
      const modelPivots = pivotsByLocalKey[localKeyValue] || []

      const relatedModels = modelPivots
        .map(pivot => relatedById.get(pivot[relatedKey]))
        .filter(Boolean)

      model.$relations[config.relation] = relatedModels
      model.$loadedRelations.add(config.relation)
    })
  }
}
