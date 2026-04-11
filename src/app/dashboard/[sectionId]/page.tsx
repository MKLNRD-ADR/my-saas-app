'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Pencil, Trash2, X } from 'lucide-react'

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
  const [loading, setLoading] = useState(true)
  const canAddTask = newTask.trim().length > 0 && newDueAt.trim().length > 0 && !adding
  const canSaveEdit = editTaskTitle.trim().length > 0 && editTaskDueAt.trim().length > 0 && !savingEdit

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
      if (a.due_at && b.due_at) {
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
      }
      if (a.due_at && !b.due_at) return -1
      if (!a.due_at && b.due_at) return 1
      return compareRecent(a, b)
    }

    const compareTasks = taskSort === 'due' ? compareDueNearest : compareRecent

    let items = [...tasks]

    if (taskFilter === 'completed') {
      items = items.filter(task => task.is_completed)
      return items.sort(compareTasks)
    }

    if (taskFilter === 'pending') {
      items = items.filter(task => !task.is_completed)
      return items.sort(compareTasks)
    }

    return items.sort(compareTasks)
  }, [tasks, taskFilter, taskSort])

  const taskCounts = useMemo(() => {
    const completed = tasks.filter(task => task.is_completed).length
    const pending = tasks.length - completed
    return {
      all: tasks.length,
      completed,
      pending
    }
  }, [tasks])

  const fetchSection = useCallback(async () => {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .eq('id', sectionId)
      .single()
    setSection(data)
    setLoading(false)
  }, [sectionId])

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
  }, [sectionId])

  useEffect(() => {
    if (sectionId) {
      fetchSection()
      fetchTasks()
    }
  }, [sectionId, fetchSection, fetchTasks])

  useEffect(() => {
    const title = newTask.trim()
    if (title.length < 3) {
      setTitleSuggestions([])
      setSuggestingTitles(false)
      return
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setSuggestingTitles(true)
      try {
        const response = await fetch('/api/improve-task-title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title }),
          signal: controller.signal
        })

        if (!response.ok) {
          setTitleSuggestions([])
          return
        }

        const data = await response.json() as { suggestions?: string[] }
        setTitleSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      } catch {
        if (!controller.signal.aborted) {
          setTitleSuggestions([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setSuggestingTitles(false)
        }
      }
    }, 400)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [newTask])

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim() || !newDueAt.trim()) return
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
  }

  async function toggleTask(task: Task) {
    await supabase
      .from('tasks')
      .update({ is_completed: !task.is_completed })
      .eq('id', task.id)
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
    if (!editTaskTitle.trim() || !editTaskDueAt.trim()) return
    setSavingEdit(true)
    await supabase
      .from('tasks')
      .update({
        title: editTaskTitle.trim(),
        due_at: new Date(editTaskDueAt).toISOString()
      })
      .eq('id', taskId)
    await fetchTasks()
    cancelEditTask()
    setSavingEdit(false)
  }

  if (loading) {
    return (
      <main className="flex-1 flex flex-col overflow-hidden animate-pulse">
        <div className="px-8 py-6 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
          <div className="h-8 w-48 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="h-12 w-full rounded-lg bg-neutral-200 dark:bg-neutral-800 mb-6" />
          <div className="space-y-2">
            {[...Array(5)].map((_, index) => (
              <div
                key={index}
                className="h-[54px] w-full rounded-xl bg-neutral-200 dark:bg-neutral-800"
              />
            ))}
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 py-6 border-b border-neutral-200 dark:border-neutral-800">
        <h2 className="text-2xl font-semibold text-black dark:text-white">
          {section?.name}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <form onSubmit={addTask} className="mb-6">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            />
            <input
              type="datetime-local"
              value={newDueAt}
              onChange={e => setNewDueAt(e.target.value)}
              required
              className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            />
            <button
              type="submit"
              disabled={!canAddTask}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black px-5 py-3 rounded-lg transition font-medium"
            >
              {adding ? '...' : 'Add'}
            </button>
          </div>

          {(suggestingTitles || titleSuggestions.length > 0) && (
            <div className="mt-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-3 py-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                {suggestingTitles ? 'Improving title...' : 'Suggested improved titles'}
              </p>
              <div className="flex flex-wrap gap-2">
                {titleSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setNewTask(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>

        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTaskFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                taskFilter === 'all'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              All ({taskCounts.all})
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                taskFilter === 'completed'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              Completed ({taskCounts.completed})
            </button>
            <button
              type="button"
              onClick={() => setTaskFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                taskFilter === 'pending'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              Not Finished ({taskCounts.pending})
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTaskSort('recent')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                taskSort === 'recent'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              Recent Added
            </button>
            <button
              type="button"
              onClick={() => setTaskSort('due')}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                taskSort === 'due'
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                  : 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              Nearest Due Date
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {filteredTasks.length === 0 && (
            <p className="text-neutral-400 text-sm text-center py-16">
              No tasks yet. Add one above!
            </p>
          )}
          {filteredTasks.map(task => {
              const isOverdue = Boolean(task.due_at) && !task.is_completed && new Date(task.due_at as string) < new Date()
              const isEditing = editingTaskId === task.id
              return (
            <div
              key={task.id}
              className={`group flex items-center gap-4 rounded-xl px-4 py-3 transition border ${
                isOverdue
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                  : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
              }`}
            >
              <input
                type="checkbox"
                checked={task.is_completed}
                onChange={() => toggleTask(task)}
                disabled={isEditing || savingEdit}
                className="w-4 h-4 accent-neutral-700 dark:accent-neutral-300 cursor-pointer"
              />
              {isEditing ? (
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={editTaskTitle}
                    onChange={e => setEditTaskTitle(e.target.value)}
                    className="flex-1 min-w-[220px] bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  />
                  <input
                    type="datetime-local"
                    value={editTaskDueAt}
                    onChange={e => setEditTaskDueAt(e.target.value)}
                    className="bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
                  />
                </div>
              ) : (
                <span className={`flex-1 text-sm ${
                  task.is_completed
                    ? 'line-through text-neutral-400'
                    : isOverdue
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-black dark:text-white'
                }`}>
                  {task.title}
                  {task.due_at && (
                    <span className={`block text-xs mt-1 ${
                      isOverdue
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}>
                      Due: {new Date(task.due_at).toLocaleString()}
                    </span>
                  )}
                </span>
              )}
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => saveTaskEdit(task.id)}
                    disabled={!canSaveEdit}
                    className="text-xs px-3 py-1.5 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-black disabled:opacity-50"
                  >
                    {savingEdit ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditTask}
                    disabled={savingEdit}
                    className="p-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 transition"
                    aria-label="Cancel edit"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    type="button"
                    onClick={() => startEditTask(task)}
                    className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
                    aria-label="Edit task"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTask(task.id)}
                    className="text-neutral-400 hover:text-red-400 transition"
                    aria-label="Delete task"
                  >
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