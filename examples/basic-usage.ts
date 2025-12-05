import { db, Model, auth } from 'firebase-lucid'

// ========================================
// 1. 初始化 Firebase（從應用層注入配置）
// ========================================
const config = {
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  authDomain: 'your-auth-domain',
  storageBucket: 'your-storage-bucket',
  messagingSenderId: 'your-sender-id',
  appId: 'your-app-id'
}
db.initialize(config)

// ========================================
// 2. 定義 Model - Lucid 風格
// ========================================

// 用戶 Model
class User extends Model {
  name!: string
  email!: string
  age?: number
  status!: 'active' | 'inactive'

  // 指定 collection 名稱（可選，預設使用 'users'）
  static collectionName = 'users'

  // 自動管理時間戳（預設為 true）
  static options = {
    timestamps: true
  }
}

// 文章 Model
class Post extends Model {
  title!: string
  content!: string
  authorId!: string
  status!: 'draft' | 'published'
  viewCount!: number
  tags!: string[]

  static collectionName = 'posts'
}

// ========================================
// 3. CRUD 操作 - Lucid 風格
// ========================================

async function crudExamples() {
  // 建立
  const user = await User.create({
    name: 'John Doe',
    email: 'john@example.com',
    age: 25,
    status: 'active'
  })
  console.log('Created user:', user.id)

  // 查詢單筆
  const foundUser = await User.find(user.id!)
  console.log('Found user:', foundUser?.name)

  // 查詢單筆（找不到拋錯）
  try {
    const user2 = await User.findOrFail('non-existent-id')
  } catch (error) {
    console.log('User not found')
  }

  // 更新
  if (foundUser) {
    foundUser.merge({ age: 26 })
    await foundUser.save()
    console.log('Updated user age to:', foundUser.age)
  }

  // 刪除
  // await foundUser?.delete()

  // 批次建立
  const users = await User.createMany([
    { name: 'Alice', email: 'alice@example.com', age: 28, status: 'active' },
    { name: 'Bob', email: 'bob@example.com', age: 30, status: 'inactive' }
  ])
  console.log('Created', users.length, 'users')
}

// ========================================
// 4. 查詢建構器 - Lucid 風格
// ========================================

async function queryExamples() {
  // 簡單查詢
  const activeUsers = await User.query()
    .where('status', '==', 'active')
    .get()
  console.log('Active users:', activeUsers.length)

  // 複雜查詢
  const adults = await User.query()
    .where('age', '>=', 18)
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get()

  // 查詢第一筆
  const firstUser = await User.query()
    .where('email', '==', 'john@example.com')
    .first()

  if (firstUser) {
    console.log('Found user:', firstUser.name)
  }

  // 查詢第一筆（找不到拋錯）
  try {
    const user = await User.query()
      .where('email', '==', 'nonexistent@example.com')
      .firstOrFail()
  } catch (error) {
    console.log('No user found with that email')
  }

  // 簡化的查詢方法
  const youngUsers = await User.query()
    .whereLessThan('age', 25)
    .get()

  const specificUsers = await User.query()
    .whereIn('status', ['active', 'pending'])
    .get()

  // 檢查是否存在
  const exists = await User.query()
    .where('email', '==', 'john@example.com')
    .exists()
  console.log('User exists:', exists)

  // 計數
  const count = await User.query()
    .where('status', '==', 'active')
    .count()
  console.log('Active user count:', count)

  // 查詢全部
  const allUsers = await User.all()
  console.log('Total users:', allUsers.length)
}

// ========================================
// 5. 文章範例（進階查詢）
// ========================================

async function postExamples() {
  // 建立文章
  const post = await Post.create({
    title: 'Getting Started with Lucid Firebase',
    content: 'This is a comprehensive guide...',
    authorId: 'user-id-123',
    status: 'published',
    viewCount: 0,
    tags: ['firebase', 'typescript', 'tutorial']
  })

  // 查詢已發布且瀏覽量大於 100 的文章
  const popularPosts = await Post.query()
    .where('status', '==', 'published')
    .where('viewCount', '>', 100)
    .orderBy('viewCount', 'desc')
    .limit(20)
    .get()

  // 查詢包含特定標籤的文章
  const typescriptPosts = await Post.query()
    .whereArrayContains('tags', 'typescript')
    .get()

  // 查詢包含多個標籤之一的文章
  const techPosts = await Post.query()
    .whereArrayContainsAny('tags', ['javascript', 'typescript', 'firebase'])
    .get()

  // 更新瀏覽量
  if (post) {
    post.viewCount += 1
    await post.save()
  }

  // 重新載入資料
  await post?.refresh()
  console.log('Updated view count:', post?.viewCount)
}

// ========================================
// 6. 認證範例
// ========================================

async function authExamples() {
  try {
    // 註冊新用戶
    const newUser = await auth.register({
      email: 'newuser@example.com',
      password: 'securePassword123',
      displayName: 'New User'
    })
    console.log('Registered user:', newUser.uid)

    // 登出
    await auth.logout()

    // Email/Password 登入
    const user = await auth.login({
      email: 'user@example.com',
      password: 'password123'
    })
    console.log('Logged in user:', user.email)

    // 檢查登入狀態
    if (auth.check()) {
      const currentUser = auth.user()
      console.log('Current user:', currentUser?.email)
    }

    // Google 登入（僅瀏覽器環境）
    // const googleUser = await auth.loginWithGoogle()
    // console.log('Google user:', googleUser.email)

    // 更新個人資料
    await auth.updateProfile({
      displayName: 'Updated Name'
    })

    // 發送密碼重設郵件
    // await auth.sendPasswordResetEmail('user@example.com')

    // 發送驗證郵件
    // await auth.sendEmailVerification()

    // 監聽認證狀態變化
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('User logged in:', user.email)
      } else {
        console.log('User logged out')
      }
    })

    // 等待認證就緒
    const readyUser = await auth.ready()
    console.log('Auth ready, user:', readyUser?.email)

    // 取消監聽
    // unsubscribe()

    // 登出
    await auth.logout()
  } catch (error) {
    console.error('Auth error:', error)
  }
}

// ========================================
// 7. 執行範例
// ========================================

async function main() {
  console.log('========== CRUD Examples ==========')
  await crudExamples()

  console.log('\n========== Query Examples ==========')
  await queryExamples()

  console.log('\n========== Post Examples ==========')
  await postExamples()

  console.log('\n========== Auth Examples ==========')
  await authExamples()

  console.log('\n========== All Done! ==========')
}

// 執行範例（需要 Firebase 配置）
// main().catch(console.error)
