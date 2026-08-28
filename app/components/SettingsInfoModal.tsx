'use client'

import { useState } from 'react'
import type { Category, Entry, FixedCost } from '../types'
import type { WarikanDefaults } from '../../lib/settings'

type CategoryTab = 'expense' | 'members'

interface Props {
  open: boolean
  onClose: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  warikanDefaults: WarikanDefaults
  onUpdateWarikanDefaults: (defaults: WarikanDefaults) => void
  categories: Category[]
  onUpdateCategories: (categories: Category[]) => void
  members: string[]
  onUpdateMembers: (members: string[]) => void
  entries: Entry[]
  fixedCosts: FixedCost[]
}

export default function SettingsInfoModal({
  open,
  onClose,
  darkMode,
  onToggleDarkMode,
  warikanDefaults,
  onUpdateWarikanDefaults,
  categories,
  onUpdateCategories,
  members,
  onUpdateMembers,
  entries,
  fixedCosts,
}: Props) {
  const [activeTab, setActiveTab] = useState<CategoryTab>('expense')
  const [newEmoji, setNewEmoji] = useState('')
  const [newName, setNewName] = useState('')
  const [newMember, setNewMember] = useState('')

  if (!open) return null

  const filtered = categories.filter(c => c.type === activeTab)

  const addCategory = () => {
    const name = newName.trim()
    if (!name || activeTab === 'members') return
    const newCategory: Category = {
      id: Date.now().toString(),
      name,
      emoji: newEmoji.trim() || '📌',
      type: 'expense',
    }
    onUpdateCategories([...categories, newCategory])
    setNewName('')
    setNewEmoji('')
  }

  const deleteCategory = (id: string) => {
    if (!confirm('このカテゴリを削除しますか？')) return
    onUpdateCategories(categories.filter(c => c.id !== id))
  }

  const updateCategoryBudget = (id: string, value: string) => {
    const parsed = Number(value)
    const budget = value.trim() !== '' && parsed > 0 ? parsed : undefined
    onUpdateCategories(categories.map(c => (c.id === id ? { ...c, monthlyBudget: budget } : c)))
  }

  const addMember = () => {
    const name = newMember.trim()
    if (!name || members.includes(name)) return
    onUpdateMembers([...members, name])
    setNewMember('')
  }

  const countMemberUsage = (name: string) =>
    entries.filter(e => e.paidBy === name || (e.warikanParticipants ?? []).includes(name)).length +
    fixedCosts.filter(f => f.paidBy === name || (f.warikanParticipants ?? []).includes(name)).length

  const deleteMember = (name: string) => {
    const usage = countMemberUsage(name)
    const message = usage > 0
      ? `「${name}」は過去の${usage}件の支出・固定費に関わっています。メンバー一覧からは削除されますが、それらの記録には名前がそのまま残ります。削除しますか？`
      : `「${name}」を削除しますか？`
    if (!confirm(message)) return
    onUpdateMembers(members.filter(m => m !== name))
  }

  const categoryTabs: { key: CategoryTab; label: string; color: string }[] = [
    { key: 'expense', label: 'カテゴリ', color: 'text-red-500' },
    { key: 'members', label: 'メンバー', color: 'text-blue-500' },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[85vh]">
        {/* ハンドル */}
        <div className="flex-shrink-0 px-6 pt-5 pb-4">
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">設定</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 text-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-5">
          {/* ホーム画面に追加 */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 dark:text-gray-300">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">ホーム画面に追加</span>
            </div>
            <ol className="space-y-1.5">
              {[
                '画面下部の共有ボタン（□↑）をタップ',
                '「ホーム画面に追加」を選択',
                '「追加」をタップして完了',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* ダークモード */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{darkMode ? '🌙' : '☀️'}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {darkMode ? 'ダークモード' : 'ライトモード'}
              </span>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              aria-label="ダークモード切替"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* 家計簿設定（この端末だけのローカル設定） */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">家計簿設定</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">この端末だけのローカル設定です。他のメンバーには影響しません</p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600 dark:text-gray-300">追加時に割り勘をデフォルトでON</label>
              <button
                type="button"
                onClick={() => onUpdateWarikanDefaults({ ...warikanDefaults, defaultOn: !warikanDefaults.defaultOn })}
                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                  warikanDefaults.defaultOn ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                aria-label="割り勘デフォルトON切替"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  warikanDefaults.defaultOn ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">デフォルトの割り勘方法</p>
              <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                {([
                  { key: 'equal', label: '均等' },
                  { key: 'ratio', label: '比率' },
                  { key: 'amount', label: '金額' },
                ] as const).map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onUpdateWarikanDefaults({ ...warikanDefaults, splitMethod: opt.key })}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      warikanDefaults.splitMethod === opt.key
                        ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* カテゴリ設定 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="px-4 pt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">カテゴリ設定</p>
              <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
                {categoryTabs.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      activeTab === t.key
                        ? `bg-white dark:bg-gray-700 ${t.color} shadow-sm`
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'members' ? (
              <div className="p-4 space-y-3">
                {members.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">メンバーがいません</p>
                )}
                <div className="space-y-2">
                  {members.map(m => (
                    <div
                      key={m}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👤</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{m}</span>
                      </div>
                      <button
                        onClick={() => deleteMember(m)}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-500 transition-colors text-xs"
                        aria-label={`${m}を削除`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="名前"
                    value={newMember}
                    onChange={e => setNewMember(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addMember() }}
                    className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                  />
                  <button
                    onClick={addMember}
                    disabled={!newMember.trim()}
                    className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
                  >
                    追加
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {filtered.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">カテゴリがありません</p>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {filtered.map(c => (
                    <div
                      key={c.id}
                      className="relative flex flex-col items-center gap-1 py-3 px-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                      <button
                        onClick={() => deleteCategory(c.id)}
                        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/50 text-gray-400 hover:text-red-500 transition-colors text-xs"
                        aria-label={`${c.name}を削除`}
                      >
                        ✕
                      </button>
                      <span className="text-2xl leading-none">{c.emoji}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center leading-tight">
                        {c.name}
                      </span>
                      {activeTab === 'expense' && (
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="予算（円）"
                          defaultValue={c.monthlyBudget ?? ''}
                          onBlur={e => updateCategoryBudget(c.id, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                          className="w-full mt-0.5 border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-1 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                  <input
                    type="text"
                    placeholder="😀"
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    maxLength={2}
                    className="w-14 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    placeholder="カテゴリ名"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addCategory() }}
                    className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                  />
                  <button
                    onClick={addCategory}
                    disabled={!newName.trim()}
                    className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
                  >
                    追加
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
