import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchMeta, fetchRoadmap, fetchStep } from '../api'
import { remaining } from '../progress'
import type { Journey } from '../types'
import { RoadmapGraph } from './RoadmapGraph'
import { SidePanel } from './SidePanel'

type Props = { journey: Journey; onChange: (journey: Journey) => void }

export function RoadmapView({ journey, onChange }: Props) {
  const { procedureId, answers, completedStepIds } = journey
  const roadmapQuery = useQuery({
    queryKey: ['roadmap', procedureId, answers, completedStepIds],
    queryFn: () => fetchRoadmap({ procedureId, answers, completedStepIds }),
    placeholderData: keepPreviousData, // keep the graph on screen while a toggle re-fetches
  })
  const metaQuery = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: Infinity })
  const stepQueries = useQueries({
    queries: (roadmapQuery.data?.steps ?? []).map(({ step }) => ({
      queryKey: ['step', step.stepId],
      queryFn: () => fetchStep(step.stepId),
      staleTime: Infinity,
    })),
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const roadmap = roadmapQuery.data
  const meta = metaQuery.data
  const error = roadmapQuery.error ?? metaQuery.error
  if (error) return <p className="m-auto text-red-600">Couldn't load roadmap: {error.message}</p>
  if (!roadmap || !meta) return <p className="m-auto text-slate-500">Building your roadmap…</p>

  const details = new Map(stepQueries.flatMap((q) => (q.data ? [[q.data.step.stepId, q.data] as const] : [])))
  const prerequisites = new Map([...details].map(([id, d]) => [id, d.prerequisites]))
  const selected = roadmap.steps.find((rs) => rs.step.stepId === selectedId) ?? null

  const toggleDone = (id: string) =>
    onChange({
      ...journey,
      completedStepIds: completedStepIds.includes(id)
        ? completedStepIds.filter((s) => s !== id)
        : [...completedStepIds, id],
    })

  return (
    <div className="flex flex-1 flex-col md:min-h-0 md:flex-row">
      <div className="h-[60vh] md:h-auto md:flex-1">
        <RoadmapGraph
          roadmap={roadmap}
          prerequisites={prerequisites}
          statusLabels={meta.enumLabels.stepStatus}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>
      <SidePanel
        roadmap={roadmap}
        remaining={remaining(roadmap)}
        selected={selected}
        selectedDetail={selectedId ? details.get(selectedId) : undefined}
        labels={meta.enumLabels}
        onToggleDone={toggleDone}
      />
    </div>
  )
}
