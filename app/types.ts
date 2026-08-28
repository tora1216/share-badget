export interface Category {
  id: string
  name: string
  emoji: string
  type: 'expense' | 'income'
  monthlyBudget?: number // 支出カテゴリのみ使用（月あたりの予算額、円）
}

export type WarikanSplitMethod = 'equal' | 'ratio' | 'amount'

// ルーム参加メンバーの一覧表示用（uid で名寄せする）。displayName はニックネームで、
// 本名保護のためGoogleアカウントのメールアドレスは保存しない
export interface Participant {
  uid: string
  displayName: string
  photoURL?: string
}

export interface Entry {
  id: string
  date: string // YYYY-MM-DD
  amount: number
  memo: string
  categoryId: string
  type: 'expense' | 'income'
  warikan?: boolean
  paidBy?: string
  warikanParticipants?: string[]
  warikanSettled?: boolean
  warikanSplitMethod?: WarikanSplitMethod
  warikanSplits?: Record<string, number>
  createdBy?: string
  fixedCostId?: string // 固定費から毎月自動生成された支出の場合、元の固定費のid
}

export interface FixedCost {
  id: string
  amount: number
  type: 'expense' | 'income'
  categoryId: string
  memo?: string
  warikan?: boolean
  paidBy?: string
  warikanParticipants?: string[]
  warikanSplitMethod?: WarikanSplitMethod
  warikanSplits?: Record<string, number>
  createdBy?: string
}

export interface CalendarEvent {
  id: string
  date: string // YYYY-MM-DD（開始日）
  endDate: string // YYYY-MM-DD（終了日、単日の場合は date と同じ）
  title: string
  note?: string
  color: string // 帯の背景色（hex）
}

export const EVENT_COLORS: string[] = [
  '#2dd4bf', // teal
  '#22c55e', // green
  '#a16207', // brown
  '#eab308', // gold
  '#ec4899', // pink
  '#ef4444', // red
  '#3b82f6', // blue
  '#a855f7', // purple
]

export const DEFAULT_FIXED_CATEGORIES: Category[] = [
  { id: 'f1', name: '住居費',  emoji: '🏠', type: 'expense' },
  { id: 'f2', name: '水道代',  emoji: '💧', type: 'expense' },
  { id: 'f3', name: '光熱費',  emoji: '⚡', type: 'expense' },
  { id: 'f4', name: 'サブスク', emoji: '📺', type: 'expense' },
  { id: 'f5', name: '通信費',  emoji: '📶', type: 'expense' },
  { id: 'f6', name: 'その他',  emoji: '📦', type: 'expense' },
]

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'e1', name: '食費',   emoji: '🛒', type: 'expense' },
  { id: 'e2', name: '外食',   emoji: '🍽️', type: 'expense' },
  { id: 'e3', name: '交通費', emoji: '🚃', type: 'expense' },
  { id: 'e4', name: '光熱費', emoji: '💡', type: 'expense' },
  { id: 'e5', name: '日用品', emoji: '🧴', type: 'expense' },
  { id: 'e6', name: '娯楽',   emoji: '🎮', type: 'expense' },
  { id: 'e7', name: '医療',   emoji: '💊', type: 'expense' },
  { id: 'e8', name: '被服費', emoji: '👕', type: 'expense' },
  { id: 'e9', name: 'その他', emoji: '📦', type: 'expense' },
]
