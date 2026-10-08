// 精算日(1〜31)を基準にした集計期間を計算する。
// 「(精算日+1)日 前月 〜 精算日 当月」を1つの期間として扱う(例: 精算日=25 の「3月」は 2/26〜3/25)。
// 精算日がその月の実際の日数を超える場合(31日を選んでいて2月など)は、その月の末日に丸める。
// デフォルトの31日は常に丸められるため、結果的に「毎月1日〜末日」のカレンダー通りの区切りになる。
export interface PeriodRange {
  start: string // YYYY-MM-DD
  end: string // YYYY-MM-DD
}

const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate() // monthは0始まり

export function getPeriodRange(year: number, month: number, settlementDay: number): PeriodRange {
  const pad = (n: number) => String(n).padStart(2, '0')

  const endDay = Math.min(settlementDay, daysInMonth(year, month))
  const end = `${year}-${pad(month + 1)}-${pad(endDay)}`

  let prevYear = year
  let prevMonth = month - 1
  if (prevMonth < 0) { prevMonth = 11; prevYear -= 1 }
  const prevEndDay = Math.min(settlementDay, daysInMonth(prevYear, prevMonth))

  let startYear = prevYear
  let startMonth = prevMonth
  let startDay = prevEndDay + 1
  if (startDay > daysInMonth(prevYear, prevMonth)) {
    startYear = year
    startMonth = month
    startDay = 1
  }
  const start = `${startYear}-${pad(startMonth + 1)}-${pad(startDay)}`

  return { start, end }
}

export function isInPeriod(dateStr: string, range: PeriodRange): boolean {
  return dateStr >= range.start && dateStr <= range.end
}

// 日付がどの「年月」の集計期間に属するかを "YYYY-MM" 形式で返す(getPeriodRange の逆引き)
export function getPeriodKey(dateStr: string, settlementDay: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const pad = (n: number) => String(n).padStart(2, '0')
  const effectiveSettlementDay = Math.min(settlementDay, daysInMonth(y, m - 1))
  if (d <= effectiveSettlementDay) {
    return `${y}-${pad(m)}`
  }
  let ny = y
  let nm = m + 1
  if (nm > 12) { nm = 1; ny += 1 }
  return `${ny}-${pad(nm)}`
}
