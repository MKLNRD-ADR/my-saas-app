'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#212121] px-4">
        <div className="w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <h1 className="text-3xl font-semibold text-white">Check your email</h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            We sent a password reset link to <span className="text-white">{email}</span>. Check your inbox and click the link.
          </p>
          <Link
            href="/login"
            className="text-sm text-neutral-400 hover:text-white transition mt-2"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#212121] px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-white mb-2">Forgot password?</h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleReset} className="w-full flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
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
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <Link
          href="/login"
          className="text-neutral-500 text-xs hover:text-white transition"
        >
          ← Back to login
        </Link>
      </div>
    </div>
  )
}