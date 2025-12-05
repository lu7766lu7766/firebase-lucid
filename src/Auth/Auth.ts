import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth as FirebaseAuth,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth'
import { db } from '../Database/Database'
import type { LoginCredentials, RegisterData } from './types'

class Auth {
  private static instance: Auth
  private auth: FirebaseAuth | null = null
  private currentUser: FirebaseUser | null = null
  private authStateListeners: Array<(user: FirebaseUser | null) => void> = []

  private constructor() {}

  static getInstance(): Auth {
    if (!Auth.instance) {
      Auth.instance = new Auth()
    }
    return Auth.instance
  }

  /**
   * 初始化認證（自動在 Database 初始化後調用）
   */
  initialize(): void {
    if (this.auth) {
      return
    }

    try {
      const app = db.getApp()
      this.auth = getAuth(app)

      // 設定持久化 - 確保登入狀態保存在 localStorage
      setPersistence(this.auth, browserLocalPersistence).catch(console.error)

      // 監聽認證狀態
      onAuthStateChanged(this.auth, (user) => {
        this.currentUser = user
        // 通知所有監聽器
        this.authStateListeners.forEach((listener) => listener(user))
      })
    } catch (error) {
      console.error('Failed to initialize Auth:', error)
      throw error
    }
  }

  /**
   * Email/Password 登入 - Lucid 風格
   * @example
   * const user = await auth.login({ email: 'user@example.com', password: 'password123' })
   */
  async login(credentials: LoginCredentials): Promise<FirebaseUser> {
    this.ensureInitialized()

    const userCredential = await signInWithEmailAndPassword(
      this.auth!,
      credentials.email,
      credentials.password
    )

    return userCredential.user
  }

  /**
   * Email/Password 註冊
   * @example
   * const user = await auth.register({
   *   email: 'user@example.com',
   *   password: 'password123',
   *   displayName: 'John Doe'
   * })
   */
  async register(data: RegisterData): Promise<FirebaseUser> {
    this.ensureInitialized()

    const userCredential = await createUserWithEmailAndPassword(
      this.auth!,
      data.email,
      data.password
    )

    // 更新顯示名稱（如果提供）
    if (data.displayName || data.name) {
      await updateProfile(userCredential.user, {
        displayName: data.displayName || data.name
      })
    }

    return userCredential.user
  }

  /**
   * Google 登入
   * @example
   * const user = await auth.loginWithGoogle()
   */
  async loginWithGoogle(): Promise<FirebaseUser> {
    this.ensureInitialized()

    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(this.auth!, provider)

    return result.user
  }

  /**
   * 登出
   * @example
   * await auth.logout()
   */
  async logout(): Promise<void> {
    this.ensureInitialized()

    await signOut(this.auth!)
    this.currentUser = null
  }

  /**
   * 取得當前用戶
   * @example
   * const user = auth.user()
   * if (user) {
   *   console.log(user.email)
   * }
   */
  user(): FirebaseUser | null {
    return this.currentUser
  }

  /**
   * 檢查是否已登入
   * @example
   * if (auth.check()) {
   *   console.log('User is logged in')
   * }
   */
  check(): boolean {
    return this.currentUser !== null
  }

  /**
   * 等待認證就緒
   * @example
   * const user = await auth.ready()
   */
  async ready(): Promise<FirebaseUser | null> {
    this.ensureInitialized()

    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth!, (user) => {
        unsubscribe()
        resolve(user)
      })
    })
  }

  /**
   * 監聽認證狀態變化
   * @example
   * auth.onAuthStateChanged((user) => {
   *   if (user) {
   *     console.log('User logged in:', user.email)
   *   } else {
   *     console.log('User logged out')
   *   }
   * })
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    this.authStateListeners.push(callback)

    // 返回取消訂閱函數
    return () => {
      const index = this.authStateListeners.indexOf(callback)
      if (index > -1) {
        this.authStateListeners.splice(index, 1)
      }
    }
  }

  /**
   * 發送密碼重設郵件
   * @example
   * await auth.sendPasswordResetEmail('user@example.com')
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    this.ensureInitialized()
    await sendPasswordResetEmail(this.auth!, email)
  }

  /**
   * 發送驗證郵件
   * @example
   * await auth.sendEmailVerification()
   */
  async sendEmailVerification(): Promise<void> {
    this.ensureInitialized()

    if (!this.currentUser) {
      throw new Error('No user is currently logged in')
    }

    await sendEmailVerification(this.currentUser)
  }

  /**
   * 更新用戶資料
   * @example
   * await auth.updateProfile({ displayName: 'New Name' })
   */
  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    this.ensureInitialized()

    if (!this.currentUser) {
      throw new Error('No user is currently logged in')
    }

    await updateProfile(this.currentUser, data)
  }

  /**
   * 取得 Firebase Auth 實例（進階使用）
   */
  getAuth(): FirebaseAuth {
    this.ensureInitialized()
    return this.auth!
  }

  /**
   * 確保已初始化
   */
  private ensureInitialized(): void {
    if (!this.auth) {
      // 嘗試自動初始化
      if (db.isInitialized()) {
        this.initialize()
      } else {
        throw new Error(
          'Auth not initialized. Please call db.initialize(config) first.\n' +
          'Example:\n' +
          '  import { db } from "firebase-lucid"\n' +
          '  const config = { apiKey: "...", projectId: "..." }\n' +
          '  db.initialize(config)'
        )
      }
    }
  }
}

// 單例導出
export const auth = Auth.getInstance()
export { Auth }
