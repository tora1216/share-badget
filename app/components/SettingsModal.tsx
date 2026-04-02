'use client'

import { useState } from 'react'
import type { Category } from '../types'

type SettingsTab = 'expense' | 'income' | 'members'

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
  onUpdate: (categories: Category[]) => void
  members: string[]
  onUpdateMembers: (members: string[]) => void
}

export default function SettingsModal({ open, onClose, categories, onUpdate, members, onUpdateMembers }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('expense')
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
      type: activeTab as 'expense' | 'income',
    }
    onUpdate([...categories, newCategory])
    setNewName('')
    setNewEmoji('')
  }

  const deleteCategory = (id: string) => {
    onUpdate(categories.filter(c => c.id !== id))
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
    { key: 'income',  label: '収入', color: 'text-green-500' },
    { key: 'members', label: 'メンバー', color: 'text-blue-500' },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl flex flex-col max-h-[80vh]">
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">設定</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 text-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4">
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

        {activeTab === 'members' ? (
          <>
            {/* Member list */}
            <div className="flex-1 overflow-y-auto min-h-0 mb-4">
              {members.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">メンバーがいません</p>
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
            </div>

            {/* Add member */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">メンバーを追加</p>
              <div className="flex gap-2">
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
          </>
        ) : (
          <>
            {/* Category list */}
            <div className="flex-1 overflow-y-auto min-h-0 mb-4">
              {filtered.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-6">カテゴリがありません</p>
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
            </div>

            {/* Add category */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">新しいカテゴリを追加</p>
              <div className="flex gap-2">
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
          </>
        )}
      </div>
    </div>
  )
}
