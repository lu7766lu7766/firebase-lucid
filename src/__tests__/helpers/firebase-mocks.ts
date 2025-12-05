import { vi } from 'vitest'

// Mock Firebase App
export const mockFirebaseApp = {
  name: '[DEFAULT]',
  options: {},
  automaticDataCollectionEnabled: false,
}

// Mock Firestore
export const mockFirestore = {
  type: 'firestore',
  _app: mockFirebaseApp,
}

// Mock Auth
export const mockAuth = {
  app: mockFirebaseApp,
  currentUser: null,
}

// Mock Document Reference
export const createMockDocRef = (id: string, collectionName: string) => ({
  id,
  path: `${collectionName}/${id}`,
  type: 'document',
  firestore: mockFirestore,
})

// Mock Document Snapshot
export const createMockDocSnap = (id: string, data: any, exists = true) => ({
  id,
  exists: () => exists,
  data: () => data,
  ref: createMockDocRef(id, 'test'),
})

// Mock Query Snapshot
export const createMockQuerySnapshot = (docs: any[]) => ({
  docs,
  size: docs.length,
  empty: docs.length === 0,
})

// Mock User
export const createMockUser = (uid: string, email: string) => ({
  uid,
  email,
  displayName: null,
  photoURL: null,
  emailVerified: false,
})

// Mock UserCredential
export const createMockUserCredential = (user: any) => ({
  user,
  providerId: 'password',
  operationType: 'signIn',
})

// Mock Timestamp
export class MockTimestamp {
  constructor(public seconds: number, public nanoseconds: number) {}

  toDate(): Date {
    return new Date(this.seconds * 1000)
  }

  toMillis(): number {
    return this.seconds * 1000 + Math.floor(this.nanoseconds / 1000000)
  }

  static now(): MockTimestamp {
    const now = Date.now()
    return new MockTimestamp(Math.floor(now / 1000), (now % 1000) * 1000000)
  }

  static fromDate(date: Date): MockTimestamp {
    const ms = date.getTime()
    return new MockTimestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000)
  }

  static fromMillis(millis: number): MockTimestamp {
    const seconds = Math.floor(millis / 1000)
    const nanoseconds = (millis % 1000) * 1000000
    return new MockTimestamp(seconds, nanoseconds)
  }
}

// Reset all mocks helper
export const resetAllMocks = () => {
  vi.clearAllMocks()
  mockAuth.currentUser = null
}
