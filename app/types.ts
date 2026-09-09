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

export interface Todo {
  id: string
  text: string
  done: boolean
  memo?: string
  dueDate?: string // YYYY-MM-DD（任意）
  createdBy?: string
  assignees?: string[] // 担当者（membersの表示名。0人=未設定、1人=個人、2人以上=全員 など）
}

export interface TodoTemplate {
  id: string
  name: string
  emoji: string
  tasks: string[]
}

export const TODO_TEMPLATES: TodoTemplate[] = [
  {
    id: 'moving',
    name: '引っ越し',
    emoji: '🏠',
    tasks: [
      '新居の物件探し',
      '新居の賃貸借契約',
      '現住居の解約通知（管理会社・大家へ連絡）',
      '引っ越し業者の見積もり依頼',
      '引っ越し業者の予約',
      '不用品の処分・粗大ゴミ回収予約',
      '荷造り（梱包資材の準備）',
      '電気の停止手続き',
      '電気の開始手続き',
      'ガスの停止手続き',
      'ガスの開始手続き（立ち会い予約）',
      '水道の停止手続き',
      '水道の開始手続き',
      'インターネット回線の移転・契約',
      '郵便物の転送届（郵便局）',
      '住民票の異動届',
      'マイナンバーカードの住所変更',
      '運転免許証の住所変更',
      '銀行・クレジットカードの住所変更',
      '各種保険の住所変更',
      '勤務先への住所変更届',
      '新居の家具・家電の購入',
      '近隣への挨拶',
      '旧居の掃除・退去立ち会い',
      '新居の掃除・害虫駆除',
    ],
  },
  {
    id: 'wedding',
    name: '結婚',
    emoji: '💍',
    tasks: [
      '両家への挨拶・顔合わせ',
      '婚約指輪・結婚指輪の準備',
      '結納・顔合わせ食事会',
      '入籍日を決める',
      '婚姻届の提出',
      '婚姻届の証人を依頼',
      '姓の変更手続き（銀行・免許証・パスポート等）',
      '結婚式場探し・見学',
      '結婚式の日取り決定',
      '招待客リストの作成',
      '招待状の準備・発送',
      '引き出物の準備',
      '新居探し・同居準備',
      '生命保険・医療保険の見直し',
      'ハネムーンの手配',
    ],
  },
  {
    id: 'baby',
    name: '出産・育児準備',
    emoji: '👶',
    tasks: [
      '産婦人科の検診・出産予定日の確認',
      '出産する病院・産院を決める',
      '母子手帳の交付',
      '里帰り出産の相談・調整',
      '出産育児一時金の手続き',
      '産休・育休の会社への申請',
      '入院準備（バッグの準備）',
      '陣痛タクシーの登録',
      'ベビー用品の購入（ベビーベッド・チャイルドシートなど）',
      '名前を考える',
      '出生届の準備',
      '健康保険の加入手続き',
      '児童手当の申請',
      '予防接種のスケジュール確認',
      '保育園・幼稚園の情報収集',
    ],
  },
  {
    id: 'travel',
    name: '旅行の準備',
    emoji: '✈️',
    tasks: [
      '行き先・日程を決める',
      '予算を決める',
      '航空券・新幹線などの移動手段を予約',
      'ホテル・宿泊先を予約',
      '現地の交通手段（レンタカー・送迎など）を予約',
      'パスポート・ビザの確認',
      '海外旅行保険の加入',
      '観光スポット・レストランのリサーチ',
      '持ち物リストの作成・荷造り',
      '両替・クレジットカードの準備',
      'Wi-Fi・SIMカードの手配',
      '留守中の対応（郵便物・ペット・植物など）',
    ],
  },
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
