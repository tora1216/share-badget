'use client'

import { useState } from 'react'
import type { Category, Participant } from '../types'
import type { WarikanDefaults } from '../../lib/settings'

type SettingsTab = 'expense' | 'members'

interface Props {
  categories: Category[]
  onUpdateCategories: (categories: Category[]) => void
  members: string[]
  onUpdateMembers: (members: string[]) => void
  darkMode: boolean
  onToggleDarkMode: () => void
  roomName: string
  roomInviteCode: string
  roomPassphrase: string
  displayName: string
  photoURL?: string
  email?: string
  onRenameDisplayName: (name: string) => void
  onLeaveRoom: () => void
  participants: Participant[]
  warikanDefaults: WarikanDefaults
  onUpdateWarikanDefaults: (defaults: WarikanDefaults) => void
}

export default function MenuPage({
  categories,
  onUpdateCategories,
  members,
  onUpdateMembers,
  darkMode,
  onToggleDarkMode,
  roomName,
  roomInviteCode,
  roomPassphrase,
  displayName,
  photoURL,
  email,
  onRenameDisplayName,
  onLeaveRoom,
  participants,
  warikanDefaults,
  onUpdateWarikanDefaults,
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('expense')
  const [newEmoji, setNewEmoji] = useState('')
  const [newName, setNewName] = useState('')
  const [newMember, setNewMember] = useState('')
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [copied, setCopied] = useState<'code' | 'pass' | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)

  const copyText = async (text: string, which: 'code' | 'pass') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

  const saveNameDraft = () => {
    onRenameDisplayName(nameDraft)
    setEditingName(false)
  }

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

  const deleteMember = (name: string) => {
    onUpdateMembers(members.filter(m => m !== name))
  }

  const tabs: { key: SettingsTab; label: string; color: string }[] = [
    { key: 'expense', label: 'カテゴリ', color: 'text-red-500' },
    { key: 'members', label: 'メンバー', color: 'text-blue-500' },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-4">
      {/* プロフィール */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-3">
          {photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoURL} alt="" className="w-12 h-12 rounded-full flex-shrink-0" />
          ) : (
            <span className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xl flex-shrink-0">👤</span>
          )}
          <div className="min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500">プロフィール</p>
            {email && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{email}</p>}
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">ユーザー名</p>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nameDraft}
                onChange={e => setNameDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveNameDraft() }}
                className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                autoFocus
              />
              <button
                onClick={saveNameDraft}
                disabled={!nameDraft.trim()}
                className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
              >
                保存
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
              <button
                onClick={() => { setNameDraft(displayName); setEditingName(true) }}
                className="text-xs text-blue-500 hover:underline"
              >
                変更
              </button>
            </div>
          )}
        </div>
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

      {/* ルーム */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 space-y-4">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">ルーム「{roomName}」</p>

        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">招待コード</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono tracking-widest truncate">
              {roomInviteCode}
            </div>
            <button
              type="button"
              onClick={() => copyText(roomInviteCode, 'code')}
              className="px-3 h-10 flex-shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs transition-colors"
            >
              {copied === 'code' ? 'コピー済み' : 'コピー'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">合言葉（招待コードとあわせて共有してください）</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono truncate">
              {showPassphrase ? roomPassphrase : '•'.repeat(Math.max(roomPassphrase.length, 6))}
            </div>
            <button
              type="button"
              onClick={() => setShowPassphrase(s => !s)}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs"
              aria-label={showPassphrase ? '合言葉を隠す' : '合言葉を表示'}
            >
              {showPassphrase ? '隠す' : '表示'}
            </button>
            <button
              type="button"
              onClick={() => copyText(roomPassphrase, 'pass')}
              className="px-3 h-10 flex-shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs transition-colors"
            >
              {copied === 'pass' ? 'コピー済み' : 'コピー'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">参加中のメンバー（Googleでログイン済み）</p>
          {participants.length > 0 ? (
            <div className="space-y-2">
              {participants.map(p => (
                <div
                  key={p.uid}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                >
                  {p.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">👤</span>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{p.displayName}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">まだ誰も参加していません</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => { if (confirm('このルームから離れますか？もう一度参加するには招待コードと合言葉が必要です。')) onLeaveRoom() }}
          className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 text-red-500 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          ルームを離れる
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
  )
}
