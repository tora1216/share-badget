'use client'

import { useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut, type User } from 'firebase/auth'
import { db, auth } from '../../lib/firebase'
import { hashPassphrase, generateInviteCode, type RoomMembership } from '../../lib/rooms'
import { DEFAULT_CATEGORIES, type Participant } from '../types'

interface Props {
  currentUser: User
  onDone?: () => void
  onCancel?: () => void
}

type Tab = 'create' | 'join'

async function ensureMembership(groupId: string, displayName: string, participant: Participant) {
  const membersRef = doc(db, 'groups', groupId, 'data', 'members')
  const membersSnap = await getDoc(membersRef)
  const members = (membersSnap.data()?.items as string[] | undefined) ?? []
  if (!members.includes(displayName)) {
    await setDoc(membersRef, { items: [...members, displayName] })
  }

  const participantsRef = doc(db, 'groups', groupId, 'data', 'participants')
  const participantsSnap = await getDoc(participantsRef)
  const existingParticipants = (participantsSnap.data()?.items as Participant[] | undefined) ?? []
  const nextParticipants = existingParticipants.some(p => p.uid === participant.uid)
    ? existingParticipants.map(p => (p.uid === participant.uid ? participant : p))
    : [...existingParticipants, participant]
  await setDoc(participantsRef, { items: nextParticipants })
}

async function addRoomToUser(uid: string, room: RoomMembership) {
  const ref = doc(db, 'users', uid)
  const snap = await getDoc(ref)
  const existing = (snap.data()?.rooms as RoomMembership[] | undefined) ?? []
  const nextRooms = [...existing.filter(r => r.groupId !== room.groupId), room]
  await setDoc(ref, { rooms: nextRooms, mainRoomId: room.groupId })
}

export default function RoomGate({ currentUser, onDone, onCancel }: Props) {
  const [tab, setTab] = useState<Tab>('create')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [roomName, setRoomName] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const [createdRoom, setCreatedRoom] = useState<{ groupId: string; name: string; passphrase: string; inviteCode: string } | null>(null)
  const [copied, setCopied] = useState<'code' | 'pass' | null>(null)

  const [inviteCodeInput, setInviteCodeInput] = useState('')
  const [joinPassphrase, setJoinPassphrase] = useState('')

  const buildParticipant = (): Participant => ({
    uid: currentUser.uid,
    displayName: currentUser.displayName ?? 'メンバー',
    photoURL: currentUser.photoURL ?? undefined,
    email: currentUser.email ?? undefined,
  })

  const handleCreate = async () => {
    const name = roomName.trim()
    const trimmedPass = passphrase.trim()
    if (!name || !trimmedPass) return
    setLoading(true)
    setError('')
    try {
      const groupId = await hashPassphrase(trimmedPass)
      const metaRef = doc(db, 'groups', groupId, 'data', 'meta')
      const membersRef = doc(db, 'groups', groupId, 'data', 'members')
      const metaSnap = await getDoc(metaRef)
      if (metaSnap.exists()) {
        setError('その合言葉は既に使われています。別の合言葉にするか、招待コードで参加してください。')
        return
      }

      // meta は無いが members はある = このアップデート以前に作られた既存ルーム。データは温存して移行する
      const membersSnap = await getDoc(membersRef)
      const isAdopting = membersSnap.exists()

      let inviteCode = ''
      for (let i = 0; i < 5; i++) {
        const candidate = generateInviteCode()
        const codeSnap = await getDoc(doc(db, 'inviteCodes', candidate))
        if (!codeSnap.exists()) {
          inviteCode = candidate
          break
        }
      }
      if (!inviteCode) throw new Error('招待コードの発行に失敗しました')

      const participant = buildParticipant()

      const writes: Promise<unknown>[] = [
        setDoc(metaRef, { name }),
        setDoc(doc(db, 'inviteCodes', inviteCode), { groupId }),
      ]
      if (!isAdopting) {
        writes.push(
          setDoc(doc(db, 'groups', groupId, 'data', 'entries'), { items: [] }),
          setDoc(doc(db, 'groups', groupId, 'data', 'categories'), { items: DEFAULT_CATEGORIES }),
          setDoc(membersRef, { items: [participant.displayName] }),
          setDoc(doc(db, 'groups', groupId, 'data', 'participants'), { items: [participant] }),
          setDoc(doc(db, 'groups', groupId, 'data', 'fixedCosts'), { items: [] }),
          setDoc(doc(db, 'groups', groupId, 'data', 'events'), { items: [] }),
        )
      }
      await Promise.all(writes)
      if (isAdopting) {
        await ensureMembership(groupId, participant.displayName, participant)
      }

      setCreatedRoom({ groupId, name, passphrase: trimmedPass, inviteCode })
    } catch (e) {
      console.error(e)
      setError('ルームの作成に失敗しました。しばらくしてから再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  const closeConfirmation = async () => {
    if (!createdRoom) return
    setLoading(true)
    setError('')
    try {
      await addRoomToUser(currentUser.uid, {
        groupId: createdRoom.groupId,
        name: createdRoom.name,
        passphrase: createdRoom.passphrase,
        inviteCode: createdRoom.inviteCode,
        joinedAt: Date.now(),
      })
      // 成功すると親コンポーネントの users/{uid} 購読が反応し、自動的に家計簿画面へ遷移する
      onDone?.()
    } catch (e) {
      console.error(e)
      setError('ルームへの参加に失敗しました。しばらくしてから再度お試しください。')
      setLoading(false)
    }
  }

  const copy = async (text: string, which: 'code' | 'pass') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(which)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

  const handleJoin = async () => {
    const code = inviteCodeInput.trim().toUpperCase()
    const trimmedPass = joinPassphrase.trim()
    if (!code || !trimmedPass) return
    setLoading(true)
    setError('')
    try {
      const codeSnap = await getDoc(doc(db, 'inviteCodes', code))
      if (!codeSnap.exists()) {
        setError('招待コードが見つかりません。')
        return
      }
      const groupId = codeSnap.data()?.groupId as string
      const hash = await hashPassphrase(trimmedPass)
      if (hash !== groupId) {
        setError('招待コードまたは合言葉が正しくありません。')
        return
      }

      const metaSnap = await getDoc(doc(db, 'groups', groupId, 'data', 'meta'))
      const name = (metaSnap.data()?.name as string | undefined) ?? 'ルーム'
      const participant = buildParticipant()

      await ensureMembership(groupId, participant.displayName, participant)
      await addRoomToUser(currentUser.uid, {
        groupId,
        name,
        passphrase: trimmedPass,
        inviteCode: code,
        joinedAt: Date.now(),
      })
      // 成功すると親コンポーネントの users/{uid} 購読が反応し、自動的に家計簿画面へ遷移する
      onDone?.()
    } catch (e) {
      console.error(e)
      setError('参加に失敗しました。しばらくしてから再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  if (createdRoom) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
          <div className="text-center space-y-1">
            <p className="text-2xl">🎉</p>
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">「{createdRoom.name}」を作成しました</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500">この2つを招待したい人に伝えてください</p>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">招待コード</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono tracking-widest">
                  {createdRoom.inviteCode}
                </div>
                <button
                  type="button"
                  onClick={() => copy(createdRoom.inviteCode, 'code')}
                  className="px-3 h-10 flex-shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs transition-colors"
                >
                  {copied === 'code' ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">合言葉</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-mono truncate">
                  {createdRoom.passphrase}
                </div>
                <button
                  type="button"
                  onClick={() => copy(createdRoom.passphrase, 'pass')}
                  className="px-3 h-10 flex-shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium text-xs transition-colors"
                >
                  {copied === 'pass' ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            onClick={closeConfirmation}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-sm transition-colors"
          >
            {loading ? '処理中…' : '閉じる'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-5">
        <div className="relative text-center space-y-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="absolute left-0 top-0 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              キャンセル
            </button>
          )}
          <p className="text-2xl">🏠</p>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">ルームに参加</h1>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          {currentUser.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUser.photoURL} alt="" className="w-7 h-7 rounded-full flex-shrink-0" />
          ) : (
            <span className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm flex-shrink-0">👤</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 dark:text-gray-500">ログイン中</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{currentUser.displayName ?? currentUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut(auth)}
            className="text-xs text-blue-500 hover:underline flex-shrink-0"
          >
            別のアカウント
          </button>
        </div>

        <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => { setTab('create'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'create' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            新しいルームを作成
          </button>
          <button
            type="button"
            onClick={() => { setTab('join'); setError('') }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'join' ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            招待コードで参加
          </button>
        </div>

        {tab === 'create' ? (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="ルーム名（例：田中家の家計簿）"
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
              autoFocus
            />
            <input
              type="text"
              placeholder="合言葉"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={!roomName.trim() || !passphrase.trim() || loading}
              className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
            >
              {loading ? '作成中…' : 'ルームを作成'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="招待コード"
              value={inviteCodeInput}
              onChange={e => setInviteCodeInput(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
              autoFocus
            />
            <input
              type="text"
              placeholder="合言葉"
              value={joinPassphrase}
              onChange={e => setJoinPassphrase(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleJoin() }}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={!inviteCodeInput.trim() || !joinPassphrase.trim() || loading}
              className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 text-white font-medium text-sm transition-colors"
            >
              {loading ? '参加中…' : '参加する'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
