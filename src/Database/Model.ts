import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  DocumentData,
  Timestamp,
  setDoc
} from 'firebase/firestore'
import { db } from './Database'
import { QueryBuilder } from './QueryBuilder'
import { HookManager } from './Hooks/HookManager'
import { BelongsTo } from './Relations/BelongsTo'
import { HasMany } from './Relations/HasMany'
import { ManyToMany } from './Relations/ManyToMany'
import type { ModelOptions, ModelRelations } from './types'
import type { BelongsToConfig, HasManyConfig, ManyToManyConfig } from './Relations/types'
import type { AfterSaveContext, BeforeUpdateContext } from './Hooks/types'

export abstract class Model {
  public id?: string
  public createdAt?: Date
  public updatedAt?: Date

  // 關聯相關
  public $relations: ModelRelations = {}
  public $loadedRelations: Set<string> = new Set()

  // Dirty tracking
  public $original: Record<string, any> = {}

  // 靜態屬性
  protected static collectionName: string
  protected static options: ModelOptions = {
    timestamps: true
  }

  /**
   * 關聯定義物件
   * 覆寫此屬性以啟用 preload 的型別提示
   *
   * @example
   * class User extends Model {
   *   static $relations = {
   *     posts: () => this.hasMany(Post, { type: 'foreignKey', foreignKey: 'userId' }),
   *     organization: () => this.belongsTo(Organization, { type: 'foreignKey', foreignKey: 'organizationId' })
   *   } as const
   * }
   *
   * // 使用時會有自動補全
   * User.query().preload('posts')  // 提示: 'posts' | 'organization'
   */
  static $relations?: Record<string, () => any>

  // ===== Lifecycle Hooks（子類可覆寫）=====

  /**
   * 在建立前調用
   */
  protected async beforeCreate(): Promise<void> {}

  /**
   * 在建立後調用
   */
  protected async afterCreate(): Promise<void> {}

  /**
   * 在儲存前調用（建立和更新都會調用）
   */
  protected async beforeSave(): Promise<void> {}

  /**
   * 在儲存後調用（建立和更新都會調用）
   * @param _context - 包含 isNew 表示是否為新建
   */
  protected async afterSave(_context: AfterSaveContext): Promise<void> {}

  /**
   * 在更新前調用
   * @param _context - 包含 dirtyFields 變更的欄位列表
   */
  protected async beforeUpdate(_context: BeforeUpdateContext): Promise<void> {}

  /**
   * 在更新後調用
   */
  protected async afterUpdate(): Promise<void> {}

  /**
   * 在刪除前調用
   */
  protected async beforeDelete(): Promise<void> {}

  /**
   * 在刪除後調用
   */
  protected async afterDelete(): Promise<void> {}

  // ===== 關聯工具方法 =====

  /**
   * 檢查關聯是否已載入
   * @param relation - 關聯名稱
   */
  public $isLoaded(relation: string): boolean {
    return this.$loadedRelations.has(relation)
  }

  /**
   * 檢查欄位是否已變更
   * @param field - 欄位名稱（可選，不傳則檢查所有欄位）
   */
  public $isDirty(field?: string): boolean {
    if (field) {
      return (this as any)[field] !== this.$original[field]
    }
    return Object.keys(this.$original).some(
      key => (this as any)[key] !== this.$original[key]
    )
  }

  /**
   * 取得所有變更的欄位名稱
   */
  public $dirtyFields(): string[] {
    return Object.keys(this.$original).filter(
      key => (this as any)[key] !== this.$original[key]
    )
  }

  /**
   * 取得 collection 名稱
   * 預設使用類別名稱的小寫複數形式
   */
  static getCollectionName(): string {
    if (this.collectionName) {
      return this.collectionName
    }
    // 預設使用類別名稱的複數小寫形式
    return this.name.toLowerCase() + 's'
  }

  /**
   * 建立查詢建構器 - Lucid 風格
   * @example
   * User.query().where('age', '>', 18).limit(10).get()
   */
  static query<T extends Model, M extends typeof Model = typeof Model>(
    this: M & (new () => T),
    collectionPath?: string
  ): QueryBuilder<T, M> {
    return new QueryBuilder<T, M>(this as any, collectionPath || (this as any).getCollectionName())
  }

  // ===== 關聯定義方法 =====

  /**
   * 定義 BelongsTo 關聯
   * @example
   * class Post extends Model {
   *   static author() {
   *     return this.belongsTo(User, {
   *       type: 'foreignKey',
   *       foreignKey: 'userId'
   *     })
   *   }
   * }
   */
  protected static belongsTo<T extends Model, R extends Model>(
    this: new () => T,
    RelatedModel: new () => R,
    config: BelongsToConfig
  ): (parent: T) => BelongsTo<T, R> {
    return (parent: T) => new BelongsTo(parent, RelatedModel, config)
  }

  /**
   * 定義 HasMany 關聯
   * @example
   * class User extends Model {
   *   static posts() {
   *     return this.hasMany(Post, {
   *       type: 'foreignKey',
   *       foreignKey: 'userId'
   *     })
   *   }
   * }
   */
  protected static hasMany<T extends Model, R extends Model>(
    this: new () => T,
    RelatedModel: new () => R,
    config: HasManyConfig
  ): (parent: T) => HasMany<T, R> {
    return (parent: T) => new HasMany(parent, RelatedModel, config)
  }

  /**
   * 定義 ManyToMany 關聯
   * @example
   * class User extends Model {
   *   static groups() {
   *     return this.manyToMany(Group, {
   *       pivotCollection: 'user_groups',
   *       foreignKey: 'userId',
   *       relatedKey: 'groupId'
   *     })
   *   }
   * }
   */
  protected static manyToMany<T extends Model, R extends Model>(
    this: new () => T,
    RelatedModel: new () => R,
    config: ManyToManyConfig
  ): (parent: T) => ManyToMany<T, R> {
    return (parent: T) => new ManyToMany(parent, RelatedModel, config)
  }

  /**
   * 查詢全部 - Lucid 風格
   * @example
   * const users = await User.all()
   */
  static async all<T extends Model>(this: new () => T): Promise<T[]> {
    const ModelClass = this as typeof Model & (new () => T)
    return ModelClass.query().get()
  }

  /**
   * 根據 ID 查詢單筆 - Lucid 風格
   * @example
   * const user = await User.find('user-id')
   */
  static async find<T extends Model>(this: new () => T, id: string): Promise<T | null> {
    const ModelClass = this as typeof Model & (new () => T)
    const collectionName = (ModelClass as typeof Model).getCollectionName()
    const firestore = db.getFirestore()

    const docRef = doc(firestore, collectionName, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return (ModelClass as typeof Model).hydrate(docSnap.id, docSnap.data()) as T
  }

  /**
   * 根據 ID 查詢單筆（找不到拋錯）- Lucid 風格
   * @example
   * const user = await User.findOrFail('user-id')
   */
  static async findOrFail<T extends Model>(this: new () => T, id: string): Promise<T> {
    const ModelClass = this as typeof Model & (new () => T)
    const result = await ModelClass.find(id)
    if (!result) {
      throw new Error(`${ModelClass.name} with id "${id}" not found in collection "${(ModelClass as typeof Model).getCollectionName()}"`)
    }
    return result
  }

  /**
   * 建立新文件 - Lucid 風格
   * @example
   * const user = await User.create({ name: 'John', email: 'john@example.com' })
   */
  static async create<T extends Model>(this: new () => T, data: Partial<T>): Promise<T> {
    const ModelClass = this as typeof Model & (new () => T)
    const collectionName = (ModelClass as typeof Model).getCollectionName()
    const firestore = db.getFirestore()

    // 建立實例並賦值
    const instance = new (ModelClass as any)() as T
    Object.assign(instance, data)

    // 執行 before hooks
    await HookManager.executeBeforeCreate(instance)

    // 處理時間戳
    const docData: any = instance.toJSON()

    if ((ModelClass as typeof Model).options.timestamps) {
      docData.createdAt = Timestamp.now()
      docData.updatedAt = Timestamp.now()
    }

    // 移除 id（如果有）
    delete docData.id

    // 建立文件
    const collectionRef = collection(firestore, collectionName)
    const docRef = await addDoc(collectionRef, docData)

    // 更新實例
    instance.id = docRef.id
    if ((ModelClass as typeof Model).options.timestamps) {
      instance.createdAt = docData.createdAt.toDate()
      instance.updatedAt = docData.updatedAt.toDate()
    }

    // 初始化 $original
    instance.$original = { ...instance.toJSON(), id: instance.id }

    // 執行 after hooks
    await HookManager.executeAfterCreate(instance)

    return instance
  }

  /**
   * 使用指定 ID 建立文件
   * @example
   * const user = await User.createWithId('custom-id', { name: 'John' })
   */
  static async createWithId<T extends Model>(
    this: new () => T,
    id: string,
    data: Partial<T>
  ): Promise<T> {
    const ModelClass = this as typeof Model & (new () => T)
    const collectionName = (ModelClass as typeof Model).getCollectionName()
    const firestore = db.getFirestore()

    // 處理時間戳
    const docData: any = { ...data }

    if ((ModelClass as typeof Model).options.timestamps) {
      docData.createdAt = Timestamp.now()
      docData.updatedAt = Timestamp.now()
    }

    // 移除 id（如果有）
    delete docData.id

    // 建立文件
    const docRef = doc(firestore, collectionName, id)
    await setDoc(docRef, docData)

    // 返回完整實例
    return (ModelClass as typeof Model).hydrate(id, docData) as T
  }

  /**
   * 批次建立 - Lucid 風格
   * @example
   * const users = await User.createMany([
   *   { name: 'John', email: 'john@example.com' },
   *   { name: 'Jane', email: 'jane@example.com' }
   * ])
   */
  static async createMany<T extends Model>(this: new () => T, dataArray: Partial<T>[]): Promise<T[]> {
    const ModelClass = this as typeof Model & (new () => T)
    return Promise.all(dataArray.map((data) => ModelClass.create(data)))
  }

  /**
   * 查詢第一筆
   * @example
   * const user = await User.first()
   */
  static async first<T extends Model>(this: new () => T): Promise<T | null> {
    const ModelClass = this as typeof Model & (new () => T)
    const results = await ModelClass.query().limit(1).get()
    return results[0] || null
  }

  /**
   * 刪除指定 ID 的文件
   * @example
   * await User.destroy('user-id')
   */
  static async destroy(id: string): Promise<void> {
    const ModelClass = this as any
    const collectionName = ModelClass.getCollectionName()
    const firestore = db.getFirestore()

    const docRef = doc(firestore, collectionName, id)
    await deleteDoc(docRef)
  }

  /**
   * 從 Firestore 資料建立實例
   */
  protected static hydrate(id: string, data: DocumentData): Model {
    const instance = new (this as any)()
    instance.id = id

    // 複製所有屬性
    Object.assign(instance, data)

    // 轉換 Timestamp 為 Date
    if (data.createdAt instanceof Timestamp) {
      instance.createdAt = data.createdAt.toDate()
    }
    if (data.updatedAt instanceof Timestamp) {
      instance.updatedAt = data.updatedAt.toDate()
    }

    // 初始化 $original 用於 dirty tracking
    instance.$original = { id, ...data }
    if (data.createdAt instanceof Timestamp) {
      instance.$original.createdAt = data.createdAt.toDate()
    }
    if (data.updatedAt instanceof Timestamp) {
      instance.$original.updatedAt = data.updatedAt.toDate()
    }

    // 為 $relations 中定義的關聯建立 getter
    this.setupRelationGetters(instance)

    return instance
  }

  /**
   * 為實例設定關聯的 getter
   * 讓 user.posts 可以直接取得 user.$relations.posts
   */
  private static setupRelationGetters(instance: Model): void {
    const ModelClass = this as any
    const relations = ModelClass.$relations

    if (!relations) return

    for (const relationName of Object.keys(relations)) {
      // 如果實例上已經有這個屬性（例如資料欄位），跳過
      if (relationName in instance && !(instance as any)[relationName] === undefined) {
        continue
      }

      // 定義 getter
      Object.defineProperty(instance, relationName, {
        get() {
          return this.$relations[relationName]
        },
        enumerable: true,
        configurable: true
      })
    }
  }

  /**
   * 合併變更 - Lucid 風格
   * @example
   * user.merge({ name: 'Jane' })
   * await user.save()
   */
  merge(data: Partial<this>): this {
    Object.assign(this, data)
    return this
  }

  /**
   * 儲存變更
   * @example
   * user.merge({ name: 'Jane' })
   * await user.save()
   */
  async save(): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot save model without id. Use Model.create() instead.')
    }

    const ModelClass = this.constructor as typeof Model
    const collectionName = (ModelClass as any).getCollectionName()
    const firestore = db.getFirestore()

    // 判斷是否為新記錄（$original 為空）
    const isNew = Object.keys(this.$original).length === 0

    // 執行 before hooks
    if (isNew) {
      await HookManager.executeBeforeCreate(this)
    } else {
      await HookManager.executeBeforeUpdate(this)
    }

    const docRef = doc(firestore, collectionName, this.id)
    const updateData: any = this.toJSON()

    // 更新時間戳
    if ((ModelClass as any).options.timestamps) {
      updateData.updatedAt = Timestamp.now()
      this.updatedAt = new Date()
    }

    // 移除 id 和時間戳（不更新 createdAt）
    delete updateData.id
    delete updateData.createdAt

    await updateDoc(docRef, updateData)

    // 更新 $original
    this.$original = { ...this.toJSON(), id: this.id }

    // 執行 after hooks
    if (isNew) {
      await HookManager.executeAfterCreate(this)
    } else {
      await HookManager.executeAfterUpdate(this)
    }

    return this
  }

  /**
   * 刪除實例
   * @example
   * await user.delete()
   */
  async delete(): Promise<void> {
    if (!this.id) {
      throw new Error('Cannot delete model without id')
    }

    // 執行 before hook
    await HookManager.executeBeforeDelete(this)

    const ModelClass = this.constructor as typeof Model
    const collectionName = (ModelClass as any).getCollectionName()
    const firestore = db.getFirestore()

    const docRef = doc(firestore, collectionName, this.id)
    await deleteDoc(docRef)

    // 執行 after hook
    await HookManager.executeAfterDelete(this)
  }

  /**
   * 重新載入資料
   * @example
   * await user.refresh()
   */
  async refresh(): Promise<this> {
    if (!this.id) {
      throw new Error('Cannot refresh model without id')
    }

    const ModelClass = this.constructor as any
    const fresh = await ModelClass.find(this.id)

    if (!fresh) {
      throw new Error(`${ModelClass.name} with id "${this.id}" not found`)
    }

    Object.assign(this, fresh)
    return this
  }

  /**
   * 序列化為 JSON
   */
  toJSON(): Record<string, any> {
    const json: Record<string, any> = {}

    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        const value = this[key]

        // 跳過函數、私有屬性和 $ 開頭的內部屬性
        if (typeof value === 'function' || key.startsWith('_') || key.startsWith('$')) {
          continue
        }

        json[key] = value
      }
    }

    return json
  }
}
