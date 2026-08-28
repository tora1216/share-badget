'use client'

import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import type { Participant } from '../types'
import { APP_VERSION, CHANGELOG } from '../../lib/changelog'

interface Props {
  roomName: string
  roomInviteCode: string
  roomPassphrase: string
  displayName: string
  photoURL?: string
  onRenameDisplayName: (name: string) => void
  onLeaveRoom: () => void
  participants: Participant[]
}

export default function MenuPage({
  roomName,
  roomInviteCode,
  roomPassphrase,
  displayName,
  photoURL,
  onRenameDisplayName,
  onLeaveRoom,
  participants,
}: Props) {
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [copied, setCopied] = useState<'code' | 'pass' | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(displayName)
  const [changelogOpen, setChangelogOpen] = useState(true)

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

        <button
          type="button"
          onClick={() => { if (confirm('ログアウトしますか？')) signOut(auth) }}
          className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          ログアウト
        </button>
      </div>

      {/* ルーム情報 */}
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

      {/* アプデ情報 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setChangelogOpen(o => !o)}
          className="w-full flex items-center justify-between p-4"
        >
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">アプデ情報</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">
              v{APP_VERSION}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={`text-gray-400 dark:text-gray-500 transition-transform ${changelogOpen ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </button>
        {changelogOpen && (
          <div className="max-h-64 overflow-y-auto px-4 pb-4 divide-y divide-gray-200 dark:divide-gray-700">
            {CHANGELOG.map((entry, i) => (
              <div key={entry.version} className="py-3 first:pt-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      i === 0
                        ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                      v{entry.version}
                    </span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{entry.title}</span>
                  </div>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                  {entry.changes.map((change, j) => (
                    <li key={j} className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 dark:bg-gray-500 flex-shrink-0" />
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
