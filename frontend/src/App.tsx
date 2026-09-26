import { useState } from 'react'
import { RoadmapView } from './components/RoadmapView'
import { TaskEntry } from './components/TaskEntry'
import type { RoadmapRequest } from './types'

function App() {
  const [request, setRequest] = useState<RoadmapRequest | null>(null)

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Civic Task Navigator</h1>
          <p className="text-sm text-slate-500">
            {request ? `${request.task} · ${request.city}` : 'Municipal bureaucracy path visualizer'}
          </p>
        </div>
        {request && (
          <button
            onClick={() => setRequest(null)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            New task
          </button>
        )}
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {request ? <RoadmapView request={request} /> : <TaskEntry onSubmit={setRequest} />}
      </main>
    </div>
  )
}

export default App
