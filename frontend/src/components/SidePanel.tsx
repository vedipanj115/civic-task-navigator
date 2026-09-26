import type { ReactNode } from 'react'
import { formatDays, formatFee, inr } from '../format'
import type { CitiesMetaResponse, Roadmap, RoadmapStep, StepDetailResponse, StepStatus } from '../types'

type Labels = CitiesMetaResponse['enumLabels']

const BADGE: Record<StepStatus, string> = {
  AVAILABLE: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  BLOCKED: 'bg-slate-100 text-slate-500 ring-slate-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  NOT_APPLICABLE: 'bg-slate-100 text-slate-500 ring-slate-200',
}

type SummaryProps = { roadmap: Roadmap; days: number; cost: number }

function Summary({ roadmap, days, cost }: SummaryProps) {
  const doneCount = roadmap.steps.filter((rs) => rs.status === 'COMPLETED').length
  const total = roadmap.steps.length
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-semibold">{roadmap.procedure.name}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{roadmap.procedure.summary}</p>
      <dl className="mt-4 grid grid-cols-2 gap-4">
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900">{children}</dd>
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
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${BADGE[rs.status]}`}>
          {labels.stepStatus[rs.status]}
        </span>
        <h2 className="mt-2 text-lg leading-snug font-semibold">{step.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{step.description}</p>
      </header>

      <div className="space-y-5 px-4 py-4 text-sm">
        <dl className="space-y-2">
          <Field label="Office">
            {step.issuingOffice}
            <span className="block text-xs text-slate-500">{step.department}</span>
          </Field>
          <Field label="Fee">
            {formatFee(step)}
            {step.feeNote && <span className="block text-xs text-slate-500">{step.feeNote}</span>}
          </Field>
          <Field label="Takes">{formatDays(step)}</Field>
          <Field label="Apply">{step.modeOnline ? 'Online' : 'In person'}</Field>
        </dl>

        {detail && detail.prerequisites.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Needs first</h3>
            <ul className="space-y-1.5">
              {detail.prerequisites.map((p) => {
                const done = stepById(p.dependsOnStepId)?.status === 'COMPLETED'
                return (
                  <li key={p.dependsOnStepId} className="flex gap-2">
                    <span className={done ? 'text-emerald-600' : 'text-slate-300'}>{done ? '✓' : '○'}</span>
                    <span>
                      {stepById(p.dependsOnStepId)?.step.title ?? p.dependsOnStepId}
                      <span className="block text-xs text-slate-500">{p.reason}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">Documents to carry</h3>
          {detail ? (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {detail.documents.map((doc) => (
                <li key={doc.documentId} className="flex items-baseline justify-between gap-2 px-3 py-2">
                  <span>{doc.name}</span>
                  {rs.missingDocumentIds.includes(doc.documentId) && doc.issuedByStepId && (
                    <span className="shrink-0 text-xs text-slate-400">
                      from {stepById(doc.issuedByStepId)?.step.shortTitle ?? doc.issuedByStepId}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400">Loading documents…</p>
          )}
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 font-medium has-checked:border-emerald-500 has-checked:bg-emerald-50 has-checked:text-emerald-800">
          <input
            type="checkbox"
            checked={rs.status === 'COMPLETED'}
            onChange={onToggleDone}
            className="size-4 accent-emerald-600"
          />
          Mark as done
        </label>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-xs text-slate-500">
          <a href={step.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-slate-700">
            Source
          </a>{' '}
          · {labels.sourceHealth[rs.sourceHealth]} ({step.verifiedOn})
        </span>
        {step.applicationUrl && (
          <a
            href={step.applicationUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
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
}

export function SidePanel({ roadmap, remaining, selected, selectedDetail, labels, onToggleDone }: Props) {
  return (
    <aside className="space-y-4 border-slate-200 bg-slate-50 p-4 md:w-96 md:overflow-y-auto md:border-l">
      <Summary roadmap={roadmap} days={remaining.days} cost={remaining.cost} />

      {selected ? (
        <StepCard
          rs={selected}
          detail={selectedDetail}
          roadmap={roadmap}
          labels={labels}
          onToggleDone={() => onToggleDone(selected.step.stepId)}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          Select a step to see its documents, office and fees.
        </p>
      )}

      {roadmap.excluded.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">Not needed for you</h2>
          <ul className="space-y-3 text-sm">
            {roadmap.excluded.map((s) => (
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
