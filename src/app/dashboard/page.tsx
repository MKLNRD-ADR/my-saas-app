'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import ThemeToggle from '@/components/ThemeToggle'

type Task = {
  id: string
  title: string
  is_completed: boolean
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      await fetchTasks()
      setLoading(false)
    }
    init()
  }, [router])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks')
      .select('*')
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
      user_id: user!.id
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

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <p className="text-neutral-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors">
      <div className="max-w-2xl mx-auto px-6 py-8">

        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-semibold">My Tasks</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">{email}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="text-sm border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500 text-neutral-600 dark:text-neutral-300 px-4 py-2 rounded-lg transition"
            >
              Log out
            </button>
          </div>
        </div>

        <form onSubmit={addTask} className="flex gap-3 mb-8">
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

        <div className="flex flex-col gap-3">
          {tasks.length === 0 && (
            <p className="text-neutral-400 text-sm text-center py-12">No tasks yet. Add one above!</p>
          )}
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-4 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3"
            >
              <input
                type="checkbox"
                checked={task.is_completed}
                onChange={() => toggleTask(task)}
                className="w-4 h-4 accent-blue-500 cursor-pointer"
              />
              <span className={`flex-1 text-sm ${task.is_completed ? 'line-through text-neutral-400' : 'text-black dark:text-white'}`}>
                {task.title}
              </span>
              <button
                onClick={() => deleteTask(task.id)}
                className="text-neutral-400 hover:text-red-400 text-xs transition"
              >
                Delete
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}