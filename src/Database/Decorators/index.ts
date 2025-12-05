import type { Model } from '../Model'
import type { HasManyConfig, BelongsToConfig, ManyToManyConfig } from '../Relations/types'

/**
 * 確保 constructor 上有 $relations 物件
 */
function ensureRelationsObject(constructor: any): void {
  if (!constructor.hasOwnProperty('$relations')) {
    constructor.$relations = {}
  }
}

/**
 * HasMany 關聯 decorator
 * 類似 AdonisJS Lucid 的 @hasMany
 *
 * @example
 * class User extends Model {
 *   @hasMany(() => Post, { type: 'foreignKey', foreignKey: 'userId' })
 *   declare posts: Post[]
 * }
 */
export function hasMany<R extends Model>(
  relatedModel: () => new () => R,
  config: HasManyConfig
) {
  return function (target: any, propertyKey: string) {
    ensureRelationsObject(target.constructor)
    target.constructor.$relations[propertyKey] = function(this: any) {
      return this.hasMany(relatedModel(), config)
    }
  }
}

/**
 * BelongsTo 關聯 decorator
 * 類似 AdonisJS Lucid 的 @belongsTo
 *
 * @example
 * class Post extends Model {
 *   @belongsTo(() => User, { type: 'foreignKey', foreignKey: 'userId' })
 *   declare author: User | null
 * }
 */
export function belongsTo<R extends Model>(
  relatedModel: () => new () => R,
  config: BelongsToConfig
) {
  return function (target: any, propertyKey: string) {
    ensureRelationsObject(target.constructor)
    target.constructor.$relations[propertyKey] = function(this: any) {
      return this.belongsTo(relatedModel(), config)
    }
  }
}

/**
 * ManyToMany 關聯 decorator
 * 類似 AdonisJS Lucid 的 @manyToMany
 *
 * @example
 * class User extends Model {
 *   @manyToMany(() => Group, {
 *     pivotCollection: 'user_groups',
 *     foreignKey: 'userId',
 *     relatedKey: 'groupId'
 *   })
 *   declare groups: Group[]
 * }
 */
export function manyToMany<R extends Model>(
  relatedModel: () => new () => R,
  config: ManyToManyConfig
) {
  return function (target: any, propertyKey: string) {
    ensureRelationsObject(target.constructor)
    target.constructor.$relations[propertyKey] = function(this: any) {
      return this.manyToMany(relatedModel(), config)
    }
  }
}
