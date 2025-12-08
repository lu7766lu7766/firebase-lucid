import { vi, beforeEach } from 'vitest'
import {
  mockFirebaseApp,
  mockFirestore,
  mockAuth,
  MockTimestamp,
} from './helpers/firebase-mocks'

// Create shared mock functions that will be used by vi.mock
const mockFns = {
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn(),
  writeBatch: vi.fn(() => ({
    update: vi.fn(),
    delete: vi.fn(),
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  })),
}

// Export for test access
export const mockGetDoc = mockFns.getDoc
export const mockGetDocs = mockFns.getDocs
export const mockAddDoc = mockFns.addDoc
export const mockUpdateDoc = mockFns.updateDoc
export const mockDeleteDoc = mockFns.deleteDoc
export const mockWriteBatch = mockFns.writeBatch

// Mock firebase/app
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => mockFirebaseApp),
}))

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => mockFirestore),
  collection: vi.fn((_db: any, name: string) => ({ type: 'collection', path: name })),
  doc: vi.fn((_db: any, collectionName: string, id: string) => ({
    type: 'doc',
    id,
    path: `${collectionName}/${id}`,
  })),
  getDoc: mockFns.getDoc,
  getDocs: mockFns.getDocs,
  addDoc: mockFns.addDoc,
  setDoc: mockFns.setDoc,
  updateDoc: mockFns.updateDoc,
  deleteDoc: mockFns.deleteDoc,
  writeBatch: mockFns.writeBatch,
  query: vi.fn((ref: any, ...constraints: any[]) => ({ ref, constraints })),
  where: vi.fn((field: string, op: string, value: any) => ({ type: 'where', field, op, value })),
  orderBy: vi.fn((field: string, direction: string) => ({ type: 'orderBy', field, direction })),
  limit: vi.fn((value: number) => ({ type: 'limit', value })),
  startAfter: vi.fn((snapshot: any) => ({ type: 'startAfter', snapshot })),
  documentId: vi.fn(() => ({ type: 'documentId' })),
  FieldPath: vi.fn(() => ({ type: 'FieldPath' })),
  Timestamp: MockTimestamp,
  serverTimestamp: vi.fn(() => MockTimestamp.now()),
}))

// Mock persistence object
export const mockBrowserLocalPersistence = { type: 'LOCAL' }

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  GoogleAuthProvider: vi.fn(() => ({ providerId: 'google.com' })),
  signInWithPopup: vi.fn(),
  updateProfile: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  setPersistence: vi.fn().mockResolvedValue(undefined),
  browserLocalPersistence: { type: 'LOCAL' },
}))

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.currentUser = null
})
