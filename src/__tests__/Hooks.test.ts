import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Model } from '../Database/Model'
import { db } from '../Database/Database'
import './setup'
import { mockAddDoc, mockGetDocs, mockUpdateDoc, mockDeleteDoc } from './setup'

// Initialize database before tests
beforeEach(() => {
  db.initialize({
    apiKey: 'test-api-key',
    projectId: 'test-project',
    authDomain: 'test.firebaseapp.com',
  })
})

// 測試用的 Model
class HookTestModel extends Model {
  static collectionName = 'hook_test_models'

  name!: string
  status!: string

  // 追蹤 hook 調用
  public hookCalls: string[] = []

  protected async beforeCreate(): Promise<void> {
    this.hookCalls.push('beforeCreate')
  }

  protected async afterCreate(): Promise<void> {
    this.hookCalls.push('afterCreate')
  }

  protected async beforeSave(): Promise<void> {
    this.hookCalls.push('beforeSave')
  }

  protected async afterSave(): Promise<void> {
    this.hookCalls.push('afterSave')
  }

  protected async beforeUpdate(): Promise<void> {
    this.hookCalls.push('beforeUpdate')
  }

  protected async afterUpdate(): Promise<void> {
    this.hookCalls.push('afterUpdate')
  }

  protected async beforeDelete(): Promise<void> {
    this.hookCalls.push('beforeDelete')
  }

  protected async afterDelete(): Promise<void> {
    this.hookCalls.push('afterDelete')
  }
}

// 測試會在 beforeDelete 拋錯的 Model
class ProtectedModel extends Model {
  static collectionName = 'protected_models'

  protected async beforeDelete(): Promise<void> {
    throw new Error('Cannot delete protected record')
  }
}

describe('Lifecycle Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // 設置 mock 返回值
    mockAddDoc.mockResolvedValue({ id: 'test-id' })
    mockUpdateDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
  })

  describe('Create Hooks', () => {
    it('should call beforeSave, beforeCreate, afterCreate, afterSave in correct order', async () => {
      const model = await HookTestModel.create({ name: 'Test', status: 'active' })

      expect(model.hookCalls).toEqual([
        'beforeSave',
        'beforeCreate',
        'afterCreate',
        'afterSave'
      ])
    })

    it('should have access to model data in beforeCreate', async () => {
      class DataCheckModel extends Model {
        static collectionName = 'data_check'
        name!: string
        slug!: string

        protected async beforeCreate(): Promise<void> {
          // 在 beforeCreate 中設置 slug
          this.slug = this.name.toLowerCase().replace(/\s+/g, '-')
        }
      }

      mockAddDoc.mockResolvedValue({ id: 'test-id' })

      const model = await DataCheckModel.create({ name: 'Hello World' })
      expect(model.slug).toBe('hello-world')
    })
  })

  describe('Update Hooks', () => {
    it('should call beforeSave, beforeUpdate, afterUpdate, afterSave when saving existing model', async () => {
      // 模擬從數據庫獲取的 model
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'existing-id',
          data: () => ({ name: 'Test', status: 'active' })
        }]
      })

      const model = await HookTestModel.query().first()
      if (!model) throw new Error('Model not found')

      // 清除 hookCalls
      model.hookCalls = []

      // 更新並儲存
      model.merge({ status: 'inactive' })
      await model.save()

      expect(model.hookCalls).toEqual([
        'beforeSave',
        'beforeUpdate',
        'afterUpdate',
        'afterSave'
      ])
    })
  })

  describe('Delete Hooks', () => {
    it('should call beforeDelete and afterDelete', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'existing-id',
          data: () => ({ name: 'Test', status: 'active' })
        }]
      })

      const model = await HookTestModel.query().first()
      if (!model) throw new Error('Model not found')

      model.hookCalls = []
      await model.delete()

      expect(model.hookCalls).toEqual([
        'beforeDelete',
        'afterDelete'
      ])
    })

    it('should abort delete if beforeDelete throws', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'protected-id',
          data: () => ({ name: 'Protected' })
        }]
      })

      const model = await ProtectedModel.query().first()
      if (!model) throw new Error('Model not found')

      await expect(model.delete()).rejects.toThrow('Cannot delete protected record')

      // deleteDoc 不應該被調用
      expect(mockDeleteDoc).not.toHaveBeenCalled()
    })
  })

  describe('Dirty Tracking', () => {
    it('should track dirty fields after merge', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'test-id',
          data: () => ({ name: 'Original', status: 'active' })
        }]
      })

      const model = await HookTestModel.query().first()
      if (!model) throw new Error('Model not found')

      expect(model.$isDirty()).toBe(false)
      expect(model.$isDirty('name')).toBe(false)

      model.merge({ name: 'Changed' })

      expect(model.$isDirty()).toBe(true)
      expect(model.$isDirty('name')).toBe(true)
      expect(model.$isDirty('status')).toBe(false)
      expect(model.$dirtyFields()).toContain('name')
    })

    it('should reset dirty state after save', async () => {
      mockGetDocs.mockResolvedValueOnce({
        empty: false,
        docs: [{
          id: 'test-id',
          data: () => ({ name: 'Original', status: 'active' })
        }]
      })

      const model = await HookTestModel.query().first()
      if (!model) throw new Error('Model not found')

      model.merge({ name: 'Changed' })
      expect(model.$isDirty()).toBe(true)

      await model.save()

      expect(model.$isDirty()).toBe(false)
    })
  })

  describe('$relations and $loadedRelations', () => {
    it('should initialize with empty $relations and $loadedRelations', async () => {
      const model = await HookTestModel.create({ name: 'Test', status: 'active' })

      expect(model.$relations).toEqual({})
      expect(model.$loadedRelations.size).toBe(0)
    })

    it('should check if relation is loaded with $isLoaded', async () => {
      const model = await HookTestModel.create({ name: 'Test', status: 'active' })

      expect(model.$isLoaded('posts')).toBe(false)

      model.$relations.posts = []
      model.$loadedRelations.add('posts')

      expect(model.$isLoaded('posts')).toBe(true)
    })
  })
})
