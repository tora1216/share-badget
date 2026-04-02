'use client'

import { useState } from 'react'
import type { FixedCost, Category } from '../types'
import { DEFAULT_FIXED_CATEGORIES } from '../types'

interface Props {
  fixedCosts: FixedCost[]
  onUpdate: (fixedCosts: FixedCost[]) => void
  categories: Category[]  // 通常カテゴリ（収入タブで使用）
}

type Tab = 'expense' | 'income'

export default function ManagePage({ fixedCosts, onUpdate, categories }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('expense')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(DEFAULT_FIXED_CATEGORIES[0]?.id ?? '')
  const [memo, setMemo] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // 支出は固定費専用カテゴリ、収入は通常の収入カテゴリ
  const filteredCategories = activeTab === 'expense'
    ? DEFAULT_FIXED_CATEGORIES
    : categories.filter(c => c.type === 'income')

  // カテゴリ検索（固定費カテゴリ → 通常カテゴリの順でフォールバック）
  const findCategory = (id: string) =>
    DEFAULT_FIXED_CATEGORIES.find(c => c.id === id) ?? categories.find(c => c.id === id)

  const filtered = fixedCosts.filter(f => f.type === activeTab)

  const totalExpense = fixedCosts.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
  const totalIncome = fixedCosts.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0)
  const balance = totalIncome - totalExpense

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    setCategoryId(
      tab === 'expense'
        ? (DEFAULT_FIXED_CATEGORIES[0]?.id ?? '')
        : (categories.find(c => c.type === 'income')?.id ?? '')
    )
  }

  const startEdit = (item: FixedCost) => {
    setEditingId(item.id)
    setActiveTab(item.type)
    setAmount(String(item.amount))
    setCategoryId(item.categoryId)
    setMemo(item.memo ?? '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setAmount('')
    setMemo('')
    setCategoryId(filteredCategories[0]?.id ?? '')
  }

  const saveFixedCost = () => {
    const parsed = Number(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) return
    if (editingId) {
      onUpdate(fixedCosts.map(f =>
        f.id === editingId
          ? { ...f, amount: parsed, categoryId: categoryId || (filteredCategories[0]?.id ?? ''), memo: memo.trim() || undefined }
          : f
      ))
      setEditingId(null)
    } else {
      onUpdate([...fixedCosts, { id: Date.now().toString(), amount: parsed, type: activeTab, categoryId: categoryId || (filteredCategories[0]?.id ?? ''), memo: memo.trim() || undefined }])
    }
    setAmount('')
    setMemo('')
  }

  const deleteFixedCost = (id: string) => {
    if (editingId === id) cancelEdit()
    onUpdate(fixedCosts.filter(f => f.id !== id))
  }

  return (
    <div className="flex flex-col">
      {/* サマリーカード */}
      <div className="px-4 pt-4 pb-2 grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">月額支出</p>
          <p className="text-base font-bold text-red-500">¥{totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">月額収入</p>
          <p className="text-base font-bold text-green-500">¥{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">収支</p>
          <p className={`text-base font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {balance >= 0 ? '+' : ''}¥{balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* タブ */}
      <div className="px-4 py-2">
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          {(['expense', 'income'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? `bg-white dark:bg-gray-700 shadow-sm ${tab === 'expense' ? 'text-red-500' : 'text-green-500'}`
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab === 'expense' ? '支出' : '収入'}
            </button>
          ))}
        </div>
      </div>

      {/* リスト */}
      <div className="px-4 pb-72">
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
                    </div>
                    <div className={`text-sm font-semibold ${item.type === 'expense' ? 'text-red-500' : 'text-green-500'}`}>
                      {item.type === 'income' ? '+' : '-'}¥{item.amount.toLocaleString()}
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
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 pt-3 pb-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
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

          <input
            type="number"
            inputMode="numeric"
            placeholder="金額（円）"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveFixedCost() }}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
          />

          <input
            type="text"
            placeholder="メモ（任意）"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveFixedCost() }}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
          />

          {filteredCategories.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {filteredCategories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-2 transition-colors ${
                    categoryId === c.id
                      ? activeTab === 'expense'
                        ? 'border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-500'
                        : 'border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-500'
                      : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="text-lg leading-none">{c.emoji}</span>
                  <span className={`text-[10px] font-medium leading-tight text-center ${
                    categoryId === c.id
                      ? activeTab === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-300'
                  }`}>
                    {c.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={saveFixedCost}
            disabled={!amount}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
          >
            {editingId ? '保存' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
