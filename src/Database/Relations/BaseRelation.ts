import type { Model } from '../Model'
import type { QueryBuilder } from '../QueryBuilder'

/**
 * 所有關聯類型的抽象基類
 *
 * @typeParam Parent - 父 Model 類型
 * @typeParam Related - 關聯 Model 類型
 */
export abstract class BaseRelation<
  Parent extends Model,
  Related extends Model
> {
  constructor(
    protected parent: Parent,
    protected RelatedModel: new () => Related,
    protected config: any
  ) {}

  /**
   * 獲取關聯資料
   * 子類必須實現
   */
  abstract get(): Promise<Related | Related[] | null>

  /**
   * 返回 QueryBuilder 以支援查詢自定義
   * 子類必須實現
   */
  abstract query(): QueryBuilder<Related>

  /**
   * 獲取本地 key 的值
   */
  protected getLocalKeyValue(): any {
    const localKey = this.config.localKey || 'id'
    return (this.parent as any)[localKey]
  }

  /**
   * 獲取關聯 Model 類
   */
  protected getRelatedModelClass(): any {
    return this.RelatedModel as any
  }

  /**
   * 獲取關聯 Model 類（公開方法，用於 PreloadManager）
   */
  public getRelatedModel(): new () => Related {
    return this.RelatedModel
  }

  /**
   * 獲取關聯配置（公開方法，用於 PreloadManager）
   */
  public getConfig(): any {
    return this.config
  }
}
