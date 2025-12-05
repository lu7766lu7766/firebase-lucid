// Database
export { db, Database } from "./Database/Database"
export { Model } from "./Database/Model"
export { QueryBuilder } from "./Database/QueryBuilder"
export type * from "./Database/types"

// Relations
export { BaseRelation, BelongsTo, HasMany, ManyToMany, PreloadManager } from "./Database/Relations"
export type { RelationType, StorageType, HasManyConfig, BelongsToConfig, ManyToManyConfig, PreloadCallback, RelationNames, InferRelations, ModelWithRelations } from "./Database/Relations"

// Decorators (Lucid style)
export { hasMany, belongsTo, manyToMany } from "./Database/Decorators"

// Hooks
export { HookManager } from "./Database/Hooks"
export type { HookType, HookContext, AfterSaveContext, BeforeUpdateContext } from "./Database/Hooks"

// Auth
export { auth, Auth } from "./Auth/Auth"
export type * from "./Auth/types"

// Utils
export { Timestamps } from "./Utils/Timestamps"

// Re-export commonly used Firebase types for convenience
export type { FirebaseApp, FirebaseOptions } from "firebase/app"

export type { Firestore, DocumentData, QueryConstraint, WhereFilterOp, OrderByDirection, Timestamp } from "firebase/firestore"

export type { User as FirebaseUser, Auth as FirebaseAuth } from "firebase/auth"
