'use client'

import { useState, useEffect } from 'react'
import type { FixedCost, WarikanSplitMethod } from '../types'
import { DEFAULT_FIXED_CATEGORIES } from '../types'
import { splitEqual, splitByRatio } from '../../lib/warikan'
import type { WarikanDefaults } from '../../lib/settings'

interface Props {
  fixedCosts: FixedCost[]
  onUpdate: (fixedCosts: FixedCost[]) => void
  members: string[]
  displayName: string
  warikanDefaults: WarikanDefaults
}

export default function ManagePage({ fixedCosts, onUpdate, members, displayName, warikanDefaults }: Props) {
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(DEFAULT_FIXED_CATEGORIES[0]?.id ?? '')
  const [memo, setMemo] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [warikan, setWarikan] = useState(() => warikanDefaults.defaultOn)
  const [paidBy, setPaidBy] = useState(() => (warikanDefaults.defaultOn ? displayName : ''))
  const [warikanParticipants, setWarikanParticipants] = useState<string[]>(() => (warikanDefaults.defaultOn ? members : []))
  const [warikanSplitMethod, setWarikanSplitMethod] = useState<WarikanSplitMethod>(warikanDefaults.splitMethod)
  const [warikanRatios, setWarikanRatios] = useState<Record<string, number>>({})
  const [warikanAmounts, setWarikanAmounts] = useState<Record<string, number>>({})

  // 割り勘方法・金額・参加メンバーの変更に応じてメンバー別の割り勘額を再計算
  useEffect(() => {
    if (!warikan) return
    if (warikanSplitMethod === 'amount') {
      setWarikanAmounts(prev => {
        const next: Record<string, number> = {}
        warikanParticipants.forEach(m => { next[m] = prev[m] ?? 0 })
        return next
      })
      return
    }
    const n = warikanParticipants.length
    if (n === 0) { setWarikanAmounts({}); return }
    const total = Number(amount) || 0
    const amounts = warikanSplitMethod === 'equal'
      ? splitEqual(total, n)
      : splitByRatio(total, warikanParticipants.map(m => warikanRatios[m] ?? 50))
    const next: Record<string, number> = {}
    warikanParticipants.forEach((m, i) => { next[m] = amounts[i] })
    setWarikanAmounts(next)
  }, [warikan, warikanSplitMethod, amount, warikanParticipants, warikanRatios])

  const resetWarikanDetails = () => {
    setWarikanParticipants(members)
    setWarikanSplitMethod(warikanDefaults.splitMethod)
    setWarikanRatios({})
    setWarikanAmounts({})
  }

  const findCategory = (id: string) => DEFAULT_FIXED_CATEGORIES.find(c => c.id === id)

  const filtered = fixedCosts.filter(f => f.type === 'expense')

  const totalExpense = filtered.reduce((s, f) => s + f.amount, 0)

  const startEdit = (item: FixedCost) => {
    setEditingId(item.id)
    setAmount(String(item.amount))
    setCategoryId(item.categoryId)
    setMemo(item.memo ?? '')
    setWarikan(item.warikan ?? false)
    setPaidBy(item.paidBy ?? '')
    setWarikanParticipants(item.warikanParticipants ?? members)
    setWarikanSplitMethod(item.warikanSplitMethod ?? 'equal')
    setWarikanRatios({})
    setWarikanAmounts(item.warikanSplits ?? {})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setAmount('')
    setMemo('')
    setCategoryId(DEFAULT_FIXED_CATEGORIES[0]?.id ?? '')
    setWarikan(warikanDefaults.defaultOn)
    setPaidBy(warikanDefaults.defaultOn ? displayName : '')
    resetWarikanDetails()
  }

  const saveFixedCost = () => {
    const warikanTotal = warikanParticipants.reduce((s, m) => s + (warikanAmounts[m] ?? 0), 0)
    const parsed = warikan ? warikanTotal : Number(amount)
    if (!parsed || isNaN(parsed) || parsed <= 0) return
    const warikanFields = warikan
      ? {
          warikan: true as const,
          paidBy,
          warikanParticipants,
          warikanSplitMethod,
          warikanSplits: Object.fromEntries(warikanParticipants.map(m => [m, warikanAmounts[m] ?? 0])),
        }
      : {
          warikan: undefined,
          paidBy: undefined,
          warikanParticipants: undefined,
          warikanSplitMethod: undefined,
          warikanSplits: undefined,
        }
    if (editingId) {
      onUpdate(fixedCosts.map(f =>
        f.id === editingId
          ? { ...f, amount: parsed, categoryId: categoryId || (DEFAULT_FIXED_CATEGORIES[0]?.id ?? ''), memo: memo.trim() || undefined, ...warikanFields }
          : f
      ))
      setEditingId(null)
    } else {
      onUpdate([...fixedCosts, { id: Date.now().toString(), amount: parsed, type: 'expense', categoryId: categoryId || (DEFAULT_FIXED_CATEGORIES[0]?.id ?? ''), memo: memo.trim() || undefined, createdBy: displayName, ...warikanFields }])
    }
    setAmount('')
    setMemo('')
    setWarikan(warikanDefaults.defaultOn)
    setPaidBy(warikanDefaults.defaultOn ? displayName : '')
    resetWarikanDetails()
  }

  const deleteFixedCost = (id: string) => {
    if (editingId === id) cancelEdit()
    onUpdate(fixedCosts.filter(f => f.id !== id))
  }

  return (
    <div className="flex flex-col">
      {/* サマリーカード */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">月額固定費</p>
          <p className="text-base font-bold text-red-500">¥{totalExpense.toLocaleString()}</p>
        </div>
      </div>

      {/* リスト */}
      <div className="px-4 pt-2 pb-72">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-gray-400 dark:text-gray-600">
            <span className="text-4xl mb-2">📋</span>
            <p className="text-sm">固定費がありません</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.map(item => {
              const cat = findCategory(item.categoryId)
              return (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-2xl flex-shrink-0">{cat?.emoji ?? '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{cat?.name ?? '未分類'}</span>
                      {item.memo && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">· {item.memo}</span>
                      )}
                      {item.warikan && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                          割り勘{item.paidBy ? ` · ${item.paidBy}` : ''}
                        </span>
                      )}
                      {item.createdBy && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">by {item.createdBy}</span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-red-500">
                      -¥{item.amount.toLocaleString()}
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(item)}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors"
                    aria-label="編集"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    onClick={() => deleteFixedCost(item.id)}
                    className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                    aria-label="削除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 追加フォーム（画面下固定） */}
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pt-3 pb-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 max-h-[75vh] overflow-y-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {editingId ? '固定費を編集' : '新しい固定費を追加'}
            </p>
            {editingId && (
              <button onClick={cancelEdit} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                キャンセル
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 w-16 flex-shrink-0">金額</label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="円"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveFixedCost() }}
              className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-300 w-16 flex-shrink-0">メモ</label>
            <input
              type="text"
              placeholder="例：家賃、サブスク...（任意）"
              value={memo}
              onChange={e => setMemo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveFixedCost() }}
              className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {DEFAULT_FIXED_CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-2 transition-colors ${
                  categoryId === c.id
                    ? 'border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-500'
                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-lg leading-none">{c.emoji}</span>
                <span className={`text-[10px] font-medium leading-tight text-center ${
                  categoryId === c.id ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'
                }`}>
                  {c.name}
                </span>
              </button>
            ))}
          </div>

          {/* 割り勘 */}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">割り勘</label>
              <button
                type="button"
                onClick={() => {
                  const next = !warikan
                  setWarikan(next)
                  resetWarikanDetails()
                  setPaidBy(next ? displayName : '')
                }}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  warikan ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                aria-label="割り勘トグル"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  warikan ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            {warikan && (
              <div className="mt-4 space-y-4">
                {/* 支払った人 */}
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">
                    支払った人（任意）
                  </label>
                  {warikanParticipants.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {warikanParticipants.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaidBy(prev => prev === m ? '' : m)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                            paidBy === m
                              ? 'border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-500 text-green-600 dark:text-green-400'
                              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">メンバーがいません。メニューから追加してください</p>
                  )}
                </div>

                {/* 割り勘方法 */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      割り勘方法
                    </label>
                    <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
                      {([
                        { key: 'equal', label: '均等' },
                        { key: 'ratio', label: '比率' },
                        { key: 'amount', label: '金額' },
                      ] as const).map(opt => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => setWarikanSplitMethod(opt.key)}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                            warikanSplitMethod === opt.key
                              ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {warikanParticipants.length > 0 ? (
                    <div className="space-y-2">
                      <div className="space-y-2">
                        {warikanParticipants.map(m => (
                          <div
                            key={m}
                            className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-0 truncate">{m}</span>
                              {warikanSplitMethod === 'ratio' && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={warikanRatios[m] ?? 50}
                                    onChange={e => setWarikanRatios(prev => ({ ...prev, [m]: Number(e.target.value) || 0 }))}
                                    className="w-14 border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 text-sm text-left bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                                </div>
                              )}
                            </div>
                            <div className="w-24 flex-shrink-0 text-right">
                              {warikanSplitMethod === 'amount' ? (
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  value={warikanAmounts[m] ?? 0}
                                  onChange={e => setWarikanAmounts(prev => ({ ...prev, [m]: Number(e.target.value) || 0 }))}
                                  className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-right bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                  {(warikanAmounts[m] ?? 0).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">合計</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                          ¥{warikanParticipants.reduce((s, m) => s + (warikanAmounts[m] ?? 0), 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">メンバーがいません。メニューから追加してください</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={saveFixedCost}
            disabled={warikan ? warikanParticipants.reduce((s, m) => s + (warikanAmounts[m] ?? 0), 0) <= 0 : !amount}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
          >
            {editingId ? '保存' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
