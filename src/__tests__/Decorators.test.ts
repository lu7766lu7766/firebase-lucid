import { describe, it, expect, beforeEach } from 'vitest'
import { Model } from '../Database/Model'
import { hasMany, belongsTo, manyToMany } from '../Database/Decorators'
import { db } from '../Database/Database'
import './setup'

// Initialize database before tests
beforeEach(() => {
  db.initialize({
    apiKey: 'test-api-key',
    projectId: 'test-project',
    authDomain: 'test.firebaseapp.com',
  })
})

// 測試用的 Models（使用 decorator）
class Post extends Model {
  static collectionName = 'posts'
  title!: string
  userId!: string

  @belongsTo(() => User, { type: 'foreignKey', foreignKey: 'userId' })
  declare author: User | null
}

class Organization extends Model {
  static collectionName = 'organizations'
  name!: string
}

class Group extends Model {
  static collectionName = 'groups'
  name!: string
}

class User extends Model {
  static collectionName = 'users'
  name!: string
  email!: string
  organizationId!: string

  @hasMany(() => Post, { type: 'foreignKey', foreignKey: 'userId' })
  declare posts: Post[]

  @belongsTo(() => Organization, { type: 'foreignKey', foreignKey: 'organizationId' })
  declare organization: Organization | null

  @manyToMany(() => Group, {
    pivotCollection: 'user_groups',
    foreignKey: 'userId',
    relatedKey: 'groupId'
  })
  declare groups: Group[]
}

describe('Decorators', () => {
  it('should register hasMany relation in $relations', () => {
    const UserClass = User as any
    expect(UserClass.$relations).toBeDefined()
    expect(UserClass.$relations.posts).toBeDefined()
    expect(typeof UserClass.$relations.posts).toBe('function')
  })

  it('should register belongsTo relation in $relations', () => {
    const UserClass = User as any
    expect(UserClass.$relations.organization).toBeDefined()
    expect(typeof UserClass.$relations.organization).toBe('function')

    const PostClass = Post as any
    expect(PostClass.$relations.author).toBeDefined()
  })

  it('should register manyToMany relation in $relations', () => {
    const UserClass = User as any
    expect(UserClass.$relations.groups).toBeDefined()
    expect(typeof UserClass.$relations.groups).toBe('function')
  })

  it('should work with preload() - relation names should be typed', () => {
    // 這個測試主要是驗證型別，編譯通過就代表成功
    const query = User.query()

    // 這些應該有型別提示
    query.preload('posts')
    query.preload('organization')
    query.preload('groups')

    expect(query).toBeDefined()
  })

  it('should have correct property types with declare keyword', () => {
    // 型別檢查 - 編譯通過就代表型別正確
    const user = new User()

    // TypeScript 應該知道這些屬性的型別
    const posts: Post[] | undefined = user.posts
    const organization: Organization | null | undefined = user.organization
    const groups: Group[] | undefined = user.groups

    // 避免 unused variable warning
    expect(posts).toBeUndefined()
    expect(organization).toBeUndefined()
    expect(groups).toBeUndefined()
  })
})
