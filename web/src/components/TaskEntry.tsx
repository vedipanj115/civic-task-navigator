import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { fetchMeta, resolveTask } from '../api'
import { HOVER_LIFT } from '../styles/hover'
import type { Activity, City, EntityType, JourneyAnswers, PremisesType, ResolveResponse } from '../types'

const INPUT = 'w-full rounded-md border border-ink-300 bg-white px-3 py-2'

function Choice({ name, legend, options }: { name: string; legend: string; options: Record<string, string> }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-300 bg-white px-3 py-2 text-sm has-checked:border-brand-500 has-checked:bg-brand-050"
          >
            <input type="radio" name={name} value={value} required className="accent-brand-600" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

type ProcedureButtonsProps = { candidates: ResolveResponse['candidates']; onPick: (procedureId: string) => void }

function ProcedureButtons({ candidates, onPick }: ProcedureButtonsProps) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {candidates.map((c) => (
        <button
          key={c.procedureId}
          type="button"
          onClick={() => onPick(c.procedureId)}
          className={`rounded-md border border-ink-300 px-3 py-2 text-left text-sm font-medium hover:border-brand-500 hover:bg-brand-050 ${HOVER_LIFT}`}
        >
          {c.name}
        </button>
      ))}
    </div>
  )
}

type Props = { onSubmit: (procedureId: string, answers: JourneyAnswers) => void }

// Unresolved task (docs/06-UI-SPEC.md S1): keep the answers so picking a candidate can submit straight away.
type Picker = { candidates: ResolveResponse['candidates']; answers: JourneyAnswers; showAll: boolean }

export function TaskEntry({ onSubmit }: Props) {
  const { data: meta, error: metaError } = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: Infinity })
  const [task, setTask] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState<Picker | null>(null)

  if (metaError) return <p className="m-auto text-danger-700">Couldn't load the form: {metaError.message}</p>
  if (!meta) return <p className="m-auto text-ink-600">Loading…</p>
  const labels = meta.enumLabels

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const optionalNumber = (key: string) => (form.get(key) ? Number(form.get(key)) : undefined)
    const answers: JourneyAnswers = {
      city: form.get('city') as City,
      entityType: form.get('entityType') as EntityType,
      activity: form.get('activity') as Activity,
      annualTurnoverInr: Math.round(Number(form.get('turnoverLakh')) * 100_000), // money is integer rupees
      premisesType: form.get('premisesType') as PremisesType,
      seatingCapacity: optionalNumber('seatingCapacity'),
      employeeCount: optionalNumber('employeeCount'),
    }
    setPending(true)
    setError(null)
    setPicker(null)
    try {
      const res = await resolveTask(task.trim(), answers.city)
      if (res.resolved && res.procedureId) onSubmit(res.procedureId, answers)
      else setPicker({ candidates: res.candidates, answers, showAll: false })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-6 p-6 motion-safe:animate-fade-up">
      <label className="block space-y-1">
        <span className="font-medium">What do you need to get done?</span>
        <input
          required
          value={task}
          onChange={(e) => {
            setTask(e.target.value)
            setPicker(null) // a new query needs a new resolve
          }}
          placeholder="e.g. Open a small restaurant"
          className={INPUT}
        />
      </label>

      <label className="block space-y-1">
        <span className="font-medium">City</span>
        <select name="city" required defaultValue="" className={INPUT}>
          <option value="" disabled>
            Select a city
          </option>
          {meta.cities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {task.trim() && (
        <>
          <Choice name="entityType" legend="What kind of business is it?" options={labels.entityType} />
          <Choice name="activity" legend="What will it do?" options={labels.activity} />
          <Choice name="premisesType" legend="Is the premises rented or owned?" options={labels.premisesType} />

          <label className="block space-y-1">
            <span className="font-medium">Expected yearly turnover (₹ lakh)</span>
            <input name="turnoverLakh" type="number" min={0} step="any" required placeholder="e.g. 18" className={INPUT} />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span className="font-medium">
                Seats <span className="font-normal text-ink-600">(optional)</span>
              </span>
              <input name="seatingCapacity" type="number" min={0} step={1} className={INPUT} />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">
                Employees <span className="font-normal text-ink-600">(optional)</span>
              </span>
              <input name="employeeCount" type="number" min={0} step={1} className={INPUT} />
            </label>
          </div>
        </>
      )}

      {picker && (
        <div role="status" className="rounded-lg border border-ink-200 bg-white p-4 shadow-card">
          <p className="font-medium">We couldn't match “{task.trim()}” exactly. Did you mean…</p>
          <ProcedureButtons candidates={picker.candidates} onPick={(id) => onSubmit(id, picker.answers)} />
          {picker.showAll ? (
            <div className="mt-4 border-t border-ink-200 pt-3">
              <p className="text-sm font-medium text-ink-600">All procedures</p>
              {/* ponytail: the only procedure is already the candidate; list GET /v1/procedures once there are more. */}
              <ProcedureButtons candidates={picker.candidates} onPick={(id) => onSubmit(id, picker.answers)} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPicker({ ...picker, showAll: true })}
              className="mt-3 text-sm text-brand-600 underline hover:text-brand-700"
            >
              Show all procedures
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-danger-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`w-full rounded-md bg-accent-500 px-4 py-2 font-semibold text-ink-900 hover:bg-accent-600 disabled:opacity-60 ${HOVER_LIFT}`}
      >
        {pending ? 'Finding your procedure…' : 'Show my roadmap'}
      </button>
    </form>
  )
}
