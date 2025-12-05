# Lucid Firebase

> AdonisJS Lucid-style Firebase ORM for TypeScript - Simple, elegant, and easy to use

一個參考 AdonisJS 6 Lucid API 風格的 Firebase 套件，讓你在 5 分鐘內快速上手 Firestore 和 Authentication。

## 核心特性

- ✨ **Lucid 風格 API** - 優雅的 `User.find()`, `User.query().where().get()` 語法
- 🎨 **Decorator 支援** - 類似 AdonisJS 的 `@hasMany`、`@belongsTo` decorator
- 📦 **獨立套件** - 可用於任何 TypeScript/JavaScript 專案
- 🔥 **完整支援** - Firestore 資料庫 + Authentication 認證
- 💪 **TypeScript 優先** - 完整的型別定義和自動補全
- 🎯 **框架無關** - 純 JS/TS API，不依賴 React 或其他框架
- ⚡ **極簡前置** - 從安裝到使用不超過 5 分鐘
- 🔄 **批量操作** - 支援批量更新/刪除，自動處理 Firebase 500 筆限制
- 🔗 **關聯資料表** - 支援 hasMany、belongsTo、manyToMany，含 preload 預載入
- 🎣 **生命週期 Hooks** - beforeCreate、afterSave、beforeDelete 等完整 Hook 支援
- 🔍 **強型別 Preload** - preload() 關聯名稱有自動補全提示

## 快速開始

### 1. 安裝

```bash
npm install firebase-lucid firebase
```

### 2. 初始化

在你的應用入口（如 `main.tsx` 或 `index.ts`）：

```typescript
import { db } from "firebase-lucid"

// 初始化
db.initialize({
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef",
})

// 檢查初始化狀態
if (db.isInitialized()) {
  console.log("Firebase is ready")
}
```

### 3. 定義 Model

```typescript
import { Model } from "firebase-lucid"

class User extends Model {
  name!: string
  email!: string
  age?: number

  // 可選：指定 collection 名稱（預設使用 'users'）
  static collectionName = "users"
}
```

### 4. 開始使用！

```typescript
// 建立用戶
const user = await User.create({
  name: "John Doe",
  email: "john@example.com",
  age: 25,
})

// 查詢用戶
const foundUser = await User.find(user.id!)
console.log(foundUser?.name) // 'John Doe'

// 查詢條件
const adults = await User.query().where("age", ">=", 18).orderBy("createdAt", "desc").limit(10).get()

// 更新單個用戶
foundUser?.merge({ age: 26 })
await foundUser?.save()

// 批量更新多個用戶
const result = await User.query().where("age", ">=", 18).update({ status: "adult" })
console.log(`Updated ${result.count} users`)

// 刪除用戶
await foundUser?.delete()
```

### Model - CRUD 操作

#### 建立

```typescript
// 建立單筆
const user = await User.create({
  name: "John",
  email: "john@example.com",
})

// 使用自訂 ID 建立
const user = await User.createWithId("custom-id", {
  name: "John",
  email: "john@example.com",
})

// 批次建立
const users = await User.createMany([
  { name: "Alice", email: "alice@example.com" },
  { name: "Bob", email: "bob@example.com" },
])
```

#### 查詢

```typescript
// 根據 ID 查詢
const user = await User.find("user-id")

// 根據 ID 查詢（找不到拋錯）
const user = await User.findOrFail("user-id")

// 查詢全部
const users = await User.all()

// 查詢第一筆
const user = await User.first()
```

#### 更新

```typescript
// 合併變更並儲存
user.merge({ name: "Jane Doe", age: 30 })
await user.save()

// 或直接修改屬性
user.name = "Jane Doe"
await user.save()

// 重新載入資料
await user.refresh()
```

#### 刪除

```typescript
// 實例方法
await user.delete()

// 靜態方法
await User.destroy("user-id")
```

### Query Builder - 鏈式查詢

#### 基本查詢

```typescript
// WHERE 條件
const users = await User.query().where("age", ">", 18).get()

// 多個條件
const users = await User.query().where("age", ">=", 18).where("status", "==", "active").get()

// 排序
const users = await User.query().orderBy("createdAt", "desc").get()

// 限制筆數
const users = await User.query().limit(10).get()

// 組合使用
const users = await User.query().where("age", ">", 18).where("status", "==", "active").orderBy("createdAt", "desc").limit(20).get()
```

#### 簡化查詢方法

```typescript
// 等於
User.query().whereEquals("status", "active")

// 不等於
User.query().whereNotEquals("status", "deleted")

// 大於
User.query().whereGreaterThan("age", 18)

// 大於等於
User.query().whereGreaterThanOrEqual("age", 18)

// 小於
User.query().whereLessThan("age", 65)

// 小於等於
User.query().whereLessThanOrEqual("age", 65)

// IN
User.query().whereIn("status", ["active", "pending"])

// NOT IN
User.query().whereNotIn("status", ["deleted", "banned"])

// ARRAY CONTAINS
User.query().whereArrayContains("tags", "javascript")

// ARRAY CONTAINS ANY
User.query().whereArrayContainsAny("tags", ["js", "ts"])
```

#### 查詢結果

```typescript
// 取得所有結果
const users = await User.query().where("age", ">", 18).get()

// 取得第一筆
const user = await User.query().where("email", "==", "john@example.com").first() // 返回 User | null

// 取得第一筆（找不到拋錯）
const user = await User.query().where("email", "==", "john@example.com").firstOrFail() // 返回 User 或拋錯

// 檢查是否存在
const exists = await User.query().where("email", "==", "john@example.com").exists() // 返回 boolean

// 計數
const count = await User.query().where("status", "==", "active").count()
```

#### 批量操作

批量操作允許你一次更新或刪除多個符合條件的文件，非常適合資料清理、狀態同步等場景。

##### 基本使用

```typescript
// 批量更新：將所有成年用戶標記為成人
const result = await User.query().where("age", ">=", 18).update({ status: "adult" })
console.log(`Updated ${result} users`)

// 批量刪除：清理已標記刪除的用戶
const deletedCount = await User.query().where("status", "==", "deleted").delete()
console.log(`Deleted ${deletedCount} users`)
```

##### 並行模式

對於大批量操作（1000+ 筆），可使用並行模式獲得更好的性能：

```typescript
// 使用並行模式進行批量更新（更快但無原子性）
const result = await User.query().where("status", "==", "inactive").update({ archived: true }, { parallel: true })

// 使用並行模式進行批量刪除
const deletedLogs = await Log.query().where("createdAt", "<", lastMonth).delete({ parallel: true })
```

##### 執行模式比較

| 模式                  | 原子性               | 性能 | 每批限制 | 適用場景                       |
| --------------------- | -------------------- | ---- | -------- | ------------------------------ |
| **writeBatch** (預設) | ✅ 每批 500 筆原子性 | 中等 | 500 筆   | 關鍵業務操作、需要原子性的場景 |
| **parallel**          | ❌ 無原子性保證      | 快速 | 無限制   | 背景任務、日誌清理、非關鍵操作 |

##### 重要提醒

- ⚠️ **批量操作不會觸發 Model hooks** - 直接操作 Firestore，不經過 Model 實例
- ✅ **自動更新時間戳** - `update()` 操作會自動更新 `updatedAt` 欄位
- 🔄 **自動分批處理** - Firebase 每個 batch 限制 500 筆，系統會自動切分
- 📊 **返回受影響數量** - `update()` 返回 `{ count: number }`，`delete()` 直接返回刪除筆數
- 🚫 **不更新保護欄位** - `id` 和 `createdAt` 欄位不會被更新

##### 錯誤處理

```typescript
try {
  const deletedCount = await User.query().where("status", "==", "spam").delete()

  console.log(`Successfully deleted ${deletedCount} spam users`)
} catch (error) {
  console.error("Batch delete failed:", error)
  // 部分 batch 可能已成功，需要檢查資料庫狀態
}
```

### Authentication - 認證

#### Email/Password 認證

```typescript
import { auth } from "firebase-lucid"

// 註冊
const user = await auth.register({
  email: "user@example.com",
  password: "securePassword123",
  displayName: "John Doe", // 可選
})

// 登入
const user = await auth.login({
  email: "user@example.com",
  password: "password123",
})

// 登出
await auth.logout()
```

#### 社交登入

```typescript
// Google 登入（僅瀏覽器環境）
const user = await auth.loginWithGoogle()
```

#### 用戶狀態

```typescript
// 取得當前用戶
const user = auth.user()
if (user) {
  console.log(user.email)
}

// 檢查是否已登入
if (auth.check()) {
  console.log("User is logged in")
}

// 等待認證就緒
const user = await auth.ready()
```

#### 用戶管理

```typescript
// 更新個人資料
await auth.updateProfile({
  displayName: "New Name",
  photoURL: "https://example.com/photo.jpg",
})

// 發送密碼重設郵件
await auth.sendPasswordResetEmail("user@example.com")

// 發送驗證郵件
await auth.sendEmailVerification()
```

#### 監聽認證狀態

```typescript
// 監聽認證狀態變化
const unsubscribe = auth.onAuthStateChanged((user) => {
  if (user) {
    console.log("User logged in:", user.email)
  } else {
    console.log("User logged out")
  }
})

// 取消監聽
unsubscribe()
```

## 關聯資料表 (Relationships)

firebase-lucid 支援三種關聯類型：`hasMany`（一對多）、`belongsTo`（屬於）和 `manyToMany`（多對多），讓你可以優雅地處理資料間的關聯關係。

### 定義關聯

firebase-lucid 提供兩種定義關聯的方式：**Decorator 風格**（推薦）和 **靜態方法風格**。

#### 方式 1：Decorator 風格（推薦）

類似 AdonisJS Lucid 的優雅語法，使用 TypeScript decorators：

```typescript
import { Model, hasMany, belongsTo, manyToMany } from "firebase-lucid"

// User Model - 擁有多個 Posts，屬於一個 Organization
class User extends Model {
  static collectionName = "users"

  name!: string
  email!: string
  organizationId!: string

  // HasMany：一對多關聯（User 有多個 Posts）
  @hasMany(() => Post, { type: "foreignKey", foreignKey: "userId" })
  declare posts: Post[]

  // BelongsTo：屬於關聯（User 屬於一個 Organization）
  @belongsTo(() => Organization, { type: "foreignKey", foreignKey: "organizationId" })
  declare organization: Organization | null

  // ManyToMany：多對多關聯（User 屬於多個 Groups）
  @manyToMany(() => Group, {
    pivotCollection: "user_groups",
    foreignKey: "userId",
    relatedKey: "groupId"
  })
  declare groups: Group[]
}

// Post Model - 屬於一個 User
class Post extends Model {
  static collectionName = "posts"

  title!: string
  content!: string
  userId!: string

  // BelongsTo：Post 屬於一個 User（作者）
  @belongsTo(() => User, { type: "foreignKey", foreignKey: "userId" })
  declare author: User | null
}
```

**Decorator 風格的優點：**
- ✨ 語法更簡潔優雅
- 🎯 型別明確（直接使用 `declare` 宣告）
- 🔍 IDE 自動補全關聯屬性
- 💡 與 AdonisJS Lucid 保持一致

#### 方式 2：靜態方法風格

傳統的靜態方法定義方式（向後相容）：

```typescript
import { Model } from "firebase-lucid"

class User extends Model {
  static collectionName = "users"

  name!: string
  email!: string
  organizationId!: string

  // 使用靜態方法定義關聯
  static posts() {
    return this.hasMany(Post, {
      type: "foreignKey",
      foreignKey: "userId",
    })
  }

  static organization() {
    return this.belongsTo(Organization, {
      type: "foreignKey",
      foreignKey: "organizationId",
    })
  }
}
```

### Lazy Loading（延遲載入）

```typescript
// 取得 User
const user = await User.find("user-1")

// 延遲載入 Posts
const posts = await User.posts().call(User, user).get()

// 延遲載入並加入條件
const publishedPosts = await User.posts().call(User, user).query().where("status", "==", "published").orderBy("createdAt", "desc").limit(10).get()

// 延遲載入 BelongsTo
const post = await Post.find("post-1")
const author = await Post.author().call(Post, post).get()
```

### Eager Loading (Preload)

使用 `preload()` 批量載入關聯，避免 N+1 查詢問題。

#### 使用 Decorator 風格時

使用 decorator 定義關聯後，可以直接存取關聯屬性：

```typescript
// 預載入單一關聯
const posts = await Post.query().preload("author").get()

// 直接存取關聯屬性（有型別提示！）
posts.forEach((post) => {
  console.log(`Post: ${post.title}`)
  console.log(`Author: ${post.author?.name}`)  // 直接用 post.author
})

// 預載入多個關聯
const users = await User.query()
  .preload("posts")
  .preload("organization")
  .get()

users.forEach((user) => {
  console.log(`User: ${user.name}`)
  console.log(`Organization: ${user.organization?.name}`)  // 直接用 user.organization
  console.log(`Posts count: ${user.posts?.length}`)        // 直接用 user.posts
})

// preload 有自動補全！輸入 .preload(' 會顯示所有關聯名稱
const users = await User.query()
  .preload("posts", (query) => {
    query.where("status", "==", "published").limit(5)
  })
  .get()

// 檢查關聯是否已載入
if (user.$isLoaded("posts")) {
  console.log("Posts are loaded:", user.posts)
}
```

#### 使用靜態方法風格時

需要透過 `$relations` 存取預載入的資料：

```typescript
const posts = await Post.query().preload("author").get()

posts.forEach((post) => {
  console.log(`Author: ${post.$relations.author?.name}`)
})
```

### ManyToMany 操作

```typescript
const user = await User.find("user-1")
const relation = User.groups().call(User, user)

// 附加關聯
await relation.attach("group-1")

// 附加並設定 pivot 額外欄位
await relation.attach("group-2", { role: "admin", joinedAt: new Date() })

// 分離關聯
await relation.detach("group-1")

// 同步關聯（會移除不在列表中的，添加新的）
await relation.sync(["group-2", "group-3"])

// 切換關聯（存在則移除，不存在則添加）
await relation.toggle("group-1")
```

### 儲存方式

firebase-lucid 支援兩種儲存關聯的方式：

#### Foreign Key（外鍵方式）

類似傳統 SQL 資料庫，在子文件中儲存父文件的 ID：

```typescript
// Post 文件：{ userId: 'user-1', title: '...' }
static posts() {
  return this.hasMany(Post, {
    type: 'foreignKey',
    foreignKey: 'userId'  // Post 文件中的欄位名稱
  })
}
```

#### Subcollection（子集合方式）

利用 Firestore 原生子集合功能：

```typescript
// 結構：users/{userId}/notifications/{notificationId}
static notifications() {
  return this.hasMany(Notification, {
    type: 'subcollection',
    subcollection: 'notifications'  // 子集合名稱
  })
}
```

## 生命週期 Hooks

生命週期 Hooks 讓你可以在 Model 操作的特定時機執行自訂邏輯。

### 可用的 Hooks

| Hook           | 觸發時機                 |
| -------------- | ------------------------ |
| `beforeCreate` | 新建文件前               |
| `afterCreate`  | 新建文件後               |
| `beforeSave`   | 每次儲存前（新建或更新） |
| `afterSave`    | 每次儲存後（新建或更新） |
| `beforeUpdate` | 更新既有文件前           |
| `afterUpdate`  | 更新既有文件後           |
| `beforeDelete` | 刪除文件前               |
| `afterDelete`  | 刪除文件後               |

### 定義 Hooks

```typescript
class User extends Model {
  static collectionName = "users"

  name!: string
  email!: string
  slug!: string

  // 建立前自動生成 slug
  protected async beforeCreate(): Promise<void> {
    this.slug = this.name.toLowerCase().replace(/\s+/g, "-")
  }

  // 建立後發送歡迎郵件
  protected async afterCreate(): Promise<void> {
    await EmailService.sendWelcome(this.email)
  }

  // 每次儲存前驗證
  protected async beforeSave(): Promise<void> {
    if (!this.email.includes("@")) {
      throw new Error("Invalid email format")
    }
  }

  // 阻止刪除管理員
  protected async beforeDelete(): Promise<void> {
    if (this.role === "admin") {
      throw new Error("Cannot delete admin user")
    }
  }

  // 刪除後清理相關資料
  protected async afterDelete(): Promise<void> {
    await Post.query().where("userId", "==", this.id).delete()
  }
}
```

### Hooks 執行順序

**新建文件時**：

1. `beforeSave`
2. `beforeCreate`
3. _執行新建操作_
4. `afterCreate`
5. `afterSave`

**更新文件時**：

1. `beforeSave`
2. `beforeUpdate`
3. _執行更新操作_
4. `afterUpdate`
5. `afterSave`

**刪除文件時**：

1. `beforeDelete`
2. _執行刪除操作_
3. `afterDelete`

### Dirty Tracking（變更追蹤）

```typescript
const user = await User.find("user-1")

// 檢查是否有任何變更
console.log(user.$isDirty()) // false

// 修改欄位
user.name = "New Name"

// 檢查是否有變更
console.log(user.$isDirty()) // true
console.log(user.$isDirty("name")) // true
console.log(user.$isDirty("email")) // false

// 取得所有變更的欄位
console.log(user.$dirtyFields()) // ['name']

// 儲存後 dirty 狀態重置
await user.save()
console.log(user.$isDirty()) // false
```

## 進階功能

### 自訂時間戳

```typescript
class User extends Model {
  name!: string
  email!: string

  // 關閉自動時間戳
  static options = {
    timestamps: false,
  }
}
```

### 序列化

```typescript
const user = await User.find("user-id")

// 轉換為 JSON 物件
const json = user?.toJSON()
console.log(json)
// { id: 'user-id', name: 'John', email: 'john@example.com', createdAt: Date, updatedAt: Date }
```

### 取得 Firebase 實例（進階使用）

```typescript
import { db, auth } from "firebase-lucid"

// 取得 Firestore 實例
const firestore = db.getFirestore()

// 取得 Firebase App 實例
const app = db.getApp()

// 取得 Firebase Auth 實例
const firebaseAuth = auth.getAuth()
```

## 完整範例

### 部落格應用

```typescript
// 定義 Models
class User extends Model {
  name!: string
  email!: string
  avatar?: string
  static collectionName = "users"
}

class Post extends Model {
  title!: string
  content!: string
  authorId!: string
  status!: "draft" | "published"
  viewCount!: number
  tags!: string[]
  static collectionName = "posts"
}

class Comment extends Model {
  postId!: string
  userId!: string
  content!: string
  static collectionName = "comments"
}

// 使用範例
async function blogExample() {
  // 建立作者
  const author = await User.create({
    name: "John Doe",
    email: "john@example.com",
  })

  // 建立文章
  const post = await Post.create({
    title: "Getting Started with Lucid Firebase",
    content: "This is a comprehensive guide...",
    authorId: author.id!,
    status: "published",
    viewCount: 0,
    tags: ["firebase", "typescript"],
  })

  // 查詢已發布文章
  const publishedPosts = await Post.query().where("status", "==", "published").orderBy("createdAt", "desc").limit(10).get()

  // 查詢包含特定標籤的文章
  const typescriptPosts = await Post.query().whereArrayContains("tags", "typescript").get()

  // 建立評論
  const comment = await Comment.create({
    postId: post.id!,
    userId: author.id!,
    content: "Great article!",
  })

  // 更新瀏覽量
  post.viewCount += 1
  await post.save()

  // 批量操作範例：發布所有草稿文章
  const publishResult = await Post.query().where("status", "==", "draft").where("authorId", "==", author.id!).update({ status: "published" })
  console.log(`Published ${publishResult.count} posts`)

  // 批量刪除舊評論（超過 30 天）
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const deleteResult = await Comment.query().where("createdAt", "<", thirtyDaysAgo).delete()
  console.log(`Deleted ${deleteResult.count} old comments`)
}
```

### 批量操作範例

```typescript
// 定時任務：清理系統資料
async function cleanupTask() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // 1. 清理過期日誌（使用並行模式加快速度）
  const logResult = await Log.query().where("createdAt", "<", thirtyDaysAgo).delete({ parallel: true })
  console.log(`Cleaned ${logResult.count} old logs`)

  // 2. 歸檔舊文章
  const archiveResult = await Post.query().where("status", "==", "published").where("updatedAt", "<", thirtyDaysAgo).update({ archived: true })
  console.log(`Archived ${archiveResult.count} posts`)

  // 3. 標記非活躍用戶
  const inactiveResult = await User.query().where("lastLoginAt", "<", thirtyDaysAgo).update({ status: "inactive" })
  console.log(`Marked ${inactiveResult.count} users as inactive`)
}

// 管理功能：批量操作用戶
async function moderationTask(spamUserIds: string[]) {
  // 批量封禁垃圾用戶
  const banResult = await User.query().whereIn("id", spamUserIds).update({ status: "banned", bannedAt: new Date() })

  // 刪除這些用戶的所有評論
  const commentResult = await Comment.query().whereIn("userId", spamUserIds).delete()

  console.log(`Banned ${banResult.count} users, deleted ${commentResult.count} comments`)
}
```

## 型別定義

套件包含完整的 TypeScript 型別定義：

```typescript
import type {
  // Model 相關
  ModelData,
  ModelOptions,

  // 批量操作
  BatchOptions,
  BatchResult,

  // 認證相關
  LoginCredentials,
  RegisterData,

  // 關聯相關
  HasManyConfig,
  BelongsToConfig,
  ManyToManyConfig,
  RelationNames,
  InferRelations,
  ModelWithRelations,

  // Firebase 型別
  FirebaseUser,
  FirebaseAuth,
  Firestore,
  DocumentData,
  Timestamp,
} from "firebase-lucid"
```

### 進階型別使用

```typescript
// 為 Model 推斷關聯型別
import type { InferRelations } from "firebase-lucid"

class User extends Model {
  @hasMany(() => Post, { type: "foreignKey", foreignKey: "userId" })
  declare posts: Post[]
}

// 推斷出的關聯型別
type UserRelations = InferRelations<typeof User>
// { posts: Post[] }

// 帶有關聯的 Model 型別
type UserWithRelations = User & UserRelations
```

## 常見問題

### Q: 如何取得 Firebase 配置？

前往 [Firebase Console](https://console.firebase.google.com/)，選擇你的專案，點擊「專案設定」，在「一般」分頁中找到「Firebase SDK snippet」，選擇「設定」，複製配置值到 `.env` 檔案。

### Q: 支援哪些環境？

支援所有現代瀏覽器（透過 Vite 或其他建置工具）和 Node.js 環境。

### Q: 可以在 React Native 使用嗎？

可以，只要確保正確設定環境變數。

### Q: 如何處理錯誤？

使用 try-catch 包裹非同步操作：

```typescript
try {
  const user = await User.findOrFail("user-id")
} catch (error) {
  console.error("User not found:", error)
}
```

### Q: 時間戳如何處理？

預設自動管理 `createdAt` 和 `updatedAt`，會自動轉換為 JavaScript `Date` 物件。

### Q: 批量操作有什麼限制？

批量操作的重要限制和注意事項：

1. **不觸發 Model hooks** - 批量操作直接操作 Firestore，不經過 Model 實例
2. **Firebase 500 筆限制** - 每個 writeBatch 限制 500 筆，系統會自動分批處理
3. **非完全原子性** - 超過 500 筆會分成多個 batch，某個 batch 失敗不會回滾前面的
4. **記憶體消耗** - 需要先將所有符合條件的文件載入記憶體

**建議**：

- 關鍵業務操作使用 writeBatch 模式（預設）
- 大量非關鍵資料清理使用 parallel 模式
- 定期執行，避免一次處理過多資料

```typescript
// 好的做法：分批處理大量資料
async function cleanupOldData() {
  let hasMore = true
  let totalDeleted = 0

  while (hasMore) {
    // 每次處理 1000 筆
    const deletedCount = await Log.query().where("createdAt", "<", thirtyDaysAgo).limit(1000).delete({ parallel: true })

    totalDeleted += deletedCount
    hasMore = deletedCount === 1000

    // 避免過度操作，給資料庫一些時間
    if (hasMore) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  console.log(`Total deleted: ${totalDeleted}`)
}
```

### Q: 批量操作和 createMany() 有什麼不同？

| 功能     | update()/delete()                                  | createMany()        |
| -------- | -------------------------------------------------- | ------------------- |
| 使用場景 | 更新/刪除現有文件                                  | 建立新文件          |
| 預設模式 | writeBatch（原子性）                               | Promise.all（並行） |
| 條件篩選 | ✅ 支援 query 條件                                 | ❌ 不支援           |
| 返回值   | `update(): { count: number }` / `delete(): number` | `Model[]` 陣列      |
| 自動分批 | ✅ 自動處理 500 筆限制                             | ❌ 無限制           |

### Q: 什麼時候應該使用批量操作？

**適合使用批量操作的場景**：

- ✅ 定時資料清理（日誌、快取）
- ✅ 狀態批量同步（發布文章、啟用用戶）
- ✅ 資料歸檔（舊資料移至歷史）
- ✅ 管理功能（批量封禁、批量審核）

**不適合使用批量操作的場景**：

- ❌ 需要觸發 Model hooks 的操作
- ❌ 需要在更新前驗證每筆資料
- ❌ 需要根據每筆資料的狀態做不同處理
- ❌ 需要完全原子性保證（超過 500 筆時）

這些情況建議使用傳統的迴圈 + save() 方式：

```typescript
// 需要 hooks 和驗證時，使用傳統方式
const users = await User.query().where("status", "==", "pending").get()

for (const user of users) {
  // 可以觸發 hooks 和自訂邏輯
  user.status = "verified"
  user.verifiedAt = new Date()
  await user.save() // 會觸發 Model hooks
}
```

## 授權

MIT

## 貢獻

歡迎貢獻！請開 Issue 或 Pull Request。

## 致謝

靈感來自 [AdonisJS Lucid ORM](https://lucid.adonisjs.com/)。
