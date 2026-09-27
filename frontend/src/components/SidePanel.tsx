import type { ReactNode } from 'react'
import { formatDays, formatFee, inr } from '../format'
import type { CitiesMetaResponse, Roadmap, RoadmapStep, StepDetailResponse, StepStatus } from '../types'

type Labels = CitiesMetaResponse['enumLabels']

const BADGE: Record<StepStatus, string> = {
  AVAILABLE: 'bg-info-050 text-info-700 ring-info-700/25',
  BLOCKED: 'bg-warn-050 text-warn-700 ring-warn-700/25',
  COMPLETED: 'bg-ok-050 text-ok-700 ring-ok-700/25',
  NOT_APPLICABLE: 'bg-ink-100 text-neutral-700 ring-ink-200',
}

type SummaryProps = { roadmap: Roadmap; days: number; cost: number; onReset: () => void }

function Summary({ roadmap, days, cost, onReset }: SummaryProps) {
  const doneCount = roadmap.steps.filter((rs) => rs.status === 'COMPLETED').length
  const total = roadmap.steps.length
  return (
    <section className="rounded-lg border border-ink-200 bg-white p-4 shadow-card">
      <h2 className="font-semibold">{roadmap.procedure.name}</h2>
      <p className="mt-0.5 text-sm text-ink-600">{roadmap.procedure.summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-ink-600">Days remaining</dt>
          <dd className="text-2xl font-semibold">~{days}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-600">Cost remaining</dt>
          <dd className="text-2xl font-semibold">{inr.format(cost)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex justify-between text-xs text-ink-600">
        <span>Progress</span>
        <span>
          {doneCount} of {total} steps done
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full bg-ok-700" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
      {doneCount > 0 && (
        <button
          type="button"
          onClick={() => window.confirm('Reset progress? All steps will be marked not done.') && onReset()}
          className="mt-3 text-xs text-ink-600 underline hover:text-ink-700"
        >
          Reset progress
        </button>
      )}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-ink-600">{label}</dt>
      <dd className="text-ink-900">{children}</dd>
    </div>
  )
}

type StepCardProps = {
  rs: RoadmapStep
  detail: StepDetailResponse | undefined
  roadmap: Roadmap
  labels: Labels
  onToggleDone: () => void
}

function StepCard({ rs, detail, roadmap, labels, onToggleDone }: StepCardProps) {
  const { step } = rs
  const stepById = (id: string) => roadmap.steps.find((s) => s.step.stepId === id)

  return (
    <article className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-card">
      <header className="border-b border-ink-200 bg-ink-050 px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${BADGE[rs.status]}`}>
          {labels.stepStatus[rs.status]}
        </span>
        <h2 className="mt-2 text-lg leading-snug font-semibold">{step.title}</h2>
        <p className="mt-1 text-sm text-ink-700">{step.description}</p>
      </header>

      <div className="space-y-5 px-4 py-4 text-sm">
        <dl className="space-y-2">
          <Field label="Office">
            {step.issuingOffice}
            <span className="block text-xs text-ink-600">{step.department}</span>
          </Field>
          <Field label="Fee">
            {formatFee(step)}
            {step.feeNote && <span className="block text-xs text-ink-600">{step.feeNote}</span>}
          </Field>
          <Field label="Takes">{formatDays(step)}</Field>
          <Field label="Apply">{step.modeOnline ? 'Online' : 'In person'}</Field>
        </dl>

        {detail && detail.prerequisites.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-600 uppercase">Needs first</h3>
            <ul className="space-y-1.5">
              {detail.prerequisites.map((p) => {
                const done = stepById(p.dependsOnStepId)?.status === 'COMPLETED'
                return (
                  <li key={p.dependsOnStepId} className="flex gap-2">
                    <span className={done ? 'text-ok-700' : 'text-ink-300'}>{done ? '✓' : '○'}</span>
                    <span>
                      {stepById(p.dependsOnStepId)?.step.title ?? p.dependsOnStepId}
                      <span className="block text-xs text-ink-600">{p.reason}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-600 uppercase">Documents to carry</h3>
          {detail ? (
            <ul className="divide-y divide-ink-200 rounded-lg border border-ink-200">
              {detail.documents.map((doc) => (
                <li key={doc.documentId} className="flex items-baseline justify-between gap-2 px-3 py-2">
                  <span>{doc.name}</span>
                  {rs.missingDocumentIds.includes(doc.documentId) && doc.issuedByStepId && (
                    <span className="shrink-0 text-xs text-ink-500">
                      from {stepById(doc.issuedByStepId)?.step.shortTitle ?? doc.issuedByStepId}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-500">Loading documents…</p>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-ink-200 px-3 py-2.5 font-medium has-checked:border-ok-700 has-checked:bg-ok-050 has-checked:text-ok-700">
          <input
            type="checkbox"
            checked={rs.status === 'COMPLETED'}
            onChange={onToggleDone}
            className="size-4 accent-ok-700"
          />
          Mark as done
        </label>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-ink-200 bg-ink-050 px-4 py-3">
        <span className="text-xs text-ink-600">
          <a href={step.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-ink-700">
            Source
          </a>{' '}
          · {labels.sourceHealth[rs.sourceHealth]} ({step.verifiedOn})
        </span>
        {step.applicationUrl && (
          <a
            href={step.applicationUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Apply ↗
          </a>
        )}
      </footer>
    </article>
  )
}

type Props = {
  roadmap: Roadmap
  remaining: { days: number; cost: number }
  selected: RoadmapStep | null
  selectedDetail: StepDetailResponse | undefined
  labels: Labels
  onToggleDone: (id: string) => void
  onReset: () => void
}

export function SidePanel({ roadmap, remaining, selected, selectedDetail, labels, onToggleDone, onReset }: Props) {
  return (
    <aside className="space-y-4 border-ink-200 bg-ink-050 p-4 md:w-96 md:overflow-y-auto md:border-l">
      <Summary roadmap={roadmap} days={remaining.days} cost={remaining.cost} onReset={onReset} />

      {selected ? (
        <StepCard
          rs={selected}
          detail={selectedDetail}
          roadmap={roadmap}
          labels={labels}
          onToggleDone={() => onToggleDone(selected.step.stepId)}
        />
      ) : (
        <p className="rounded-lg border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-600">
          Select a step to see its documents, office and fees.
        </p>
      )}

      {roadmap.excluded.length > 0 && (
        <section className="rounded-lg border border-ink-200 bg-white p-4 shadow-card">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-ink-600 uppercase">Not needed for you</h2>
          <ul className="space-y-3 text-sm">
            {roadmap.excluded.map((s) => (
              <li key={s.stepId}>
                <div className="font-medium text-ink-500 line-through">{s.title}</div>
                <div className="text-ink-600">{s.reason}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
