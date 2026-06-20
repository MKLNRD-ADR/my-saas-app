'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Calendar, Mic, Pencil, Plus, Trash2, X } from 'lucide-react'

type Task = {
  id: string
  title: string
  is_completed: boolean
  created_at: string
  due_at: string | null
}

type Section = {
  id: string
  name: string
}

type TaskFilter = 'all' | 'completed' | 'pending'
type TaskSort = 'recent' | 'due'

type SpokenTaskParseResult = {
  title: string
  dueAt: string
}

type VoiceRecognitionResultItem = {
  transcript: string
}

type VoiceRecognitionResultList = {
  0: VoiceRecognitionResultItem
  length: number
}

type VoiceRecognitionEvent = {
  results: {
    0: VoiceRecognitionResultList
    length: number
  }
}

type VoiceRecognitionErrorEvent = {
  error: string
}

type VoiceRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: VoiceRecognitionEvent) => void) | null
  onerror: ((event: VoiceRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
}

type VoiceRecognitionConstructor = new () => VoiceRecognition

const DUPLICATE_STOP_WORDS = new Set([
  'a', 'an', 'the', 'i', 'will', 'do', 'to', 'my', 'me', 'please', 'task', 'for'
])

const WEEKDAY_TO_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6
}

function toDateTimeInputValue(value: Date) {
  const tzOffsetMs = value.getTimezoneOffset() * 60000
  return new Date(value.getTime() - tzOffsetMs).toISOString().slice(0, 16)
}

function resolveNextWeekday(baseDate: Date, targetDay: number, useNextWeek: boolean) {
  const date = new Date(baseDate)
  date.setSeconds(0, 0)
  const currentDay = date.getDay()
  let diff = targetDay - currentDay
  if (diff <= 0 || useNextWeek) diff += 7
  date.setDate(date.getDate() + diff)
  return date
}

function parseSpokenTaskInput(input: string): SpokenTaskParseResult {
  const original = input.replace(/\s+/g, ' ').trim()
  if (!original) return { title: '', dueAt: '' }

  const now = new Date()
  let parsedDate: Date | null = null
  let parsedHour: number | null = null
  let parsedMinute = 0
  const consumedParts: string[] = []
  const lower = original.toLowerCase()

  const isoDateMatch = lower.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/)
  if (isoDateMatch) {
    parsedDate = new Date(Number(isoDateMatch[1]), Number(isoDateMatch[2]) - 1, Number(isoDateMatch[3]))
    consumedParts.push(isoDateMatch[0])
  }

  const slashDateMatch = lower.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/)
  if (!parsedDate && slashDateMatch) {
    const month = Number(slashDateMatch[1])
    const day = Number(slashDateMatch[2])
    const yearRaw = slashDateMatch[3]
    let year = now.getFullYear()
    if (yearRaw) year = Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
    parsedDate = new Date(year, month - 1, day)
    consumedParts.push(slashDateMatch[0])
  }

  const relativeDayMatch = lower.match(/\b(today|tomorrow)\b/)
  if (!parsedDate && relativeDayMatch) {
    parsedDate = new Date(now)
    parsedDate.setSeconds(0, 0)
    if (relativeDayMatch[1] === 'tomorrow') parsedDate.setDate(parsedDate.getDate() + 1)
    consumedParts.push(relativeDayMatch[0])
  }

  const weekdayMatch = lower.match(/\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)
  if (!parsedDate && weekdayMatch) {
    parsedDate = resolveNextWeekday(now, WEEKDAY_TO_INDEX[weekdayMatch[2]], Boolean(weekdayMatch[1]))
    consumedParts.push(weekdayMatch[0])
  }

  const time12hMatch = lower.match(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
  if (time12hMatch) {
    let hour = Number(time12hMatch[1])
    const minute = time12hMatch[2] ? Number(time12hMatch[2]) : 0
    const meridiem = time12hMatch[3]
    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0
    parsedHour = hour
    parsedMinute = minute
    consumedParts.push(time12hMatch[0])
  }

  const time24hMatch = lower.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/)
  if (parsedHour === null && time24hMatch) {
    parsedHour = Number(time24hMatch[1])
    parsedMinute = Number(time24hMatch[2])
    consumedParts.push(time24hMatch[0])
  }

  let title = original
  for (const part of consumedParts) {
    const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    title = title.replace(new RegExp(escaped, 'i'), ' ')
  }
  title = title.replace(/\b(on|at|by|due|for)\b/gi, ' ').replace(/\s+/g, ' ').trim()
  if (!title) title = original

  if (!parsedDate && parsedHour === null) return { title, dueAt: '' }

  const dueDate = parsedDate ? new Date(parsedDate) : new Date(now)
  dueDate.setSeconds(0, 0)
  if (parsedHour !== null) {
    dueDate.setHours(parsedHour, parsedMinute, 0, 0)
  } else {
    dueDate.setHours(now.getHours(), now.getMinutes(), 0, 0)
  }

  return { title, dueAt: toDateTimeInputValue(dueDate) }
}

function normalizeWord(word: string) {
  const lower = word.toLowerCase()
  if (lower === 'assignemt') return 'assignment'
  if (/^assign[a-z]*$/.test(lower) && lower !== 'assignment') return 'assignment'
  if (lower === 'mathematics' || lower === 'maths') return 'math'
  return lower
}

function tokenizeForDuplicateCheck(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).map(normalizeWord).filter(Boolean)
}

function areDuplicateTitles(existingTitle: string, newTitle: string) {
  const existingTokens = tokenizeForDuplicateCheck(existingTitle)
  const newTokens = tokenizeForDuplicateCheck(newTitle)
  if (existingTokens.length === 0 || newTokens.length === 0) return false

  const existingNumbers = existingTokens.filter(t => /^\d+$/.test(t))
  const newNumbers = newTokens.filter(t => /^\d+$/.test(t))
  if (existingNumbers.length > 0 || newNumbers.length > 0) {
    if (existingNumbers.length === 0 || newNumbers.length === 0) return false
    if (existingNumbers.join('|') !== newNumbers.join('|')) return false
  }

  const existingCore = existingTokens.filter(t => !DUPLICATE_STOP_WORDS.has(t))
  const newCore = newTokens.filter(t => !DUPLICATE_STOP_WORDS.has(t))
  const short = existingCore.length <= newCore.length ? existingCore : newCore
  const longSet = new Set(existingCore.length <= newCore.length ? newCore : existingCore)
  if (short.length === 0) return existingTokens.join(' ') === newTokens.join(' ')
  const sharedCount = short.filter(t => longSet.has(t)).length
  return sharedCount === short.length && short.length >= 2
}

export default function SectionPage() {
  const params = useParams()
  const sectionId = params.sectionId as string
  const [section, setSection] = useState<Section | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [newDueAt, setNewDueAt] = useState('')
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [suggestingTitles, setSuggestingTitles] = useState(false)
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')
  const [taskSort, setTaskSort] = useState<TaskSort>('recent')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskDueAt, setEditTaskDueAt] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [adding, setAdding] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const dateInputRef = useState<HTMLInputElement | null>(null)

  const canSaveEdit = editTaskTitle.trim().length > 0 && !savingEdit

  function toDateTimeLocalValue(value: string | null) {
    if (!value) return ''
    const date = new Date(value)
    const tzOffsetMs = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16)
  }

  const filteredTasks = useMemo(() => {
    const compareRecent = (a: Task, b: Task) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    const compareDueNearest = (a: Task, b: Task) => {
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
      if (a.due_at && !b.due_at) return -1
      if (!a.due_at && b.due_at) return 1
      return compareRecent(a, b)
    }
    const compareTasks = taskSort === 'due' ? compareDueNearest : compareRecent
    let items = [...tasks]
    if (taskFilter === 'completed') return items.filter(t => t.is_completed).sort(compareTasks)
    if (taskFilter === 'pending') return items.filter(t => !t.is_completed).sort(compareTasks)
    return items.sort(compareTasks)
  }, [tasks, taskFilter, taskSort])

  const taskCounts = useMemo(() => {
    const completed = tasks.filter(t => t.is_completed).length
    return { all: tasks.length, completed, pending: tasks.length - completed }
  }, [tasks])

  const duplicateTask = useMemo(() => {
    const title = newTask.trim()
    if (!title) return null
    return tasks.find(task => areDuplicateTitles(task.title, title)) ?? null
  }, [tasks, newTask])

  const canAddTask = newTask.trim().length > 0 && !adding && !duplicateTask

  const fetchSection = useCallback(async () => {
    const { data } = await supabase.from('sections').select('*').eq('id', sectionId).single()
    setSection(data)
    setLoading(false)
  }, [sectionId])

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from('tasks').select('*').eq('section_id', sectionId).order('created_at', { ascending: false })
    setTasks(data ?? [])
  }, [sectionId])

  useEffect(() => {
    if (sectionId) { fetchSection(); fetchTasks() }
  }, [sectionId, fetchSection, fetchTasks])

  useEffect(() => {
    const title = newTask.trim()
    if (title.length < 3) { setTitleSuggestions([]); setSuggestingTitles(false); return }
    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setSuggestingTitles(true)
      try {
        const response = await fetch('/api/improve-task-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
          signal: controller.signal
        })
        if (!response.ok) { setTitleSuggestions([]); return }
        const data = await response.json() as { suggestions?: string[] }
        setTitleSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      } catch {
        if (!controller.signal.aborted) setTitleSuggestions([])
      } finally {
        if (!controller.signal.aborted) setSuggestingTitles(false)
      }
    }, 400)
    return () => { clearTimeout(timeout); controller.abort() }
  }, [newTask])

  function openModal() {
    setNewTask('')
    setNewDueAt('')
    setTitleSuggestions([])
    setVoiceError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setNewTask('')
    setNewDueAt('')
    setTitleSuggestions([])
    setVoiceError('')
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim() || !canAddTask) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      title: newTask.trim(),
      user_id: user!.id,
      section_id: sectionId,
      due_at: newDueAt ? new Date(newDueAt).toISOString() : null
    })
    setNewTask('')
    setNewDueAt('')
    setTitleSuggestions([])
    await fetchTasks()
    setAdding(false)
    closeModal()
  }

  function startVoiceInput() {
    if (typeof window === 'undefined') return
    const recognitionWindow = window as typeof window & {
      SpeechRecognition?: VoiceRecognitionConstructor
      webkitSpeechRecognition?: VoiceRecognitionConstructor
    }
    const Recognition = recognitionWindow.SpeechRecognition ?? recognitionWindow.webkitSpeechRecognition
    if (!Recognition) { setVoiceError('Voice input is not supported in this browser.'); return }
    const recognition = new Recognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    setVoiceError('')
    setIsListening(true)
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? ''
      if (!transcript) return
      const parsed = parseSpokenTaskInput(transcript)
      setNewTask(parsed.title)
      if (parsed.dueAt) setNewDueAt(parsed.dueAt)
    }
    recognition.onerror = () => { setVoiceError('Could not capture voice input. Please try again.') }
    recognition.onend = () => { setIsListening(false) }
    recognition.start()
  }

  async function toggleTask(task: Task) {
    await supabase.from('tasks').update({ is_completed: !task.is_completed }).eq('id', task.id)
    await fetchTasks()
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id)
    await fetchTasks()
  }

  function startEditTask(task: Task) {
    setEditingTaskId(task.id)
    setEditTaskTitle(task.title)
    setEditTaskDueAt(toDateTimeLocalValue(task.due_at))
  }

  function cancelEditTask() {
    setEditingTaskId(null)
    setEditTaskTitle('')
    setEditTaskDueAt('')
  }

  async function saveTaskEdit(taskId: string) {
    if (!editTaskTitle.trim()) return
    setSavingEdit(true)
    await supabase.from('tasks').update({
      title: editTaskTitle.trim(),
      due_at: editTaskDueAt ? new Date(editTaskDueAt).toISOString() : null
    }).eq('id', taskId)
    await fetchTasks()
    cancelEditTask()
    setSavingEdit(false)
  }

  if (loading) {
    return (
      <main className="flex-1 min-h-0 flex flex-col overflow-hidden animate-pulse">
        <div className="px-4 sm:px-8 pt-14 sm:pt-6 pb-5 border-b border-neutral-200 dark:border-neutral-800 space-y-2.5">
          <div className="h-8 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-full rounded-xl bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-black dark:text-white">Add new task</h3>
              <button onClick={closeModal} className="text-neutral-400 hover:text-black dark:hover:text-white transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addTask} className="flex flex-col gap-4">
              {/* Title input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Task title..."
                  value={newTask}
                  onChange={e => setNewTask(e.target.value)}
                  autoFocus
                  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                />
                <button
                  type="button"
                  onClick={startVoiceInput}
                  disabled={isListening}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition disabled:opacity-60"
                >
                  <Mic size={15} className={isListening ? 'animate-pulse text-red-500' : ''} />
                </button>
              </div>

              {/* Title suggestions */}
              {(suggestingTitles || titleSuggestions.length > 0) && (
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 px-3 py-2">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    {suggestingTitles ? 'Improving title...' : 'Suggested titles'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {titleSuggestions.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewTask(s)}
                        className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Due date with calendar icon */}
              <input
  type="datetime-local"
  value={newDueAt}
  onChange={e => setNewDueAt(e.target.value)}
  className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
/>

              {voiceError && <p className="text-xs text-red-500">{voiceError}</p>}
              {duplicateTask && (
                <p className="text-xs text-red-500">Duplicate detected: similar to "{duplicateTask.title}"</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canAddTask}
                  className="flex-1 py-2.5 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {adding ? 'Adding...' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="px-4 sm:px-8 pt-14 sm:pt-6 pb-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold text-black dark:text-white">{section?.name}</h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-2 bg-neutral-900 dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition"
        >
          <Plus size={15} />
          Add task
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6 pb-28 sm:pb-6">

        <div className="flex items-start sm:items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex sm:hidden w-full gap-2">
            <select value={taskFilter} onChange={e => setTaskFilter(e.target.value as TaskFilter)}
              className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white rounded-lg px-3 py-2.5 text-sm outline-none">
              <option value="all">All ({taskCounts.all})</option>
              <option value="completed">Completed ({taskCounts.completed})</option>
              <option value="pending">Not Finished ({taskCounts.pending})</option>
            </select>
            <select value={taskSort} onChange={e => setTaskSort(e.target.value as TaskSort)}
              className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white rounded-lg px-3 py-2.5 text-sm outline-none">
              <option value="recent">Recent Added</option>
              <option value="due">Nearest Due Date</option>
            </select>
          </div>

          <div className="hidden sm:flex gap-2 flex-wrap">
            {(['all', 'completed', 'pending'] as TaskFilter[]).map(f => (
              <button key={f} type="button" onClick={() => setTaskFilter(f)}
                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm border transition ${
                  taskFilter === f
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
                }`}>
                {f === 'all' ? `All (${taskCounts.all})` : f === 'completed' ? `Completed (${taskCounts.completed})` : `Not Finished (${taskCounts.pending})`}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex gap-2">
            {(['recent', 'due'] as TaskSort[]).map(s => (
              <button key={s} type="button" onClick={() => setTaskSort(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm border transition ${
                  taskSort === s
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                    : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
                }`}>
                {s === 'recent' ? 'Recent Added' : 'Nearest Due Date'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filteredTasks.length === 0 && (
            <p className="text-neutral-400 text-sm text-center py-16">No tasks yet. Click "Add task" to get started!</p>
          )}
          {filteredTasks.map(task => {
            const isOverdue = Boolean(task.due_at) && !task.is_completed && new Date(task.due_at as string) < new Date()
            const isEditing = editingTaskId === task.id
            return (
              <div key={task.id}
                className={`group flex items-start sm:items-center gap-3 rounded-xl px-3 py-2.5 transition border ${
                  isOverdue
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                    : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
                }`}>
                <input type="checkbox" checked={task.is_completed} onChange={() => toggleTask(task)}
                  disabled={isEditing || savingEdit}
                  className="w-4 h-4 accent-neutral-700 dark:accent-neutral-300 cursor-pointer" />
                {isEditing ? (
                  <div className="flex-1 flex items-center gap-2 flex-wrap">
                    <input type="text" value={editTaskTitle} onChange={e => setEditTaskTitle(e.target.value)}
                      className="flex-1 min-w-[180px] bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400" />
                    <div className="relative">
                      <input type="datetime-local" value={editTaskDueAt} onChange={e => setEditTaskDueAt(e.target.value)}
                        className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer" />
                      <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
                    </div>
                  </div>
                ) : (
                  <span className={`flex-1 text-sm leading-snug ${
                    task.is_completed ? 'line-through text-neutral-400'
                    : isOverdue ? 'text-red-700 dark:text-red-300'
                    : 'text-black dark:text-white'
                  }`}>
                    {task.title}
                    {task.due_at && (
                      <span className={`block text-xs mt-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        Due: {new Date(task.due_at).toLocaleString()}
                      </span>
                    )}
                  </span>
                )}
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => saveTaskEdit(task.id)} disabled={!canSaveEdit}
                      className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black disabled:opacity-50">
                      {savingEdit ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" onClick={cancelEditTask} disabled={savingEdit}
                      className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                    <button type="button" onClick={() => startEditTask(task)}
                      className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition">
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => deleteTask(task.id)}
                      className="text-neutral-400 hover:text-red-400 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}