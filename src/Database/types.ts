export interface ModelData {
  id?: string
  createdAt?: Date
  updatedAt?: Date
  [key: string]: any
}

export interface ModelOptions {
  timestamps?: boolean
  collection?: string
}

/**
 * 批量操作選項
 */
export interface BatchOptions {
  /**
   * 是否使用並行模式 (Promise.all)
   * - false (預設): 使用 Firebase writeBatch (原子性保證，最多 500 筆/batch)
   * - true: 使用 Promise.all (更快但無原子性保證)
   */
  parallel?: boolean
}

/**
 * 批量操作結果
 */
export interface BatchResult {
  /**
   * 受影響的文件數量
   */
  count: number
}

/**
 * Model 關聯資料儲存
 */
export interface ModelRelations {
  [key: string]: any
}

/**
 * Hook 上下文
 */
export interface HookContext {
  isNew: boolean
}
