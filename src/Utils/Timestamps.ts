import { Timestamp } from 'firebase/firestore'

export class Timestamps {
  /**
   * 取得當前時間戳
   */
  static now(): Timestamp {
    return Timestamp.now()
  }

  /**
   * 從 Date 轉換為 Timestamp
   */
  static fromDate(date: Date): Timestamp {
    return Timestamp.fromDate(date)
  }

  /**
   * 從毫秒轉換為 Timestamp
   */
  static fromMillis(milliseconds: number): Timestamp {
    return Timestamp.fromMillis(milliseconds)
  }

  /**
   * 從 Timestamp 轉換為 Date
   */
  static toDate(timestamp: Timestamp): Date {
    return timestamp.toDate()
  }

  /**
   * 從 Timestamp 轉換為毫秒
   */
  static toMillis(timestamp: Timestamp): number {
    return timestamp.toMillis()
  }
}
