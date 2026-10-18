import type { Entry } from '../app/types'
import { isFixedCostEntry } from './fixedCost'

// 候補の対象にする期間(直近半年)
const LOOKBACK_DAYS = 183

// 過去の支出のメモから入力候補を作る。同じカテゴリ・同じ固定費区分のものに絞り、
// 使った回数が多い順(同数なら最近使った順)に並べる。入力中の文字があればそれを含むものだけに絞り込む
export function getMemoSuggestions(
  entries: Entry[],
  { categoryId, fixedCost, query, excludeEntryId, limit = 5 }: {
    categoryId: string
    fixedCost: boolean
    query: string
    excludeEntryId?: string | null
    limit?: number
  },
): string[] {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const stats = new Map<string, { count: number; lastDate: string }>()
  for (const e of entries) {
    if (e.id === excludeEntryId || e.categoryId !== categoryId || isFixedCostEntry(e) !== fixedCost || e.date < since) continue
    const memo = e.memo.trim()
    if (!memo) continue
    const s = stats.get(memo)
    if (s) {
      s.count++
      if (e.date > s.lastDate) s.lastDate = e.date
    } else {
      stats.set(memo, { count: 1, lastDate: e.date })
    }
  }

  const q = query.trim().toLowerCase()
  return [...stats.entries()]
    .filter(([memo]) => !q || (memo.toLowerCase().includes(q) && memo.toLowerCase() !== q))
    .sort(([, a], [, b]) => b.count - a.count || b.lastDate.localeCompare(a.lastDate))
    .slice(0, limit)
    .map(([memo]) => memo)
}
