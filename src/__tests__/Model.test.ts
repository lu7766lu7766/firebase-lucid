import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Model } from '../Database/Model'
import { db } from '../Database/Database'
import { doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { createMockDocSnap, MockTimestamp } from './helpers/firebase-mocks'
import { mockGetDocs } from './setup'

// Test Model class
class TestUser extends Model {
  static collectionName = 'users'
  name?: string
  email?: string
  age?: number
}

// Test Model without explicit collection name
class Product extends Model {
  title?: string
  price?: number
}

describe('Model', () => {
  beforeEach(() => {
    db.reset()
    db.initialize({ apiKey: 'test-key', projectId: 'test-project' })
    vi.clearAllMocks()
  })

  describe('getCollectionName()', () => {
    it('should return explicit collection name if set', () => {
      expect(TestUser.getCollectionName()).toBe('users')
    })

    it('should return pluralized lowercase class name if not set', () => {
      expect(Product.getCollectionName()).toBe('products')
    })
  })

  describe('query()', () => {
    it('should return a QueryBuilder instance', () => {
      const builder = TestUser.query()

      expect(builder).toBeDefined()
      expect(builder.constructor.name).toBe('QueryBuilder')
    })
  })

  describe('all()', () => {
    it('should return all documents from collection', async () => {
      const mockDocs = [
        createMockDocSnap('1', { name: 'John', email: 'john@test.com' }),
        createMockDocSnap('2', { name: 'Jane', email: 'jane@test.com' }),
      ]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const users = await TestUser.all()

      expect(users).toHaveLength(2)
      expect(users[0].id).toBe('1')
      expect(users[0].name).toBe('John')
    })
  })

  describe('find()', () => {
    it('should find a document by id', async () => {
      const mockData = { name: 'John', email: 'john@test.com' }
      const mockDocSnap = createMockDocSnap('user-1', mockData, true)

      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any)

      const user = await TestUser.find('user-1')

      expect(user).not.toBeNull()
      expect(user?.id).toBe('user-1')
      expect(user?.name).toBe('John')
      expect(user?.email).toBe('john@test.com')
    })

    it('should return null if document does not exist', async () => {
      const mockDocSnap = createMockDocSnap('user-1', {}, false)

      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any)

      const user = await TestUser.find('user-1')

      expect(user).toBeNull()
    })

    it('should convert Timestamp to Date', async () => {
      const timestamp = MockTimestamp.now()
      const mockData = {
        name: 'John',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      const mockDocSnap = createMockDocSnap('user-1', mockData, true)

      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any)

      const user = await TestUser.find('user-1')

      expect(user?.createdAt).toBeInstanceOf(Date)
      expect(user?.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('findOrFail()', () => {
    it('should find a document by id', async () => {
      const mockData = { name: 'John' }
      const mockDocSnap = createMockDocSnap('user-1', mockData, true)

      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any)

      const user = await TestUser.findOrFail('user-1')

      expect(user.id).toBe('user-1')
      expect(user.name).toBe('John')
    })

    it('should throw error if document does not exist', async () => {
      const mockDocSnap = createMockDocSnap('user-1', {}, false)

      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any)

      await expect(TestUser.findOrFail('user-1')).rejects.toThrow(
        'TestUser with id "user-1" not found in collection "users"'
      )
    })
  })

  describe('create()', () => {
    it('should create a new document', async () => {
      const mockDocRef = { id: 'new-user-id' }
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any)

      const user = await TestUser.create({ name: 'John', email: 'john@test.com' })

      expect(addDoc).toHaveBeenCalled()
      expect(user.id).toBe('new-user-id')
      expect(user.name).toBe('John')
      expect(user.email).toBe('john@test.com')
    })

    it('should add timestamps when timestamps option is enabled', async () => {
      const mockDocRef = { id: 'new-user-id' }
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any)

      await TestUser.create({ name: 'John' })

      const callArgs = vi.mocked(addDoc).mock.calls[0][1]
      expect(callArgs).toHaveProperty('createdAt')
      expect(callArgs).toHaveProperty('updatedAt')
    })

    it('should remove id from data before creating', async () => {
      const mockDocRef = { id: 'new-user-id' }
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any)

      await TestUser.create({ id: 'should-be-removed', name: 'John' } as any)

      const callArgs = vi.mocked(addDoc).mock.calls[0][1]
      expect(callArgs).not.toHaveProperty('id')
    })
  })

  describe('createWithId()', () => {
    it('should create a document with specific id', async () => {
      vi.mocked(setDoc).mockResolvedValue(undefined)

      const user = await TestUser.createWithId('custom-id', { name: 'John' })

      expect(setDoc).toHaveBeenCalled()
      expect(user.id).toBe('custom-id')
      expect(user.name).toBe('John')
    })

    it('should add timestamps', async () => {
      vi.mocked(setDoc).mockResolvedValue(undefined)

      await TestUser.createWithId('custom-id', { name: 'John' })

      const callArgs = vi.mocked(setDoc).mock.calls[0][1]
      expect(callArgs).toHaveProperty('createdAt')
      expect(callArgs).toHaveProperty('updatedAt')
    })
  })

  describe('createMany()', () => {
    it('should create multiple documents', async () => {
      const mockDocRef = { id: 'new-id' }
      vi.mocked(addDoc).mockResolvedValue(mockDocRef as any)

      const users = await TestUser.createMany([
        { name: 'John', email: 'john@test.com' },
        { name: 'Jane', email: 'jane@test.com' },
      ])

      expect(users).toHaveLength(2)
      expect(addDoc).toHaveBeenCalledTimes(2)
    })
  })

  describe('first()', () => {
    it('should return the first document', async () => {
      const mockDocs = [createMockDocSnap('1', { name: 'John' })]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const user = await TestUser.first()

      expect(user).not.toBeNull()
      expect(user?.id).toBe('1')
    })

    it('should return null if no documents exist', async () => {
      const mockSnapshot = { docs: [] }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const user = await TestUser.first()

      expect(user).toBeNull()
    })
  })

  describe('destroy()', () => {
    it('should delete a document by id', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined)

      await TestUser.destroy('user-1')

      expect(deleteDoc).toHaveBeenCalled()
      expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-1')
    })
  })

  describe('merge()', () => {
    it('should merge data into instance', () => {
      const user = new TestUser()
      user.id = '1'
      user.name = 'John'
      user.email = 'john@test.com'

      user.merge({ name: 'Jane', age: 30 })

      expect(user.name).toBe('Jane')
      expect(user.email).toBe('john@test.com')
      expect(user.age).toBe(30)
    })

    it('should return this for chaining', () => {
      const user = new TestUser()
      const result = user.merge({ name: 'John' })

      expect(result).toBe(user)
    })
  })

  describe('save()', () => {
    it('should update an existing document', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined)

      const user = new TestUser()
      user.id = 'user-1'
      user.name = 'Jane'
      user.email = 'jane@test.com'

      await user.save()

      expect(updateDoc).toHaveBeenCalled()
    })

    it('should throw error if id is not set', async () => {
      const user = new TestUser()
      user.name = 'John'

      await expect(user.save()).rejects.toThrow(
        'Cannot save model without id. Use Model.create() instead.'
      )
    })

    it('should update updatedAt timestamp', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined)

      const user = new TestUser()
      user.id = 'user-1'
      user.name = 'Jane'

      await user.save()

      const callArgs = vi.mocked(updateDoc).mock.calls[0][1]
      expect(callArgs).toHaveProperty('updatedAt')
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('should not update createdAt', async () => {
      vi.mocked(updateDoc).mockResolvedValue(undefined)

      const user = new TestUser()
      user.id = 'user-1'
      user.name = 'Jane'
      user.createdAt = new Date('2024-01-01')

      await user.save()

      const callArgs = vi.mocked(updateDoc).mock.calls[0][1]
      expect(callArgs).not.toHaveProperty('createdAt')
    })
  })

  describe('delete()', () => {
    it('should delete the instance', async () => {
      vi.mocked(deleteDoc).mockResolvedValue(undefined)

      const user = new TestUser()
      user.id = 'user-1'

      await user.delete()

      expect(deleteDoc).toHaveBeenCalled()
    })

    it('should throw error if id is not set', async () => {
      const user = new TestUser()

      await expect(user.delete()).rejects.toThrow('Cannot delete model without id')
    })
  })

  describe('refresh()', () => {
    it('should reload data from database', async () => {
      const mockData = { name: 'Jane Updated', email: 'jane@test.com' }
      const mockDocSnap = createMockDocSnap('user-1', mockData, true)

      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any)

      const user = new TestUser()
      user.id = 'user-1'
      user.name = 'Jane'

      await user.refresh()

      expect(user.name).toBe('Jane Updated')
    })

    it('should throw error if id is not set', async () => {
      const user = new TestUser()

      await expect(user.refresh()).rejects.toThrow('Cannot refresh model without id')
    })

    it('should throw error if document not found', async () => {
      const mockDocSnap = createMockDocSnap('user-1', {}, false)

      vi.mocked(getDoc).mockResolvedValue(mockDocSnap as any)

      const user = new TestUser()
      user.id = 'user-1'

      await expect(user.refresh()).rejects.toThrow('TestUser with id "user-1" not found')
    })
  })

  describe('toJSON()', () => {
    it('should serialize model to JSON', () => {
      const user = new TestUser()
      user.id = 'user-1'
      user.name = 'John'
      user.email = 'john@test.com'
      user.age = 30

      const json = user.toJSON()

      expect(json).toEqual({
        id: 'user-1',
        name: 'John',
        email: 'john@test.com',
        age: 30,
      })
    })

    it('should skip functions', () => {
      const user = new TestUser()
      user.id = 'user-1'
      user.name = 'John'

      const json = user.toJSON()

      expect(json).not.toHaveProperty('save')
      expect(json).not.toHaveProperty('delete')
      expect(json).not.toHaveProperty('toJSON')
    })

    it('should skip private properties', () => {
      const user: any = new TestUser()
      user.id = 'user-1'
      user.name = 'John'
      user._privateField = 'secret'

      const json = user.toJSON()

      expect(json).not.toHaveProperty('_privateField')
    })
  })
})
