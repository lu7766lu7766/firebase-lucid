import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { FirebaseConfig } from '../Config/FirebaseConfig'

describe('FirebaseConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.FIREBASE_API_KEY
    delete process.env.FIREBASE_AUTH_DOMAIN
    delete process.env.FIREBASE_PROJECT_ID
    delete process.env.FIREBASE_STORAGE_BUCKET
    delete process.env.FIREBASE_MESSAGING_SENDER_ID
    delete process.env.FIREBASE_APP_ID
    delete process.env.VITE_FIREBASE_API_KEY
    delete process.env.VITE_FIREBASE_AUTH_DOMAIN
    delete process.env.VITE_FIREBASE_PROJECT_ID
    delete process.env.VITE_FIREBASE_STORAGE_BUCKET
    delete process.env.VITE_FIREBASE_MESSAGING_SENDER_ID
    delete process.env.VITE_FIREBASE_APP_ID
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('fromEnv()', () => {
    it('should load configuration from provided env object', () => {
      const env = {
        FIREBASE_API_KEY: 'test-api-key',
        FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
        FIREBASE_PROJECT_ID: 'test-project-id',
        FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
        FIREBASE_MESSAGING_SENDER_ID: 'test-sender-id',
        FIREBASE_APP_ID: 'test-app-id'
      }

      const config = FirebaseConfig.fromEnv(env)

      expect(config).toEqual({
        apiKey: 'test-api-key',
        authDomain: 'test-auth-domain',
        projectId: 'test-project-id',
        storageBucket: 'test-storage-bucket',
        messagingSenderId: 'test-sender-id',
        appId: 'test-app-id'
      })
    })

    it('should prefer VITE_ prefixed variables over standard variables', () => {
      const env = {
        VITE_FIREBASE_API_KEY: 'vite-api-key',
        FIREBASE_API_KEY: 'standard-api-key',
        VITE_FIREBASE_PROJECT_ID: 'vite-project-id',
        FIREBASE_PROJECT_ID: 'standard-project-id'
      }

      const config = FirebaseConfig.fromEnv(env)

      expect(config.apiKey).toBe('vite-api-key')
      expect(config.projectId).toBe('vite-project-id')
    })

    it('should fall back to standard variables if VITE_ prefixed variables are not set', () => {
      const env = {
        FIREBASE_API_KEY: 'standard-api-key',
        FIREBASE_PROJECT_ID: 'standard-project-id'
      }

      const config = FirebaseConfig.fromEnv(env)

      expect(config.apiKey).toBe('standard-api-key')
      expect(config.projectId).toBe('standard-project-id')
    })

    it('should load minimal valid configuration with only required fields', () => {
      const env = {
        FIREBASE_API_KEY: 'test-api-key',
        FIREBASE_PROJECT_ID: 'test-project-id'
      }

      const config = FirebaseConfig.fromEnv(env)

      expect(config.apiKey).toBe('test-api-key')
      expect(config.projectId).toBe('test-project-id')
      expect(config.authDomain).toBeUndefined()
      expect(config.storageBucket).toBeUndefined()
    })

    it('should fall back to process.env when env object is not provided', () => {
      process.env.FIREBASE_API_KEY = 'env-api-key'
      process.env.FIREBASE_PROJECT_ID = 'env-project-id'

      const config = FirebaseConfig.fromEnv()

      expect(config.apiKey).toBe('env-api-key')
      expect(config.projectId).toBe('env-project-id')
    })

    it('should throw error if apiKey is missing', () => {
      const env = { FIREBASE_PROJECT_ID: 'test-project-id' }

      expect(() => FirebaseConfig.fromEnv(env)).toThrow(
        'Firebase configuration is incomplete. Please provide apiKey and projectId when calling db.initialize(config).'
      )
    })

    it('should throw error if projectId is missing', () => {
      const env = { FIREBASE_API_KEY: 'test-api-key' }

      expect(() => FirebaseConfig.fromEnv(env)).toThrow(
        'Firebase configuration is incomplete. Please provide apiKey and projectId when calling db.initialize(config).'
      )
    })

    it('should throw error if both apiKey and projectId are missing', () => {
      expect(() => FirebaseConfig.fromEnv({})).toThrow(
        'Firebase configuration is incomplete. Please provide apiKey and projectId when calling db.initialize(config).'
      )
    })
  })

  describe('ensureConfig()', () => {
    it('should return config when required fields exist', () => {
      const config = {
        apiKey: 'test-key',
        projectId: 'test-project'
      }

      expect(FirebaseConfig.ensureConfig(config)).toBe(config)
    })

    it('should throw when config is missing required fields', () => {
      // @ts-expect-error runtime validation
      expect(() => FirebaseConfig.ensureConfig({ apiKey: 'key' })).toThrow(
        'Firebase configuration is incomplete. Please provide apiKey and projectId when calling db.initialize(config).'
      )
    })
  })
})
