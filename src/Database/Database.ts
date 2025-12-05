import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
const ensureConfig = (config?: FirebaseOptions): FirebaseOptions => {
  if (!config || !config.apiKey || !config.projectId) {
    throw new Error(
      'Firebase configuration is incomplete. Please provide apiKey and projectId when calling db.initialize(config).'
    )
  }
  return config
}

class Database {
  private static instance: Database
  private app: FirebaseApp | null = null
  private firestore: Firestore | null = null
  private initialized = false

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database()
    }
    return Database.instance
  }

  /**
   * 初始化 Firebase
   * @param config 必填配置；請從應用層傳入
   * @example
   * // 在應用層組裝配置後初始化
   * db.initialize({
   *   apiKey: 'your-api-key',
   *   projectId: 'your-project-id',
   *   // ...
   * })
   */
  initialize(config: FirebaseOptions): void {
    if (this.initialized) {
      console.warn('Firebase is already initialized')
      return
    }

    try {
      const firebaseConfig = ensureConfig(config)
      this.app = initializeApp(firebaseConfig)
      this.firestore = getFirestore(this.app)
      this.initialized = true
      console.log('Firebase initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Firebase:', error)
      throw error
    }
  }

  /**
   * 取得 Firestore 實例
   * @throws Error if database is not initialized
   */
  getFirestore(): Firestore {
    if (!this.firestore) {
      throw new Error(
        'Database not initialized. Please call db.initialize(config) first.\n' +
        'Example:\n' +
        '  import { db } from "firebase-lucid"\n' +
        '  const config = { apiKey: "...", projectId: "..." }\n' +
        '  db.initialize(config)'
      )
    }
    return this.firestore
  }

  /**
   * 取得 Firebase App 實例
   * @throws Error if database is not initialized
   */
  getApp(): FirebaseApp {
    if (!this.app) {
      throw new Error('Database not initialized. Please call db.initialize(config) first.')
    }
    return this.app
  }

  /**
   * 檢查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * 重置資料庫連接（主要用於測試）
   */
  reset(): void {
    this.app = null
    this.firestore = null
    this.initialized = false
  }
}

// 單例導出
export const db = Database.getInstance()
export { Database }
