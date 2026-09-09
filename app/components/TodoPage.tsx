'use client'

import { useState, useRef } from 'react'
import type { Todo } from '../types'
import { TODO_TEMPLATES } from '../types'

interface Props {
  todos: Todo[]
  onUpdate: (todos: Todo[]) => void
  displayName: string
  members: string[]
}

interface DragState {
  id: string
  pointerId: number
  section: 'pending' | 'done'
  sectionIds: string[] // ドラッグ開始時点でのそのセクションのid順
  draggedIndex: number
  rowHeight: number
  startY: number
  currentY: number
}

export default function TodoPage({ todos, onUpdate, displayName, members }: Props) {
  const [quickText, setQuickText] = useState('')
  const [templateOpen, setTemplateOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [text, setText] = useState('')
  const [memo, setMemo] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignees, setAssignees] = useState<string[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)

  // 並び替え中の楽観的な表示順。確定後はFirestoreの購読更新（todos）が届き次第、破棄してpropsに委ねる
  const [dragTodos, setDragTodos] = useState<Todo[] | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // todosが更新されたら（＝並び替えがFirestoreに反映されたら）楽観的な表示順を手放す
  const [syncedTodos, setSyncedTodos] = useState(todos)
  if (todos !== syncedTodos) {
    setSyncedTodos(todos)
    if (!dragState) setDragTodos(null)
  }

  const displayTodos = dragTodos ?? todos
  const pending = displayTodos.filter(t => !t.done)
  const done = displayTodos.filter(t => t.done)

  // ドラッグ中はpending/doneの配列自体は動かさず、見た目だけtransformで動かす（指を離した時に1回だけ確定する）
  const dragDeltaY = dragState ? dragState.currentY - dragState.startY : 0
  const dragTargetIndex = dragState
    ? Math.max(0, Math.min(dragState.sectionIds.length - 1, dragState.draggedIndex + Math.round(dragDeltaY / dragState.rowHeight)))
    : -1

  const quickAdd = () => {
    const trimmed = quickText.trim()
    if (!trimmed) return
    onUpdate([...todos, {
      id: Date.now().toString(),
      text: trimmed,
      done: false,
      createdBy: displayName || undefined,
    }])
    setQuickText('')
  }

  const startEdit = (item: Todo) => {
    setEditingId(item.id)
    setText(item.text)
    setMemo(item.memo ?? '')
    setDueDate(item.dueDate ?? '')
    setAssignees(item.assignees ?? [])
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setEditingId(null)
    setAssignees([])
    setDialogOpen(false)
  }

  const toggleAssignee = (name: string) => {
    setAssignees(prev => (prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]))
  }

  const saveEdit = () => {
    if (!editingId) return
    const trimmed = text.trim()
    if (!trimmed) return
    onUpdate(todos.map(t =>
      t.id === editingId
        ? { ...t, text: trimmed, memo: memo.trim() || undefined, dueDate: dueDate || undefined, assignees: assignees.length > 0 ? assignees : undefined }
        : t
    ))
    closeDialog()
  }

  const deleteTodo = (id: string) => {
    if (editingId === id) closeDialog()
    onUpdate(todos.filter(t => t.id !== id))
  }

  const toggleDone = (id: string) => {
    onUpdate(todos.map(t => (t.id === id ? { ...t, done: !t.done } : t)))
  }

  const applyTemplate = (templateId: string) => {
    const template = TODO_TEMPLATES.find(t => t.id === templateId)
    if (!template) return
    const existingTexts = new Set(todos.map(t => t.text))
    const newTasks = template.tasks.filter(task => !existingTexts.has(task))
    const newTodos: Todo[] = newTasks.map((task, i) => ({
      id: `${Date.now()}-${i}`,
      text: task,
      done: false,
      createdBy: displayName || undefined,
    }))
    onUpdate([...todos, ...newTodos])
    setTemplateOpen(false)
  }

  const handlePointerDown = (e: React.PointerEvent, item: Todo, section: 'pending' | 'done', index: number) => {
    e.preventDefault()
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch {}
    const el = rowRefs.current[item.id]
    const rowHeight = el?.getBoundingClientRect().height ?? 56
    setDragState({
      id: item.id,
      pointerId: e.pointerId,
      section,
      sectionIds: (section === 'pending' ? pending : done).map(t => t.id),
      draggedIndex: index,
      rowHeight,
      startY: e.clientY,
      currentY: e.clientY,
    })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return
    const clientY = e.clientY
    setDragState(prev => (prev ? { ...prev, currentY: clientY } : prev))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState || e.pointerId !== dragState.pointerId) return
    const { section, sectionIds, draggedIndex } = dragState
    const targetIndex = Math.max(0, Math.min(sectionIds.length - 1, draggedIndex + Math.round((dragState.currentY - dragState.startY) / dragState.rowHeight)))
    setDragState(null)
    if (targetIndex === draggedIndex) return
    const current = section === 'pending' ? pending : done
    const other = section === 'pending' ? done : pending
    const reordered = [...current]
    const [moved] = reordered.splice(draggedIndex, 1)
    reordered.splice(targetIndex, 0, moved)
    const newTodos = section === 'pending' ? [...reordered, ...other] : [...other, ...reordered]
    setDragTodos(newTodos)
    onUpdate(newTodos)
  }

  const renderRow = (item: Todo, section: 'pending' | 'done', index: number) => {
    const isDraggedItem = dragState?.id === item.id
    const isDraggingThisSection = dragState?.section === section
    let transform: string | undefined
    if (isDraggedItem) {
      transform = `translateY(${dragDeltaY}px)`
    } else if (isDraggingThisSection && dragState) {
      const { draggedIndex, rowHeight } = dragState
      if (draggedIndex < dragTargetIndex && index > draggedIndex && index <= dragTargetIndex) {
        transform = `translateY(-${rowHeight}px)`
      } else if (draggedIndex > dragTargetIndex && index >= dragTargetIndex && index < draggedIndex) {
        transform = `translateY(${rowHeight}px)`
      }
    }
    return (
      <div
        key={item.id}
        ref={el => { rowRefs.current[item.id] = el }}
        style={{
          transform,
          transition: isDraggedItem ? 'none' : 'transform 150ms ease',
          position: isDraggedItem ? 'relative' : undefined,
          zIndex: isDraggedItem ? 10 : undefined,
        }}
        className={`w-full flex items-center gap-2 py-3 bg-white dark:bg-gray-900 ${isDraggedItem ? 'shadow-lg rounded-xl' : ''}`}
      >
        <button
          type="button"
          aria-label="ドラッグして並び替え"
          onPointerDown={e => handlePointerDown(e, item, section, index)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/>
            <circle cx="15" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/>
            <circle cx="15" cy="18" r="1.5"/>
          </svg>
        </button>
        <button
          type="button"
          onClick={() => toggleDone(item.id)}
          aria-label={item.done ? '未完了に戻す' : '完了にする'}
          className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-[10px] transition-colors ${
            item.done
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
          }`}
        >
          {item.done && '✓'}
        </button>
        <button
          onClick={() => startEdit(item)}
          className="flex-1 min-w-0 text-left space-y-0.5"
        >
          <span className={`block text-sm font-medium truncate ${
            item.done ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-800 dark:text-gray-100'
          }`}>
            {item.text}
          </span>
          {item.memo && (
            <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">{item.memo}</span>
          )}
          {item.dueDate && (
            <span className="block text-xs text-gray-400 dark:text-gray-500">期限: {item.dueDate}</span>
          )}
          {item.assignees && item.assignees.length > 0 && (
            <span className="inline-block text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
              {item.assignees.join('・')}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => deleteTodo(item.id)}
          className="text-gray-300 dark:text-gray-600 hover:text-red-400 flex-shrink-0 transition-colors"
          aria-label="削除"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* ヘッダーカード：タイトル・テンプレート・折りたたみ + クイック追加 */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">✅</span>
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">やることリスト</span>
            </div>
            <button
              type="button"
              onClick={() => setTemplateOpen(true)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <span>+</span> テンプレート
            </button>
          </div>

          <div className="px-4 pb-4 flex items-center gap-2">
            <input
              type="text"
              placeholder="例）新居の物件探し、婚姻届の提出..."
              value={quickText}
              onChange={e => setQuickText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') quickAdd() }}
              className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={quickAdd}
              disabled={!quickText.trim()}
              className="flex-shrink-0 flex items-center gap-1 px-4 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white text-sm font-semibold transition-colors"
            >
              <span>+</span> 追加
            </button>
          </div>

          {/* リスト（見出しカードと同じ枠の中に表示） */}
          <div className="px-4 pb-4">
            {displayTodos.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400 dark:text-gray-600">
                <span className="text-3xl mb-2">✅</span>
                <p className="text-sm">やることがありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {pending.map((item, index) => renderRow(item, 'pending', index))}
                {done.map((item, index) => renderRow(item, 'done', index))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 編集ダイアログ */}
      {dialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
          onClick={e => { if (e.target === e.currentTarget) closeDialog() }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">タスクを編集</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">タスク</label>
                <input
                  type="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">期限（任意）</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">メモ（任意）</label>
                <input
                  type="text"
                  placeholder="詳細を入力..."
                  value={memo}
                  onChange={e => setMemo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit() }}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
                />
              </div>

              {members.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">担当者（任意）</label>
                  <div className="flex flex-wrap gap-2">
                    {members.map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => toggleAssignee(m)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                          assignees.includes(m)
                            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-6">
              {editingId && (
                <button
                  onClick={() => deleteTodo(editingId)}
                  className="py-3 px-4 rounded-xl text-red-500 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  削除
                </button>
              )}
              <div className="flex-1 flex gap-3">
                <button
                  onClick={closeDialog}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!text.trim()}
                  className="flex-1 py-3 rounded-xl font-medium text-sm transition-colors text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* テンプレート選択ダイアログ */}
      {templateOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
          onClick={e => { if (e.target === e.currentTarget) setTemplateOpen(false) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />

            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-4">テンプレートを選択</p>

            <div className="space-y-2">
              {TODO_TEMPLATES.map(template => (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                >
                  <span className="text-2xl flex-shrink-0">{template.emoji}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{template.name}</span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500">{template.tasks.length}個のタスク</span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">›</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setTemplateOpen(false)}
              className="w-full mt-6 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
