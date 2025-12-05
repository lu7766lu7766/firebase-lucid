import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Model } from '../Database/Model'
import { db } from '../Database/Database'
import './setup'
import { mockGetDoc, mockGetDocs, mockAddDoc, mockDeleteDoc } from './setup'

// Initialize database before tests
beforeEach(() => {
  db.initialize({
    apiKey: 'test-api-key',
    projectId: 'test-project',
    authDomain: 'test.firebaseapp.com',
  })
})

// 測試用的 Models
class User extends Model {
  static collectionName = 'users'

  name!: string
  email!: string
  organizationId!: string

  // HasMany 關聯（外鍵方式）
  static posts() {
    return this.hasMany(Post, {
      type: 'foreignKey',
      foreignKey: 'userId'
    })
  }

  // BelongsTo 關聯
  static organization() {
    return this.belongsTo(Organization, {
      type: 'foreignKey',
      foreignKey: 'organizationId'
    })
  }

  // ManyToMany 關聯
  static groups() {
    return this.manyToMany(Group, {
      pivotCollection: 'user_groups',
      foreignKey: 'userId',
      relatedKey: 'groupId'
    })
  }
}

class Post extends Model {
  static collectionName = 'posts'

  title!: string
  content!: string
  userId!: string

  // BelongsTo 關聯
  static author() {
    return this.belongsTo(User, {
      type: 'foreignKey',
      foreignKey: 'userId'
    })
  }

  // HasMany 關聯
  static comments() {
    return this.hasMany(Comment, {
      type: 'foreignKey',
      foreignKey: 'postId'
    })
  }
}

class Comment extends Model {
  static collectionName = 'comments'

  text!: string
  postId!: string
}

class Organization extends Model {
  static collectionName = 'organizations'

  name!: string
}

class Group extends Model {
  static collectionName = 'groups'

  name!: string
}

describe('Relations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('BelongsTo', () => {
    it('should lazy load parent model', async () => {
      // 模擬 Post 查詢
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'post-1',
          data: () => ({ title: 'Test Post', userId: 'user-1' })
        }]
      })

      // 模擬 User 查詢
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: 'user-1',
        data: () => ({ name: 'John', email: 'john@example.com' })
      })

      const post = await Post.query().first()
      if (!post) throw new Error('Post not found')

      // Lazy load author
      const author = await (Post as any).author().call(Post, post).get()

      expect(author).not.toBeNull()
      expect(author.name).toBe('John')
    })

    it('should return null if foreign key is empty', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'post-1',
          data: () => ({ title: 'Test Post', userId: null })
        }]
      })

      const post = await Post.query().first()
      if (!post) throw new Error('Post not found')

      const author = await (Post as any).author().call(Post, post).get()

      expect(author).toBeNull()
    })
  })

  describe('HasMany', () => {
    it('should lazy load child models with foreign key', async () => {
      // 模擬 User 查詢
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'user-1',
          data: () => ({ name: 'John', email: 'john@example.com' })
        }]
      })

      // 模擬 Posts 查詢
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [
          { id: 'post-1', data: () => ({ title: 'Post 1', userId: 'user-1' }) },
          { id: 'post-2', data: () => ({ title: 'Post 2', userId: 'user-1' }) }
        ]
      })

      const user = await User.query().first()
      if (!user) throw new Error('User not found')

      // Lazy load posts
      const posts = await (User as any).posts().call(User, user).get()

      expect(posts).toHaveLength(2)
      expect(posts[0].title).toBe('Post 1')
    })

    it('should return empty array when no children exist', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'user-1',
          data: () => ({ name: 'John', email: 'john@example.com' })
        }]
      })

      mockGetDocs.mockResolvedValueOnce({
        empty: true,
        docs: []
      })

      const user = await User.query().first()
      if (!user) throw new Error('User not found')

      const posts = await (User as any).posts().call(User, user).get()

      expect(posts).toEqual([])
    })
  })

  describe('ManyToMany', () => {
    it('should lazy load related models through pivot', async () => {
      // 模擬 User 查詢
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [{
            id: 'user-1',
            data: () => ({ name: 'John' })
          }]
        })
        // 模擬 pivot 查詢
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'pivot-1', data: () => ({ userId: 'user-1', groupId: 'group-1' }) },
            { id: 'pivot-2', data: () => ({ userId: 'user-1', groupId: 'group-2' }) }
          ]
        })
        // 模擬 Groups 查詢
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'group-1', data: () => ({ name: 'Admins' }) },
            { id: 'group-2', data: () => ({ name: 'Users' }) }
          ]
        })

      const user = await User.query().first()
      if (!user) throw new Error('User not found')

      const groups = await (User as any).groups().call(User, user).get()

      expect(groups).toHaveLength(2)
      expect(groups.map((g: Group) => g.name)).toContain('Admins')
      expect(groups.map((g: Group) => g.name)).toContain('Users')
    })

    it('should attach new relation', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'user-1',
          data: () => ({ name: 'John' })
        }]
      })

      mockAddDoc.mockResolvedValueOnce({ id: 'pivot-new' })

      const user = await User.query().first()
      if (!user) throw new Error('User not found')

      const relation = (User as any).groups().call(User, user)
      await relation.attach('group-3')

      expect(mockAddDoc).toHaveBeenCalled()
    })

    it('should detach existing relation', async () => {
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [{
            id: 'user-1',
            data: () => ({ name: 'John' })
          }]
        })
        // 模擬 pivot 查詢（for detach）
        .mockResolvedValueOnce({
          empty: false,
          docs: [{
            id: 'pivot-1',
            ref: { id: 'pivot-1' },
            data: () => ({ userId: 'user-1', groupId: 'group-1' })
          }]
        })

      mockDeleteDoc.mockResolvedValue(undefined)

      const user = await User.query().first()
      if (!user) throw new Error('User not found')

      const relation = (User as any).groups().call(User, user)
      await relation.detach('group-1')

      expect(mockDeleteDoc).toHaveBeenCalled()
    })
  })

  describe('Preload', () => {
    it('should preload BelongsTo relation', async () => {
      // 模擬 Posts 查詢
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'post-1', data: () => ({ title: 'Post 1', userId: 'user-1' }) },
            { id: 'post-2', data: () => ({ title: 'Post 2', userId: 'user-2' }) }
          ]
        })
        // 模擬 Users 批量查詢（preload）
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'user-1', data: () => ({ name: 'John' }) },
            { id: 'user-2', data: () => ({ name: 'Jane' }) }
          ]
        })

      const posts = await Post.query().preload('author').get()

      expect(posts).toHaveLength(2)
      expect(posts[0].$isLoaded('author')).toBe(true)
      expect(posts[0].$relations.author?.name).toBe('John')
      expect(posts[1].$relations.author?.name).toBe('Jane')
    })

    it('should preload HasMany relation', async () => {
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [{
            id: 'user-1',
            data: () => ({ name: 'John' })
          }]
        })
        // 模擬 Posts 批量查詢（preload）
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'post-1', data: () => ({ title: 'Post 1', userId: 'user-1' }) },
            { id: 'post-2', data: () => ({ title: 'Post 2', userId: 'user-1' }) }
          ]
        })

      const users = await User.query().preload('posts').get()

      expect(users).toHaveLength(1)
      expect(users[0].$isLoaded('posts')).toBe(true)
      expect(users[0].$relations.posts).toHaveLength(2)
    })

    it('should preload multiple relations', async () => {
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [{
            id: 'user-1',
            data: () => ({ name: 'John', organizationId: 'org-1' })
          }]
        })
        // 模擬 Posts preload
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'post-1', data: () => ({ title: 'Post 1', userId: 'user-1' }) }
          ]
        })
        // 模擬 Organization preload
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'org-1', data: () => ({ name: 'Acme Inc' }) }
          ]
        })

      const users = await User.query()
        .preload('posts')
        .preload('organization')
        .get()

      expect(users[0].$isLoaded('posts')).toBe(true)
      expect(users[0].$isLoaded('organization')).toBe(true)
      expect(users[0].$relations.posts).toHaveLength(1)
      expect(users[0].$relations.organization?.name).toBe('Acme Inc')
    })

    it('should preload with custom query callback', async () => {
      mockGetDocs
        .mockResolvedValueOnce({
          empty: false,
          docs: [{
            id: 'user-1',
            data: () => ({ name: 'John' })
          }]
        })
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            { id: 'post-1', data: () => ({ title: 'Published Post', userId: 'user-1', status: 'published' }) }
          ]
        })

      const users = await User.query()
        .preload('posts', (query) => {
          query.where('status', '==', 'published')
        })
        .get()

      expect(users[0].$relations.posts).toHaveLength(1)
    })
  })
})

describe('Utils', () => {
  describe('groupBy', () => {
    it('should group array by key', async () => {
      const { groupBy } = await import('../Database/utils/groupBy')

      const items = [
        { id: 1, category: 'a' },
        { id: 2, category: 'a' },
        { id: 3, category: 'b' }
      ]

      const grouped = groupBy(items, 'category')

      expect(grouped.a).toHaveLength(2)
      expect(grouped.b).toHaveLength(1)
    })

    it('should handle null/undefined keys', async () => {
      const { groupBy } = await import('../Database/utils/groupBy')

      const items = [
        { id: 1, category: 'a' },
        { id: 2, category: null },
        { id: 3, category: undefined }
      ]

      const grouped = groupBy(items, 'category')

      expect(grouped.a).toHaveLength(1)
      expect(grouped[null as any]).toBeUndefined()
    })
  })

  describe('chunk', () => {
    it('should split array into chunks', async () => {
      const { chunk } = await import('../Database/utils/groupBy')

      const items = [1, 2, 3, 4, 5]
      const chunks = chunk(items, 2)

      expect(chunks).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should throw error for invalid chunk size', async () => {
      const { chunk } = await import('../Database/utils/groupBy')

      expect(() => chunk([1, 2, 3], 0)).toThrow('Chunk size must be greater than 0')
    })
  })
})
