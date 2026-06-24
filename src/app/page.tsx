import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'TaskFlow',
  description: 'Task management app',
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#212121] text-white font-sans">

      {/* navbar */}
      <nav className="flex items-center justify-between px-8 sm:px-16 py-5 border-b border-neutral-800">
        <span className="text-base font-semibold tracking-tight text-white">TaskFlow</span>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/login"
            className="text-sm sm:text-base text-neutral-400 hover:text-white transition px-4 py-2"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm sm:text-base bg-white text-black px-6 sm:px-7 py-2.5 rounded-full font-medium hover:bg-neutral-100 transition"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* hero — two-column split */}
      <section className="max-w-7xl mx-auto px-8 sm:px-16 pt-16 sm:pt-28 pb-20 sm:pb-32 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* left: copy */}
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 tracking-tight">
            Tasks you'll actually<br />
            <span className="text-neutral-400">remember to finish.</span>
          </h1>
          <p className="text-base sm:text-lg text-neutral-400 mb-10 leading-relaxed max-w-lg">
            TaskFlow keeps everything in sections so nothing slips. No bloat, no upsells — just your list.
          </p>
          <div className="flex items-center gap-6 flex-wrap">
            <Link
              href="/signup"
              className="bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-neutral-100 transition text-base"
            >
              Start for free
            </Link>
            <Link
              href="/login"
              className="text-base text-neutral-400 hover:text-white transition"
            >
              Sign in →
            </Link>
          </div>
        </div>

        {/* right: app screenshot — drop your image in /public and update the src below */}
        <div className="rounded-2xl border border-neutral-700 overflow-hidden bg-[#1a1a1a]">
          <Image
            src="/yours-screenshot.png"
            alt="TaskFlow app preview"
            width={800}
            height={600}
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* how it works */}
      <section className="max-w-7xl mx-auto px-8 sm:px-16 py-20 sm:py-28">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Up and running in three steps</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Create your account',
              desc: "Sign up in seconds. No credit card, no email confirmation — just pick a username and password and you're in.",
            },
            {
              step: '02',
              title: 'Add your sections',
              desc: 'Organize tasks into sections like Work, Personal, or Side Project. Create as many as you need, rename or delete anytime.',
            },
            {
              step: '03',
              title: 'Start adding tasks',
              desc: 'Type or speak your tasks. AI cleans up the title, catches duplicates, and auto-fills due dates when you mention them.',
            },
          ].map((s, i) => (
            <div key={i} className="bg-[#2a2a2a] border border-neutral-700 rounded-2xl p-8">
              <p className="text-4xl font-bold text-neutral-700 mb-5">{s.step}</p>
              <h4 className="font-semibold text-white text-lg mb-3">{s.title}</h4>
              <p className="text-base text-neutral-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="max-w-7xl mx-auto px-8 sm:px-16 pb-20 sm:pb-28">
        <div className="border-t border-neutral-800 pt-12 mb-12 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">Everything included</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">All TaskFlow Features</h2>
          <p className="text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Built for real daily use: fast task entry, AI cleanup, smart duplicate checks, voice input, and a floating assistant that answers across all your sections.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-800 rounded-2xl overflow-hidden border border-neutral-800">
          {[
            {
              icon: '✦',
              title: 'AI title improvement',
              desc: 'Type short titles like "do math" and get cleaner options like "Complete Math Assignment" instantly.',
            },
            {
              icon: '✎',
              title: 'auto-correct suggestions',
              desc: 'Misspellings like "assignm" are corrected automatically in suggestions so titles stay clean.',
            },
            {
              icon: '🎙',
              title: 'voice to task input',
              desc: 'Use the mic to speak your task. If you include date/time, it auto-fills due date too.',
            },
            {
              icon: '⊘',
              title: 'smart duplicate blocking',
              desc: 'Prevents duplicate tasks across wording variations while still allowing numbered tasks like 1, 2, 3.',
            },
            {
              icon: '◎',
              title: 'section duplicate protection',
              desc: 'Section names are checked case-insensitively so duplicate section names are blocked.',
            },
            {
              icon: '⊟',
              title: 'floating AI assistant',
              desc: 'Bottom-right chat widget answers questions like closest due date across all sections.',
            },
            {
              icon: '✓',
              title: 'edit, delete, complete',
              desc: 'Quickly update titles and dates, mark done, or remove tasks when no longer needed.',
            },
            {
              icon: '⊞',
              title: 'filters and sorting',
              desc: 'View all/completed/pending tasks and sort by recent added or nearest due date.',
            },
            {
              icon: '⊕',
              title: 'auth + personal workspace',
              desc: 'Your account gets its own private sections and tasks with login, signup, and protected routes.',
            },
          ].map((f, i) => (
            <div key={i} className="bg-[#242424] p-8">
              <div className="w-10 h-10 rounded-lg bg-[#2f2f2f] border border-neutral-700 flex items-center justify-center text-base mb-5 text-neutral-300">
                {f.icon}
              </div>
              <h4 className="font-semibold text-white text-base mb-3">{f.title}</h4>
              <p className="text-sm text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* faq */}
      <section className="max-w-4xl mx-auto px-8 sm:px-16 py-20 sm:py-28">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">FAQ</p>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Common questions</h2>
        </div>
        <div className="flex flex-col divide-y divide-neutral-800">
          {[
            {
              q: 'Is TaskFlow really free?',
              a: 'Yes. No trial period, no hidden tier, no credit card. Every feature listed on this page is available to every user.',
            },
            {
              q: 'How does the AI title improvement work?',
              a: "When you type a task title, TaskFlow sends it to an AI model that suggests a cleaner, more specific version. You can accept or ignore it — it never overwrites without your approval.",
            },
            {
              q: 'Can I use voice input on mobile?',
              a: 'Yes. The mic button works on any device with a microphone. It also detects dates and times in your speech and fills the due date field automatically.',
            },
            {
              q: 'What happens to my data if I stop using it?',
              a: 'Your account and all tasks stay intact. Nothing is deleted unless you delete it yourself. You can also delete your account from settings at any time.',
            },
            {
              q: 'Is there a mobile app?',
              a: 'TaskFlow is a fully responsive web app that works great on mobile browsers. A dedicated app may come later.',
            },
          ].map((item, i) => (
            <div key={i} className="py-7">
              <p className="text-base font-medium text-white mb-3">{item.q}</p>
              <p className="text-base text-neutral-500 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* footer CTA — matches nav alignment */}
      <section className="border-t border-neutral-800 px-8 sm:px-16 py-14 sm:py-20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Try it in 30 seconds.</h2>
            <p className="text-base text-neutral-500">No credit card. No setup. Actually free.</p>
          </div>
          <Link
            href="/signup"
            className="flex-shrink-0 bg-white text-black px-8 py-3.5 rounded-full font-medium hover:bg-neutral-100 transition text-base"
          >
            Get started free
          </Link>
        </div>
      </section>

      {/* bottom footer */}
      <footer className="border-t border-neutral-800 px-8 sm:px-16 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-600">
          <span>© 2025 TaskFlow. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-neutral-400 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-neutral-400 transition">Terms</Link>
            <Link href="/contact" className="hover:text-neutral-400 transition">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}