import type { Entry } from '../app/types'

// 固定費としてマークされた支出かどうか(fixedCostIdは繰り返しのまとまりを表すidとして使う)
export function isFixedCostEntry(entry: Entry): boolean {
  return Boolean(entry.fixedCostId)
}
