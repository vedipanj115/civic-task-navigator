import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchRoadmap } from '../api'
import { allSteps, remaining, stepStatuses } from '../progress'
import type { RoadmapRequest } from '../types'
import { RoadmapGraph } from './RoadmapGraph'
import { SidePanel } from './SidePanel'

export function RoadmapView({ request }: { request: RoadmapRequest }) {
  const { data, isPending, error } = useQuery({
    queryKey: ['roadmap', request],
    queryFn: () => fetchRoadmap(request),
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(() => new Set())

  if (isPending) return <p className="m-auto text-slate-500">Building your roadmap…</p>
  if (error) return <p className="m-auto text-red-600">Couldn't load roadmap: {error.message}</p>

  const steps = allSteps(data)
  const status = stepStatuses(data, done)
  const toggleDone = (id: string) =>
    setDone((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })

  return (
    <div className="flex flex-1 flex-col md:min-h-0 md:flex-row">
      <div className="h-[60vh] md:h-auto md:flex-1">
        <RoadmapGraph roadmap={data} status={status} selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <SidePanel
        roadmap={data}
        steps={steps}
        status={status}
        remaining={remaining(data, done)}
        selected={steps.find((s) => s.id === selectedId) ?? null}
        onToggleDone={toggleDone}
      />
    </div>
  )
}
