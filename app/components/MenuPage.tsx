'use client'

import { useState } from 'react'
import type { Category } from '../types'

type SettingsTab = 'expense' | 'income' | 'members'

interface Props {
  categories: Category[]
  onUpdateCategories: (categories: Category[]) => void
  members: string[]
  onUpdateMembers: (members: string[]) => void
  darkMode: boolean
  onToggleDarkMode: () => void
}

export default function MenuPage({
  categories,
  onUpdateCategories,
  members,
  onUpdateMembers,
  darkMode,
  onToggleDarkMode,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('expense')
  const [newEmoji, setNewEmoji] = useState('')
  const [newName, setNewName] = useState('')
  const [newMember, setNewMember] = useState('')

  const filtered = categories.filter(c => c.type === activeTab)

  const addCategory = () => {
    const name = newName.trim()
    if (!name || activeTab === 'members') return
    const newCategory: Category = {
      id: Date.now().toString(),
      name,
      emoji: newEmoji.trim() || '📌',
      type: activeTab as 'expense' | 'income',
    }
    onUpdateCategories([...categories, newCategory])
    setNewName('')
    setNewEmoji('')
  }

  const deleteCategory = (id: string) => {
    onUpdateCategories(categories.filter(c => c.id !== id))
  }

  const addMember = () => {
    const name = newMember.trim()
    if (!name || members.includes(name)) return
    onUpdateMembers([...members, name])
    setNewMember('')
  }

  const deleteMember = (name: string) => {
    onUpdateMembers(members.filter(m => m !== name))
  }

  const tabs: { key: SettingsTab; label: string; color: string }[] = [
    { key: 'expense', label: '支出', color: 'text-red-500' },
    { key: 'income', label: '収入', color: 'text-green-500' },
    { key: 'members', label: 'メンバー', color: 'text-blue-500' },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
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

      {/* カテゴリ・メンバー管理 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* タブ */}
        <div className="px-4 pt-4">
          <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            {tabs.map(t => (
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
  )
}
