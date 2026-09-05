'use client'

import { useState } from 'react'
import type { Category } from '../types'
import type { WarikanDefaults } from '../../lib/settings'

interface Props {
  open: boolean
  onClose: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  warikanDefaults: WarikanDefaults
  onUpdateWarikanDefaults: (defaults: WarikanDefaults) => void
  categories: Category[]
  onUpdateCategories: (categories: Category[]) => void
  settlementDay: number
  onUpdateSettlementDay: (day: number) => void
  roomName: string
  onRenameRoom: (name: string) => void
  inviteCode: string
  onRegenerateInviteCode: () => void
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
  settlementDay,
  onUpdateSettlementDay,
  roomName,
  onRenameRoom,
  inviteCode,
  onRegenerateInviteCode,
}: Props) {
  const [newEmoji, setNewEmoji] = useState('')
  const [newName, setNewName] = useState('')
  const [appOpen, setAppOpen] = useState(true)
  const [roomOpen, setRoomOpen] = useState(true)
  const [roomNameDraft, setRoomNameDraft] = useState(roomName)
  const [editingRoomName, setEditingRoomName] = useState(false)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [walletOpen, setWalletOpen] = useState(true)
  const [categoryOpen, setCategoryOpen] = useState(true)
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editEmoji, setEditEmoji] = useState('')
  const [editName, setEditName] = useState('')

  if (!open) return null

  const addCategory = () => {
    const name = newName.trim()
    if (!name) return
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

  const startEditCategory = (c: Category) => {
    setEditingCategoryId(c.id)
    setEditEmoji(c.emoji)
    setEditName(c.name)
  }

  const saveEditCategory = () => {
    const name = editName.trim()
    if (!editingCategoryId || !name) return
    onUpdateCategories(categories.map(c => (c.id === editingCategoryId ? { ...c, name, emoji: editEmoji.trim() || '📌' } : c)))
    setEditingCategoryId(null)
  }

  const saveRoomName = () => {
    const trimmed = roomNameDraft.trim()
    if (!trimmed) return
    onRenameRoom(trimmed)
    setEditingRoomName(false)
  }

  const copyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 1500)
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

  const shareUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 1500)
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

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

        <div className="flex-1 overflow-y-auto px-6 pb-10 space-y-6">
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

          {/* 共有リンク */}
          <button
            type="button"
            onClick={copyShareLink}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-sm transition-colors"
          >
            {copiedLink ? 'コピー済み' : 'アプリのURLをコピー'}
          </button>

          {/* アプリ設定 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setAppOpen(o => !o)}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">アプリ設定</span>
              <svg
                xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-400 dark:text-gray-500 transition-transform ${appOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {appOpen && (
              <div className="px-4 pb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {darkMode ? 'ダークモード' : 'ライトモード'}
                </span>
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                  aria-label="ダークモード切替"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            )}
          </div>

          {/* ルーム設定 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setRoomOpen(o => !o)}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">ルーム設定</span>
              <svg
                xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-400 dark:text-gray-500 transition-transform ${roomOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {roomOpen && (
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">ルーム名</p>
                  {editingRoomName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={roomNameDraft}
                        onChange={e => setRoomNameDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveRoomName() }}
                        autoFocus
                        className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      />
                      <button
                        onClick={saveRoomName}
                        disabled={!roomNameDraft.trim()}
                        className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{roomName}</span>
                      <button
                        onClick={() => { setRoomNameDraft(roomName); setEditingRoomName(true) }}
                        className="text-xs text-blue-500 hover:underline flex-shrink-0"
                      >
                        変更
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">招待コード</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono tracking-widest truncate">
                      {inviteCode}
                    </div>
                    <button
                      type="button"
                      onClick={copyInviteCode}
                      className="px-3 h-10 flex-shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs transition-colors"
                    >
                      {copiedInvite ? 'コピー済み' : 'コピー'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onRegenerateInviteCode}
                    className="mt-2 text-xs text-red-500 hover:underline"
                  >
                    招待コードを再発行する
                  </button>
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">精算日を設定</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {settlementDay > 1
                          ? `毎月${settlementDay}日を含めて締め、翌日から次の期間として集計します`
                          : 'OFFの場合は毎月1日〜末日で集計します（カレンダー通りの月区切り）'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUpdateSettlementDay(settlementDay > 1 ? 1 : 25)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        settlementDay > 1 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      aria-label="精算日設定の切替"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                        settlementDay > 1 ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                  {settlementDay > 1 && (
                    <select
                      value={settlementDay}
                      onChange={e => onUpdateSettlementDay(Number(e.target.value))}
                      className="w-full mt-3 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    >
                      {Array.from({ length: 27 }, (_, i) => i + 2).map(d => (
                        <option key={d} value={d}>{d}日締め</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* カテゴリ設定 */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setCategoryOpen(o => !o)}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">カテゴリ設定</span>
              <svg
                xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-400 dark:text-gray-500 transition-transform ${categoryOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {categoryOpen && (
              <div className="px-4 pb-4 space-y-3">
                {categories.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">カテゴリがありません</p>
                )}
                <div className="space-y-2">
                  {categories.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
                    >
                      {editingCategoryId === c.id ? (
                        <>
                          <input
                            type="text"
                            value={editEmoji}
                            onChange={e => setEditEmoji(e.target.value)}
                            maxLength={2}
                            className="w-10 flex-shrink-0 border border-gray-200 dark:border-gray-700 rounded-lg px-1 py-1 text-center text-lg focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                          />
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEditCategory() }}
                            autoFocus
                            className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                          />
                          <button
                            onClick={saveEditCategory}
                            disabled={!editName.trim()}
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white transition-colors text-xs"
                            aria-label="保存"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 transition-colors text-xs"
                            aria-label="キャンセル"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-xl flex-shrink-0">{c.emoji}</span>
                          <span className="flex-1 min-w-0 text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            {c.name}
                          </span>
                          <button
                            onClick={() => startEditCategory(c)}
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-400 hover:text-blue-500 transition-colors"
                            aria-label={`${c.name}を編集`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button
                            onClick={() => deleteCategory(c.id)}
                            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label={`${c.name}を削除`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </>
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

          {/* 家計簿設定（この端末だけのローカル設定） */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setWalletOpen(o => !o)}
              className="w-full flex items-center justify-between p-4"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">家計簿設定</span>
              <svg
                xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-gray-400 dark:text-gray-500 transition-transform ${walletOpen ? 'rotate-180' : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {walletOpen && (
              <div className="px-4 pb-4 space-y-4">
                <p className="text-[11px] text-gray-400 dark:text-gray-500">この端末だけのローカル設定です。他のメンバーには影響しません</p>

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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
