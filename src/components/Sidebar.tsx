'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { Plus, Trash2, LayoutList, LogOut, Pencil, Check, X, Menu } from 'lucide-react'

type Section = {
  id: string
  name: string
}

function normalizeSectionName(name: string) {
  return name.replace(/\s+/g, ' ').trim().toLowerCase()
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
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editingSectionName, setEditingSectionName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [sectionNameError, setSectionNameError] = useState('')
  const [renameError, setRenameError] = useState('')
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const isNewSectionDuplicate = useMemo(() => {
    const normalized = normalizeSectionName(newSection)
    if (!normalized) return false
    return sections.some(section => normalizeSectionName(section.name) === normalized)
  }, [newSection, sections])

  const isRenameDuplicate = useMemo(() => {
    const normalized = normalizeSectionName(editingSectionName)
    if (!normalized || !editingSectionId) return false
    return sections.some(
      section =>
        section.id !== editingSectionId &&
        normalizeSectionName(section.name) === normalized
    )
  }, [editingSectionId, editingSectionName, sections])

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
    const cleanedName = newSection.replace(/\s+/g, ' ').trim()
    if (!cleanedName) return
    if (isNewSectionDuplicate) {
      setSectionNameError('Duplicate section name. Please choose another name.')
      return
    }

    setSectionNameError('')
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('sections').insert({
      name: cleanedName,
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

  function startRenameSection(section: Section) {
    setEditingSectionId(section.id)
    setEditingSectionName(section.name)
    setRenameError('')
  }

  function cancelRenameSection() {
    setEditingSectionId(null)
    setEditingSectionName('')
    setRenameError('')
  }

  async function saveRenameSection(id: string) {
    if (!editingSectionName.trim()) return
    if (isRenameDuplicate) {
      setRenameError('Duplicate section name. Please choose another name.')
      return
    }

    setRenameError('')
    setRenaming(true)
    await supabase
      .from('sections')
      .update({ name: editingSectionName.trim() })
      .eq('id', id)
    await fetchSections()
    cancelRenameSection()
    setRenaming(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setIsMobileOpen(false)
    router.push('/login')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsMobileOpen(prev => !prev)}
        className="lg:hidden fixed top-4 left-4 z-40 inline-flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 p-2 text-neutral-700 dark:text-neutral-200 shadow-sm"
        aria-label={isMobileOpen ? 'Close sidebar' : 'Open sidebar'}
      >
        {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {isMobileOpen && (
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 h-screen flex flex-col bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >

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
              className="w-full text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={adding || isNewSectionDuplicate}
                className="flex-1 text-xs bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black py-1.5 rounded-lg transition disabled:bg-neutral-300 disabled:text-neutral-500 dark:disabled:bg-neutral-700 dark:disabled:text-neutral-400 disabled:cursor-not-allowed disabled:hover:bg-neutral-300 dark:disabled:hover:bg-neutral-700"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInput(false)
                  setNewSection('')
                  setSectionNameError('')
                }}
                className="flex-1 text-xs border border-neutral-200 dark:border-neutral-700 text-neutral-500 py-1.5 rounded-lg transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
            {(sectionNameError || isNewSectionDuplicate) && (
              <p className="text-xs text-red-500 mt-2 px-1">
                {sectionNameError || 'Duplicate section name. Please choose another name.'}
              </p>
            )}
          </form>
        )}

        {renameError && (
          <p className="text-xs text-red-500 mb-2 px-2">{renameError}</p>
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
            onClick={() => {
              if (editingSectionId !== section.id) {
                setIsMobileOpen(false)
                router.push(`/dashboard/${section.id}`)
              }
            }}
            className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer mb-0.5 transition ${
              params?.sectionId === section.id
                ? 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white'
                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <LayoutList size={14} className="flex-shrink-0 text-neutral-400" />
              {editingSectionId === section.id ? (
                <input
                  type="text"
                  value={editingSectionName}
                  onChange={e => setEditingSectionName(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                  className="text-sm w-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white rounded px-2 py-1 outline-none"
                />
              ) : (
                <span className="text-sm truncate">{section.name}</span>
              )}
            </div>
            {editingSectionId === section.id ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); saveRenameSection(section.id) }}
                  disabled={renaming || !editingSectionName.trim() || isRenameDuplicate}
                  className="text-neutral-400 hover:text-green-500 transition disabled:opacity-40"
                >
                  <Check size={13} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); cancelRenameSection() }}
                  disabled={renaming}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition disabled:opacity-40"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); startRenameSection(section) }}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); deleteSection(section.id) }}
                  className="text-neutral-400 hover:text-red-400 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
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

      </aside>
    </>
  )
}