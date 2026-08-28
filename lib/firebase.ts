import { initializeApp, getApps, type FirebaseOptions } from 'firebase/app'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from 'firebase/firestore'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'

const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true'

const firebaseConfig: FirebaseOptions = useEmulator
  ? { apiKey: 'demo-api-key', projectId: 'demo-share-badget' }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    }

// Next.js は app/ 以下を一度サーバーでもレンダーするため、
// getApps() で二重初期化を防ぐ（App Router のホットリロード対策も兼ねる）
const app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig)

let emulatorsConnected = false

// このアプリのデータ型は「値が無い」を undefined で表す（例: warikan: undefined）。
// localStorage 時代は JSON.stringify が黙って undefined を落としてくれていたが、
// Firestore の SDK は undefined フィールドをデフォルトで拒否してエラーになるため、
// ignoreUndefinedProperties で localStorage 時代と同じ挙動に揃える。
function createFirestore(): Firestore {
  // サーバー側レンダー時は IndexedDB が無いのでメモリキャッシュにフォールバック
  if (typeof window === 'undefined') {
    try {
      return initializeFirestore(app, { ignoreUndefinedProperties: true })
    } catch {
      return getFirestore(app)
    }
  }
  if (useEmulator) {
    let instance: Firestore
    try {
      instance = initializeFirestore(app, { ignoreUndefinedProperties: true })
    } catch {
      instance = getFirestore(app)
    }
    if (!emulatorsConnected) connectFirestoreEmulator(instance, '127.0.0.1', 8080)
    return instance
  }
  try {
    // オフラインでもPWAとして開けるようIndexedDBキャッシュを有効化
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager({}) }),
    })
  } catch {
    // Fast Refresh 等で既に初期化済みの場合は既存インスタンスを使う
    return getFirestore(app)
  }
}

export const db = createFirestore()

// getAuth() は apiKey を即座に検証するため、.env.local が未設定のままだと
// Next.js のサーバー側プリレンダーでビルドごと落ちてしまう。
// Auth はどのみちクライアント側の useEffect でしか使わないので、
// サーバー側では失敗を握りつぶしたダミー値にしておく。
function createAuth(): Auth {
  try {
    return getAuth(app)
  } catch {
    return null as unknown as Auth
  }
}

export const auth = createAuth()

if (typeof window !== 'undefined' && useEmulator && !emulatorsConnected) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  emulatorsConnected = true
}
