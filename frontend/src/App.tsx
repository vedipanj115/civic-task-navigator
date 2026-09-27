import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchMeta } from './api'
import { AdminSources } from './components/AdminSources'
import { LandingPage } from './components/LandingPage'
import { RoadmapView } from './components/RoadmapView'
import { TaskEntry } from './components/TaskEntry'
import { loadJourney, saveJourney } from './journey'
import type { Journey, JourneyAnswers } from './types'

function App() {
  const [showLanding, setShowLanding] = useState(true)
  const [journey, setJourney] = useState<Journey | null>(loadJourney)
  const [showAdmin, setShowAdmin] = useState(false) // S4; no router, so a flag like showLanding
  const city = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: Infinity }).data?.cities[0]?.label

  useEffect(() => saveJourney(journey), [journey])

  const goHome = () => {
    setJourney(null)
    setShowAdmin(false)
    setShowLanding(true)
  }

  const startJourney = (procedureId: string, answers: JourneyAnswers) =>
    setJourney({
      journeyId: `jny_${crypto.randomUUID()}`,
      procedureId,
      answers,
      createdAt: new Date().toISOString(),
      completedStepIds: [],
    })

  if (showLanding) return <LandingPage onGetStarted={() => setShowLanding(false)} />

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-xl font-semibold">
              <button onClick={goHome} className="hover:text-indigo-600">
                Civic Task Navigator
              </button>
            </h1>
            {city && <span className="text-sm font-medium text-slate-600">{city}</span>}
          </div>
          <p className="text-sm text-slate-500">Municipal bureaucracy path visualizer</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdmin((v) => !v)} className="text-sm text-slate-600 underline hover:text-slate-900">
            {showAdmin ? 'Back' : 'Admin'}
          </button>
          {journey && !showAdmin && (
            <button
              onClick={() => setJourney(null)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              New task
            </button>
          )}
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {showAdmin ? (
          <AdminSources />
        ) : journey ? (
          <RoadmapView journey={journey} onChange={setJourney} />
        ) : (
          <TaskEntry onSubmit={startJourney} />
        )}
      </main>
      <footer className="border-t border-slate-200 bg-white px-6 py-3 text-xs text-slate-500">
        Guidance assembled from official sources. Always confirm on the linked government page before applying.
      </footer>
    </div>
  )
}

export default App
