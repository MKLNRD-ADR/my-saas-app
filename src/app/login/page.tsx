'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#212121] px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white mb-2">Log in or sign up</h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            You&apos;ll get smarter responses and can upload<br />files, images, and more.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-[#2f2f2f] text-white placeholder-neutral-500 rounded-full px-5 py-3.5 text-sm outline-none border border-transparent focus:border-neutral-500 transition"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-[#2f2f2f] text-white placeholder-neutral-500 rounded-full px-5 py-3.5 text-sm outline-none border border-transparent focus:border-neutral-500 transition"
            required
          />

          {error && (
            <p className="text-red-400 text-xs px-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-neutral-100 text-black font-medium py-3.5 rounded-full text-sm transition disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Continue'}
          </button>
        </form>

        {/* Footer links */}
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <Link href="/terms" className="hover:underline">Terms of Use</Link>
          <span>|</span>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>

        {/* Sign up prompt */}
        <p className="text-neutral-500 text-xs">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-white hover:underline">Sign up</Link>
        </p>

      </div>
    </div>
  )
}