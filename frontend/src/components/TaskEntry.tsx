import { useState, type FormEvent } from 'react'
import type { RoadmapRequest } from '../types'

const CITIES = ['Mumbai', 'Thane', 'Navi Mumbai', 'Pune']

// ponytail: hardcoded for the business demo; should come from backend per procedure once it exists.
const QUESTIONS = [
  { id: 'turnover', text: 'Expected yearly turnover?', options: ['Under ₹20 lakh', '₹20 lakh or more'] },
  { id: 'workers', text: 'How many people will work there?', options: ['Just me', '1–9', '10 or more'] },
  { id: 'premises', text: 'Where will you operate from?', options: ['Rented space', 'Owned space', 'Home'] },
]

export function TaskEntry({ onSubmit }: { onSubmit: (request: RoadmapRequest) => void }) {
  const [task, setTask] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    onSubmit({
      task: task.trim(),
      city: String(form.get('city')),
      answers: Object.fromEntries(QUESTIONS.map((q) => [q.id, String(form.get(q.id))])),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-xl space-y-6 p-6">
      <label className="block space-y-1">
        <span className="font-medium">What do you need to get done?</span>
        <input
          required
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder="e.g. Start a small food business"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="font-medium">City</span>
        <select
          name="city"
          required
          defaultValue=""
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2"
        >
          <option value="" disabled>
            Select a city
          </option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>

      {task.trim() &&
        QUESTIONS.map((q) => (
          <fieldset key={q.id} className="space-y-2">
            <legend className="font-medium">{q.text}</legend>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm has-checked:border-indigo-500 has-checked:bg-indigo-50"
                >
                  <input type="radio" name={q.id} value={opt} required className="accent-indigo-600" />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

      <button
        type="submit"
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
      >
        Show my roadmap
      </button>
    </form>
  )
}
