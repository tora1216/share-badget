'use client'

import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '../../lib/firebase'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const signInGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      // ログイン成功後は onAuthStateChanged が親コンポーネントに伝播し、自動的に画面が切り替わる
    } catch (e) {
      console.error(e)
      setError('ログインに失敗しました。ポップアップがブロックされていないか確認して、再度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-6 bg-gradient-to-b from-sky-50 via-white to-indigo-50 dark:from-black dark:via-gray-950 dark:to-black">
      {/* 背景の装飾ブロブ */}
      <div className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full bg-blue-300/40 dark:bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 w-80 h-80 rounded-full bg-purple-300/40 dark:bg-purple-700/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-pink-200/30 dark:bg-pink-600/10 blur-3xl" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-10">
          <div className="relative">
            <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-blue-400 to-purple-500 blur-xl opacity-40 dark:opacity-50 scale-110" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon.png"
              alt="共有家計簿"
              className="relative w-24 h-24 rounded-[28px] shadow-xl ring-1 ring-black/5 dark:ring-white/10"
            />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-gray-100">共有家計簿</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">みんなでシェアする、かんたん家計管理</p>
          </div>
        </div>

        <div className="rounded-3xl bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xl shadow-gray-200/50 dark:shadow-none p-6 space-y-4">
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            onClick={signInGoogle}
            disabled={loading}
            className="group w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 text-gray-700 dark:text-gray-200 font-semibold text-sm transition-all shadow-md shadow-gray-200/60 dark:shadow-none hover:shadow-lg active:scale-[0.98] ring-1 ring-black/5 dark:ring-white/10"
          >
            {loading ? (
              <span className="w-[18px] h-[18px] border-2 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" className="transition-transform group-hover:scale-110">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
            )}
            {loading ? 'ログイン中…' : 'Googleでログイン'}
          </button>
        </div>
      </div>
    </div>
  )
}
