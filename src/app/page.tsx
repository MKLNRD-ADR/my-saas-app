import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">

      {/* navbar */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-lg font-semibold tracking-tight">TaskFlow</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-lg hover:opacity-80 transition"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* hero */}
      <section className="max-w-3xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-block text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full mb-6">
          actually free. no credit card.
        </div>
        <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
          stop losing track of<br />what needs to get done
        </h1>
        <p className="text-lg text-neutral-500 dark:text-neutral-400 mb-10 max-w-xl mx-auto leading-relaxed">
          TaskFlow keeps your tasks organized by section so you always know what to work on next. no bloat, no nonsense.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 rounded-lg font-medium hover:opacity-80 transition"
          >
            start for free
          </Link>
          <Link
            href="/login"
            className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition"
          >
            already have an account →
          </Link>
        </div>
      </section>

      {/* fake app preview */}
      <section className="max-w-4xl mx-auto px-8 pb-24">
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="flex h-96">
            {/* fake sidebar */}
            <div className="w-56 bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 p-4 flex flex-col gap-1">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-3 px-2">TaskFlow</p>
              {['Work stuff', 'Personal', 'Side project', 'Shopping'].map((s, i) => (
                <div
                  key={s}
                  className={`text-sm px-3 py-2 rounded-lg cursor-default ${
                    i === 0
                      ? 'bg-neutral-200 dark:bg-neutral-700 text-black dark:text-white'
                      : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {s}
                </div>
              ))}
            </div>

            {/* fake main */}
            <div className="flex-1 bg-white dark:bg-black p-6">
              <h3 className="text-lg font-semibold mb-1 text-black dark:text-white">Work stuff</h3>
              <p className="text-xs text-neutral-400 mb-6">4 tasks</p>
              <div className="flex flex-col gap-2">
                {[
                  { text: 'finish the landing page', done: true },
                  { text: 'review pull requests', done: true },
                  { text: 'fix that annoying navbar bug', done: false },
                  { text: 'write docs for the API', done: false },
                ].map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-4 py-2"
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      task.done
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-neutral-300 dark:border-neutral-600'
                    }`}>
                      {task.done && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${
                      task.done
                        ? 'line-through text-neutral-400'
                        : 'text-black dark:text-white'
                    }`}>
                      {task.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="max-w-4xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-3 gap-6">
          {[
            {
              title: 'sections for everything',
              desc: 'work, personal, groceries — keep each part of your life in its own space without things bleeding into each other.'
            },
            {
              title: 'no extra garbage',
              desc: "it's a task app. you add tasks, you complete them, you delete them. that's it. no kanban boards you'll never use."
            },
            {
              title: 'yours only',
              desc: 'your tasks are tied to your account. nobody else sees them. no shared workspaces you accidentally post to.'
            }
          ].map((f, i) => (
            <div key={i} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
              <h4 className="font-medium text-black dark:text-white mb-2">{f.title}</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* footer cta */}
      <section className="border-t border-neutral-200 dark:border-neutral-800 px-8 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4 tracking-tight">just try it</h2>
        <p className="text-neutral-500 dark:text-neutral-400 mb-8 text-sm">takes 30 seconds to sign up. no email confirmation nonsense.</p>
        <Link
          href="/signup"
          className="bg-black dark:bg-white text-white dark:text-black px-8 py-3 rounded-lg font-medium hover:opacity-80 transition"
        >
          get started free
        </Link>
      </section>

    </div>
  )
}