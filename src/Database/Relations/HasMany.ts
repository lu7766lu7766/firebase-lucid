import { BaseRelation } from './BaseRelation'
import type { Model } from '../Model'
import type { QueryBuilder } from '../QueryBuilder'
import type { HasManyConfig } from './types'

/**
 * HasMany 關聯
 * 表示當前 Model 擁有多個另一 Model
 *
 * @example
 * // User 有多個 Posts（外鍵方式）
 * class User extends Model {
 *   static posts() {
 *     return this.hasMany(Post, {
 *       type: 'foreignKey',
 *       foreignKey: 'userId'
 *     })
 *   }
 * }
 *
 * // User 有多個 Notifications（子集合方式）
 * class User extends Model {
 *   static notifications() {
 *     return this.hasMany(Notification, {
 *       type: 'subcollection',
 *       subcollection: 'notifications'
 *     })
 *   }
 * }
 *
 * // 使用
 * const user = await User.find('123')
 * const posts = await user.posts().get()
 */
export class HasMany<
  Parent extends Model,
  Related extends Model
> extends BaseRelation<Parent, Related> {
  declare protected config: HasManyConfig

  constructor(
    parent: Parent,
    RelatedModel: new () => Related,
    config: HasManyConfig
  ) {
    super(parent, RelatedModel, config)
  }

  /**
   * 獲取關聯的子 models
   * @returns 關聯的 Model 實例陣列
   */
  async get(): Promise<Related[]> {
    return await this.query().get()
  }

  /**
   * 返回 QueryBuilder 以支援查詢自定義
   *
   * @example
   * const publishedPosts = await user.posts()
   *   .where('status', '==', 'published')
   *   .orderBy('createdAt', 'desc')
   *   .limit(10)
   *   .get()
   */
  query(): QueryBuilder<Related> {
    if (this.config.type === 'foreignKey') {
      return this.createForeignKeyQuery()
    } else {
      return this.createSubcollectionQuery()
    }
  }

  /**
   * 建立外鍵查詢
   */
  private createForeignKeyQuery(): QueryBuilder<Related> {
    const localKeyValue = this.getLocalKeyValue()
    const RelatedModelClass = this.getRelatedModelClass()

    if (!this.config.foreignKey) {
      throw new Error('foreignKey is required for foreignKey type HasMany relation')
    }

    return RelatedModelClass.query().where(
      this.config.foreignKey,
      '==',
      localKeyValue
    )
  }

  /**
   * 建立子集合查詢
   */
  private createSubcollectionQuery(): QueryBuilder<Related> {
    const parentId = this.getLocalKeyValue()
    const RelatedModelClass = this.getRelatedModelClass()

    if (!this.config.subcollection) {
      throw new Error('subcollection is required for subcollection type HasMany relation')
    }

    const ParentModelClass = (this.parent.constructor as any)
    const parentCollection = ParentModelClass.getCollectionName()
    const subcollectionPath = `${parentCollection}/${parentId}/${this.config.subcollection}`

    // 建立使用子集合路徑的 QueryBuilder
    return RelatedModelClass.query(subcollectionPath)
  }
}
