'use client'

import { useState, useEffect, useRef } from 'react'
import type { Entry, Category, CalendarEvent, FixedCost } from '../types'
import { DEFAULT_CATEGORIES, EVENT_COLORS } from '../types'
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

  // 日付ごとの明細グループへのスクロール参照
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})

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
  const [eventEndDate, setEventEndDate] = useState(todayStr)
  const [eventColor, setEventColor] = useState(EVENT_COLORS[0])

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
    if (storedEvents) {
      const parsed = JSON.parse(storedEvents) as Partial<CalendarEvent>[]
      setCalendarEvents(parsed.map(e => ({
        id: e.id!,
        date: e.date!,
        endDate: e.endDate ?? e.date!,
        title: e.title!,
        note: e.note,
        color: e.color ?? EVENT_COLORS[0],
      })))
    }
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

  // 1クリック → 明細へスクロール、ダブルクリック → 追加ダイアログ
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
        groupRefs.current[dateStr]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    setEventEndDate(dateStr)
    setEventColor(EVENT_COLORS[0])
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
    setEventEndDate(ev.endDate)
    setEventColor(ev.color)
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
      const start = selectedDate <= eventEndDate ? selectedDate : eventEndDate
      const end = selectedDate <= eventEndDate ? eventEndDate : selectedDate
      let updated: CalendarEvent[]
      if (editingEventId) {
        updated = calendarEvents.map(e =>
          e.id === editingEventId
            ? { ...e, date: start, endDate: end, title: eventTitle.trim(), note: eventNote.trim() || undefined, color: eventColor }
            : e
        )
      } else {
        updated = [...calendarEvents, { id: Date.now().toString(), date: start, endDate: end, title: eventTitle.trim(), note: eventNote.trim() || undefined, color: eventColor }]
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

  const deleteFromDialog = () => {
    if (editingEntryId) deleteEntry(editingEntryId)
    if (editingEventId) deleteEvent(editingEventId)
    setEditingEntryId(null)
    setEditingEventId(null)
    setDialogOpen(false)
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
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  const getEntriesForDay = (day: number) =>
    entries.filter(e => e.date === `${monthPrefix}-${String(day).padStart(2, '0')}`)

  // 週ごとのセル配列（帯を週単位のグリッドで描画するため）
  type WeekCell = { day: number | null; dateStr: string | null }
  const weekCount = Math.ceil((firstDay + daysInMonth) / 7)
  const weeks: WeekCell[][] = Array.from({ length: weekCount }, (_, w) =>
    Array.from({ length: 7 }, (_, c) => {
      const day = w * 7 + c - firstDay + 1
      return day >= 1 && day <= daysInMonth
        ? { day, dateStr: `${monthPrefix}-${String(day).padStart(2, '0')}` }
        : { day: null, dateStr: null }
    })
  )

  type EventLane = { event: CalendarEvent; colStart: number; colEnd: number; isStart: boolean; isEnd: boolean }

  // 週内で予定を重ならないレーンに割り当てる（帯表示用）
  const getWeekLanes = (week: WeekCell[]): EventLane[][] => {
    const definedIdx = week.map((c, i) => (c.dateStr ? i : -1)).filter(i => i >= 0)
    if (definedIdx.length === 0) return []
    const weekMin = week[definedIdx[0]].dateStr!
    const weekMax = week[definedIdx[definedIdx.length - 1]].dateStr!
    const overlapping = calendarEvents
      .filter(e => e.date <= weekMax && e.endDate >= weekMin)
      .sort((a, b) => a.date.localeCompare(b.date) || b.endDate.localeCompare(a.endDate))

    const segments: EventLane[] = overlapping.map(e => {
      const startIdx = definedIdx.find(i => week[i].dateStr! >= e.date) ?? definedIdx[0]
      const endCandidates = definedIdx.filter(i => week[i].dateStr! <= e.endDate)
      const endIdx = endCandidates.length > 0 ? endCandidates[endCandidates.length - 1] : definedIdx[definedIdx.length - 1]
      return { event: e, colStart: startIdx, colEnd: endIdx, isStart: e.date >= weekMin, isEnd: e.endDate <= weekMax }
    })

    const lanes: EventLane[][] = []
    for (const seg of segments) {
      const lane = lanes.find(l => l.every(s => seg.colStart > s.colEnd || seg.colEnd < s.colStart))
      if (lane) lane.push(seg)
      else lanes.push([seg])
    }
    return lanes
  }

  const totalExpense = entries
    .filter(e => e.date.startsWith(monthPrefix) && e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)

  const totalIncome = entries
    .filter(e => e.date.startsWith(monthPrefix) && e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0)

  const filteredCategories = categories.filter(c => c.type === activeTab)

  // 月内の明細（日付ごとにグルーピング、新しい日付順）
  const monthEntries = entries.filter(e => e.date.startsWith(monthPrefix))
  const monthEvents = calendarEvents.filter(e => e.date.startsWith(monthPrefix))
  const groupDates = Array.from(new Set([...monthEntries.map(e => e.date), ...monthEvents.map(e => e.date)]))
    .sort((a, b) => b.localeCompare(a))

  const navTitle: Record<NavTab, string> = {
    calendar: 'カレンダー',
    manage: '管理',
    report: 'レポート',
    menu: 'メニュー',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-black shadow-sm dark:shadow-none dark:border-b dark:border-gray-800 px-4 py-3 sticky top-0 z-10 flex items-center justify-between flex-shrink-0">
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
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={prevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ‹
        </button>
        <div className="text-center bg-gray-100 dark:bg-gray-800/70 rounded-2xl px-4 py-2">
          <span className="text-base font-bold text-gray-800 dark:text-gray-100">
            {currentYear}年{currentMonth + 1}月
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            （{currentMonth + 1}月1日－{currentMonth + 1}月{daysInMonth}日）
          </span>
        </div>
        <button
          onClick={nextMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ›
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-black">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7">
          {DAYS_OF_WEEK.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-medium py-2 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 日付セル（週単位：日付 → 予定の帯 → 金額 の順） */}
        {weeks.map((week, wi) => {
          // カレンダー上は1週あたり予定を1本だけ表示（重なる分は明細一覧で確認）
          const lanes = getWeekLanes(week).slice(0, 1)
          return (
            <div key={wi} className="pb-1">
              {/* 日付番号 */}
              <div className="grid grid-cols-7">
                {week.map((cell, ci) => {
                  if (!cell.dateStr || cell.day === null) {
                    return <div key={`empty-${wi}-${ci}`} className="h-6" />
                  }
                  const isToday = cell.dateStr === todayStr
                  const isFuture = cell.dateStr > todayStr
                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => handleDayClick(cell.dateStr!)}
                      className={`px-1.5 pt-1 pb-0.5 cursor-pointer ${isFuture ? 'opacity-40' : ''}`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 text-xs font-semibold leading-none rounded-full ${
                          isToday
                            ? 'bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-900'
                            : ci === 0 ? 'text-red-500' : ci === 6 ? 'text-blue-500' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {cell.day}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 予定の帯（一番上） */}
              {lanes.length > 0 && (
                <div className="px-1 space-y-0.5 mb-0.5">
                  {lanes.map((lane, li) => (
                    <div key={li} className="grid grid-cols-7 gap-x-0.5">
                      {lane.map(seg => (
                        <div
                          key={seg.event.id}
                          onClick={() => openEditEvent(seg.event)}
                          style={{
                            backgroundColor: seg.event.color,
                            gridColumnStart: seg.colStart + 1,
                            gridColumnEnd: seg.colEnd + 2,
                          }}
                          className={`text-white text-[10px] font-medium px-1.5 py-0.5 truncate leading-tight cursor-pointer ${
                            seg.isStart ? 'rounded-l-md' : ''
                          } ${seg.isEnd ? 'rounded-r-md' : ''}`}
                        >
                          {seg.event.title}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* 金額 */}
              <div className="grid grid-cols-7">
                {week.map((cell, ci) => {
                  if (!cell.dateStr || cell.day === null) {
                    return <div key={`empty-amt-${wi}-${ci}`} />
                  }
                  const dayEntries = getEntriesForDay(cell.day)
                  const isFuture = cell.dateStr > todayStr
                  const dayExpenseTotal = dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
                  const dayIncomeTotal = dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
                  return (
                    <div
                      key={`${cell.dateStr}-amt`}
                      onClick={() => handleDayClick(cell.dateStr!)}
                      className={`px-1.5 cursor-pointer ${isFuture ? 'opacity-40' : ''}`}
                    >
                      {dayIncomeTotal > 0 && (
                        <div className="text-[10px] text-sky-500 leading-tight text-right">
                          {dayIncomeTotal.toLocaleString()}
                        </div>
                      )}
                      {dayExpenseTotal > 0 && (
                        <div className="text-[10px] text-orange-500 leading-tight text-right">
                          {dayExpenseTotal.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* サマリーバー */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-800 bg-gray-50 dark:bg-gray-900/60 border-y border-gray-200 dark:border-gray-800 py-3">
        <div className="text-center">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">収入</div>
          <div className="text-sm font-bold text-sky-500">{totalIncome.toLocaleString()}円</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">支出</div>
          <div className="text-sm font-bold text-red-500">{totalExpense.toLocaleString()}円</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">合計</div>
          <div className="text-sm font-bold text-red-500">
            {totalIncome - totalExpense < 0 ? '-' : ''}{Math.abs(totalIncome - totalExpense).toLocaleString()}円
          </div>
        </div>
      </div>

      {/* 月内の明細（日付ごとにグルーピング） */}
      <div className="bg-white dark:bg-black divide-y divide-gray-100 dark:divide-gray-800">
        {groupDates.map(dateStr => {
          const [y, m, d] = dateStr.split('-').map(Number)
          const dowIdx = new Date(y, m - 1, d).getDay()
          const dow = DAYS_OF_WEEK[dowIdx]
          const dowColor = dowIdx === 0 ? 'text-red-500' : dowIdx === 6 ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'
          const dayEntries = monthEntries.filter(e => e.date === dateStr)
          const dayEvents = monthEvents.filter(e => e.date === dateStr)
          const dayExpense = dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
          const dayIncome = dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
          const dayNet = dayIncome - dayExpense

          return (
            <div key={dateStr} ref={el => { groupRefs.current[dateStr] = el }}>
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/60">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {y}年{m}月{d}日<span className={`ml-1 font-normal ${dowColor}`}>（{dow}）</span>
                </span>
                {dayNet !== 0 && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {dayNet > 0 ? '+' : '-'}{Math.abs(dayNet).toLocaleString()}円
                  </span>
                )}
              </div>

              {dayEvents.map(ev => (
                <button
                  key={ev.id}
                  onClick={() => openEditEvent(ev)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 text-left"
                >
                  <span className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: ev.color }} />
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                    {ev.title}
                    {ev.endDate !== ev.date && (
                      <span className="text-gray-400 dark:text-gray-500 font-normal">
                        　{Number(ev.date.split('-')[1])}/{Number(ev.date.split('-')[2])}〜{Number(ev.endDate.split('-')[1])}/{Number(ev.endDate.split('-')[2])}
                      </span>
                    )}
                    {ev.note && <span className="text-gray-400 dark:text-gray-500 font-normal">　（{ev.note}）</span>}
                  </span>
                  <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">›</span>
                </button>
              ))}

              {dayEntries.map(entry => {
                const cat = categories.find(c => c.id === entry.categoryId)
                return (
                  <button
                    key={entry.id}
                    onClick={() => openEditEntry(entry)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-900 text-left"
                  >
                    <span className="text-xl flex-shrink-0">{cat?.emoji ?? '📌'}</span>
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                      {cat?.name ?? '未分類'}
                      {entry.memo && <span className="text-gray-400 dark:text-gray-500 font-normal">　（{entry.memo}）</span>}
                      {entry.warikan && (
                        <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                          割り勘{entry.paidBy ? ` · ${entry.paidBy}` : ''}
                        </span>
                      )}
                    </span>
                    <span className="text-base font-bold text-gray-800 dark:text-gray-100 flex-shrink-0">
                      {entry.amount.toLocaleString()}円
                    </span>
                    <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">›</span>
                  </button>
                )
              })}
            </div>
          )
        })}

        {groupDates.length === 0 && (
          <div className="flex flex-col items-center py-10 text-gray-400 dark:text-gray-600">
            <span className="text-3xl mb-1">📭</span>
            <p className="text-sm">この月の記録はありません</p>
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
          className="fixed inset-0 bg-black/50 flex items-end justify-center z-30"
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
              {activeTab === 'event' ? (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">開始日</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={e => setSelectedDate(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">終了日</label>
                    <input
                      type="date"
                      value={eventEndDate}
                      onChange={e => setEventEndDate(e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-1">日付</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                  />
                </div>
              )}

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
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">色</label>
                    <div className="flex flex-wrap gap-2">
                      {EVENT_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEventColor(c)}
                          aria-label={`色 ${c}`}
                          className={`w-8 h-8 rounded-full transition-transform ${eventColor === c ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900 scale-110' : ''}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
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

            <div className="flex items-center gap-3 mt-6">
              {(editingEntryId || editingEventId) && (
                <button
                  onClick={deleteFromDialog}
                  className="py-3 px-4 rounded-xl text-red-500 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  削除
                </button>
              )}
              <div className="flex-1 flex gap-3">
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
        </div>
      )}

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 flex items-center z-20">
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

      <SettingsInfoModal open={settingsInfoOpen} onClose={() => setSettingsInfoOpen(false)} />
    </div>
  )
}
