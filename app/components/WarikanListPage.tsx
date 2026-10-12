'use client'

import { useState } from 'react'
import type { Entry, Category, Settlement } from '../types'
import { DEFAULT_FIXED_CATEGORIES } from '../types'
import { computeSettlementSummary } from '../../lib/warikan'
import { getPeriodRange, isInPeriod } from '../../lib/period'

interface Props {
  entries: Entry[]
  categories: Category[]
  settlementDay: number
  settlements: Settlement[]
  members: string[]
  onToggleSettled: (id: string) => void
  onSettlePeriod: (start: string, end: string, periodKey: string) => void
  onOpenEntry: (entry: Entry) => void
  onUpdateSettlement: (id: string, fields: Pick<Settlement, 'date' | 'from' | 'to' | 'amount'>) => void
  onDeleteSettlement: (id: string) => void
}

export default function WarikanListPage({ entries, categories, settlementDay, settlements, members, onToggleSettled, onSettlePeriod, onOpenEntry, onUpdateSettlement, onDeleteSettlement }: Props) {
  // 固定費から生成された支出は固定費専用のカテゴリ(f1〜f6)を使うため、通常のカテゴリ一覧と合わせて探す
  const findCategory = (categoryId: string) =>
    categories.find(c => c.id === categoryId) ?? DEFAULT_FIXED_CATEGORIES.find(c => c.id === categoryId)

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(null)
  const [editDate, setEditDate] = useState('')
  const [editFrom, setEditFrom] = useState('')
  const [editTo, setEditTo] = useState('')
  const [editAmount, setEditAmount] = useState('')

  const period = getPeriodRange(year, month, settlementDay)
  const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
  }

  const periodEntries = entries
    .filter(e => e.warikan && isInPeriod(e.date, period))
    .sort((a, b) => b.date.localeCompare(a.date))

  const settled = periodEntries.filter(e => e.warikanSettled)
  const unsettled = periodEntries.filter(e => !e.warikanSettled)
  const unsettledTotal = unsettled.reduce((s, e) => s + e.amount, 0)
  const transfers = computeSettlementSummary(unsettled)
  // 一度精算した月に、後から未精算の支出が追加された場合に目立たせる
  const isAddOn = settled.length > 0 && unsettled.length > 0

  const periodSettlements = settlements
    .filter(s => s.periodKey === periodKey)
    .sort((a, b) => b.date.localeCompare(a.date))

  const handleSettle = () => {
    if (unsettled.length === 0) return
    if (!confirm(`${year}年${month + 1}月分の未精算(¥${unsettledTotal.toLocaleString()})を精算済みにしますか？`)) return
    onSettlePeriod(period.start, period.end, periodKey)
  }

  const openEditSettlement = (s: Settlement) => {
    setEditingSettlement(s)
    setEditDate(s.date)
    setEditFrom(s.from)
    setEditTo(s.to)
    setEditAmount(String(s.amount))
  }

  const saveEditSettlement = () => {
    if (!editingSettlement) return
    const amount = Number(editAmount)
    if (!editDate || !editFrom || !editTo || !amount || amount <= 0) return
    onUpdateSettlement(editingSettlement.id, { date: editDate, from: editFrom, to: editTo, amount })
    setEditingSettlement(null)
  }

  const deleteEditSettlement = () => {
    if (!editingSettlement) return
    if (!confirm('この精算履歴を削除しますか？(対象の支出の精算済み状態はそのままです)')) return
    onDeleteSettlement(editingSettlement.id)
    setEditingSettlement(null)
  }

  const renderRow = (entry: Entry) => {
    const cat = findCategory(entry.categoryId)
    const [, m, d] = entry.date.split('-').map(Number)
    return (
      <div
        key={entry.id}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <button onClick={() => onOpenEntry(entry)} className="flex items-start gap-3 flex-1 min-w-0 text-left">
          <span className="text-xl flex-shrink-0">{cat?.emoji ?? '📌'}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {cat?.name ?? '未分類'}
              {entry.memo && <span className="text-gray-400 dark:text-gray-500 font-normal"> ({entry.memo})</span>}
            </span>
            <span className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{m}/{d}</span>
              {entry.paidBy && (
                <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md truncate">
                  {entry.paidBy}
                </span>
              )}
            </span>
          </span>
        </button>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
            {entry.amount.toLocaleString()}円
          </span>
          <button
            onClick={() => {
              if (!entry.warikanSettled && !confirm('精算済みにしますか？')) return
              onToggleSettled(entry.id)
            }}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
              entry.warikanSettled
                ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/60'
                : 'bg-orange-100 dark:bg-orange-900/40 text-orange-500 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/60'
            }`}
            aria-label={entry.warikanSettled ? '精算済み(タップで未精算に戻す)' : '未精算(タップで精算済みにする)'}
          >
            {entry.warikanSettled ? '✓' : '!'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
      {/* 月切替 */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl px-4 py-3 border border-gray-100 dark:border-gray-800 shadow-sm">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ‹
        </button>
        <div className="text-center">
          <span className="font-semibold text-gray-800 dark:text-gray-100">{year}年{month + 1}月分</span>
          {settlementDay !== 31 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{period.start.replaceAll('-', '/')} 〜 {period.end.replaceAll('-', '/')}</p>
          )}
        </div>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ›
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">未精算の合計</p>
          <p className="text-xl font-bold text-orange-500">¥{unsettledTotal.toLocaleString()}</p>
        </div>
        <span className="text-3xl">💸</span>
      </div>

      {unsettled.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">精算サマリー(タップで精算済みにする)</p>
          {transfers.length > 0 ? (
            <div className="space-y-2">
              {transfers.map((t, i) => (
                <button
                  key={i}
                  onClick={handleSettle}
                  className="w-full flex items-center gap-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3 py-2.5 transition-colors text-left"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{t.from}</span>
                  <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">→</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{t.to}</span>
                  <span className="ml-auto text-sm font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">
                    ¥{t.amount.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={handleSettle}
              className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors"
            >
              未精算(¥{unsettledTotal.toLocaleString()})を精算済みにする
            </button>
          )}
        </div>
      ) : periodEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">🎉</span>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">精算完了！この月の未精算の支出はありません</p>
        </div>
      )}

      {periodSettlements.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">精算履歴</p>
          <div className="space-y-2">
            {periodSettlements.map(s => {
              const [, m, d] = s.date.split('-').map(Number)
              return (
                <button
                  key={s.id}
                  onClick={() => openEditSettlement(s)}
                  className="w-full flex items-center gap-2 text-sm px-2 py-1.5 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{m}/{d}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{s.from}</span>
                  <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">→</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200 truncate">{s.to}</span>
                  <span className="ml-auto font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">¥{s.amount.toLocaleString()}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {periodEntries.length > 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          {settled.length > 0 && (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {settled.map(renderRow)}
            </div>
          )}

          {unsettled.length > 0 && (
            <div className={isAddOn ? 'bg-orange-50/60 dark:bg-orange-950/20 border-t border-orange-100 dark:border-orange-900/40' : ''}>
              <div className="px-4 py-2">
                <span className={`text-xs font-semibold ${isAddOn ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {isAddOn ? '追加分(精算後に追加)' : '未精算'}
                </span>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {unsettled.map(renderRow)}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center py-10 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-2">💸</span>
          <p className="text-sm">この月は割り勘した支出がありません</p>
        </div>
      )}

      {/* 精算履歴の編集ダイアログ */}
      {editingSettlement && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
          onClick={e => { if (e.target === e.currentTarget) setEditingSettlement(null) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">精算履歴を編集</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 w-16 flex-shrink-0">日付</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 w-16 flex-shrink-0">金額</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editAmount}
                  onChange={e => setEditAmount(e.target.value)}
                  className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">払った人(from)</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditFrom(m)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                        editFrom === m
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">受け取った人(to)</label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditTo(m)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                        editTo === m
                          ? 'border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-500 text-green-600 dark:text-green-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={deleteEditSettlement}
                className="py-3 px-4 rounded-xl text-red-500 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                削除
              </button>
              <div className="flex-1 flex gap-3">
                <button
                  onClick={() => setEditingSettlement(null)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveEditSettlement}
                  disabled={!editDate || !editFrom || !editTo || !editAmount || Number(editAmount) <= 0}
                  className="flex-1 py-3 rounded-xl font-medium text-sm transition-colors text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
