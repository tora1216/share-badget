'use client'

import { useState } from 'react'
import type { Entry } from '../types'
import { DEFAULT_FIXED_CATEGORIES } from '../types'
import { isFixedCostEntry } from '../../lib/fixedCost'

interface Props {
  entries: Entry[]
  onOpenEntry: (entry: Entry) => void
  onAddNew: (dateStr: string) => void
  onCopyToMonth: (sourceEntries: Entry[], year: number, month: number) => void
}

export default function ManagePage({ entries, onOpenEntry, onAddNew, onCopyToMonth }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [actionSheetOpen, setActionSheetOpen] = useState(false)
  const [copyDialogOpen, setCopyDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const findCategory = (id: string) => DEFAULT_FIXED_CATEGORIES.find(c => c.id === id)

  const monthEntries = entries
    .filter(e => isFixedCostEntry(e) && e.type === 'expense' && e.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalExpense = monthEntries.reduce((s, e) => s + e.amount, 0)

  // 各繰り返し(fixedCostId)でもっとも新しい支出をコピー元の候補にする。表示中の月に既にあるものは除く
  const monthSeriesIds = new Set(monthEntries.map(e => e.fixedCostId))
  const latestBySeriesId = new Map<string, Entry>()
  for (const e of entries) {
    if (!isFixedCostEntry(e) || e.type !== 'expense') continue
    const current = latestBySeriesId.get(e.fixedCostId!)
    if (!current || e.date > current.date) latestBySeriesId.set(e.fixedCostId!, e)
  }
  const copyCandidates = Array.from(latestBySeriesId.values())
    .filter(e => !monthSeriesIds.has(e.fixedCostId) && e.date < `${monthPrefix}-01`)
    .sort((a, b) => b.date.localeCompare(a.date))

  const openCopyDialog = () => {
    setActionSheetOpen(false)
    setSelectedIds(copyCandidates.map(e => e.id))
    setCopyDialogOpen(true)
  }

  const handleAddNew = () => {
    setActionSheetOpen(false)
    onAddNew(`${monthPrefix}-01`)
  }

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]))
  }

  const confirmCopy = () => {
    const selected = copyCandidates.filter(e => selectedIds.includes(e.id))
    onCopyToMonth(selected, year, month)
    setCopyDialogOpen(false)
  }

  return (
    <div className="flex flex-col">
      {/* 月切替 */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800 shadow-sm">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
          >
            ‹
          </button>
          <span className="font-semibold text-gray-800 dark:text-gray-100">{year}年{month + 1}月</span>
          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
          >
            ›
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="px-4 pt-2 pb-2">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">この月の固定費</p>
          <p className="text-base font-bold text-red-500">¥{totalExpense.toLocaleString()}</p>
        </div>
      </div>

      {/* リスト */}
      <div className="px-4 pt-2 pb-4">
        {monthEntries.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400 dark:text-gray-600">
            <span className="text-4xl mb-2">📋</span>
            <p className="text-sm">この月の固定費がありません</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
            {monthEntries.map(entry => {
              const cat = findCategory(entry.categoryId)
              return (
                <button
                  key={entry.id}
                  onClick={() => onOpenEntry(entry)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left"
                >
                  <span className="text-xl flex-shrink-0">{cat?.emoji ?? '📌'}</span>
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {cat?.name ?? '未分類'}
                    {entry.memo && <span className="text-gray-400 dark:text-gray-500 font-normal"> ({entry.memo})</span>}
                    {entry.warikan && entry.paidBy && (
                      <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                        {entry.paidBy}
                      </span>
                    )}
                  </span>
                  <span className="text-base font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">
                    {entry.amount.toLocaleString()}円
                  </span>
                  <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">›</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setActionSheetOpen(true)}
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light transition-colors z-10"
        aria-label="固定費を追加"
      >
        +
      </button>

      {/* 追加方法を選ぶアクションシート */}
      {actionSheetOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
          onClick={e => { if (e.target === e.currentTarget) setActionSheetOpen(false) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">{year}年{month + 1}月に固定費を追加</p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleAddNew}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
              >
                <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 text-xl">✎</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">新規作成</span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500">金額やカテゴリを入力して追加</span>
                </span>
              </button>
              <button
                type="button"
                onClick={openCopyDialog}
                disabled={copyCandidates.length === 0}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <span className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 text-xl">📋</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-100">コピーして追加</span>
                  <span className="block text-xs text-gray-400 dark:text-gray-500">
                    {copyCandidates.length > 0 ? `${copyCandidates.length}件の候補から選んで複製` : '候補がありません'}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* コピーダイアログ */}
      {copyDialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
          onClick={e => { if (e.target === e.currentTarget) setCopyDialogOpen(false) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">{year}年{month + 1}月にコピーする固定費を選択</p>

            <div className="space-y-2 mb-6">
              {copyCandidates.map(e => {
                const cat = findCategory(e.categoryId)
                const checked = selectedIds.includes(e.id)
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => toggleSelected(e.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                      checked
                        ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <span className={`w-5 h-5 flex-shrink-0 rounded-md border flex items-center justify-center text-xs ${
                      checked
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-gray-300 dark:border-gray-600 text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className="text-xl flex-shrink-0">{cat?.emoji ?? '📌'}</span>
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {cat?.name ?? '未分類'}
                      {e.memo && <span className="text-gray-400 dark:text-gray-500 font-normal"> ({e.memo})</span>}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex-shrink-0">
                      {e.amount.toLocaleString()}円
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCopyDialogOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmCopy}
                disabled={selectedIds.length === 0}
                className="flex-1 py-3 rounded-xl font-medium text-sm transition-colors text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400"
              >
                追加({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
