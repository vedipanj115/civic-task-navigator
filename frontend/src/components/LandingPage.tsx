const STEPS = [
  { title: 'Tell us your task', body: 'Describe what you need done, pick your city and answer a few quick questions.' },
  { title: 'Get a personalized roadmap', body: 'See every office, fee and document, in the order you have to do them.' },
  { title: 'Track every step', body: 'Tick steps off as you go and watch the days and cost left shrink.' },
]

const FADE_UP = 'motion-safe:animate-fade-up'

export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-100 px-4 py-12 text-ink-900">
      <div className="w-full max-w-4xl text-center">
        <div className={FADE_UP}>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Civic Task Navigator</h1>
          <p className="mt-2 text-xs font-medium tracking-wide text-brand-600 uppercase sm:text-sm">
            Municipal bureaucracy path visualizer
          </p>
          <p className="mx-auto mt-6 max-w-xl text-base text-ink-700 sm:text-lg">
            Tell us what you're trying to do and we'll map out every government step, in order, with the paperwork
            you need at each one.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 text-left md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              style={{ animationDelay: `${150 + i * 100}ms` }}
              className={`relative rounded-lg border border-ink-200 bg-white p-5 shadow-card ${FADE_UP}`}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-050 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
                {i + 1}
              </span>
              <h2 className="mt-3 font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm text-ink-600">{step.body}</p>
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-3.5 z-10 hidden -translate-y-1/2 text-lg text-ink-500 md:block"
                >
                  →
                </span>
              )}
            </li>
          ))}
        </ol>

        <button
          onClick={onGetStarted}
          style={{ animationDelay: '500ms' }}
          className={`mt-10 w-full rounded-md bg-accent-500 px-6 py-2.5 font-semibold text-ink-900 hover:bg-accent-600 sm:w-auto ${FADE_UP}`}
        >
          Get started
        </button>
      </div>
    </div>
  )
}
