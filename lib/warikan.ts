// 合計をできるだけ均等に整数円で配る
export function splitEqual(total: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(total / n)
  const remainder = total - base * n
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0))
}

// 比率に応じて整数円で配分し、端数は端数の大きい人から順に上乗せする
export function splitByRatio(total: number, ratios: number[]): number[] {
  const sum = ratios.reduce((a, b) => a + b, 0)
  if (sum <= 0) return ratios.map(() => 0)
  const raw = ratios.map(r => (total * r) / sum)
  const floors = raw.map(Math.floor)
  const remainder = total - floors.reduce((a, b) => a + b, 0)
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac)
  const result = [...floors]
  for (let k = 0; k < remainder; k++) result[order[k % order.length].i] += 1
  return result
}

export interface WarikanEntryLike {
  amount: number
  paidBy?: string
  warikanSplits?: Record<string, number>
}

export interface SettlementTransfer {
  from: string
  to: string
  amount: number
}

// 未精算の割り勘エントリから、誰が誰にいくら払えばよいかを最小送金数で計算する
export function computeSettlementSummary(entries: WarikanEntryLike[]): SettlementTransfer[] {
  const balance: Record<string, number> = {}
  const add = (name: string, delta: number) => {
    balance[name] = (balance[name] ?? 0) + delta
  }

  for (const entry of entries) {
    if (!entry.paidBy || !entry.warikanSplits) continue
    add(entry.paidBy, entry.amount)
    for (const [member, share] of Object.entries(entry.warikanSplits)) {
      add(member, -share)
    }
  }

  const creditors = Object.entries(balance)
    .filter(([, v]) => v > 0)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
  const debtors = Object.entries(balance)
    .filter(([, v]) => v < 0)
    .map(([name, amount]) => ({ name, amount: -amount }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: SettlementTransfer[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(debtor.amount, creditor.amount)
    if (amount > 0) {
      transfers.push({ from: debtor.name, to: creditor.name, amount })
    }
    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0) i++
    if (creditor.amount === 0) j++
  }
  return transfers
}
