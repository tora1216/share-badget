'use client'

import { APP_VERSION, CHANGELOG } from '../../lib/changelog'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsInfoModal({ open, onClose }: Props) {
  if (!open) return null

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

          {/* アップデート情報 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">アップデート情報</span>
              <span className="text-xs font-bold bg-blue-500 text-white px-2 py-0.5 rounded-full">
                v{APP_VERSION}
              </span>
            </div>
            <div className="space-y-3">
              {CHANGELOG.map((entry, i) => (
                <div key={entry.version} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
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
          </div>
        </div>
      </div>
    </div>
  )
}
