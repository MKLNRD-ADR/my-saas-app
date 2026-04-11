'use client'

import { useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Bot, MessageCircle, Send, X } from 'lucide-react'

type TaskRow = {
  id: string
  title: string
  due_at: string | null
  is_completed: boolean
  section_id: string
}

type SectionRow = {
  id: string
  name: string
}

type ChatMessage = {
  id: number
  role: 'assistant' | 'user'
  text: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function includesAny(text: string, words: string[]) {
  return words.some(word => text.includes(word))
}

function buildClosestDueReply(tasks: TaskRow[], sectionMap: Record<string, string>) {
  const pendingWithDueDate = tasks
    .filter(task => !task.is_completed && Boolean(task.due_at))
    .sort((a, b) => new Date(a.due_at as string).getTime() - new Date(b.due_at as string).getTime())

  const closest = pendingWithDueDate[0]
  if (!closest?.due_at) {
    return 'No pending tasks with a due date were found across your sections.'
  }

  const sectionName = sectionMap[closest.section_id] ?? 'Unknown section'
  const isOverdue = new Date(closest.due_at).getTime() < Date.now()

  if (isOverdue) {
    return `The closest due task is already overdue: "${closest.title}" in ${sectionName}, due ${formatDateTime(closest.due_at)}.`
  }

  return `The closest due task is "${closest.title}" in ${sectionName}, due ${formatDateTime(closest.due_at)}.`
}

function buildOverdueReply(tasks: TaskRow[]) {
  const now = Date.now()
  const overdue = tasks.filter(
    task => !task.is_completed && Boolean(task.due_at) && new Date(task.due_at as string).getTime() < now
  )

  if (overdue.length === 0) {
    return 'Great news. You have no overdue tasks right now.'
  }

  return `You have ${overdue.length} overdue task${overdue.length === 1 ? '' : 's'}.`
}

function buildTodayReply(tasks: TaskRow[]) {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const dueToday = tasks.filter(task => {
    if (!task.due_at || task.is_completed) return false
    const due = new Date(task.due_at).getTime()
    return due >= todayStart.getTime() && due <= todayEnd.getTime()
  })

  if (dueToday.length === 0) {
    return 'No pending tasks are due today.'
  }

  return `You have ${dueToday.length} pending task${dueToday.length === 1 ? '' : 's'} due today.`
}

function answerQuestion(
  question: string,
  tasks: TaskRow[],
  sections: SectionRow[]
) {
  const sectionMap = Object.fromEntries(sections.map(section => [section.id, section.name]))
  const lower = question.toLowerCase()

  if (tasks.length === 0) {
    return 'No tasks found yet. Add some tasks first, then ask me about due dates.'
  }

  if (includesAny(lower, ['closest due', 'close to due', 'nearest due', 'next due'])) {
    return buildClosestDueReply(tasks, sectionMap)
  }

  if (includesAny(lower, ['overdue', 'late tasks'])) {
    return buildOverdueReply(tasks)
  }

  if (includesAny(lower, ['due today', 'today'])) {
    return buildTodayReply(tasks)
  }

  if (includesAny(lower, ['how many tasks', 'task count', 'total tasks'])) {
    return `You currently have ${tasks.length} total task${tasks.length === 1 ? '' : 's'} across all sections.`
  }

  return 'I can help with task insights across all sections. Try asking: "What is the closest due date?", "How many overdue tasks do I have?", or "What is due today?"'
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: 'assistant',
      text: 'Hi, I am your task assistant. Ask me about closest due dates, overdue tasks, or what is due today across all sections.'
    }
  ])

  const quickPrompts = useMemo(
    () => [
      'What is the closest due date?',
      'How many overdue tasks do I have?',
      'What is due today?'
    ],
    []
  )

  async function fetchTaskData() {
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user

    if (!user) {
      return {
        tasks: [] as TaskRow[],
        sections: [] as SectionRow[]
      }
    }

    const [tasksResult, sectionsResult] = await Promise.all([
      supabase
        .from('tasks')
        .select('id,title,due_at,is_completed,section_id')
        .eq('user_id', user.id),
      supabase
        .from('sections')
        .select('id,name')
        .eq('user_id', user.id)
    ])

    return {
      tasks: (tasksResult.data ?? []) as TaskRow[],
      sections: (sectionsResult.data ?? []) as SectionRow[]
    }
  }

  async function submitQuestion(question: string) {
    const trimmed = question.trim()
    if (!trimmed || loading) return

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: trimmed
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const { tasks, sections } = await fetchTaskData()
      const answer = answerQuestion(trimmed, tasks, sections)

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: answer
        }
      ])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: 'I could not load task data right now. Please try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black shadow-lg hover:scale-105 transition"
          aria-label="Open AI assistant"
        >
          <MessageCircle size={22} className="mx-auto" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black grid place-items-center">
                <Bot size={16} />
              </div>
              <div>
                <p className="text-sm font-medium text-black dark:text-white">AI Assistant</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Across all sections</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-neutral-500 hover:text-black dark:hover:text-white transition"
              aria-label="Close assistant"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-3 py-3 h-[320px] overflow-y-auto space-y-2 bg-neutral-50 dark:bg-neutral-950/40">
            {messages.map(message => (
              <div
                key={message.id}
                className={`max-w-[90%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  message.role === 'assistant'
                    ? 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                    : 'ml-auto bg-neutral-900 dark:bg-white text-white dark:text-black'
                }`}
              >
                {message.text}
              </div>
            ))}
            {loading && (
              <div className="max-w-[90%] px-3 py-2 rounded-xl text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                Thinking...
              </div>
            )}
          </div>

          <div className="px-3 pt-2 pb-1 flex flex-wrap gap-2 border-t border-neutral-200 dark:border-neutral-800">
            {quickPrompts.map(prompt => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => submitQuestion(prompt)}
                className="text-xs px-2 py-1 rounded-full border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault()
              submitQuestion(input)
            }}
            className="p-3 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your tasks..."
              className="flex-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="h-9 w-9 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black grid place-items-center disabled:opacity-50"
              aria-label="Send message"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
