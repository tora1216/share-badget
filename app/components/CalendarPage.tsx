'use client'

import { useState, useEffect, useRef } from 'react'
import type { Entry, Category, CalendarEvent, FixedCost } from '../types'
import { DEFAULT_CATEGORIES } from '../types'
import ManagePage from './ManagePage'
import ReportPage from './ReportPage'
import MenuPage from './MenuPage'
import SettingsInfoModal from './SettingsInfoModal'

type NavTab = 'calendar' | 'manage' | 'report' | 'menu'

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarPage() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [entries, setEntries] = useState<Entry[]>([])
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [members, setMembers] = useState<string[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [darkMode, setDarkMode] = useState(false)

  // 選択中の日付（カレンダー下の明細表示用）
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  // 追加ダイアログ state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'event'>('expense')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [warikan, setWarikan] = useState(false)
  const [paidBy, setPaidBy] = useState('')
  // 予定ダイアログ用
  const [eventTitle, setEventTitle] = useState('')
  const [eventNote, setEventNote] = useState('')

  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>([])
  const [activeNav, setActiveNav] = useState<NavTab>('calendar')
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [settingsInfoOpen, setSettingsInfoOpen] = useState(false)

  // ダブルクリック検出用
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastClickedDateRef = useRef<string | null>(null)

  useEffect(() => {
    const storedEntries = localStorage.getItem('share-badget-entries')
    if (storedEntries) setEntries(JSON.parse(storedEntries))
    const storedCategories = localStorage.getItem('share-badget-categories')
    if (storedCategories) setCategories(JSON.parse(storedCategories))
    const storedMembers = localStorage.getItem('share-badget-members')
    if (storedMembers) setMembers(JSON.parse(storedMembers))
    const storedEvents = localStorage.getItem('share-badget-events')
    if (storedEvents) setCalendarEvents(JSON.parse(storedEvents))
    const storedFixed = localStorage.getItem('share-badget-fixed-costs')
    if (storedFixed) setFixedCosts(JSON.parse(storedFixed))
    const isDark = localStorage.getItem('share-badget-dark') === 'true'
    setDarkMode(isDark)
  }, [])

  const toggleDarkMode = () => {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('share-badget-dark', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  // 1クリック → 明細表示、ダブルクリック → 追加ダイアログ
  const handleDayClick = (dateStr: string) => {
    if (lastClickedDateRef.current === dateStr && clickTimerRef.current) {
      clearTimeout(clickTimerRef.current)
      clickTimerRef.current = null
      lastClickedDateRef.current = null
      openDialog(dateStr)
    } else {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
      lastClickedDateRef.current = dateStr
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null
        lastClickedDateRef.current = null
        setFocusedDate(dateStr)
        setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50)
      }, 280)
    }
  }

  const firstCategoryId = (type: 'expense' | 'income') =>
    categories.find(c => c.type === type)?.id ?? ''

  const openDialog = (dateStr: string, tab: 'expense' | 'income' | 'event' = 'expense') => {
    setEditingEntryId(null)
    setEditingEventId(null)
    setSelectedDate(dateStr)
    setActiveTab(tab)
    setAmount('')
    setMemo('')
    setCategoryId(firstCategoryId('expense'))
    setWarikan(false)
    setPaidBy('')
    setEventTitle('')
    setEventNote('')
    setDialogOpen(true)
  }

  const openEditEntry = (entry: Entry) => {
    setEditingEntryId(entry.id)
    setEditingEventId(null)
    setSelectedDate(entry.date)
    setActiveTab(entry.type)
    setAmount(String(entry.amount))
    setMemo(entry.memo)
    setCategoryId(entry.categoryId)
    setWarikan(entry.warikan ?? false)
    setPaidBy(entry.paidBy ?? '')
    setEventTitle('')
    setEventNote('')
    setDialogOpen(true)
  }

  const openEditEvent = (ev: CalendarEvent) => {
    setEditingEventId(ev.id)
    setEditingEntryId(null)
    setSelectedDate(ev.date)
    setActiveTab('event')
    setEventTitle(ev.title)
    setEventNote(ev.note ?? '')
    setAmount('')
    setMemo('')
    setCategoryId('')
    setWarikan(false)
    setPaidBy('')
    setDialogOpen(true)
  }

  const handleTabChange = (tab: 'expense' | 'income' | 'event') => {
    setActiveTab(tab)
    if (tab !== 'event') setCategoryId(firstCategoryId(tab))
  }

  const saveEntry = () => {
    if (activeTab === 'event') {
      if (!eventTitle.trim()) return
      let updated: CalendarEvent[]
      if (editingEventId) {
        updated = calendarEvents.map(e =>
          e.id === editingEventId
            ? { ...e, date: selectedDate, title: eventTitle.trim(), note: eventNote.trim() || undefined }
            : e
        )
      } else {
        updated = [...calendarEvents, { id: Date.now().toString(), date: selectedDate, title: eventTitle.trim(), note: eventNote.trim() || undefined }]
      }
      setCalendarEvents(updated)
      localStorage.setItem('share-badget-events', JSON.stringify(updated))
      setEditingEventId(null)
      setDialogOpen(false)
      return
    }
    const parsed = Number(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) return
    let updated: Entry[]
    if (editingEntryId) {
      updated = entries.map(e =>
        e.id === editingEntryId
          ? { ...e, date: selectedDate, amount: parsed, memo, categoryId, type: activeTab, ...(warikan ? { warikan: true, paidBy } : { warikan: undefined, paidBy: undefined }) }
          : e
      )
    } else {
      updated = [...entries, { id: Date.now().toString(), date: selectedDate, amount: parsed, memo, categoryId, type: activeTab, ...(warikan && { warikan: true, paidBy }) }]
    }
    setEntries(updated)
    localStorage.setItem('share-badget-entries', JSON.stringify(updated))
    setEditingEntryId(null)
    setDialogOpen(false)
  }

  const deleteEvent = (id: string) => {
    const updated = calendarEvents.filter(e => e.id !== id)
    setCalendarEvents(updated)
    localStorage.setItem('share-badget-events', JSON.stringify(updated))
  }

  const deleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id)
    setEntries(updated)
    localStorage.setItem('share-badget-entries', JSON.stringify(updated))
  }

  const updateCategories = (updated: Category[]) => {
    setCategories(updated)
    localStorage.setItem('share-badget-categories', JSON.stringify(updated))
  }

  const updateMembers = (updated: string[]) => {
    setMembers(updated)
    localStorage.setItem('share-badget-members', JSON.stringify(updated))
  }

  const updateFixedCosts = (updated: FixedCost[]) => {
    setFixedCosts(updated)
    localStorage.setItem('share-badget-fixed-costs', JSON.stringify(updated))
  }

  const prevMonth = () => {
    setFocusedDate(null)
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  const nextMonth = () => {
    setFocusedDate(null)
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const getEntriesForDay = (day: number) =>
    entries.filter(e => e.date === `${monthPrefix}-${String(day).padStart(2, '0')}`)

  const getEventsForDay = (day: number) =>
    calendarEvents.filter(e => e.date === `${monthPrefix}-${String(day).padStart(2, '0')}`)

  const totalExpense = entries
    .filter(e => e.date.startsWith(monthPrefix) && e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalIncome = entries
    .filter(e => e.date.startsWith(monthPrefix) && e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  const filteredCategories = categories.filter(c => c.type === activeTab)

  // 明細表示用のデータ
  const focusedEntries = focusedDate ? entries.filter(e => e.date === focusedDate) : []
  const focusedEvents = focusedDate ? calendarEvents.filter(e => e.date === focusedDate) : []
  const focusedExpenseTotal = focusedEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const focusedIncomeTotal = focusedEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const focusedDayLabel = (() => {
    if (!focusedDate) return ''
    const [y, m, d] = focusedDate.split('-').map(Number)
    const dow = DAYS_OF_WEEK[new Date(y, m - 1, d).getDay()]
    const dowColor = new Date(y, m - 1, d).getDay() === 0 ? 'text-red-500' : new Date(y, m - 1, d).getDay() === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
    return { month: m, day: d, dow, dowColor }
  })()

  const navTitle: Record<NavTab, string> = {
    calendar: '共有家計簿',
    manage: '管理',
    report: 'レポート',
    menu: 'メニュー',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm px-4 py-3 sticky top-0 z-10 flex items-center justify-between flex-shrink-0">
        <div className="w-20" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{navTitle[activeNav]}</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label={darkMode ? 'ライトモードに切替' : 'ダークモードに切替'}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
          <button
            onClick={() => setSettingsInfoOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="設定"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ページコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-16">

      {activeNav === 'manage' && (
        <ManagePage
          fixedCosts={fixedCosts}
          onUpdate={updateFixedCosts}
          categories={categories}
        />
      )}
      {activeNav === 'report' && (
        <ReportPage entries={entries} categories={categories} />
      )}
      {activeNav === 'menu' && (
        <MenuPage
          categories={categories}
          onUpdateCategories={updateCategories}
          members={members}
          onUpdateMembers={updateMembers}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      {activeNav === 'calendar' && <>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={prevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">{currentYear}年{currentMonth + 1}月</div>
          <div className="text-xs flex gap-3 justify-center mt-0.5">
            <span className="text-red-500">支出 ¥{totalExpense.toLocaleString()}</span>
            <span className="text-green-500">収入 ¥{totalIncome.toLocaleString()}</span>
          </div>
        </div>
        <button
          onClick={nextMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ›
        </button>
      </div>

      {/* Calendar */}
      <div className="border-t border-l border-gray-200 dark:border-gray-700">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7">
          {DAYS_OF_WEEK.map((day, i) => (
            <div
              key={day}
              className={`border-r border-b border-gray-200 dark:border-gray-700 text-center text-xs font-medium py-1.5 bg-gray-50 dark:bg-gray-800/60 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付セル */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[76px] border-r border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`
            const dayEntries = getEntriesForDay(day)
            const isToday = dateStr === todayStr
            const isFocused = dateStr === focusedDate
            const dayOfWeek = (firstDay + i) % 7
            const dayExpenseTotal = dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
            const dayIncomeTotal = dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
            const dayEvents = getEventsForDay(day)

            return (
              <div
                key={day}
                onClick={() => handleDayClick(dateStr)}
                className={`min-h-[76px] p-1 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors flex flex-col overflow-hidden ${
                  isFocused
                    ? 'bg-blue-50 dark:bg-blue-950/50'
                    : isToday
                    ? 'bg-blue-50/60 dark:bg-blue-950/20'
                    : 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                }`}
              >
                {/* 日付番号 */}
                <div
                  className={`text-xs font-semibold leading-none ${
                    dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {isToday ? (
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full text-white text-[10px]">
                      {day}
                    </span>
                  ) : day}
                </div>

                {/* 予定・収入・支出 */}
                <div className="mt-auto">
                  {dayEvents.length > 0 && (
                    <div className="space-y-px">
                      {dayEvents.map(ev => (
                        <div key={ev.id} className="text-[9px] text-purple-500 leading-tight truncate">
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  )}
                  {(dayIncomeTotal > 0 || dayExpenseTotal > 0) && (
                    <div className={`space-y-px ${dayEvents.length > 0 ? 'mt-1' : ''}`}>
                      {dayIncomeTotal > 0 && (
                        <div className="text-[9px] text-green-500 leading-tight text-right">
                          {dayIncomeTotal >= 10000 ? `+${(dayIncomeTotal / 10000).toFixed(1)}万` : `+¥${dayIncomeTotal.toLocaleString()}`}
                        </div>
                      )}
                      {dayExpenseTotal > 0 && (
                        <div className="text-[9px] text-red-500 leading-tight text-right">
                          {dayExpenseTotal >= 10000 ? `${(dayExpenseTotal / 10000).toFixed(1)}万` : `¥${dayExpenseTotal.toLocaleString()}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 日付の明細（カレンダー直下） */}
        {focusedDate && typeof focusedDayLabel === 'object' && (
          <div ref={detailRef} className="mt-0 bg-white dark:bg-gray-900 border-t-2 border-blue-400 dark:border-blue-500 overflow-hidden">
            {/* 明細ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-semibold text-gray-800 dark:text-gray-100">
                  {focusedDayLabel.month}月{focusedDayLabel.day}日
                </span>
                <span className={`ml-1 text-sm ${focusedDayLabel.dowColor}`}>
                  （{focusedDayLabel.dow}）
                </span>
                <div className="flex gap-3 mt-0.5 text-xs flex-wrap">
                  {focusedExpenseTotal > 0 && <span className="text-red-500">支出 ¥{focusedExpenseTotal.toLocaleString()}</span>}
                  {focusedIncomeTotal > 0 && <span className="text-green-500">収入 ¥{focusedIncomeTotal.toLocaleString()}</span>}
                  {focusedEvents.length > 0 && <span className="text-purple-500">予定 {focusedEvents.length}件</span>}
                </div>
              </div>
              <button
                onClick={() => setFocusedDate(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 予定セクション */}
            {focusedEvents.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-purple-50 dark:bg-purple-950/20">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">予定</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {focusedEvents.map(ev => (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3">
                      <span className="text-xl flex-shrink-0 mt-0.5">🗓️</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">{ev.title}</div>
                        {ev.note && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ev.note}</div>}
                      </div>
                      <button
                        onClick={() => openEditEvent(ev)}
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors"
                        aria-label="編集"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                        aria-label="削除"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 収支セクション */}
            {focusedEntries.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">収支</span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {focusedEntries.map(entry => {
                    const cat = categories.find(c => c.id === entry.categoryId)
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xl flex-shrink-0">{cat?.emoji ?? '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {cat?.name ?? '未分類'}
                            </span>
                            {entry.memo && (
                              <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                · {entry.memo}
                              </span>
                            )}
                            {entry.warikan && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                                割り勘{entry.paidBy ? ` · ${entry.paidBy}` : ''}
                              </span>
                            )}
                          </div>
                          <div className={`text-sm font-semibold ${
                            entry.type === 'expense' ? 'text-red-500' : 'text-green-500'
                          }`}>
                            {entry.type === 'income' ? '+' : '-'}¥{entry.amount.toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={() => openEditEntry(entry)}
                          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/40 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors"
                          aria-label="編集"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-900/40 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors"
                          aria-label="削除"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 空状態 */}
            {focusedEntries.length === 0 && focusedEvents.length === 0 && (
              <div className="flex flex-col items-center py-8 text-gray-400 dark:text-gray-600">
                <span className="text-3xl mb-1">📭</span>
                <p className="text-sm">この日の記録はありません</p>
              </div>
            )}

            {/* 追加ボタン */}
            <div className="px-4 py-3 border-t border-gray-50 dark:border-gray-800 flex gap-2">
              <button
                onClick={() => openDialog(focusedDate!)}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium text-sm transition-colors"
              >
                + 収支を追加
              </button>
              <button
                onClick={() => openDialog(focusedDate!, 'event')}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-medium text-sm transition-colors"
              >
                + 予定を追加
              </button>
            </div>
          </div>
        )}
      </div>

      </> /* end activeNav === 'calendar' */}

      </main>

      {/* FAB (カレンダーのみ) */}
      {activeNav === 'calendar' && (
        <button
          onClick={() => openDialog(todayStr)}
          className="fixed bottom-20 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light transition-colors z-10"
          aria-label="追加"
        >
          +
        </button>
      )}

      {/* 追加ダイアログ */}
      {dialogOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-20"
          onClick={e => { if (e.target === e.currentTarget) setDialogOpen(false) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-t-2xl w-full max-w-lg px-6 pt-5 pb-10 shadow-xl">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4" />

            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-5">
              {(['expense', 'income', 'event'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? `bg-white dark:bg-gray-700 shadow-sm ${
                          tab === 'expense' ? 'text-red-500' : tab === 'income' ? 'text-green-500' : 'text-purple-500'
                        }`
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab === 'expense' ? '支出' : tab === 'income' ? '収入' : '予定'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">日付</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                />
              </div>

              {activeTab === 'event' ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">タイトル</label>
                    <input
                      type="text"
                      placeholder="例：旅行、誕生日..."
                      value={eventTitle}
                      onChange={e => setEventTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEntry() }}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">メモ（任意）</label>
                    <input
                      type="text"
                      placeholder="詳細を入力..."
                      value={eventNote}
                      onChange={e => setEventNote(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEntry() }}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">金額（円）</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEntry() }}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">メモ（任意）</label>
                    <input
                      type="text"
                      placeholder="例：スーパー、外食..."
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEntry() }}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">カテゴリ</label>
                {filteredCategories.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {filteredCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id)}
                        className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-colors ${
                          categoryId === c.id
                            ? activeTab === 'expense'
                              ? 'border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-500'
                              : 'border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-500'
                            : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-2xl leading-none">{c.emoji}</span>
                        <span className={`text-xs font-medium leading-tight text-center ${
                          categoryId === c.id
                            ? activeTab === 'expense' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-300'
                        }`}>
                          {c.name}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 py-2">
                    カテゴリがありません。
                    <button
                      onClick={() => { setDialogOpen(false); setActiveNav('menu') }}
                      className="text-blue-500 underline ml-1"
                    >
                      設定から追加
                    </button>
                  </p>
                )}
                  </div>

                  {/* 割り勘 */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300">割り勘</label>
                  <button
                    type="button"
                    onClick={() => { setWarikan(w => !w); setPaidBy('') }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      warikan ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    aria-label="割り勘トグル"
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                      warikan ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {warikan && (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">
                      立替者
                    </label>
                    {members.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPaidBy(prev => prev === m ? '' : m)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                              paidBy === m
                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        メンバーがいません。
                        <button
                          onClick={() => { setDialogOpen(false); setActiveNav('menu') }}
                          className="text-blue-500 underline ml-1"
                        >
                          設定から追加
                        </button>
                      </p>
                    )}
                  </div>
                )}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setDialogOpen(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveEntry}
                disabled={activeTab === 'event' ? !eventTitle.trim() : (!amount || Number(amount) <= 0)}
                className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors text-white disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 ${
                  activeTab === 'expense'
                    ? 'bg-red-500 hover:bg-red-600'
                    : activeTab === 'income'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                {editingEntryId || editingEventId ? '保存' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center z-20">
        {([
          {
            key: 'calendar' as NavTab,
            label: 'カレンダー',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            ),
          },
          {
            key: 'manage' as NavTab,
            label: '管理',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/>
                <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                <line x1="12" y1="12" x2="12" y2="16"/>
                <line x1="10" y1="14" x2="14" y2="14"/>
              </svg>
            ),
          },
          {
            key: 'report' as NavTab,
            label: 'レポート',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            ),
          },
          {
            key: 'menu' as NavTab,
            label: 'メニュー',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            ),
          },
        ] as const).map(item => (
          <button
            key={item.key}
            onClick={() => { setDialogOpen(false); setActiveNav(item.key) }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 h-full transition-colors ${
              activeNav === item.key
                ? 'text-blue-500'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
