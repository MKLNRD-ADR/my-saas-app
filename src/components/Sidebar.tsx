'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { Plus, Trash2, LayoutList, LogOut } from 'lucide-react'

type Section = {
  id: string
  name: string
}

export default function Sidebar() {
  const router = useRouter()
  const params = useParams()
  const [email, setEmail] = useState('')
  const [sections, setSections] = useState<Section[]>([])
  const [newSection, setNewSection] = useState('')
  const [adding, setAdding] = useState(false)
  const [showInput, setShowInput] = useState(false)
  const [sectionsLoading, setSectionsLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email ?? '')
        await fetchSections()
      } else {
        setSectionsLoading(false)
      }
    }
    init()
  }, [])

  async function fetchSections() {
    setSectionsLoading(true)
    try {
      const { data } = await supabase
        .from('sections')
        .select('*')
        .order('created_at', { ascending: true })
      setSections(data ?? [])
    } finally {
      setSectionsLoading(false)
    }
  }

  async function addSection(e: React.FormEvent) {
    e.preventDefault()
    if (!newSection.trim()) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('sections').insert({
      name: newSection.trim(),
      user_id: user!.id
    }).select().single()
    setNewSection('')
    setShowInput(false)
    await fetchSections()
    if (data) router.push(`/dashboard/${data.id}`)
    setAdding(false)
  }

  async function deleteSection(id: string) {
    await supabase.from('sections').delete().eq('id', id)
    await fetchSections()
    router.push('/dashboard')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="w-64 h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800">

      {/* header */}
      <div className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-base font-semibold text-black dark:text-white">TaskFlow</h1>
          <p className="text-xs text-neutral-400 mt-0.5">Your workspace</p>
        </div>
        <ThemeToggle />
      </div>

      {/* sections list */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-xs font-medium text-neutral-400 uppercase tracking-widest">Sections</span>
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            <Plus size={15} />
          </button>
        </div>

        {showInput && (
          <form onSubmit={addSection} className="mb-3 px-1">
            <input
              type="text"
              placeholder="Section name..."
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              autoFocus
              className="w-full text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={adding}
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg transition"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowInput(false); setNewSection('') }}
                className="flex-1 text-xs border border-neutral-200 dark:border-neutral-700 text-neutral-500 py-1.5 rounded-lg transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {sectionsLoading && (
          <div className="px-1 space-y-1 animate-pulse">
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="h-9 rounded-lg bg-neutral-200 dark:bg-neutral-800"
              />
            ))}
          </div>
        )}

        {sections.length === 0 && !showInput && !sectionsLoading && (
          <p className="text-xs text-neutral-400 text-center mt-6 px-2">
            No sections yet. Click + to add one.
          </p>
        )}

        {!sectionsLoading && sections.map(section => (
          <div
            key={section.id}
            onClick={() => router.push(`/dashboard/${section.id}`)}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-0.5 transition ${
              params?.sectionId === section.id
                ? 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <LayoutList size={14} className="flex-shrink-0 text-neutral-400" />
              <span className="text-sm truncate">{section.name}</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); deleteSection(section.id) }}
              className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition flex-shrink-0"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* bottom */}
      <div className="px-4 py-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="mb-3">
          <p className="text-sm font-medium text-black dark:text-white truncate">{email}</p>
          <p className="text-xs text-neutral-400">Logged in</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

    </div>
  )
}