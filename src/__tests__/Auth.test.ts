import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Auth, auth } from '../Auth/Auth'
import { db } from '../Database/Database'
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth'
import { createMockUser, createMockUserCredential } from './helpers/firebase-mocks'

describe('Auth', () => {
  beforeEach(() => {
    // Reset auth by accessing private fields
    const authInstance = auth as any
    authInstance.auth = null
    authInstance.currentUser = null
    authInstance.authStateListeners = []

    db.reset()
    db.initialize({ apiKey: 'test-key', projectId: 'test-project' })
    vi.clearAllMocks()
  })

  describe('getInstance()', () => {
    it('should return the same instance (singleton pattern)', () => {
      const instance1 = Auth.getInstance()
      const instance2 = Auth.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should return the same instance as the exported auth', () => {
      const instance = Auth.getInstance()

      expect(instance).toBe(auth)
    })
  })

  describe('initialize()', () => {
    it('should initialize Firebase Auth', () => {
      auth.initialize()

      expect(getAuth).toHaveBeenCalled()
      expect(onAuthStateChanged).toHaveBeenCalled()
    })

    it('should set browserLocalPersistence for session persistence', () => {
      auth.initialize()

      expect(setPersistence).toHaveBeenCalledWith(
        expect.anything(),
        browserLocalPersistence
      )
    })

    it('should not initialize twice', () => {
      auth.initialize()
      auth.initialize()

      expect(getAuth).toHaveBeenCalledTimes(1)
    })

    it('should throw error if database is not initialized', () => {
      db.reset()

      expect(() => auth.initialize()).toThrow()
    })
  })

  describe('login()', () => {
    beforeEach(() => {
      auth.initialize()
    })

    it('should login with email and password', async () => {
      const mockUser = createMockUser('user-1', 'test@example.com')
      const mockCredential = createMockUserCredential(mockUser)

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue(mockCredential as any)

      const user = await auth.login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      )
      expect(user).toBe(mockUser)
    })

    it('should throw error if not initialized', async () => {
      const authInstance = auth as any
      authInstance.auth = null
      db.reset()

      await expect(
        auth.login({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow('Auth not initialized')
    })
  })

  describe('register()', () => {
    beforeEach(() => {
      auth.initialize()
    })

    it('should register and update profile when provided', async () => {
      const mockUser = createMockUser('user-1', 'test@example.com')
      const mockCredential = createMockUserCredential(mockUser)

      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(mockCredential as any)

      const user = await auth.register({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.png',
      })

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com',
        'password123'
      )
      expect(user).toBe(mockUser)
      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'Test User',
        photoURL: 'https://example.com/avatar.png',
      })
    })

    it('should register without displayName', async () => {
      const mockUser = createMockUser('user-1', 'test@example.com')
      const mockCredential = createMockUserCredential(mockUser)

      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(mockCredential as any)

      const user = await auth.register({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(user).toBe(mockUser)
      expect(updateProfile).not.toHaveBeenCalled()
    })

    it('should use name field if displayName is not provided', async () => {
      const mockUser = createMockUser('user-1', 'test@example.com')
      const mockCredential = createMockUserCredential(mockUser)

      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue(mockCredential as any)

      const user = await auth.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      } as any)

      expect(user).toBe(mockUser)
      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'Test User',
      })
    })
  })

  describe('loginWithGoogle()', () => {
    it.skip('should login with Google', async () => {
      auth.initialize()
      const mockUser = createMockUser('user-1', 'test@gmail.com')
      const mockResult = { user: mockUser }

      vi.mocked(signInWithPopup).mockResolvedValue(mockResult as any)

      const user = await auth.loginWithGoogle()

      expect(signInWithPopup).toHaveBeenCalled()
      expect(user).toBe(mockUser)
    })
  })

  describe('logout()', () => {
    beforeEach(() => {
      auth.initialize()
    })

    it('should logout user', async () => {
      vi.mocked(signOut).mockResolvedValue(undefined)

      await auth.logout()

      expect(signOut).toHaveBeenCalled()
      expect(auth.user()).toBeNull()
    })
  })

  describe('user()', () => {
    it('should return current user', () => {
      const user = auth.user()

      expect(user).toBeNull()
    })
  })

  describe('check()', () => {
    it('should return false when no user is logged in', () => {
      expect(auth.check()).toBe(false)
    })

    it('should return true when user is logged in', () => {
      auth.initialize()
      // Simulate user login by directly setting currentUser via authStateChanged
      const mockUser = createMockUser('user-1', 'test@example.com')
      const authStateCallback = vi.mocked(onAuthStateChanged).mock.calls[0][1]
      authStateCallback(mockUser as any)

      expect(auth.check()).toBe(true)
    })
  })

  describe('ready()', () => {
    it.skip('should wait for auth state to be ready', async () => {
      auth.initialize()
      const mockUser = createMockUser('user-1', 'test@example.com')

      // Mock the second onAuthStateChanged call (inside ready())
      vi.mocked(onAuthStateChanged).mockImplementationOnce((auth: any, callback: any) => {
        // Initial call from initialize
        return vi.fn()
      }).mockImplementationOnce((auth: any, callback: any) => {
        // Call from ready()
        setTimeout(() => callback(mockUser as any), 0)
        return vi.fn()
      })

      const user = await auth.ready()

      expect(user).toBe(mockUser)
    })

    it.skip('should resolve with null if no user', async () => {
      auth.initialize()

      // Mock the second onAuthStateChanged call (inside ready())
      vi.mocked(onAuthStateChanged).mockImplementationOnce((auth: any, callback: any) => {
        // Initial call from initialize
        return vi.fn()
      }).mockImplementationOnce((auth: any, callback: any) => {
        // Call from ready()
        setTimeout(() => callback(null), 0)
        return vi.fn()
      })

      const user = await auth.ready()

      expect(user).toBeNull()
    })
  })

  describe('onAuthStateChanged()', () => {
    beforeEach(() => {
      auth.initialize()
    })

    it('should register auth state listener', () => {
      const callback = vi.fn()

      auth.onAuthStateChanged(callback)

      // Trigger auth state change
      const mockUser = createMockUser('user-1', 'test@example.com')
      const authStateCallback = vi.mocked(onAuthStateChanged).mock.calls[0][1]
      authStateCallback(mockUser as any)

      expect(callback).toHaveBeenCalledWith(mockUser)
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()

      const unsubscribe = auth.onAuthStateChanged(callback)

      expect(typeof unsubscribe).toBe('function')

      // Verify the callback is registered
      const authInstance = auth as any
      expect(authInstance.authStateListeners).toContain(callback)

      unsubscribe()

      // Verify the callback is removed
      expect(authInstance.authStateListeners).not.toContain(callback)
    })
  })

  describe('sendPasswordResetEmail()', () => {
    it('should send password reset email', async () => {
      auth.initialize()

      await auth.sendPasswordResetEmail('test@example.com')

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'test@example.com'
      )
    })
  })

  describe('sendEmailVerification()', () => {
    it('should send email verification', async () => {
      auth.initialize()
      const mockUser = createMockUser('user-1', 'test@example.com')

      // Simulate logged in user
      const authInstance = auth as any
      authInstance.currentUser = mockUser

      await auth.sendEmailVerification()

      expect(sendEmailVerification).toHaveBeenCalledWith(mockUser)
    })

    it('should throw error if no user is logged in', async () => {
      auth.initialize()

      await expect(auth.sendEmailVerification()).rejects.toThrow(
        'No user is currently logged in'
      )
    })
  })

  describe('updateProfile()', () => {
    it('should update user profile', async () => {
      auth.initialize()
      const mockUser = createMockUser('user-1', 'test@example.com')

      // Simulate logged in user
      const authInstance = auth as any
      authInstance.currentUser = mockUser

      await auth.updateProfile({ displayName: 'New Name' })

      expect(updateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: 'New Name',
      })
    })

    it('should throw error if no user is logged in', async () => {
      auth.initialize()

      await expect(auth.updateProfile({ displayName: 'New Name' })).rejects.toThrow(
        'No user is currently logged in'
      )
    })
  })

  describe('getAuth()', () => {
    beforeEach(() => {
      auth.initialize()
    })

    it('should return Firebase Auth instance', () => {
      const firebaseAuth = auth.getAuth()

      expect(firebaseAuth).toBeDefined()
    })
  })

  describe('ensureInitialized()', () => {
    it('should throw error if database is not initialized', async () => {
      db.reset()

      await expect(
        auth.login({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow('Auth not initialized. Please call db.initialize(config) first.')
    })

    it('should auto-initialize if database is initialized', async () => {
      db.initialize({ apiKey: 'test-key', projectId: 'test-project' })

      const mockUser = createMockUser('user-1', 'test@example.com')
      const mockCredential = createMockUserCredential(mockUser)

      vi.mocked(signInWithEmailAndPassword).mockResolvedValue(mockCredential as any)

      await auth.login({ email: 'test@example.com', password: 'pass' })

      expect(getAuth).toHaveBeenCalled()
    })
  })
})
