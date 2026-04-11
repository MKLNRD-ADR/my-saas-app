const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const ACTION_VERBS = new Set([
  'add',
  'call',
  'complete',
  'do',
  'draft',
  'finish',
  'learn',
  'plan',
  'practice',
  'prepare',
  'read',
  'review',
  'solve',
  'study',
  'submit',
  'work',
  'write'
])

const COMMON_TYPO_MAP: Record<string, string> = {
  assign: 'assignment',
  assignm: 'assignment',
  assignme: 'assignment',
  assignmen: 'assignment',
  assignmet: 'assignment',
  assignmnt: 'assignment',
  assignemt: 'assignment',
  assigment: 'assignment',
  asignment: 'assignment',
  homewrok: 'homework',
  projet: 'project',
  reoprt: 'report',
  metting: 'meeting',
  schdule: 'schedule',
  tommorow: 'tomorrow'
}

function toTitleCase(input: string) {
  return input
    .split(' ')
    .filter(Boolean)
    .map(word => word[0]?.toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function autocorrectTitle(input: string) {
  return input
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => {
      const lower = word.toLowerCase()
      const corrected = COMMON_TYPO_MAP[lower] ?? lower
      if (corrected === 'mathematics' || corrected === 'maths') return 'math'
      if (/^assign[a-z]*$/.test(corrected) && corrected !== 'assignment') {
        return 'assignment'
      }
      return corrected
    })
    .join(' ')
}

function buildFallbackSuggestions(rawTitle: string) {
  const cleaned = rawTitle.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  const normalized = cleaned.toLowerCase()
  const words = normalized.split(' ')

  const objectReplacements: Record<string, string> = {
    math: 'Math Assignment',
    homework: 'Homework Task',
    project: 'Project Milestone',
    report: 'Report Draft',
    email: 'Email Follow-up',
    code: 'Coding Task'
  }

  const verb = words[0]
  const hasLeadingActionVerb = ACTION_VERBS.has(verb)
  const objectPart = hasLeadingActionVerb ? words.slice(1).join(' ') : normalized
  const baseObject = objectPart || normalized
  const expandedObject = objectReplacements[baseObject] ?? toTitleCase(baseObject)

  if (normalized === 'do math') {
    return [
      'Complete Math Assignment',
      'Finish Math Practice Session',
      'Solve Math Exercises',
      'Review Math Concepts'
    ]
  }

  const compactOriginal = toTitleCase(cleaned)
  const suggestions = [
    `Complete ${expandedObject}`,
    `Finish ${expandedObject}`,
    `Work on ${expandedObject}`,
    `Plan and complete ${expandedObject}`,
    compactOriginal
  ]

  if (verb === 'write') {
    suggestions.unshift(`Draft ${expandedObject}`)
  }

  if (verb === 'call') {
    suggestions.unshift(`Call ${toTitleCase(baseObject)}`)
  }

  return Array.from(new Set(suggestions)).slice(0, 5)
}

function sanitizeSuggestions(inputTitle: string, items: string[]) {
  const normalizedInput = inputTitle.trim().toLowerCase()
  return Array.from(
    new Set(
      items
        .map(item => item.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter(item => item.toLowerCase() !== normalizedInput)
    )
  ).slice(0, 5)
}

async function getAiSuggestions(title: string) {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'

  if (!apiKey) {
    return null
  }

  const prompt = [
    'You improve short todo titles.',
    'Fix spelling mistakes and awkward grammar first.',
    'Return only a JSON array with 4 to 5 concise improved task titles.',
    'Keep each suggestion under 50 characters.',
    `Input title: "${title}"`
  ].join('\n')

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You rewrite task titles to be clearer and action-oriented.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.5
    })
  })

  if (!response.ok) {
    return null
  }

  const data = await response.json() as {
    choices?: Array<{
      message?: {
        content?: string
      }
    }>
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    return null
  }

  try {
    const parsed = JSON.parse(content)
    if (!Array.isArray(parsed)) {
      return null
    }

    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { title?: string }
    const title = body.title?.trim() ?? ''
    const correctedTitle = autocorrectTitle(title)

    if (title.length < 3) {
      return Response.json({ suggestions: [] })
    }

    const aiSuggestions = await getAiSuggestions(correctedTitle)
    const baseSuggestions =
      aiSuggestions && aiSuggestions.length > 0
        ? aiSuggestions
        : buildFallbackSuggestions(correctedTitle)

    const suggestions = sanitizeSuggestions(
      title,
      [toTitleCase(correctedTitle), ...baseSuggestions]
    )

    return Response.json({ suggestions })
  } catch {
    return Response.json({ suggestions: [] }, { status: 200 })
  }
}
