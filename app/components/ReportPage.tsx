'use client'

import { useState } from 'react'
import type { Entry, Category } from '../types'
import { getPeriodRange, isInPeriod } from '../../lib/period'

interface Props {
  entries: Entry[]
  categories: Category[]
  onUpdateCategories: (categories: Category[]) => void
  settlementDay: number
}

export default function ReportPage({ entries, categories, onUpdateCategories, settlementDay }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const period = getPeriodRange(year, month, settlementDay)

  const monthEntries = entries.filter(e => isInPeriod(e.date, period))
  const totalExpense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const updateCategoryBudget = (id: string, value: string) => {
    const parsed = Number(value)
    const budget = value.trim() !== '' && parsed > 0 ? parsed : undefined
    onUpdateCategories(categories.map(c => (c.id === id ? { ...c, monthlyBudget: budget } : c)))
  }

  // カテゴリ別支出
  const expenseByCategory = categories
    .filter(c => c.type === 'expense')
    .map(c => ({
      ...c,
      total: monthEntries.filter(e => e.type === 'expense' && e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
    }))
    .sort((a, b) => b.total - a.total)

  const maxExpense = Math.max(...expenseByCategory.map(c => c.total), 1)

  // 直近6ヶ月のトレンド
  const trend = Array.from({ length: 6 }).map((_, i) => {
    let m = month - (5 - i)
    let y = year
    if (m < 0) { m += 12; y -= 1 }
    const p = getPeriodRange(y, m, settlementDay)
    const monthData = entries.filter(e => isInPeriod(e.date, p))
    return {
      label: `${m + 1}月`,
      expense: monthData.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    }
  })
  const maxTrend = Math.max(...trend.map(t => t.expense), 1)

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
          <span className="font-semibold text-gray-800 dark:text-gray-100">{year}年{month + 1}月</span>
          {settlementDay > 1 && (
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

      {/* サマリーカード */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">今月の支出</p>
        <p className="text-base font-bold text-red-500">¥{totalExpense.toLocaleString()}</p>
      </div>

      {/* 直近6ヶ月トレンド */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">直近6ヶ月</p>
        <div className="flex items-end justify-between gap-1.5 h-28">
          {trend.map((t, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '96px' }}>
                {t.expense > 0 ? (
                  <div
                    className="w-full bg-red-400 dark:bg-red-500 rounded-t"
                    style={{ height: `${(t.expense / maxTrend) * 88}px`, minHeight: '3px' }}
                  />
                ) : (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t" style={{ height: '4px' }} />
                )}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 支出カテゴリ内訳・予算設定 */}
      {expenseByCategory.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">支出カテゴリ内訳・予算</p>
          <div className="space-y-3">
            {expenseByCategory.map(c => {
              const overBudget = c.monthlyBudget != null && c.total > c.monthlyBudget
              const barWidth = c.monthlyBudget
                ? Math.min((c.total / c.monthlyBudget) * 100, 100)
                : (c.total / maxExpense) * 100
              return (
                <div key={c.id}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base leading-none flex-shrink-0">{c.emoji}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{c.name}</span>
                    </div>
                    <span className={`text-xs font-semibold flex-shrink-0 ${overBudget ? 'text-red-600 dark:text-red-400' : 'text-red-500'}`}>
                      ¥{c.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${overBudget ? 'bg-red-600 dark:bg-red-500' : 'bg-red-400 dark:bg-red-500'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    {overBudget ? (
                      <p className="text-[10px] text-red-500">予算を¥{(c.total - c.monthlyBudget!).toLocaleString()}オーバー</p>
                    ) : <span />}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">予算</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="未設定"
                        defaultValue={c.monthlyBudget ?? ''}
                        onBlur={e => updateCategoryBudget(c.id, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                        className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-[11px] text-right focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 placeholder-gray-400"
                      />
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">円</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {monthEntries.length === 0 && (
        <div className="flex flex-col items-center py-10 text-gray-400 dark:text-gray-600">
          <span className="text-4xl mb-2">📊</span>
          <p className="text-sm">この月のデータがありません</p>
        </div>
      )}
    </div>
  )
}
