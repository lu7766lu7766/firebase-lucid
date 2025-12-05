import type { Model } from '../Model'
import type { QueryBuilder } from '../QueryBuilder'

/**
 * 關聯類型
 */
export type RelationType = 'hasMany' | 'belongsTo' | 'manyToMany'

/**
 * 儲存類型
 * - foreignKey: 使用外鍵欄位（類似 SQL）
 * - subcollection: 使用 Firestore 子集合
 */
export type StorageType = 'foreignKey' | 'subcollection'

/**
 * 基礎關聯配置
 */
export interface BaseRelationConfig {
  /**
   * 本地 key（預設: 'id'）
   */
  localKey?: string
}

/**
 * HasMany 關聯配置
 */
export interface HasManyConfig extends BaseRelationConfig {
  /**
   * 儲存類型
   */
  type: StorageType
  /**
   * 外鍵欄位名稱（foreignKey 類型必填）
   * 例如：Post 的 userId 欄位
   */
  foreignKey?: string
  /**
   * 子集合名稱（subcollection 類型必填）
   * 例如：users/{userId}/posts 中的 'posts'
   */
  subcollection?: string
}

/**
 * BelongsTo 關聯配置
 */
export interface BelongsToConfig extends BaseRelationConfig {
  /**
   * 儲存類型（BelongsTo 只支援 foreignKey）
   */
  type: 'foreignKey'
  /**
   * 外鍵欄位名稱
   * 例如：Post 的 userId 欄位
   */
  foreignKey: string
  /**
   * 關聯 model 的 key（預設: 'id'）
   */
  ownerKey?: string
}

/**
 * ManyToMany 關聯配置
 */
export interface ManyToManyConfig extends BaseRelationConfig {
  /**
   * Pivot collection 名稱
   * 例如：'user_groups'
   */
  pivotCollection: string
  /**
   * Pivot 中當前 model 的外鍵欄位
   * 例如：'userId'
   */
  foreignKey: string
  /**
   * Pivot 中關聯 model 的外鍵欄位
   * 例如：'groupId'
   */
  relatedKey: string
  /**
   * 關聯 model 的本地 key（預設: 'id'）
   */
  relatedLocalKey?: string
  /**
   * 需要從 pivot 載入的額外欄位
   * 例如：['role', 'joinedAt']
   */
  pivotFields?: string[]
}

/**
 * Preload 回調函數類型
 * 用於自定義預載入查詢
 */
export type PreloadCallback<T extends Model> = (
  query: QueryBuilder<T>
) => void | QueryBuilder<T>

/**
 * 關聯定義類型（用於 Model 的靜態方法返回）
 */
export interface RelationDefinition<Parent extends Model, Related extends Model> {
  (parent: Parent): BaseRelationInstance<Parent, Related>
}

/**
 * 基礎關聯實例介面
 */
export interface BaseRelationInstance<_Parent extends Model, Related extends Model> {
  /**
   * 獲取關聯資料
   */
  get(): Promise<Related | Related[] | null>
  /**
   * 獲取 QueryBuilder 以自定義查詢
   */
  query(): QueryBuilder<Related>
}
