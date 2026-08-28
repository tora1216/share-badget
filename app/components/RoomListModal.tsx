'use client'

import type { RoomMembership } from '../../lib/rooms'

interface Props {
  open: boolean
  onClose: () => void
  rooms: RoomMembership[]
  mainRoomId: string
  onSwitchRoom: (groupId: string) => void
  onAddRoom: () => void
}

export default function RoomListModal({ open, onClose, rooms, mainRoomId, onSwitchRoom, onAddRoom }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl flex flex-col max-h-[80vh]">
        <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">ルーム一覧</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onAddRoom}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 text-xl transition-colors"
              aria-label="ルームを追加"
            >
              +
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 text-lg transition-colors"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
          {rooms.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">ルームがありません</p>
          )}
          {rooms.map(room => {
            const isActive = room.groupId === mainRoomId
            return (
              <button
                key={room.groupId}
                onClick={() => { onSwitchRoom(room.groupId); onClose() }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                  isActive
                    ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500'
                    : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span className="text-xl flex-shrink-0">🏠</span>
                <span className={`flex-1 min-w-0 text-sm font-medium truncate ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {room.name}
                </span>
                {isActive && <span className="text-xs text-blue-500 flex-shrink-0">表示中</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
