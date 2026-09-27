import { inr } from '../format'
import type { Roadmap } from '../types'

// docs/06-UI-SPEC.md §3 header strip: whole-procedure totals, static. Progress lives in SidePanel's Summary.
type Props = { roadmap: Roadmap; city: string | undefined }

export function RoadmapHeader({ roadmap: { procedure, totals }, city }: Props) {
  const { criticalPathDaysMin: min, criticalPathDaysMax: max } = totals
  const stats = [
    ['Applicable steps', totals.applicableStepCount],
    ['Total fee', inr.format(totals.totalFeeInr)],
    ['Estimated days', min === max ? `${max}` : `${min}–${max}`],
    ['Departments', totals.distinctDepartments],
    ['Pages consolidated', totals.distinctSourceUrls],
  ] as const

  return (
    <section className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">{procedure.name}</h2>
        {city && <p className="text-sm text-slate-500">{city}</p>}
      </div>
      <dl className="flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
        <div className="rounded-lg bg-emerald-50 px-3 py-1.5 ring-1 ring-emerald-200">
          <dt className="text-emerald-800">Days saved by running steps in parallel</dt>
          <dd className="text-2xl font-semibold text-emerald-700">
            {totals.sequentialDaysMax - totals.criticalPathDaysMax}
          </dd>
        </div>
      </dl>
    </section>
  )
}
