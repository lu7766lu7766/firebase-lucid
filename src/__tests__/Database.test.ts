import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Database, db } from '../Database/Database'
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
describe('Database', () => {
  beforeEach(() => {
    // Reset database before each test
    db.reset()
    vi.clearAllMocks()
  })

  describe('getInstance()', () => {
    it('should return the same instance (singleton pattern)', () => {
      const instance1 = Database.getInstance()
      const instance2 = Database.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should return the same instance as the exported db', () => {
      const instance = Database.getInstance()

      expect(instance).toBe(db)
    })
  })

  describe('initialize()', () => {
    it('should initialize Firebase with provided config', () => {
      const config = {
        apiKey: 'test-api-key',
        projectId: 'test-project-id',
      }

      db.initialize(config)

      expect(initializeApp).toHaveBeenCalledWith(config)
      expect(getFirestore).toHaveBeenCalled()
      expect(db.isInitialized()).toBe(true)
    })

    it('should throw when config is missing', () => {
      // @ts-expect-error runtime guard
      expect(() => db.initialize(undefined)).toThrow(
        'Firebase configuration is incomplete. Please provide apiKey and projectId when calling db.initialize(config).'
      )
    })

    it('should warn and skip if already initialized', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      db.initialize({ apiKey: 'key', projectId: 'id' })
      db.initialize({ apiKey: 'key2', projectId: 'id2' })

      expect(consoleWarnSpy).toHaveBeenCalledWith('Firebase is already initialized')
      expect(initializeApp).toHaveBeenCalledTimes(1)

      consoleWarnSpy.mockRestore()
    })

    it('should log success message when initialized', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      db.initialize({ apiKey: 'key', projectId: 'id' })

      expect(consoleLogSpy).toHaveBeenCalledWith('Firebase initialized successfully')

      consoleLogSpy.mockRestore()
    })

    it('should throw and log error if initialization fails', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const error = new Error('Initialization failed')
      vi.mocked(initializeApp).mockImplementationOnce(() => {
        throw error
      })

      expect(() => db.initialize({ apiKey: 'key', projectId: 'id' })).toThrow('Initialization failed')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to initialize Firebase:', error)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('getFirestore()', () => {
    it('should return Firestore instance when initialized', () => {
      db.initialize({ apiKey: 'key', projectId: 'id' })

      const firestore = db.getFirestore()

      expect(firestore).toBeDefined()
      expect(firestore.type).toBe('firestore')
    })

    it('should throw error when not initialized', () => {
      expect(() => db.getFirestore()).toThrow(
        'Database not initialized. Please call db.initialize(config) first.'
      )
    })
  })

  describe('getApp()', () => {
    it('should return Firebase App instance when initialized', () => {
      db.initialize({ apiKey: 'key', projectId: 'id' })

      const app = db.getApp()

      expect(app).toBeDefined()
      expect(app.name).toBe('[DEFAULT]')
    })

    it('should throw error when not initialized', () => {
      expect(() => db.getApp()).toThrow(
        'Database not initialized. Please call db.initialize(config) first.'
      )
    })
  })

  describe('isInitialized()', () => {
    it('should return false when not initialized', () => {
      expect(db.isInitialized()).toBe(false)
    })

    it('should return true when initialized', () => {
      db.initialize({ apiKey: 'key', projectId: 'id' })

      expect(db.isInitialized()).toBe(true)
    })
  })

  describe('reset()', () => {
    it('should reset the database connection', () => {
      db.initialize({ apiKey: 'key', projectId: 'id' })
      expect(db.isInitialized()).toBe(true)

      db.reset()

      expect(db.isInitialized()).toBe(false)
      expect(() => db.getFirestore()).toThrow()
      expect(() => db.getApp()).toThrow()
    })

    it('should allow re-initialization after reset', () => {
      db.initialize({ apiKey: 'key1', projectId: 'id1' })
      db.reset()
      db.initialize({ apiKey: 'key2', projectId: 'id2' })

      expect(db.isInitialized()).toBe(true)
      expect(initializeApp).toHaveBeenCalledTimes(2)
    })
  })
})
