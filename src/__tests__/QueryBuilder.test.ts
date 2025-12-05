import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryBuilder } from '../Database/QueryBuilder'
import { Model } from '../Database/Model'
import { db } from '../Database/Database'
import { where, orderBy, limit, startAfter, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { createMockDocSnap } from './helpers/firebase-mocks'
import { mockGetDocs, mockWriteBatch } from './setup'

class TestUser extends Model {
  static collectionName = 'users'
  name?: string
  age?: number
}

describe('QueryBuilder', () => {
  let builder: QueryBuilder<TestUser>

  beforeEach(() => {
    db.reset()
    db.initialize({ apiKey: 'test-key', projectId: 'test-project' })
    vi.clearAllMocks()

    builder = new QueryBuilder(TestUser, 'users')
  })

  describe('where()', () => {
    it('should add where constraint', () => {
      const result = builder.where('age', '>', 18)

      expect(result).toBe(builder) // chainable
      expect(where).toHaveBeenCalledWith('age', '>', 18)
    })

    it('should be chainable', () => {
      const result = builder.where('age', '>', 18).where('status', '==', 'active')

      expect(result).toBe(builder)
      expect(where).toHaveBeenCalledTimes(2)
    })
  })

  describe('whereEquals()', () => {
    it('should add equals constraint', () => {
      builder.whereEquals('status', 'active')

      expect(where).toHaveBeenCalledWith('status', '==', 'active')
    })
  })

  describe('whereNotEquals()', () => {
    it('should add not equals constraint', () => {
      builder.whereNotEquals('status', 'deleted')

      expect(where).toHaveBeenCalledWith('status', '!=', 'deleted')
    })
  })

  describe('whereGreaterThan()', () => {
    it('should add greater than constraint', () => {
      builder.whereGreaterThan('age', 18)

      expect(where).toHaveBeenCalledWith('age', '>', 18)
    })
  })

  describe('whereGreaterThanOrEqual()', () => {
    it('should add greater than or equal constraint', () => {
      builder.whereGreaterThanOrEqual('age', 18)

      expect(where).toHaveBeenCalledWith('age', '>=', 18)
    })
  })

  describe('whereLessThan()', () => {
    it('should add less than constraint', () => {
      builder.whereLessThan('age', 65)

      expect(where).toHaveBeenCalledWith('age', '<', 65)
    })
  })

  describe('whereLessThanOrEqual()', () => {
    it('should add less than or equal constraint', () => {
      builder.whereLessThanOrEqual('age', 65)

      expect(where).toHaveBeenCalledWith('age', '<=', 65)
    })
  })

  describe('whereIn()', () => {
    it('should add in constraint', () => {
      builder.whereIn('status', ['active', 'pending'])

      expect(where).toHaveBeenCalledWith('status', 'in', ['active', 'pending'])
    })
  })

  describe('whereNotIn()', () => {
    it('should add not-in constraint', () => {
      builder.whereNotIn('status', ['deleted', 'banned'])

      expect(where).toHaveBeenCalledWith('status', 'not-in', ['deleted', 'banned'])
    })
  })

  describe('whereArrayContains()', () => {
    it('should add array-contains constraint', () => {
      builder.whereArrayContains('tags', 'javascript')

      expect(where).toHaveBeenCalledWith('tags', 'array-contains', 'javascript')
    })
  })

  describe('whereArrayContainsAny()', () => {
    it('should add array-contains-any constraint', () => {
      builder.whereArrayContainsAny('tags', ['javascript', 'typescript'])

      expect(where).toHaveBeenCalledWith('tags', 'array-contains-any', ['javascript', 'typescript'])
    })
  })

  describe('orderBy()', () => {
    it('should add orderBy constraint with default ascending order', () => {
      builder.orderBy('createdAt')

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'asc')
    })

    it('should add orderBy constraint with descending order', () => {
      builder.orderBy('createdAt', 'desc')

      expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    })

    it('should be chainable', () => {
      const result = builder.orderBy('name').orderBy('age', 'desc')

      expect(result).toBe(builder)
      expect(orderBy).toHaveBeenCalledTimes(2)
    })
  })

  describe('limit()', () => {
    it('should add limit constraint', () => {
      builder.limit(10)

      expect(limit).toHaveBeenCalledWith(10)
    })

    it('should be chainable', () => {
      const result = builder.limit(10)

      expect(result).toBe(builder)
    })
  })

  describe('startAfter()', () => {
    it('should add startAfter constraint', () => {
      const mockSnapshot = { id: 'doc-1' } as any

      builder.startAfter(mockSnapshot)

      expect(startAfter).toHaveBeenCalledWith(mockSnapshot)
    })

    it('should be chainable', () => {
      const mockSnapshot = { id: 'doc-1' } as any
      const result = builder.startAfter(mockSnapshot)

      expect(result).toBe(builder)
    })
  })

  describe('get()', () => {
    it('should execute query and return results', async () => {
      const mockDocs = [
        createMockDocSnap('1', { name: 'John', age: 25 }),
        createMockDocSnap('2', { name: 'Jane', age: 30 }),
      ]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const results = await builder.get()

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('1')
      expect(results[0].name).toBe('John')
      expect(results[1].id).toBe('2')
      expect(results[1].name).toBe('Jane')
    })

    it('should return empty array when no results', async () => {
      const mockSnapshot = { docs: [] }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const results = await builder.get()

      expect(results).toHaveLength(0)
    })

    it('should work with chained constraints', async () => {
      const mockDocs = [createMockDocSnap('1', { name: 'John', age: 25 })]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const results = await builder
        .where('age', '>', 18)
        .orderBy('name')
        .limit(10)
        .get()

      expect(results).toHaveLength(1)
      expect(where).toHaveBeenCalled()
      expect(orderBy).toHaveBeenCalled()
      expect(limit).toHaveBeenCalled()
    })
  })

  describe('first()', () => {
    it('should return the first result', async () => {
      const mockDocs = [
        createMockDocSnap('1', { name: 'John', age: 25 }),
        createMockDocSnap('2', { name: 'Jane', age: 30 }),
      ]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const result = await builder.first()

      expect(result).not.toBeNull()
      expect(result?.id).toBe('1')
      expect(result?.name).toBe('John')
    })

    it('should return null when no results', async () => {
      const mockSnapshot = { docs: [] }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const result = await builder.first()

      expect(result).toBeNull()
    })

    it('should add limit(1) constraint', async () => {
      const mockDocs = [createMockDocSnap('1', { name: 'John', age: 25 })]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      await builder.first()

      expect(limit).toHaveBeenCalledWith(1)
    })
  })

  describe('firstOrFail()', () => {
    it('should return the first result', async () => {
      const mockDocs = [createMockDocSnap('1', { name: 'John', age: 25 })]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const result = await builder.firstOrFail()

      expect(result.id).toBe('1')
      expect(result.name).toBe('John')
    })

    it('should throw error when no results', async () => {
      const mockSnapshot = { docs: [] }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      await expect(builder.firstOrFail()).rejects.toThrow(
        'No results found in collection "users"'
      )
    })
  })

  describe('count()', () => {
    it('should return the count of results', async () => {
      const mockDocs = [
        createMockDocSnap('1', { name: 'John' }),
        createMockDocSnap('2', { name: 'Jane' }),
        createMockDocSnap('3', { name: 'Bob' }),
      ]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const count = await builder.count()

      expect(count).toBe(3)
    })

    it('should return 0 when no results', async () => {
      const mockSnapshot = { docs: [] }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const count = await builder.count()

      expect(count).toBe(0)
    })
  })

  describe('exists()', () => {
    it('should return true when results exist', async () => {
      const mockDocs = [createMockDocSnap('1', { name: 'John' })]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const exists = await builder.exists()

      expect(exists).toBe(true)
    })

    it('should return false when no results exist', async () => {
      const mockSnapshot = { docs: [] }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const exists = await builder.exists()

      expect(exists).toBe(false)
    })
  })

  describe('chaining', () => {
    it('should support complex query chains', async () => {
      const mockDocs = [createMockDocSnap('1', { name: 'John', age: 25 })]
      const mockSnapshot = { docs: mockDocs }

      mockGetDocs.mockResolvedValue(mockSnapshot)

      const result = await builder
        .where('age', '>', 18)
        .whereNotEquals('status', 'deleted')
        .whereIn('role', ['admin', 'user'])
        .orderBy('createdAt', 'desc')
        .limit(10)
        .first()

      expect(result).not.toBeNull()
      expect(where).toHaveBeenCalledTimes(3)
      expect(orderBy).toHaveBeenCalled()
      expect(limit).toHaveBeenCalled()
    })
  })

  describe('Batch Operations', () => {
    describe('update()', () => {
      it('should update multiple documents using writeBatch', async () => {
        const mockDocs = [
          createMockDocSnap('1', { name: 'John', age: 25 }),
          createMockDocSnap('2', { name: 'Jane', age: 30 }),
          createMockDocSnap('3', { name: 'Bob', age: 35 }),
        ]
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        const result = await builder.where('age', '>', 18).update({ status: 'active' })

        expect(result).toEqual({ count: 3 })
        expect(mockWriteBatch).toHaveBeenCalled()

        // Verify batch operations
        const batchInstance = mockWriteBatch.mock.results[0].value
        expect(batchInstance.update).toHaveBeenCalledTimes(3)
        expect(batchInstance.commit).toHaveBeenCalled()
      })

      it('should return zero count when no documents match', async () => {
        const mockSnapshot = { docs: [], empty: true }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        const result = await builder.where('age', '>', 100).update({ status: 'active' })

        expect(result).toEqual({ count: 0 })
        expect(mockWriteBatch).not.toHaveBeenCalled()
      })

      it('should use Promise.all in parallel mode', async () => {
        const mockDocs = [
          createMockDocSnap('1', { name: 'John', age: 25 }),
          createMockDocSnap('2', { name: 'Jane', age: 30 }),
        ]
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)
        vi.mocked(updateDoc).mockResolvedValue(undefined)

        const result = await builder
          .where('age', '>', 18)
          .update({ status: 'active' }, { parallel: true })

        expect(result).toEqual({ count: 2 })
        expect(updateDoc).toHaveBeenCalledTimes(2)
        expect(mockWriteBatch).not.toHaveBeenCalled()
      })

      it('should add updatedAt timestamp automatically', async () => {
        const mockDocs = [createMockDocSnap('1', { name: 'John', age: 25 })]
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        await builder.update({ status: 'active' })

        const batchInstance = mockWriteBatch.mock.results[0].value
        const updateCall = batchInstance.update.mock.calls[0][1]

        expect(updateCall).toHaveProperty('updatedAt')
        expect(updateCall.updatedAt).toBeDefined()
      })

      it('should not update id or createdAt', async () => {
        const mockDocs = [createMockDocSnap('1', { name: 'John', age: 25 })]
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        await builder.update({
          id: 'new-id',
          createdAt: Timestamp.now(),
          status: 'active',
        } as any)

        const batchInstance = mockWriteBatch.mock.results[0].value
        const updateCall = batchInstance.update.mock.calls[0][1]

        expect(updateCall).not.toHaveProperty('id')
        expect(updateCall).not.toHaveProperty('createdAt')
        expect(updateCall).toHaveProperty('status', 'active')
      })

      it('should handle batches larger than 500 documents', async () => {
        // Create 1200 mock documents (should split into 3 batches)
        const mockDocs = Array.from({ length: 1200 }, (_, i) =>
          createMockDocSnap(`doc-${i}`, { name: `User ${i}` })
        )
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        const result = await builder.update({ status: 'active' })

        expect(result).toEqual({ count: 1200 })

        // Should create 3 batches (500 + 500 + 200)
        expect(mockWriteBatch).toHaveBeenCalledTimes(3)

        // Verify each batch was committed
        const batches = mockWriteBatch.mock.results.map(r => r.value)
        batches.forEach(batch => {
          expect(batch.commit).toHaveBeenCalled()
        })

        // Verify update was called 1200 times across all batches
        const totalUpdates = batches.reduce(
          (sum, batch) => sum + batch.update.mock.calls.length,
          0
        )
        expect(totalUpdates).toBe(1200)
      })
    })

    describe('delete()', () => {
      it('should delete multiple documents using writeBatch', async () => {
        const mockDocs = [
          createMockDocSnap('1', { name: 'John', age: 25 }),
          createMockDocSnap('2', { name: 'Jane', age: 30 }),
        ]
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        const result = await builder.where('status', '==', 'deleted').delete()

        expect(result).toBe(2)
        expect(mockWriteBatch).toHaveBeenCalled()

        // Verify batch operations
        const batchInstance = mockWriteBatch.mock.results[0].value
        expect(batchInstance.delete).toHaveBeenCalledTimes(2)
        expect(batchInstance.commit).toHaveBeenCalled()
      })

      it('should return zero count when no documents match', async () => {
        const mockSnapshot = { docs: [], empty: true }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        const result = await builder.where('status', '==', 'deleted').delete()

        expect(result).toBe(0)
        expect(mockWriteBatch).not.toHaveBeenCalled()
      })

      it('should use Promise.all in parallel mode', async () => {
        const mockDocs = [
          createMockDocSnap('1', { name: 'John', age: 25 }),
          createMockDocSnap('2', { name: 'Jane', age: 30 }),
        ]
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)
        vi.mocked(deleteDoc).mockResolvedValue(undefined)

        const result = await builder
          .where('status', '==', 'deleted')
          .delete({ parallel: true })

        expect(result).toBe(2)
        expect(deleteDoc).toHaveBeenCalledTimes(2)
        expect(mockWriteBatch).not.toHaveBeenCalled()
      })

      it('should handle batches larger than 500 documents', async () => {
        // Create 750 mock documents (should split into 2 batches)
        const mockDocs = Array.from({ length: 750 }, (_, i) =>
          createMockDocSnap(`doc-${i}`, { name: `User ${i}` })
        )
        const mockSnapshot = { docs: mockDocs, empty: false }

        mockGetDocs.mockResolvedValue(mockSnapshot)

        const result = await builder.delete()

        expect(result).toBe(750)

        // Should create 2 batches (500 + 250)
        expect(mockWriteBatch).toHaveBeenCalledTimes(2)

        // Verify each batch was committed
        const batches = mockWriteBatch.mock.results.map(r => r.value)
        batches.forEach(batch => {
          expect(batch.commit).toHaveBeenCalled()
        })

        // Verify delete was called 750 times across all batches
        const totalDeletes = batches.reduce(
          (sum, batch) => sum + batch.delete.mock.calls.length,
          0
        )
        expect(totalDeletes).toBe(750)
      })
    })
  })
})
