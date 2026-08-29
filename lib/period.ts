// 精算日（1〜28）を基準にした集計期間を計算する。
// 精算日が1（デフォルト）の場合は通常のカレンダー月と同じ。
// それ以外は「(精算日+1)日 前月 〜 精算日 当月」を1つの期間として扱う
// （例: 精算日=25 の「3月」は 2/26〜3/25）
export interface PeriodRange {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
}

export function getPeriodRange(year: number, month: number, settlementDay: number): PeriodRange {
  const pad = (n: number) => String(n).padStart(2, '0')
  if (settlementDay <= 1) {
    const lastDay = new Date(year, month + 1, 0).getDate()
    return {
      start: `${year}-${pad(month + 1)}-01`,
      end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
    }
  }
  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth < 0) { prevMonth = 11; prevYear -= 1 }
  return {
    start: `${prevYear}-${pad(prevMonth + 1)}-${pad(settlementDay + 1)}`,
    end: `${year}-${pad(month + 1)}-${pad(settlementDay)}`,
  }
}

export function isInPeriod(dateStr: string, range: PeriodRange): boolean {
  return dateStr >= range.start && dateStr <= range.end
}
