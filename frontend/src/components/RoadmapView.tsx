import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchMeta, fetchRoadmap, fetchStep } from '../api'
import { remaining } from '../progress'
import type { Journey } from '../types'
import { ErrorState } from './ErrorState'
import { RoadmapGraph, StepList } from './RoadmapGraph'
import { SidePanel } from './SidePanel'

// Loading state per docs/06-UI-SPEC.md: 3 stage columns of ghost cards plus the rail, same layout as loaded.
function RoadmapSkeleton() {
  const ghost = 'rounded-lg bg-slate-200/70'
  return (
    <div aria-busy="true" aria-label="Loading roadmap" className="flex flex-1 flex-col motion-safe:animate-pulse md:min-h-0 md:flex-row">
      <div className="flex h-[60vh] items-center justify-center gap-10 overflow-hidden p-6 md:h-auto md:flex-1">
        {[2, 2, 2].map((cards, col) => (
          <div key={col} className="w-48 shrink-0 space-y-4 lg:w-56">
            <div className={`h-4 w-24 ${ghost}`} />
            {Array.from({ length: cards }, (_, i) => (
              <div key={i} className="h-[84px] rounded-lg border border-slate-200 bg-white p-3">
                <div className={`h-3 w-2/3 ${ghost}`} />
                <div className={`mt-2 h-2.5 w-1/2 ${ghost}`} />
                <div className={`mt-3 h-2.5 w-1/3 ${ghost}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="space-y-4 border-slate-200 bg-slate-50 p-4 md:w-96 md:border-l">
        <div className="h-44 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`h-4 w-1/2 ${ghost}`} />
          <div className={`mt-2 h-3 w-5/6 ${ghost}`} />
          <div className={`mt-6 h-8 w-2/3 ${ghost}`} />
          <div className={`mt-6 h-1.5 w-full ${ghost}`} />
        </div>
        <div className="h-24 rounded-xl border border-dashed border-slate-300" />
      </div>
    </div>
  )
}

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
  const [showGraph, setShowGraph] = useState(false) // <640px only: graph collapsed behind "View graph"

  const roadmap = roadmapQuery.data
  const meta = metaQuery.data
  const error = roadmapQuery.error ?? metaQuery.error
  if (error)
    return (
      <ErrorState
        message={`Couldn't load your roadmap: ${error.message}`}
        code={'code' in error ? String(error.code) : undefined}
        onRetry={() => {
          if (roadmapQuery.error) roadmapQuery.refetch()
          if (metaQuery.error) metaQuery.refetch()
        }}
      />
    )
  if (!roadmap || !meta) return <RoadmapSkeleton />

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
    <div className="flex flex-1 flex-col md:min-h-0 md:flex-row motion-safe:animate-fade-up">
      <div className="sm:hidden">
        <StepList
          roadmap={roadmap}
          statusLabels={meta.enumLabels.stepStatus}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <button
          type="button"
          aria-expanded={showGraph}
          aria-controls="roadmap-graph"
          onClick={() => setShowGraph((v) => !v)}
          className="mx-4 mb-4 w-[calc(100%-2rem)] rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {showGraph ? 'Hide graph' : 'View graph'}
        </button>
      </div>
      <div id="roadmap-graph" className={`${showGraph ? '' : 'hidden'} h-[60vh] sm:block md:h-auto md:flex-1`}>
        <RoadmapGraph
          key={String(showGraph)} // remount on toggle so fitView measures the now-visible pane
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
        onReset={() => onChange({ ...journey, completedStepIds: [] })}
      />
    </div>
  )
}
