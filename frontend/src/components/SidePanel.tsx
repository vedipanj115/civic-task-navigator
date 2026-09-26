import type { Status } from '../progress'
import type { RoadmapResponse, Step } from '../types'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const BADGE: Record<Status, [string, string]> = {
  available: ['Ready to start', 'bg-indigo-50 text-indigo-700 ring-indigo-200'],
  blocked: ['Blocked', 'bg-slate-100 text-slate-500 ring-slate-200'],
  done: ['Done', 'bg-emerald-50 text-emerald-700 ring-emerald-200'],
}

function Summary({ days, cost, doneCount, total }: { days: number; cost: number; doneCount: number; total: number }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-slate-500">Days remaining</dt>
          <dd className="text-2xl font-semibold">~{days}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Cost remaining</dt>
          <dd className="text-2xl font-semibold">{inr.format(cost)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <span>Progress</span>
        <span>
          {doneCount} of {total} steps done
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-emerald-500" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
    </div>
  )
}

type StepCardProps = {
  step: Step
  status: Status
  prerequisites: { title: string; reason: string; done: boolean }[]
  onToggleDone: () => void
}

function StepCard({ step, status, prerequisites, onToggleDone }: StepCardProps) {
  const [badgeText, badgeClass] = BADGE[status]
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${badgeClass}`}>
          {badgeText}
        </span>
        <h2 className="mt-2 text-lg leading-snug font-semibold">{step.title}</h2>
      </header>

      <div className="space-y-5 px-4 py-4 text-sm">
        <dl className="space-y-2">
          <Field label="Office">{step.office}</Field>
          <Field label="Fee">{step.fee}</Field>
          <Field label="Takes">{step.processingTime}</Field>
        </dl>

        {prerequisites.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Needs first</h3>
            <ul className="space-y-1.5">
              {prerequisites.map((p) => (
                <li key={p.title} className="flex gap-2">
                  <span className={p.done ? 'text-emerald-600' : 'text-slate-300'}>{p.done ? '✓' : '○'}</span>
                  <span>
                    {p.title}
                    <span className="block text-xs text-slate-500">{p.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Documents to carry</h3>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {step.documents.map((doc) => (
              <li key={doc} className="px-3 py-2">
                {doc}
              </li>
            ))}
          </ul>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 font-medium has-checked:border-emerald-500 has-checked:bg-emerald-50 has-checked:text-emerald-800">
          <input
            type="checkbox"
            checked={status === 'done'}
            onChange={onToggleDone}
            className="size-4 accent-emerald-600"
          />
          Mark as done
        </label>
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-xs text-slate-500">
          <a href={step.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-slate-700">
            Source
          </a>{' '}
          · verified {step.verifiedOn}
        </span>
        <a
          href={step.applyLink}
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Apply ↗
        </a>
      </footer>
    </article>
  )
}

type Props = {
  roadmap: RoadmapResponse
  steps: Step[]
  status: Map<string, Status>
  remaining: { days: number; cost: number }
  selected: Step | null
  onToggleDone: (id: string) => void
}

export function SidePanel({ roadmap, steps, status, remaining, selected, onToggleDone }: Props) {
  const doneCount = steps.filter((s) => status.get(s.id) === 'done').length

  return (
    <aside className="space-y-4 border-slate-200 bg-slate-50 p-4 md:w-96 md:overflow-y-auto md:border-l">
      <Summary days={remaining.days} cost={remaining.cost} doneCount={doneCount} total={steps.length} />

      {selected ? (
        <StepCard
          step={selected}
          status={status.get(selected.id)!}
          prerequisites={selected.dependsOn.flatMap((d) => {
            const dep = steps.find((s) => s.id === d)
            return dep ? [{ title: dep.title, reason: selected.dependencyReason[d] ?? '', done: status.get(d) === 'done' }] : []
          })}
          onToggleDone={() => onToggleDone(selected.id)}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Select a step to see its documents, office and fees.
        </p>
      )}

      {roadmap.excludedSteps.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Not needed for you</h2>
          <ul className="space-y-3 text-sm">
            {roadmap.excludedSteps.map((s) => (
              <li key={s.stepId}>
                <div className="font-medium text-slate-400 line-through">{s.title}</div>
                <div className="text-slate-500">{s.reason}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
