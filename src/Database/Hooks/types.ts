/**
 * Hook 類型
 */
export type HookType =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeSave'
  | 'afterSave'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDelete'
  | 'afterDelete'

/**
 * Hook 上下文
 */
export interface HookContext {
  /**
   * 是否為新建操作
   */
  isNew: boolean
  /**
   * 變更的欄位列表
   */
  dirtyFields: string[]
}

/**
 * AfterSave Hook 上下文
 */
export interface AfterSaveContext {
  /**
   * 是否為新建操作
   */
  isNew: boolean
}

/**
 * BeforeUpdate Hook 上下文
 */
export interface BeforeUpdateContext {
  /**
   * 變更的欄位列表
   */
  dirtyFields: string[]
}
