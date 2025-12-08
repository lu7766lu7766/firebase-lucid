import { BaseRelation } from './BaseRelation'
import type { Model } from '../Model'
import type { QueryBuilder } from '../QueryBuilder'
import type { BelongsToManyConfig } from './types'

/**
 * BelongsToMany 關聯（使用陣列外鍵）
 * 適用於 parent 上的欄位為 ID 陣列，例如 product_ids: string[]
 */
export class BelongsToMany<
  Parent extends Model,
  Related extends Model
> extends BaseRelation<Parent, Related> {
  declare protected config: BelongsToManyConfig

  constructor(
    parent: Parent,
    RelatedModel: new () => Related,
    config: BelongsToManyConfig
  ) {
    super(parent, RelatedModel, config)
  }

  /**
   * 載入關聯的 models
   */
  async get(): Promise<Related[]> {
    const ids = this.getForeignKeyValues()
    if (ids.length === 0) {
      return []
    }

    const RelatedModelClass = this.getRelatedModelClass()
    const ownerKey = this.config.ownerKey || 'id'

    return RelatedModelClass.query().whereIn(ownerKey, ids).get()
  }

  /**
   * 返回 QueryBuilder 以支援自定義查詢
   */
  query(): QueryBuilder<Related> {
    const ids = this.getForeignKeyValues()
    const RelatedModelClass = this.getRelatedModelClass()
    const ownerKey = this.config.ownerKey || 'id'

    if (ids.length === 0) {
      // 返回不會匹配任何文件的查詢
      return RelatedModelClass.query().where(ownerKey, '==', '__no_match__')
    }

    return RelatedModelClass.query().whereIn(ownerKey, ids)
  }

  /**
   * 取得 parent 上的 ID 陣列
   */
  private getForeignKeyValues(): any[] {
    const foreignKey = this.config.foreignKey
    const value = (this.parent as any)[foreignKey]
    if (!Array.isArray(value)) {
      return []
    }
    return value.filter(v => v != null && v !== '')
  }
}
