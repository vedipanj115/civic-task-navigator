import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { fetchMeta, resolveTask } from '../api'
import type { Activity, City, EntityType, JourneyAnswers, PremisesType } from '../types'

const INPUT = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2'

function Choice({ name, legend, options }: { name: string; legend: string; options: Record<string, string> }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(options).map(([value, label]) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm has-checked:border-indigo-500 has-checked:bg-indigo-50"
          >
            <input type="radio" name={name} value={value} required className="accent-indigo-600" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

type Props = { onSubmit: (procedureId: string, answers: JourneyAnswers) => void }

export function TaskEntry({ onSubmit }: Props) {
  const { data: meta, error: metaError } = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: Infinity })
  const [task, setTask] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (metaError) return <p className="m-auto text-red-600">Couldn't load the form: {metaError.message}</p>
  if (!meta) return <p className="m-auto text-slate-500">Loading…</p>
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
    try {
      const res = await resolveTask(task.trim(), answers.city)
      if (res.resolved && res.procedureId) onSubmit(res.procedureId, answers)
      else setError("We couldn't match that task yet. Try describing it differently.")
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-6 p-6">
      <label className="block space-y-1">
        <span className="font-medium">What do you need to get done?</span>
        <input
          required
          value={task}
          onChange={(e) => setTask(e.target.value)}
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
                Seats <span className="font-normal text-slate-500">(optional)</span>
              </span>
              <input name="seatingCapacity" type="number" min={0} step={1} className={INPUT} />
            </label>
            <label className="block space-y-1">
              <span className="font-medium">
                Employees <span className="font-normal text-slate-500">(optional)</span>
              </span>
              <input name="employeeCount" type="number" min={0} step={1} className={INPUT} />
            </label>
          </div>
        </>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {pending ? 'Finding your procedure…' : 'Show my roadmap'}
      </button>
    </form>
  )
}
