import type { RoadmapResponse, Step } from '../types'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function StepDetails({ step }: { step: Step }) {
  return (
    <section className="space-y-2 text-sm">
      <h2 className="text-base font-semibold">{step.title}</h2>
      <p className="text-slate-600">{step.office}</p>
      <p>
        <span className="font-medium">{step.fee}</span> · {step.processingTime}
      </p>
      <div>
        <h3 className="font-medium">Documents</h3>
        <ul className="list-disc pl-5 text-slate-600">
          {step.documents.map((doc) => (
            <li key={doc}>{doc}</li>
          ))}
        </ul>
      </div>
      <a
        href={step.applyLink}
        target="_blank"
        rel="noreferrer"
        className="inline-block rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
      >
        Apply
      </a>
      <p className="text-xs text-slate-400">
        <a href={step.sourceUrl} target="_blank" rel="noreferrer" className="underline">
          Source
        </a>{' '}
        · verified {step.verifiedOn}
      </p>
    </section>
  )
}

type Props = { roadmap: RoadmapResponse; selected: Step | null }

export function SidePanel({ roadmap, selected }: Props) {
  return (
    <aside className="space-y-6 border-slate-200 bg-white p-5 md:w-80 md:overflow-y-auto md:border-l">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Critical path</dt>
          <dd className="text-xl font-semibold">~{roadmap.criticalPathDays} days</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <dt className="text-xs text-slate-500">Total cost</dt>
          <dd className="text-xl font-semibold">{inr.format(roadmap.totalCost)}</dd>
        </div>
      </dl>

      {selected ? (
        <StepDetails step={selected} />
      ) : (
        <p className="text-sm text-slate-400">Click a step to see documents, office and fees.</p>
      )}

      {roadmap.excludedSteps.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Not needed for you</h2>
          <ul className="space-y-2">
            {roadmap.excludedSteps.map((s) => (
              <li key={s.stepId} className="rounded-md border border-dashed border-slate-300 p-2 text-sm">
                <div className="font-medium text-slate-500 line-through">{s.title}</div>
                <div className="text-slate-500">{s.reason}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
