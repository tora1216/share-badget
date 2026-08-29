'use client'

import { useState, useEffect, useRef } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import type { Entry, Category, CalendarEvent, FixedCost, WarikanSplitMethod, Participant } from '../types'
import { DEFAULT_CATEGORIES, EVENT_COLORS } from '../types'
import { splitEqual, splitByRatio } from '../../lib/warikan'
import { db, auth } from '../../lib/firebase'
import type { UserRooms } from '../../lib/rooms'
import { getWarikanDefaults, setWarikanDefaults as persistWarikanDefaults, DEFAULT_WARIKAN_DEFAULTS, type WarikanDefaults } from '../../lib/settings'
import ManagePage from './ManagePage'
import ReportPage from './ReportPage'
import WarikanListPage from './WarikanListPage'
import MenuPage from './MenuPage'
import SettingsInfoModal from './SettingsInfoModal'
import LoginPage from './LoginPage'
import RoomGate from './RoomGate'
import RoomListModal from './RoomListModal'

type NavTab = 'calendar' | 'manage' | 'report' | 'warikan' | 'menu'

const DAYS_OF_WEEK = ['日', '月', '火', '水', '木', '金', '土']

export default function CalendarPage() {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [userRooms, setUserRooms] = useState<UserRooms | null>(null)
  const [userRoomsChecked, setUserRoomsChecked] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [entries, setEntries] = useState<Entry[]>([])
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [members, setMembers] = useState<string[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [darkMode, setDarkMode] = useState(false)
  const [warikanDefaults, setWarikanDefaultsState] = useState<WarikanDefaults>(DEFAULT_WARIKAN_DEFAULTS)

  const activeGroupId = userRooms?.mainRoomId || ''
  const myDisplayName = participants.find(p => p.uid === authUser?.uid)?.displayName ?? authUser?.displayName ?? ''

  // 日付ごとの明細グループへのスクロール参照
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // 追加ダイアログ state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'expense' | 'event'>('expense')
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [warikan, setWarikan] = useState(false)
  const [paidBy, setPaidBy] = useState('')
  const [warikanParticipants, setWarikanParticipants] = useState<string[]>([])
  const [warikanSettled, setWarikanSettled] = useState(false)
  const [warikanSplitMethod, setWarikanSplitMethod] = useState<WarikanSplitMethod>('equal')
  const [warikanRatios, setWarikanRatios] = useState<Record<string, number>>({})
  const [warikanAmounts, setWarikanAmounts] = useState<Record<string, number>>({})
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
  const [roomListOpen, setRoomListOpen] = useState(false)
  const [addingRoom, setAddingRoom] = useState(false)

  // ダブルクリック検出用
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastClickedDateRef = useRef<string | null>(null)

  // ダークモードは端末ごとの表示設定なので今まで通り localStorage のまま
  useEffect(() => {
    const isDark = localStorage.getItem('share-badget-dark') === 'true'
    setDarkMode(isDark)
  }, [])

  // 割り勘のデフォルト設定も端末（ユーザー）ごとのローカル設定
  useEffect(() => {
    setWarikanDefaultsState(getWarikanDefaults())
  }, [])

  const saveWarikanDefaults = (next: WarikanDefaults) => {
    persistWarikanDefaults(next)
    setWarikanDefaultsState(next)
  }

  // Googleログイン状態を確認
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, user => {
      setAuthUser(user)
      setAuthChecked(true)
      if (!user) {
        setUserRooms(null)
        setUserRoomsChecked(true)
      }
    })
    return () => unsubAuth()
  }, [])

  // ログインしているユーザーが所属しているルーム一覧を購読
  useEffect(() => {
    if (!authUser) return
    setUserRoomsChecked(false)
    const unsub = onSnapshot(doc(db, 'users', authUser.uid), snap => {
      setUserRooms(snap.exists() ? (snap.data() as UserRooms) : { rooms: [], mainRoomId: '' })
      setUserRoomsChecked(true)
    })
    return () => unsub()
  }, [authUser])

  // メインルームが決まったら Firestore の各ドキュメントに購読を張る（リアルタイム共有）
  useEffect(() => {
    if (!activeGroupId) return
    const col = (name: string) => doc(db, 'groups', activeGroupId, 'data', name)
    const unsubscribers = [
      onSnapshot(col('entries'), snap => {
        setEntries((snap.data()?.items as Entry[]) ?? [])
      }),
      onSnapshot(col('categories'), snap => {
        const items = snap.data()?.items as Category[] | undefined
        setCategories(items && items.length > 0 ? items : DEFAULT_CATEGORIES)
      }),
      onSnapshot(col('members'), snap => {
        setMembers((snap.data()?.items as string[]) ?? [])
      }),
      onSnapshot(col('participants'), snap => {
        setParticipants((snap.data()?.items as Participant[]) ?? [])
      }),
      onSnapshot(col('fixedCosts'), snap => {
        setFixedCosts((snap.data()?.items as FixedCost[]) ?? [])
      }),
      onSnapshot(col('events'), snap => {
        const items = (snap.data()?.items as Partial<CalendarEvent>[]) ?? []
        setCalendarEvents(items.map(e => ({
          id: e.id!,
          date: e.date!,
          endDate: e.endDate ?? e.date!,
          title: e.title!,
          note: e.note,
          color: e.color ?? EVENT_COLORS[0],
        })))
      }),
      onSnapshot(col('meta'), snap => {
        setRoomName((snap.data()?.name as string | undefined) ?? '')
      }),
    ]
    return () => unsubscribers.forEach(u => u())
  }, [activeGroupId])

  const switchRoom = (groupId: string) => {
    if (!authUser || !userRooms) return
    setDoc(doc(db, 'users', authUser.uid), { rooms: userRooms.rooms, mainRoomId: groupId })
      .catch(err => console.error('ルームの切り替えに失敗しました', err))
  }

  const leaveRoom = () => {
    if (!authUser || !userRooms) return
    const remaining = userRooms.rooms.filter(r => r.groupId !== activeGroupId)
    const nextMainRoomId = remaining.length > 0 ? remaining[remaining.length - 1].groupId : ''
    setDoc(doc(db, 'users', authUser.uid), { rooms: remaining, mainRoomId: nextMainRoomId })
      .catch(err => console.error('ルームを離れる処理に失敗しました', err))
    setEntries([])
    setCategories(DEFAULT_CATEGORIES)
    setMembers([])
    setParticipants([])
    setCalendarEvents([])
    setFixedCosts([])
    setRoomName('')
  }

  const renameDisplayName = (name: string) => {
    const trimmed = name.trim()
    const uid = authUser?.uid
    if (!trimmed || !uid || !activeGroupId) return
    if (!members.includes(trimmed)) writeGroupData('members', [...members, trimmed])
    writeGroupData('participants', participants.map(p => (p.uid === uid ? { ...p, displayName: trimmed } : p)))
  }

  // 割り勘方法・金額・参加メンバーの変更に応じてメンバー別の割り勘額を再計算
  useEffect(() => {
    if (!warikan) return
    if (warikanSplitMethod === 'amount') {
      setWarikanAmounts(prev => {
        const next: Record<string, number> = {}
        warikanParticipants.forEach(m => { next[m] = prev[m] ?? 0 })
        return next
      })
      return
    }
    const n = warikanParticipants.length
    if (n === 0) { setWarikanAmounts({}); return }
    const total = Number(amount) || 0
    const amounts = warikanSplitMethod === 'equal'
      ? splitEqual(total, n)
      : splitByRatio(total, warikanParticipants.map(m => warikanRatios[m] ?? 50))
    const next: Record<string, number> = {}
    warikanParticipants.forEach((m, i) => { next[m] = amounts[i] })
    setWarikanAmounts(next)
  }, [warikan, warikanSplitMethod, amount, warikanParticipants, warikanRatios])

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

  const firstCategoryId = () =>
    categories.find(c => c.type === 'expense')?.id ?? ''

  const openDialog = (dateStr: string, tab: 'expense' | 'event' = 'expense') => {
    setEditingEntryId(null)
    setEditingEventId(null)
    setSelectedDate(dateStr)
    setActiveTab(tab)
    setAmount('')
    setMemo('')
    setCategoryId(firstCategoryId())
    setWarikan(warikanDefaults.defaultOn)
    setPaidBy(warikanDefaults.defaultOn ? myDisplayName : '')
    resetWarikanDetails()
    setEventTitle('')
    setEventNote('')
    setEventEndDate(dateStr)
    setEventColor(EVENT_COLORS[0])
    setDialogOpen(true)
  }

  const resetWarikanDetails = () => {
    setWarikanParticipants(members)
    setWarikanSettled(false)
    setWarikanSplitMethod(warikanDefaults.splitMethod)
    setWarikanRatios({})
    setWarikanAmounts({})
  }

  const openEditEntry = (entry: Entry) => {
    setEditingEntryId(entry.id)
    setEditingEventId(null)
    setSelectedDate(entry.date)
    setActiveTab('expense')
    setAmount(String(entry.amount))
    setMemo(entry.memo)
    setCategoryId(entry.categoryId)
    setWarikan(entry.warikan ?? false)
    setPaidBy(entry.paidBy ?? '')
    setWarikanParticipants(entry.warikanParticipants ?? members)
    setWarikanSettled(entry.warikanSettled ?? false)
    setWarikanSplitMethod(entry.warikanSplitMethod ?? 'equal')
    setWarikanRatios({})
    setWarikanAmounts(entry.warikanSplits ?? {})
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
    resetWarikanDetails()
    setDialogOpen(true)
  }

  const handleTabChange = (tab: 'expense' | 'event') => {
    setActiveTab(tab)
    if (tab !== 'event') setCategoryId(firstCategoryId())
  }

  // グループのFirestoreドキュメントを丸ごと上書き保存する（このアプリは配列全体を1ドキュメントに保存する方式）
  const writeGroupData = (name: string, items: unknown[]) => {
    if (!activeGroupId) return
    setDoc(doc(db, 'groups', activeGroupId, 'data', name), { items })
      .catch(err => console.error(`Firestoreへの書き込みに失敗しました (${name})`, err))
  }

  // 固定費のうち、今月分の支出としてまだ計上されていないものを一覧化する
  const thisMonthPrefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const pendingFixedCosts = fixedCosts.filter(f =>
    f.type === 'expense' &&
    !entries.some(e => e.fixedCostId === f.id && e.date.startsWith(thisMonthPrefix))
  )

  // ボタン操作で、今月分の固定費をまとめて支出として追加する
  const addThisMonthFixedCosts = () => {
    if (pendingFixedCosts.length === 0) return
    const dateStr = `${thisMonthPrefix}-01`
    const newEntries: Entry[] = pendingFixedCosts.map(f => ({
      id: `${Date.now()}-${f.id}`,
      date: dateStr,
      amount: f.amount,
      memo: f.memo ?? '',
      categoryId: f.categoryId,
      type: 'expense',
      fixedCostId: f.id,
      ...(f.warikan
        ? {
            warikan: true as const,
            paidBy: f.paidBy,
            warikanParticipants: f.warikanParticipants,
            warikanSettled: false,
            warikanSplitMethod: f.warikanSplitMethod,
            warikanSplits: f.warikanSplits,
          }
        : {}),
    }))
    writeGroupData('entries', [...entries, ...newEntries])
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
      writeGroupData('events', updated)
      setEditingEventId(null)
      setDialogOpen(false)
      return
    }
    const warikanTotal = warikanParticipants.reduce((s, m) => s + (warikanAmounts[m] ?? 0), 0)
    const parsed = warikan ? warikanTotal : Number(amount)
    if (!parsed || isNaN(parsed) || parsed <= 0) return
    const warikanFields = warikan
      ? {
          warikan: true as const,
          paidBy,
          warikanParticipants,
          warikanSettled,
          warikanSplitMethod,
          warikanSplits: Object.fromEntries(warikanParticipants.map(m => [m, warikanAmounts[m] ?? 0])),
        }
      : {
          warikan: undefined,
          paidBy: undefined,
          warikanParticipants: undefined,
          warikanSettled: undefined,
          warikanSplitMethod: undefined,
          warikanSplits: undefined,
        }
    let updated: Entry[]
    if (editingEntryId) {
      updated = entries.map(e =>
        e.id === editingEntryId
          ? { ...e, date: selectedDate, amount: parsed, memo, categoryId, type: activeTab, ...warikanFields }
          : e
      )
    } else {
      updated = [...entries, { id: Date.now().toString(), date: selectedDate, amount: parsed, memo, categoryId, type: activeTab, ...warikanFields }]
    }
    writeGroupData('entries', updated)
    setEditingEntryId(null)
    setDialogOpen(false)
  }

  const deleteEvent = (id: string) => {
    const updated = calendarEvents.filter(e => e.id !== id)
    writeGroupData('events', updated)
  }

  const deleteEntry = (id: string) => {
    const updated = entries.filter(e => e.id !== id)
    writeGroupData('entries', updated)
  }

  const toggleEntrySettled = (id: string) => {
    const updated = entries.map(e => (e.id === id ? { ...e, warikanSettled: !e.warikanSettled } : e))
    writeGroupData('entries', updated)
  }

  const settleAllUnsettled = () => {
    const updated = entries.map(e => (e.warikan && !e.warikanSettled ? { ...e, warikanSettled: true } : e))
    writeGroupData('entries', updated)
  }

  const deleteFromDialog = () => {
    if (!confirm('削除しますか？')) return
    if (editingEntryId) deleteEntry(editingEntryId)
    if (editingEventId) deleteEvent(editingEventId)
    setEditingEntryId(null)
    setEditingEventId(null)
    setDialogOpen(false)
  }

  const updateCategories = (updated: Category[]) => {
    writeGroupData('categories', updated)
  }

  const updateMembers = (updated: string[]) => {
    writeGroupData('members', updated)
  }

  const updateFixedCosts = (updated: FixedCost[]) => {
    writeGroupData('fixedCosts', updated)
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1) }
    else setCurrentMonth(currentMonth - 1)
  }

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1) }
    else setCurrentMonth(currentMonth + 1)
  }

  const yearOptions = Array.from(new Set([
    ...Array.from({ length: 8 }, (_, i) => today.getFullYear() - 6 + i),
    currentYear,
  ])).sort((a, b) => a - b)

  const firstDay = new Date(currentYear, currentMonth, 1).getDay()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const monthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

  // 固定費から自動生成された支出はカレンダー上には表示しない（固定費タブ・精算・レポートには表示される）
  const calendarEntries = entries.filter(e => !e.fixedCostId)

  const getEntriesForDay = (day: number) =>
    calendarEntries.filter(e => e.date === `${monthPrefix}-${String(day).padStart(2, '0')}`)

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

  const totalExpense = calendarEntries
    .filter(e => e.date.startsWith(monthPrefix) && e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0)

  const unsettledTotal = entries
    .filter(e => e.warikan && !e.warikanSettled)
    .reduce((sum, e) => sum + e.amount, 0)

  const fixedCostTotal = fixedCosts
    .filter(f => f.type === 'expense')
    .reduce((sum, f) => sum + f.amount, 0)

  const filteredCategories = categories.filter(c => c.type === activeTab)

  // 月内の明細（日付ごとにグルーピング、新しい日付順）。予定はカレンダー上にのみ表示するため明細一覧には含めない
  const monthEntries = calendarEntries.filter(e => e.date.startsWith(monthPrefix))
  const groupDates = Array.from(new Set(monthEntries.map(e => e.date)))
    .sort((a, b) => b.localeCompare(a))

  const navTitle: Record<NavTab, string> = {
    calendar: 'カレンダー',
    manage: '固定費',
    report: 'レポート',
    warikan: '精算',
    menu: 'メニュー',
  }

  const activeRoom = userRooms?.rooms.find(r => r.groupId === activeGroupId)

  if (!authChecked) return null
  if (!authUser) return <LoginPage />
  if (!userRoomsChecked) return null
  if (!activeGroupId) return <RoomGate currentUser={authUser} />
  if (addingRoom) {
    return (
      <RoomGate
        currentUser={authUser}
        defaultNickname={myDisplayName}
        onDone={() => setAddingRoom(false)}
        onCancel={() => setAddingRoom(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      {/* Header */}
      <header className="bg-white/70 dark:bg-black/50 backdrop-blur-xl backdrop-saturate-150 shadow-sm dark:shadow-none dark:border-b dark:border-white/10 px-4 py-3 sticky top-0 z-10 flex items-center justify-between flex-shrink-0">
        <div className="w-20 flex items-center">
          <button
            onClick={() => setRoomListOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="ルーム一覧"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </button>
        </div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{navTitle[activeNav]}</h1>
        <div className="w-20 flex items-center justify-end">
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
      <main className="flex-1 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))]">

      {activeNav === 'manage' && (
        <ManagePage
          fixedCosts={fixedCosts}
          onUpdate={updateFixedCosts}
          members={members}
          displayName={myDisplayName}
          warikanDefaults={warikanDefaults}
          pendingCount={pendingFixedCosts.length}
          onAddThisMonth={addThisMonthFixedCosts}
        />
      )}
      {activeNav === 'report' && (
        <ReportPage entries={entries} categories={categories} />
      )}
      {activeNav === 'warikan' && (
        <WarikanListPage
          entries={entries}
          categories={categories}
          onToggleSettled={toggleEntrySettled}
          onSettleAll={settleAllUnsettled}
          onOpenEntry={openEditEntry}
        />
      )}
      {activeNav === 'menu' && (
        <MenuPage
          roomName={roomName}
          roomInviteCode={activeRoom?.inviteCode ?? ''}
          roomPassphrase={activeRoom?.passphrase ?? ''}
          displayName={myDisplayName}
          photoURL={authUser.photoURL ?? undefined}
          onRenameDisplayName={renameDisplayName}
          onLeaveRoom={leaveRoom}
          participants={participants}
        />
      )}

      {activeNav === 'calendar' && <>
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white dark:bg-black border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={prevMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ‹
        </button>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/70 rounded-2xl px-2 py-1">
          <select
            value={currentYear}
            onChange={e => setCurrentYear(Number(e.target.value))}
            className="bg-transparent text-base font-bold text-gray-800 dark:text-gray-100 focus:outline-none appearance-none text-right pl-1"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select
            value={currentMonth}
            onChange={e => setCurrentMonth(Number(e.target.value))}
            className="bg-transparent text-base font-bold text-gray-800 dark:text-gray-100 focus:outline-none appearance-none pr-1"
          >
            {Array.from({ length: 12 }, (_, i) => i).map(m => (
              <option key={m} value={m}>{m + 1}月</option>
            ))}
          </select>
        </div>
        <button
          onClick={nextMonth}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-2xl text-gray-600 dark:text-gray-300"
        >
          ›
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-black">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
          {DAYS_OF_WEEK.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-medium py-1 ${
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
            <div
              key={wi}
              className={`relative pb-1 ${wi > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}
            >
              {/* 縦の罫線（予定の帯があっても週全体で途切れないよう別レイヤーで描画） */}
              <div className="absolute inset-0 grid grid-cols-7 divide-x divide-gray-200 dark:divide-gray-700 pointer-events-none">
                {Array.from({ length: 7 }, (_, i) => <div key={i} />)}
              </div>

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
                      className={`px-1.5 pt-1 pb-0.5 text-left cursor-pointer ${isFuture ? 'opacity-40' : ''}`}
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

              {/* 予定の帯（一番上）：予定が無い週も高さを揃えるため常に確保 */}
              <div className="px-1 mb-0.5 h-5">
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

              {/* 金額：支出が無い日も高さを揃えるため常に確保 */}
              <div className="grid grid-cols-7">
                {week.map((cell, ci) => {
                  if (!cell.dateStr || cell.day === null) {
                    return <div key={`empty-amt-${wi}-${ci}`} className="h-3.5" />
                  }
                  const dayEntries = getEntriesForDay(cell.day)
                  const isFuture = cell.dateStr > todayStr
                  const dayExpenseTotal = dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
                  return (
                    <div
                      key={`${cell.dateStr}-amt`}
                      onClick={() => handleDayClick(cell.dateStr!)}
                      className={`px-1.5 h-3.5 cursor-pointer ${isFuture ? 'opacity-40' : ''}`}
                    >
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
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">今月の支出</div>
          <div className="text-sm font-bold text-red-500">{totalExpense.toLocaleString()}円</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">固定費</div>
          <div className="text-sm font-bold text-gray-600 dark:text-gray-300">{fixedCostTotal.toLocaleString()}円</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">未精算</div>
          <div className="text-sm font-bold text-orange-500">{unsettledTotal.toLocaleString()}円</div>
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
          const dayExpense = dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)

          return (
            <div key={dateStr} ref={el => { groupRefs.current[dateStr] = el }}>
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900/60">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {y}年{m}月{d}日<span className={`ml-1 font-normal ${dowColor}`}>（{dow}）</span>
                </span>
                {dayExpense > 0 && (
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {dayExpense.toLocaleString()}円
                  </span>
                )}
              </div>

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
                      {entry.warikan && entry.paidBy && (
                        <span className="ml-1.5 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md">
                          {entry.paidBy}
                        </span>
                      )}
                      {entry.warikan && entry.warikanSettled && (
                        <span className="ml-1 text-xs bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-md">
                          精算済
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
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-3xl font-light transition-colors z-10"
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
              {(['expense', 'event'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? `bg-white dark:bg-gray-700 shadow-sm ${
                          tab === 'expense' ? 'text-red-500' : 'text-purple-500'
                        }`
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab === 'expense' ? '支出' : '予定'}
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
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-300 w-16 flex-shrink-0">日付</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
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
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 w-16 flex-shrink-0">金額</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="円"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEntry() }}
                      className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 w-16 flex-shrink-0">メモ</label>
                    <input
                      type="text"
                      placeholder="例：スーパー、外食...（任意）"
                      value={memo}
                      onChange={e => setMemo(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEntry() }}
                      className="flex-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-300 block mb-2">カテゴリ</label>
                {filteredCategories.length > 0 ? (
                  <div className="grid grid-cols-4 gap-1.5">
                    {filteredCategories.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategoryId(c.id)}
                        className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl border-2 transition-colors ${
                          categoryId === c.id
                            ? activeTab === 'expense'
                              ? 'border-red-400 bg-red-50 dark:bg-red-950/40 dark:border-red-500'
                              : 'border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-500'
                            : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-lg leading-none">{c.emoji}</span>
                        <span className={`text-[10px] font-medium leading-tight text-center ${
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
                    onClick={() => {
                      const next = !warikan
                      setWarikan(next)
                      setPaidBy(next ? myDisplayName : '')
                      resetWarikanDetails()
                    }}
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
                  <div className="mt-4 space-y-4">
                    {/* 支払った人 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          支払った人（任意）
                        </label>
                        <button
                          type="button"
                          onClick={() => setWarikanSettled(s => !s)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] border-2 transition-colors ${
                            warikanSettled
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {warikanSettled && '✓'}
                          </span>
                          精算済
                        </button>
                      </div>
                      {warikanParticipants.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {warikanParticipants.map(m => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setPaidBy(prev => prev === m ? '' : m)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${
                                paidBy === m
                                  ? 'border-green-400 bg-green-50 dark:bg-green-950/40 dark:border-green-500 text-green-600 dark:text-green-400'
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

                    {/* 割り勘方法 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          割り勘方法
                        </label>
                        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
                          {([
                            { key: 'equal', label: '均等' },
                            { key: 'ratio', label: '比率' },
                            { key: 'amount', label: '金額' },
                          ] as const).map(opt => (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => setWarikanSplitMethod(opt.key)}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                                warikanSplitMethod === opt.key
                                  ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {warikanParticipants.length > 0 ? (
                        <div className="space-y-2">
                          <div className="space-y-2">
                            {warikanParticipants.map(m => (
                              <div
                                key={m}
                                className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 min-w-0 truncate">{m}</span>
                                  {warikanSplitMethod === 'ratio' && (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <input
                                        type="number"
                                        inputMode="numeric"
                                        min={0}
                                        value={warikanRatios[m] ?? 50}
                                        onChange={e => setWarikanRatios(prev => ({ ...prev, [m]: Number(e.target.value) || 0 }))}
                                        className="w-14 border border-gray-200 dark:border-gray-700 rounded-lg px-1.5 py-1 text-sm text-left bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                      />
                                      <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
                                    </div>
                                  )}
                                </div>
                                <div className="w-24 flex-shrink-0 text-right">
                                  {warikanSplitMethod === 'amount' ? (
                                    <input
                                      type="number"
                                      inputMode="numeric"
                                      value={warikanAmounts[m] ?? 0}
                                      onChange={e => setWarikanAmounts(prev => ({ ...prev, [m]: Number(e.target.value) || 0 }))}
                                      className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-sm text-right bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    />
                                  ) : (
                                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                                      {(warikanAmounts[m] ?? 0).toLocaleString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">合計</span>
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100">
                              ¥{warikanParticipants.reduce((s, m) => s + (warikanAmounts[m] ?? 0), 0).toLocaleString()}
                            </span>
                          </div>
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
                  disabled={
                    activeTab === 'event'
                      ? !eventTitle.trim()
                      : warikan
                        ? warikanParticipants.reduce((s, m) => s + (warikanAmounts[m] ?? 0), 0) <= 0
                        : (!amount || Number(amount) <= 0)
                  }
                  className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors text-white disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 ${
                    activeTab === 'expense'
                      ? 'bg-red-500 hover:bg-red-600'
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

      {/* ボトムナビ（ホームインジケーターの safe area 分だけ下に余白を追加） */}
      <nav className="fixed bottom-0 inset-x-0 pb-[env(safe-area-inset-bottom)] bg-white/70 dark:bg-black/50 backdrop-blur-xl backdrop-saturate-150 border-t border-black/5 dark:border-white/10 z-20">
        <div className="h-16 flex items-center">
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
            label: '固定費',
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
            key: 'warikan' as NavTab,
            label: '精算',
            icon: (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3l4 4-4 4"/>
                <path d="M21 7H9"/>
                <path d="M7 21l-4-4 4-4"/>
                <path d="M3 17h12"/>
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
        </div>
      </nav>

      <SettingsInfoModal
        open={settingsInfoOpen}
        onClose={() => setSettingsInfoOpen(false)}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        warikanDefaults={warikanDefaults}
        onUpdateWarikanDefaults={saveWarikanDefaults}
        categories={categories}
        onUpdateCategories={updateCategories}
        members={members}
        onUpdateMembers={updateMembers}
        entries={entries}
        fixedCosts={fixedCosts}
      />
      <RoomListModal
        open={roomListOpen}
        onClose={() => setRoomListOpen(false)}
        rooms={userRooms?.rooms ?? []}
        mainRoomId={activeGroupId}
        onSwitchRoom={switchRoom}
        onAddRoom={() => { setRoomListOpen(false); setAddingRoom(true) }}
      />
    </div>
  )
}
