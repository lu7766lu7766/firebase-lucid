import { describe, it, expect, vi } from 'vitest'
import { Timestamps } from '../Utils/Timestamps'
import { Timestamp } from 'firebase/firestore'

describe('Timestamps', () => {
  describe('now()', () => {
    it('should return current timestamp', () => {
      const result = Timestamps.now()

      expect(result).toBeDefined()
      expect(result.constructor.name).toBe('MockTimestamp')
    })

    it('should call Timestamp.now()', () => {
      const spy = vi.spyOn(Timestamp, 'now')

      Timestamps.now()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('fromDate()', () => {
    it('should convert Date to Timestamp', () => {
      const date = new Date('2024-01-01T00:00:00Z')

      const result = Timestamps.fromDate(date)

      expect(result).toBeDefined()
      expect(result.constructor.name).toBe('MockTimestamp')
      expect(result.toDate().getTime()).toBe(date.getTime())
    })
  })

  describe('fromMillis()', () => {
    it('should convert milliseconds to Timestamp', () => {
      const millis = 1704067200000 // 2024-01-01T00:00:00Z

      const result = Timestamps.fromMillis(millis)

      expect(result).toBeDefined()
      expect(result.constructor.name).toBe('MockTimestamp')
      expect(result.toMillis()).toBe(millis)
    })
  })

  describe('toDate()', () => {
    it('should convert Timestamp to Date', () => {
      const timestamp = Timestamp.now()

      const result = Timestamps.toDate(timestamp)

      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('toMillis()', () => {
    it('should convert Timestamp to milliseconds', () => {
      const timestamp = Timestamp.now()

      const result = Timestamps.toMillis(timestamp)

      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(0)
    })

    it('should return correct milliseconds for known timestamp', () => {
      const millis = 1704067200000
      const timestamp = Timestamp.fromMillis(millis)

      const result = Timestamps.toMillis(timestamp)

      expect(result).toBe(millis)
    })
  })
})
