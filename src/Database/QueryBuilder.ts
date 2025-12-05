import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryConstraint,
  WhereFilterOp,
  OrderByDirection,
  DocumentSnapshot,
  writeBatch,
  WriteBatch,
  updateDoc,
  deleteDoc,
  Timestamp
} from 'firebase/firestore'
import { db } from './Database'
import { Model } from './Model'
import type { BatchOptions, BatchResult } from './types'
import type { PreloadCallback, RelationNames, InferRelations } from './Relations/types'

/** 帶有關聯屬性的 Model 型別 */
type WithRelations<T, M> = T & InferRelations<M>
import { PreloadManager } from './Relations/PreloadManager'

export class QueryBuilder<T extends Model, M extends typeof Model = typeof Model> {
  private constraints: QueryConstraint[] = []
  private preloadManager = new PreloadManager()

  constructor(
    private ModelClass: new () => T,
    private collectionName: string
  ) {}

  /**
   * WHERE 條件 - Lucid 風格
   * @example
   * query().where('age', '>', 18)
   */
  where(field: string, operator: WhereFilterOp, value: any): this {
    this.constraints.push(where(field, operator, value))
    return this
  }

  /**
   * WHERE 等於條件（簡化版）
   * @example
   * query().whereEquals('status', 'active')
   */
  whereEquals(field: string, value: any): this {
    return this.where(field, '==', value)
  }

  /**
   * WHERE 不等於
   * @example
   * query().whereNotEquals('status', 'deleted')
   */
  whereNotEquals(field: string, value: any): this {
    return this.where(field, '!=', value)
  }

  /**
   * WHERE 大於
   * @example
   * query().whereGreaterThan('age', 18)
   */
  whereGreaterThan(field: string, value: any): this {
    return this.where(field, '>', value)
  }

  /**
   * WHERE 大於等於
   * @example
   * query().whereGreaterThanOrEqual('age', 18)
   */
  whereGreaterThanOrEqual(field: string, value: any): this {
    return this.where(field, '>=', value)
  }

  /**
   * WHERE 小於
   * @example
   * query().whereLessThan('age', 65)
   */
  whereLessThan(field: string, value: any): this {
    return this.where(field, '<', value)
  }

  /**
   * WHERE 小於等於
   * @example
   * query().whereLessThanOrEqual('age', 65)
   */
  whereLessThanOrEqual(field: string, value: any): this {
    return this.where(field, '<=', value)
  }

  /**
   * WHERE IN
   * @example
   * query().whereIn('status', ['active', 'pending'])
   */
  whereIn(field: string, values: any[]): this {
    return this.where(field, 'in', values)
  }

  /**
   * WHERE NOT IN
   * @example
   * query().whereNotIn('status', ['deleted', 'banned'])
   */
  whereNotIn(field: string, values: any[]): this {
    return this.where(field, 'not-in', values)
  }

  /**
   * WHERE ARRAY CONTAINS
   * @example
   * query().whereArrayContains('tags', 'javascript')
   */
  whereArrayContains(field: string, value: any): this {
    return this.where(field, 'array-contains', value)
  }

  /**
   * WHERE ARRAY CONTAINS ANY
   * @example
   * query().whereArrayContainsAny('tags', ['javascript', 'typescript'])
   */
  whereArrayContainsAny(field: string, values: any[]): this {
    return this.where(field, 'array-contains-any', values)
  }

  /**
   * 排序 - Lucid 風格
   * @example
   * query().orderBy('createdAt', 'desc')
   */
  orderBy(field: string, direction: OrderByDirection = 'asc'): this {
    this.constraints.push(orderBy(field, direction))
    return this
  }

  /**
   * 限制數量 - Lucid 風格
   * @example
   * query().limit(10)
   */
  limit(count: number): this {
    this.constraints.push(limit(count))
    return this
  }

  /**
   * 分頁（從某個文件之後開始）
   * @example
   * query().startAfter(lastDoc)
   */
  startAfter(snapshot: DocumentSnapshot): this {
    this.constraints.push(startAfter(snapshot))
    return this
  }

  /**
   * 預載入關聯 - Lucid 風格
   *
   * 若 Model 定義了 `$relations` 屬性，則 relation 參數會有型別提示。
   *
   * @example
   * // 單一關聯
   * const users = await User.query().preload('posts').get()
   *
   * // 多個關聯
   * const users = await User.query().preload('posts').preload('profile').get()
   *
   * // 自定義查詢
   * const users = await User.query()
   *   .preload('posts', query => query.where('status', '==', 'published').limit(5))
   *   .get()
   *
   * // 嵌套預載入
   * const users = await User.query()
   *   .preload('posts', query => query.preload('comments'))
   *   .get()
   *
   * @param relation - 關聯名稱（若 Model 有 $relations 則會有自動補全）
   * @param callback - 可選的查詢自定義回調
   */
  preload<K extends RelationNames<M>>(
    relation: K,
    callback?: PreloadCallback<any>
  ): this {
    this.preloadManager.register(relation, callback)
    return this
  }

  /**
   * 執行查詢 - Lucid 風格
   * @example
   * const users = await query().where('age', '>', 18).get()
   */
  async get(): Promise<WithRelations<T, M>[]> {
    const firestore = db.getFirestore()
    const collectionRef = collection(firestore, this.collectionName)

    const q = query(collectionRef, ...this.constraints)
    const snapshot = await getDocs(q)

    const ModelConstructor = this.ModelClass as any

    const models = snapshot.docs.map((doc) => {
      return ModelConstructor.hydrate(doc.id, doc.data())
    })

    // 執行預載入
    if (this.preloadManager.hasPreloads()) {
      await this.preloadManager.execute(models)
    }

    return models
  }

  /**
   * 取得第一筆結果
   * @example
   * const user = await query().where('email', '==', 'john@example.com').first()
   */
  async first(): Promise<WithRelations<T, M> | null> {
    // 暫時儲存原有的限制
    const originalConstraints = [...this.constraints]

    // 加入 limit(1)
    this.limit(1)
    const results = await this.get()  // get() 會執行 preload

    // 恢復原有的限制
    this.constraints = originalConstraints

    return results[0] || null
  }

  /**
   * 取得第一筆結果（找不到拋錯）
   * @example
   * const user = await query().where('email', '==', 'john@example.com').firstOrFail()
   */
  async firstOrFail(): Promise<WithRelations<T, M>> {
    const result = await this.first()
    if (!result) {
      throw new Error(`No results found in collection "${this.collectionName}"`)
    }
    return result
  }

  /**
   * 計數（注意：Firestore 沒有原生 count，這會載入所有文件）
   * @example
   * const count = await query().where('status', '==', 'active').count()
   */
  async count(): Promise<number> {
    const results = await this.get()
    return results.length
  }

  /**
   * 檢查是否存在
   * @example
   * const exists = await query().where('email', '==', 'john@example.com').exists()
   */
  async exists(): Promise<boolean> {
    const result = await this.first()
    return result !== null
  }

  /**
   * 批量更新符合條件的文件
   * @example
   * const result = await query().where('age', '>', 18).update({ status: 'active' })
   * console.log(`Updated ${result.count} documents`)
   *
   * // 使用並行模式
   * await query().where('age', '>', 18).update({ status: 'active' }, { parallel: true })
   */
  async update(
    data: Partial<T>,
    options: BatchOptions = {}
  ): Promise<BatchResult> {
    const firestore = db.getFirestore()
    const collectionRef = collection(firestore, this.collectionName)

    // 1. 查詢符合條件的文件
    const q = query(collectionRef, ...this.constraints)
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { count: 0 }
    }

    // 2. 準備更新資料
    const updateData: any = { ...data }
    const ModelClass = this.ModelClass as any
    if (ModelClass.options?.timestamps !== false) {
      updateData.updatedAt = Timestamp.now()
    }
    delete updateData.id
    delete updateData.createdAt

    // 3. 執行更新
    if (options.parallel) {
      await Promise.all(
        snapshot.docs.map(docSnap => updateDoc(docSnap.ref, updateData))
      )
    } else {
      await this.executeBatches(
        snapshot.docs,
        (batch, docSnap) => batch.update(docSnap.ref, updateData)
      )
    }

    return { count: snapshot.docs.length }
  }

  /**
   * 批量刪除符合條件的文件
   * @example
   * const deletedCount = await query().where('status', '==', 'deleted').delete()
   * console.log(`Deleted ${deletedCount} documents`)
   *
   * // 使用並行模式
   * await query().where('status', '==', 'deleted').delete({ parallel: true })
   */
  async delete(options: BatchOptions = {}): Promise<number> {
    const firestore = db.getFirestore()
    const collectionRef = collection(firestore, this.collectionName)

    const q = query(collectionRef, ...this.constraints)
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return 0
    }

    if (options.parallel) {
      await Promise.all(
        snapshot.docs.map(docSnap => deleteDoc(docSnap.ref))
      )
    } else {
      await this.executeBatches(
        snapshot.docs,
        (batch, docSnap) => batch.delete(docSnap.ref)
      )
    }

    return snapshot.docs.length
  }

  /**
   * 執行批量操作（自動處理 Firebase 500 筆/batch 限制）
   * @private
   */
  private async executeBatches(
    docs: DocumentSnapshot[],
    operation: (batch: WriteBatch, doc: DocumentSnapshot) => void
  ): Promise<void> {
    const firestore = db.getFirestore()
    const BATCH_SIZE = 500 // Firebase 限制

    // 每 500 筆建立一個新 batch
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(firestore)
      const batchDocs = docs.slice(i, i + BATCH_SIZE)

      for (const doc of batchDocs) {
        operation(batch, doc)
      }

      await batch.commit()
    }
  }
}
