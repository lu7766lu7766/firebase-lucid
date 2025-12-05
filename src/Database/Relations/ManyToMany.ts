import { BaseRelation } from './BaseRelation'
import type { Model } from '../Model'
import type { QueryBuilder } from '../QueryBuilder'
import type { ManyToManyConfig } from './types'
import { chunk } from '../utils/groupBy'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from '../Database'

/**
 * ManyToMany 關聯
 * 表示多對多關係，透過 pivot collection 連接
 *
 * @example
 * // User 有多個 Groups
 * class User extends Model {
 *   static groups() {
 *     return this.manyToMany(Group, {
 *       pivotCollection: 'user_groups',
 *       foreignKey: 'userId',
 *       relatedKey: 'groupId'
 *     })
 *   }
 * }
 *
 * // 使用
 * const user = await User.find('123')
 * const groups = await user.groups().get()
 *
 * // 附加關聯
 * await user.groups().attach('group-id')
 *
 * // 分離關聯
 * await user.groups().detach('group-id')
 *
 * // 同步關聯
 * await user.groups().sync(['group-1', 'group-2'])
 */
export class ManyToMany<
  Parent extends Model,
  Related extends Model
> extends BaseRelation<Parent, Related> {
  declare protected config: ManyToManyConfig

  constructor(
    parent: Parent,
    RelatedModel: new () => Related,
    config: ManyToManyConfig
  ) {
    super(parent, RelatedModel, config)
  }

  /**
   * 獲取關聯的 models
   * @returns 關聯的 Model 實例陣列
   */
  async get(): Promise<Related[]> {
    // 1. 查詢 pivot collection
    const pivots = await this.queryPivot()

    if (pivots.length === 0) {
      return []
    }

    // 2. 提取關聯 IDs
    const relatedIds = pivots.map(p => p[this.config.relatedKey])

    // 3. 批量載入關聯 models（Firestore whereIn 限制 10 個值）
    const RelatedModelClass = this.getRelatedModelClass()
    const relatedKey = this.config.relatedLocalKey || 'id'
    const chunks = chunk(relatedIds, 10)
    const allRelated: Related[] = []

    for (const chunkIds of chunks) {
      const related = await RelatedModelClass.query()
        .whereIn(relatedKey, chunkIds)
        .get()
      allRelated.push(...related)
    }

    // 4. 附加 pivot 數據（如果有配置 pivotFields）
    if (this.config.pivotFields && this.config.pivotFields.length > 0) {
      this.attachPivotData(allRelated, pivots)
    }

    return allRelated
  }

  /**
   * 返回 QueryBuilder
   * @throws ManyToMany 暫不支援自定義查詢，請使用 get()
   */
  query(): QueryBuilder<Related> {
    throw new Error('ManyToMany does not support query() yet. Use get() instead.')
  }

  /**
   * 附加關聯
   * @param relatedId - 要附加的關聯 ID
   * @param pivotData - pivot 表的額外數據
   */
  async attach(relatedId: string, pivotData?: Record<string, any>): Promise<void> {
    const firestore = db.getFirestore()
    const collectionRef = collection(firestore, this.config.pivotCollection)
    const localKeyValue = this.getLocalKeyValue()

    const data: any = {
      [this.config.foreignKey]: localKeyValue,
      [this.config.relatedKey]: relatedId,
      createdAt: Timestamp.now(),
      ...pivotData
    }

    await addDoc(collectionRef, data)
  }

  /**
   * 分離關聯
   * @param relatedId - 要分離的關聯 ID
   */
  async detach(relatedId: string): Promise<void> {
    const firestore = db.getFirestore()
    const collectionRef = collection(firestore, this.config.pivotCollection)
    const localKeyValue = this.getLocalKeyValue()

    // 查詢要刪除的 pivot 記錄
    const q = query(
      collectionRef,
      where(this.config.foreignKey, '==', localKeyValue),
      where(this.config.relatedKey, '==', relatedId)
    )

    const snapshot = await getDocs(q)

    // 刪除所有匹配的記錄
    await Promise.all(
      snapshot.docs.map(doc => deleteDoc(doc.ref))
    )
  }

  /**
   * 同步關聯
   * 會移除不在列表中的關聯，添加列表中新的關聯
   * @param relatedIds - 要同步的關聯 ID 列表
   * @param pivotData - pivot 表的額外數據（用於新增的記錄）
   */
  async sync(relatedIds: string[], pivotData?: Record<string, any>): Promise<void> {
    // 1. 獲取現有關聯
    const pivots = await this.queryPivot()
    const existingIds = pivots.map(p => p[this.config.relatedKey])

    // 2. 計算差異
    const toAttach = relatedIds.filter(id => !existingIds.includes(id))
    const toDetach = existingIds.filter(id => !relatedIds.includes(id))

    // 3. 執行附加和分離
    await Promise.all([
      ...toAttach.map(id => this.attach(id, pivotData)),
      ...toDetach.map(id => this.detach(id))
    ])
  }

  /**
   * 切換關聯（如果存在則移除，不存在則添加）
   * @param relatedId - 要切換的關聯 ID
   * @param pivotData - pivot 表的額外數據（用於新增時）
   */
  async toggle(relatedId: string, pivotData?: Record<string, any>): Promise<boolean> {
    const pivots = await this.queryPivot()
    const exists = pivots.some(p => p[this.config.relatedKey] === relatedId)

    if (exists) {
      await this.detach(relatedId)
      return false
    } else {
      await this.attach(relatedId, pivotData)
      return true
    }
  }

  /**
   * 查詢 pivot collection
   */
  private async queryPivot(): Promise<any[]> {
    const firestore = db.getFirestore()
    const collectionRef = collection(firestore, this.config.pivotCollection)
    const localKeyValue = this.getLocalKeyValue()

    const q = query(
      collectionRef,
      where(this.config.foreignKey, '==', localKeyValue)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  }

  /**
   * 附加 pivot 數據到關聯 models
   */
  private attachPivotData(related: Related[], pivots: any[]): void {
    const pivotByRelatedId = new Map<string, any>()

    pivots.forEach(pivot => {
      const relatedId = pivot[this.config.relatedKey]
      pivotByRelatedId.set(relatedId, pivot)
    })

    related.forEach(model => {
      const pivot = pivotByRelatedId.get((model as any).id)

      if (pivot) {
        // 將 pivot 欄位附加到 model
        (model as any).$pivot = {}
        this.config.pivotFields?.forEach(field => {
          (model as any).$pivot[field] = pivot[field]
        })
      }
    })
  }
}
