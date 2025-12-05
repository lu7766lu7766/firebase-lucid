import { BaseRelation } from './BaseRelation'
import type { Model } from '../Model'
import type { QueryBuilder } from '../QueryBuilder'
import type { BelongsToConfig } from './types'

/**
 * BelongsTo 關聯
 * 表示當前 Model 屬於另一個 Model
 *
 * @example
 * // Post 屬於 User
 * class Post extends Model {
 *   userId!: string
 *
 *   static author() {
 *     return this.belongsTo(User, {
 *       type: 'foreignKey',
 *       foreignKey: 'userId'
 *     })
 *   }
 * }
 *
 * // 使用
 * const post = await Post.find('123')
 * const author = await post.author().get()
 */
export class BelongsTo<
  Parent extends Model,
  Related extends Model
> extends BaseRelation<Parent, Related> {
  declare protected config: BelongsToConfig

  constructor(
    parent: Parent,
    RelatedModel: new () => Related,
    config: BelongsToConfig
  ) {
    super(parent, RelatedModel, config)
  }

  /**
   * 獲取關聯的父 model
   * @returns 關聯的 Model 實例，如果外鍵為空則返回 null
   */
  async get(): Promise<Related | null> {
    const foreignKeyValue = (this.parent as any)[this.config.foreignKey]

    if (!foreignKeyValue) {
      return null
    }

    const RelatedModelClass = this.getRelatedModelClass()
    return await RelatedModelClass.find(foreignKeyValue)
  }

  /**
   * 返回 QueryBuilder 以支援查詢自定義
   *
   * @example
   * const author = await post.author()
   *   .where('status', '==', 'active')
   *   .first()
   */
  query(): QueryBuilder<Related> {
    const foreignKeyValue = (this.parent as any)[this.config.foreignKey]
    const RelatedModelClass = this.getRelatedModelClass()

    if (!foreignKeyValue) {
      // 返回不會匹配任何文件的查詢
      return RelatedModelClass.query().where('id', '==', '__no_match__')
    }

    const ownerKey = this.config.ownerKey || 'id'
    return RelatedModelClass.query().where(ownerKey, '==', foreignKeyValue)
  }
}
