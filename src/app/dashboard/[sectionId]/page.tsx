'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'

type Task = {
  id: string
  title: string
  is_completed: boolean
  created_at: string
}

type Section = {
  id: string
  name: string
}

export default function SectionPage() {
  const params = useParams()
  const sectionId = params.sectionId as string
  const [section, setSection] = useState<Section | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sectionId) {
      fetchSection()
      fetchTasks()
    }
  }, [sectionId])

  async function fetchSection() {
    const { data } = await supabase
      .from('sections')
      .select('*')
      .eq('id', sectionId)
      .single()
    setSection(data)
    setLoading(false)
  }

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim()) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      title: newTask.trim(),
      user_id: user!.id,
      section_id: sectionId
    })
    setNewTask('')
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
          {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <form onSubmit={addTask} className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Add a new task..."
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            className="flex-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={adding}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg transition font-medium"
          >
            {adding ? '...' : 'Add'}
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {tasks.length === 0 && (
            <p className="text-neutral-400 text-sm text-center py-16">
              No tasks yet. Add one above!
            </p>
          )}
          {tasks.map(task => (
            <div
              key={task.id}
              className="group flex items-center gap-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 transition"
            >
              <input
                type="checkbox"
                checked={task.is_completed}
                onChange={() => toggleTask(task)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
              <span className={`flex-1 text-sm ${
                task.is_completed
                  ? 'line-through text-neutral-400'
                  : 'text-black dark:text-white'
              }`}>
                {task.title}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}