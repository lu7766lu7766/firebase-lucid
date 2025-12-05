import type { HookType, AfterSaveContext, BeforeUpdateContext } from './types'

/**
 * Hook 管理器
 * 負責調用 Model 上的生命週期 hooks
 */
export class HookManager {
  /**
   * 調用 model 上的 hook 方法
   */
  private static async callHook(
    instance: any,
    hookName: HookType,
    context?: any
  ): Promise<void> {
    const hookMethod = instance[hookName]
    if (typeof hookMethod === 'function') {
      await hookMethod.call(instance, context)
    }
  }

  /**
   * 執行 Create 前置 hooks
   * 順序: beforeSave -> beforeCreate
   */
  static async executeBeforeCreate(instance: any): Promise<void> {
    await this.callHook(instance, 'beforeSave')
    await this.callHook(instance, 'beforeCreate')
  }

  /**
   * 執行 Create 後置 hooks
   * 順序: afterCreate -> afterSave
   * After hooks 失敗不會影響已完成的操作
   */
  static async executeAfterCreate(instance: any): Promise<void> {
    try {
      await this.callHook(instance, 'afterCreate')
      await this.callHook(instance, 'afterSave', { isNew: true } as AfterSaveContext)
    } catch (error) {
      console.error('After create hook failed:', error)
    }
  }

  /**
   * 執行 Update 前置 hooks
   * 順序: beforeSave -> beforeUpdate
   */
  static async executeBeforeUpdate(instance: any): Promise<void> {
    const dirtyFields = typeof instance.$dirtyFields === 'function'
      ? instance.$dirtyFields()
      : []

    await this.callHook(instance, 'beforeSave')
    await this.callHook(instance, 'beforeUpdate', { dirtyFields } as BeforeUpdateContext)
  }

  /**
   * 執行 Update 後置 hooks
   * 順序: afterUpdate -> afterSave
   */
  static async executeAfterUpdate(instance: any): Promise<void> {
    try {
      await this.callHook(instance, 'afterUpdate')
      await this.callHook(instance, 'afterSave', { isNew: false } as AfterSaveContext)
    } catch (error) {
      console.error('After update hook failed:', error)
    }
  }

  /**
   * 執行 Delete 前置 hooks
   */
  static async executeBeforeDelete(instance: any): Promise<void> {
    await this.callHook(instance, 'beforeDelete')
  }

  /**
   * 執行 Delete 後置 hooks
   */
  static async executeAfterDelete(instance: any): Promise<void> {
    try {
      await this.callHook(instance, 'afterDelete')
    } catch (error) {
      console.error('After delete hook failed:', error)
    }
  }
}
