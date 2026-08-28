import type { WarikanSplitMethod } from '../app/types'

// 割り勘のデフォルト設定。ルームのデータではなく端末（ユーザー）ごとのローカル設定として保存する
export interface WarikanDefaults {
  defaultOn: boolean // 支出・収入の入力時に割り勘トグルを最初からONにする
  splitMethod: WarikanSplitMethod
}

const STORAGE_KEY = 'share-badget-warikan-defaults'

export const DEFAULT_WARIKAN_DEFAULTS: WarikanDefaults = {
  defaultOn: false,
  splitMethod: 'equal',
}

export function getWarikanDefaults(): WarikanDefaults {
  if (typeof window === 'undefined') return DEFAULT_WARIKAN_DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_WARIKAN_DEFAULTS
    return { ...DEFAULT_WARIKAN_DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_WARIKAN_DEFAULTS
  }
}

export function setWarikanDefaults(defaults: WarikanDefaults) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
}
