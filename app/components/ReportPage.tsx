'use client'

import { useState } from 'react'
import type { Entry, Category } from '../types'

interface Props {
  entries: Entry[]
  categories: Category[]
}

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

export default function ReportPage({ entries, categories }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

  const monthEntries = entries.filter(e => e.date.startsWith(monthPrefix))
  const totalExpense = monthEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const totalIncome = monthEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const balance = totalIncome - totalExpense

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // カテゴリ別支出
  const expenseByCategory = categories
    .filter(c => c.type === 'expense')
    .map(c => ({
      ...c,
      total: monthEntries.filter(e => e.type === 'expense' && e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const maxExpense = expenseByCategory[0]?.total ?? 1

  // カテゴリ別収入
  const incomeByCategory = categories
    .filter(c => c.type === 'income')
    .map(c => ({
      ...c,
      total: monthEntries.filter(e => e.type === 'income' && e.categoryId === c.id).reduce((s, e) => s + e.amount, 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  const maxIncome = incomeByCategory[0]?.total ?? 1

  // 直近6ヶ月のトレンド
  const trend = Array.from({ length: 6 }).map((_, i) => {
    let m = month - (5 - i)
    let y = year
    if (m < 0) { m += 12; y -= 1 }
    const prefix = `${y}-${String(m + 1).padStart(2, '0')}`
    const monthData = entries.filter(e => e.date.startsWith(prefix))
    return {
      label: `${m + 1}月`,
      expense: monthData.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
      income: monthData.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
    }
  })
  const maxTrend = Math.max(...trend.map(t => Math.max(t.expense, t.income)), 1)

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
        <span className="font-semibold text-gray-800 dark:text-gray-100">{year}年{month + 1}月</span>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ›
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">支出</p>
          <p className="text-base font-bold text-red-500">¥{totalExpense.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">収入</p>
          <p className="text-base font-bold text-green-500">¥{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-1">収支</p>
          <p className={`text-base font-bold ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {balance >= 0 ? '+' : ''}¥{balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 直近6ヶ月トレンド */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">直近6ヶ月</p>
        <div className="flex items-end justify-between gap-1.5 h-28">
          {trend.map((t, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end gap-0.5" style={{ height: '96px' }}>
                {t.income > 0 && (
                  <div
                    className="w-full bg-green-400 dark:bg-green-500 rounded-t"
                    style={{ height: `${(t.income / maxTrend) * 88}px`, minHeight: '3px' }}
                  />
                )}
                {t.expense > 0 && (
                  <div
                    className="w-full bg-red-400 dark:bg-red-500 rounded-t"
                    style={{ height: `${(t.expense / maxTrend) * 88}px`, minHeight: '3px' }}
                  />
                )}
                {t.income === 0 && t.expense === 0 && (
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-t" style={{ height: '4px' }} />
                )}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">{t.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-400 inline-block" />収入</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />支出</span>
        </div>
      </div>

      {/* 支出カテゴリ内訳 */}
      {expenseByCategory.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">支出カテゴリ内訳</p>
          <div className="space-y-2.5">
            {expenseByCategory.map(c => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300">{c.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-red-500">¥{c.total.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-400 dark:bg-red-500 rounded-full"
                    style={{ width: `${(c.total / maxExpense) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 収入カテゴリ内訳 */}
      {incomeByCategory.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">収入カテゴリ内訳</p>
          <div className="space-y-2.5">
            {incomeByCategory.map(c => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span className="text-xs text-gray-600 dark:text-gray-300">{c.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-green-500">¥{c.total.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 dark:bg-green-500 rounded-full"
                    style={{ width: `${(c.total / maxIncome) * 100}%` }}
                  />
                </div>
              </div>
            ))}
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
