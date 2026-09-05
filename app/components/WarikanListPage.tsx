'use client'

import type { Entry, Category } from '../types'
import { computeSettlementSummary } from '../../lib/warikan'
import { getPeriodKey, getPeriodRange } from '../../lib/period'

interface Props {
  entries: Entry[]
  categories: Category[]
  settlementDay: number
  onToggleSettled: (id: string) => void
  onSettlePeriod: (start: string, end: string) => void
  onOpenEntry: (entry: Entry) => void
}

export default function WarikanListPage({ entries, categories, settlementDay, onToggleSettled, onSettlePeriod, onOpenEntry }: Props) {
  const warikanEntries = entries
    .filter(e => e.warikan)
    .sort((a, b) => b.date.localeCompare(a.date))

  const unsettled = warikanEntries.filter(e => !e.warikanSettled)
  const unsettledTotal = unsettled.reduce((s, e) => s + e.amount, 0)
  const transfers = computeSettlementSummary(unsettled)

  // 月（精算日基準の期間）ごとにグループ化。同じ月に精算済みと未精算が混ざる場合は
  // 未精算分を「追加分（精算後に追加）」として目立たせる
  const periodGroups = (() => {
    const map = new Map<string, Entry[]>()
    for (const e of warikanEntries) {
      const key = getPeriodKey(e.date, settlementDay)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, list]) => {
        const [y, m] = key.split('-').map(Number)
        const range = getPeriodRange(y, m - 1, settlementDay)
        return {
          key,
          label: `${y}年${m}月分`,
          range,
          settled: list.filter(e => e.warikanSettled),
          unsettled: list.filter(e => !e.warikanSettled),
        }
      })
  })()

  const renderRow = (entry: Entry) => {
    const cat = categories.find(c => c.id === entry.categoryId)
    const [, m, d] = entry.date.split('-').map(Number)
    return (
      <div
        key={entry.id}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <button onClick={() => onOpenEntry(entry)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <span className="text-xl flex-shrink-0">{cat?.emoji ?? '📌'}</span>
          <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
            {cat?.name ?? '未分類'}
            {entry.memo && <span className="text-gray-400 dark:text-gray-500 font-normal">　（{entry.memo}）</span>}
            <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500">{m}/{d}</span>
            {entry.paidBy && (
              <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                {entry.paidBy}
              </span>
            )}
          </span>
        </button>
        <span className="text-base font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">
          {entry.amount.toLocaleString()}円
        </span>
        <button
          onClick={() => onToggleSettled(entry.id)}
          className={`flex-shrink-0 text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors ${
            entry.warikanSettled
              ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60'
              : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/60'
          }`}
        >
          {entry.warikanSettled ? '精算済み' : '未精算'}
        </button>
      </div>
    )
  }

  const renderGroup = (group: (typeof periodGroups)[number]) => {
    const isAddOn = group.settled.length > 0 && group.unsettled.length > 0
    return (
      <div
        key={group.key}
        className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
      >
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 pt-4 pb-2">{group.label}</p>

        {group.settled.length > 0 && (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {group.settled.map(renderRow)}
          </div>
        )}

        {group.unsettled.length > 0 && (
          <div className={isAddOn ? 'bg-orange-50/60 dark:bg-orange-950/20 border-t border-orange-100 dark:border-orange-900/40' : ''}>
            <div className="flex items-center justify-between px-4 py-2">
              <span className={`text-xs font-semibold ${isAddOn ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {isAddOn ? '追加分（精算後に追加）' : '未精算'}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`${group.label}の${isAddOn ? '追加分' : '未精算分'}をまとめて精算済みにしますか？`)) {
                    onSettlePeriod(group.range.start, group.range.end)
                  }
                }}
                className="text-xs font-medium text-blue-500 hover:underline"
              >
                まとめて精算済みにする
              </button>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {group.unsettled.map(renderRow)}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">未精算の合計</p>
          <p className="text-xl font-bold text-orange-500">¥{unsettledTotal.toLocaleString()}</p>
        </div>
        <span className="text-3xl">💸</span>
      </div>

      {transfers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">精算サマリー（これだけ払えばOK）</p>
          <div className="space-y-2">
            {transfers.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{t.from}</span>
                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">→</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{t.to}</span>
                <span className="ml-auto text-sm font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">
                  ¥{t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {periodGroups.map(renderGroup)}

      {warikanEntries.length === 0 && (
        <div className="flex flex-col items-center py-10 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-2">💸</span>
          <p className="text-sm">割り勘した支出はまだありません</p>
        </div>
      )}
    </div>
  )
}
