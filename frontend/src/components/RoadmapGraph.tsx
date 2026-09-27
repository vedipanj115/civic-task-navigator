import ReactFlow, {
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  MarkerType,
  Position,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from 'reactflow'
import { formatDays, formatFee } from '../format'
import type { Roadmap, RoadmapStep, StepStatus } from '../types'

const NODE_W = 256 // Tailwind w-64
const GAP = 240 // horizontal room between columns for arrow lanes + labels
const COL_WIDTH = NODE_W + GAP
const ROW_HEIGHT = 112 // node is 84px tall, leaving a 28px corridor between rows
const TOP = 72 // first step row, below the stage header
const LABEL_SPACING = 22 // min vertical distance between labels in one gap
const PORT_STEP = 6 // bent edges leave a node above its centre and enter below it, 6px apart

const CARD: Record<StepStatus, string> = {
  AVAILABLE: 'border-slate-300 bg-white',
  BLOCKED: 'border-dashed border-slate-300 bg-slate-100 text-slate-400',
  COMPLETED: 'border-emerald-500 bg-emerald-50',
  NOT_APPLICABLE: 'border-dashed border-slate-300 bg-slate-100 text-slate-400',
}

type StepNodeData = { rs: RoadmapStep; statusLabel: string; isSelected: boolean }

// Card content shared by the graph node (one line each, truncated) and the mobile list (wraps, shows reasons).
function StepBody({ rs, statusLabel, full = false }: { rs: RoadmapStep; statusLabel: string; full?: boolean }) {
  const blocked = rs.status === 'BLOCKED'
  const clip = full ? '' : 'truncate'
  const waiting = `Waiting on ${rs.blockedBy.map((b) => b.shortTitle).join(', ')}`
  const statusLine =
    rs.status === 'COMPLETED' ? (
      <span className="font-medium text-emerald-700">✓ {statusLabel}</span>
    ) : rs.status === 'AVAILABLE' ? (
      <span className="font-medium text-indigo-600">{statusLabel}</span>
    ) : (
      <span>{blocked && !full ? waiting : statusLabel}</span>
    )

  return (
    <>
      <div className={`${clip} text-sm font-semibold ${blocked ? '' : 'text-slate-900'}`} title={rs.step.title}>
        {full ? rs.step.title : rs.step.shortTitle}
      </div>
      <div className={`mt-0.5 ${clip} ${blocked ? '' : 'text-slate-500'}`}>
        {formatFee(rs.step)} · {formatDays(rs.step)}
      </div>
      <div className={`mt-1.5 ${clip}`} title={blocked && !full ? waiting : undefined}>
        {statusLine}
      </div>
      {blocked && full && (
        <ul className="mt-1 space-y-0.5">
          {rs.blockedBy.map((b) => (
            <li key={b.stepId}>
              Waiting on <span className="font-medium text-slate-600">{b.shortTitle}</span>: {b.reason}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function StepNode({ data: { rs, statusLabel, isSelected } }: NodeProps<StepNodeData>) {
  return (
    <div
      className={`h-[84px] w-64 cursor-pointer rounded-lg border px-3 py-2 text-xs shadow-sm ${CARD[rs.status]} ${
        isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0!" />
      <StepBody rs={rs} statusLabel={statusLabel} />
      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  )
}

type StageData = { stage: number; done: number; total: number }

function StageHeader({ data, className = 'w-64' }: Pick<NodeProps<StageData>, 'data'> & { className?: string }) {
  return (
    <div className={`flex ${className} items-baseline justify-between border-b-2 border-slate-300 pb-2`}>
      <span className="text-sm font-semibold tracking-wide text-slate-700 uppercase">Stage {data.stage}</span>
      <span className="text-xs text-slate-500">
        {data.done}/{data.total} done
      </span>
    </div>
  )
}

type WhyEdgeData = {
  reason: string
  labelX: number
  labelOffsetY: number
  laneX?: number
  corridorDir?: 1 | -1 // set when the edge skips a stage and must run between rows
  srcOffset: number // y offset from the node centre where the edge leaves / enters, so
  tgtOffset: number //   horizontals of different edges never share a line
}

// Edge with its own vertical lane (laneX) and a label nudged clear of its neighbours. Edges that skip a
// stage leave the source, drop into the corridor between rows, cross the skipped column(s) there, then
// take their lane into the target, so they never pass behind a node.
function WhyEdge(props: EdgeProps<WhyEdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style } = props
  const data = props.data!
  const sy = sourceY + data.srcOffset
  const ty = targetY + data.tgtOffset
  let path: string
  let baseY: number
  if (data.corridorDir) {
    const corridorY = sourceY + (data.corridorDir * ROW_HEIGHT) / 2
    path = `M ${sourceX} ${sy} H ${sourceX + 16} V ${corridorY} H ${data.laneX} V ${ty} H ${targetX}`
    baseY = (corridorY + ty) / 2
  } else {
    ;[path, , baseY] = getSmoothStepPath({
      sourceX,
      sourceY: sy,
      sourcePosition,
      targetX,
      targetY: ty,
      targetPosition,
      centerX: data.laneX,
    })
  }
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${data.labelX}px, ${baseY + data.labelOffsetY}px)` }}
          title={data.reason}
          className="pointer-events-auto absolute max-w-[150px] truncate rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] leading-tight text-slate-600"
        >
          {data.reason}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = { step: StepNode, stage: StageHeader }
const edgeTypes = { why: WhyEdge }

type Link = {
  sourceId: string
  targetId: string
  reason: string
  srcCol: number
  srcRow: number // for stage-skipping edges: the corridor row (half-way between rows)
  tgtCol: number
  tgtRow: number
  corridorDir?: 1 | -1
}

function buildEdges(links: Link[], status: (id: string) => StepStatus | undefined): Edge<WhyEdgeData>[] {
  const edges: Edge<WhyEdgeData>[] = []
  const byGap = new Map<number, Link[]>()
  for (const l of links) byGap.set(l.tgtCol, [...(byGap.get(l.tgtCol) ?? []), l])

  // Flat edges keep the node centre; each bent edge gets its own port, outgoing above and incoming below.
  // Without this, an edge ending at a row and one starting from it can share a horizontal and fake a link.
  const outs = new Map<string, number>()
  const ins = new Map<string, number>()
  const ports = new Map<Link, { src: number; tgt: number }>()
  for (const l of links) {
    if (l.srcRow === l.tgtRow) continue
    outs.set(l.sourceId, (outs.get(l.sourceId) ?? 0) + 1)
    ins.set(l.targetId, (ins.get(l.targetId) ?? 0) + 1)
    ports.set(l, { src: -PORT_STEP * outs.get(l.sourceId)!, tgt: PORT_STEP * ins.get(l.targetId)! })
  }

  for (const [tgtCol, gapLinks] of byGap) {
    const gapStart = tgtCol * COL_WIDTH - GAP
    const flat = gapLinks.filter((l) => l.srcRow === l.tgtRow)
    // Each bending edge gets its own lane; lower targets take the left lanes so lines cross less.
    const bent = gapLinks
      .filter((l) => l.srcRow !== l.tgtRow)
      .sort((a, b) => b.tgtRow - a.tgtRow || b.srcRow - a.srcRow)

    // Labels sit at the edge's vertical midpoint; flat edges can't move, bent ones get pushed down until clear.
    const placed = flat.map((l) => l.srcRow * ROW_HEIGHT)
    const offsets = new Map<Link, number>()
    for (const l of [...bent].sort((a, b) => a.srcRow + a.tgtRow - (b.srcRow + b.tgtRow))) {
      const port = ports.get(l)!
      const desired = ((l.srcRow + l.tgtRow) / 2) * ROW_HEIGHT + ((l.corridorDir ? 0 : port.src) + port.tgt) / 2
      let y = desired
      let hit: number | undefined
      while ((hit = placed.find((p) => Math.abs(p - y) < LABEL_SPACING)) !== undefined) y = hit + LABEL_SPACING
      placed.push(y)
      offsets.set(l, y - desired)
    }

    const push = (l: Link, laneX: number | undefined, labelX: number) => {
      const color = status(l.sourceId) === 'COMPLETED' ? '#10b981' : '#94a3b8'
      edges.push({
        id: `${l.sourceId}->${l.targetId}`,
        source: l.sourceId,
        target: l.targetId,
        type: 'why',
        style: { stroke: color, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        data: {
          reason: l.reason,
          laneX,
          labelX,
          labelOffsetY: offsets.get(l) ?? 0,
          corridorDir: l.corridorDir,
          srcOffset: ports.get(l)?.src ?? 0,
          tgtOffset: ports.get(l)?.tgt ?? 0,
        },
      })
    }
    for (const l of flat) push(l, undefined, gapStart + GAP / 2)
    bent.forEach((l, i) => {
      const laneX = gapStart + ((i + 1) * GAP) / (bent.length + 1)
      push(l, laneX, laneX)
    })
  }
  return edges
}

const stageCounts = (stepIds: string[], byId: Map<string, RoadmapStep>) => ({
  done: stepIds.filter((id) => byId.get(id)?.status === 'COMPLETED').length,
  total: stepIds.length,
})

type ListProps = Pick<Props, 'roadmap' | 'statusLabels' | 'selectedId' | 'onSelect'>

// Accessible stage-ordered alternative to the graph (docs/06-UI-SPEC.md §6), primary view below 640px.
export function StepList({ roadmap, statusLabels, selectedId, onSelect }: ListProps) {
  const byId = new Map(roadmap.steps.map((rs) => [rs.step.stepId, rs]))
  return (
    <ol className="space-y-6 p-4">
      {roadmap.stages.map(({ stage, stepIds }) => (
        <li key={stage}>
          <StageHeader data={{ stage, ...stageCounts(stepIds, byId) }} className="w-full" />
          <ul className="mt-3 space-y-3">
            {stepIds.map((id) => {
              const rs = byId.get(id)!
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={id === selectedId}
                    onClick={() => onSelect(id === selectedId ? null : id)}
                    className={`block w-full rounded-lg border px-3 py-2 text-left text-xs shadow-sm ${CARD[rs.status]} ${
                      id === selectedId ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                    }`}
                  >
                    <StepBody rs={rs} statusLabel={statusLabels[rs.status]} full />
                  </button>
                </li>
              )
            })}
          </ul>
        </li>
      ))}
    </ol>
  )
}

type Props = {
  roadmap: Roadmap
  // Full prerequisite list per step (from GET /v1/steps/{id}); blockedBy alone drops edges once steps are done.
  prerequisites: Map<string, Array<{ dependsOnStepId: string; reason: string }>>
  statusLabels: Record<StepStatus, string>
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function RoadmapGraph({ roadmap, prerequisites, statusLabels, selectedId, onSelect }: Props) {
  const byId = new Map(roadmap.steps.map((rs) => [rs.step.stepId, rs]))
  const pos = new Map<string, { col: number; row: number }>()
  roadmap.stages.forEach(({ stepIds }, col) => stepIds.forEach((id, row) => pos.set(id, { col, row })))

  const nodes: Node[] = roadmap.stages.flatMap(({ stage, stepIds }, col) => [
    {
      id: `stage-${stage}`,
      type: 'stage',
      position: { x: col * COL_WIDTH, y: 0 },
      data: { stage, ...stageCounts(stepIds, byId) },
      selectable: false,
    },
    ...stepIds.map((id, row) => {
      const rs = byId.get(id)!
      return {
        id,
        type: 'step',
        position: { x: col * COL_WIDTH, y: TOP + row * ROW_HEIGHT },
        data: { rs, statusLabel: statusLabels[rs.status], isSelected: id === selectedId },
      }
    }),
  ])

  const links: Link[] = [...pos].flatMap(([targetId, tgt]) =>
    (prerequisites.get(targetId) ?? [])
      .filter((p) => pos.has(p.dependsOnStepId))
      .map((p) => {
        const src = pos.get(p.dependsOnStepId)!
        const skips = tgt.col - src.col > 1
        const corridorDir = skips ? (tgt.row >= src.row ? 1 : -1) : undefined
        return {
          sourceId: p.dependsOnStepId,
          targetId,
          reason: p.reason,
          srcCol: src.col,
          srcRow: corridorDir ? src.row + corridorDir / 2 : src.row,
          tgtCol: tgt.col,
          tgtRow: tgt.row,
          corridorDir,
        }
      }),
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={buildEdges(links, (id) => byId.get(id)?.status)}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      onNodeClick={(_, node) => onSelect(node.type === 'step' ? node.id : null)}
      onPaneClick={() => onSelect(null)}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1} // default 0.5 can't fit a multi-stage graph on a phone-width pane
      // RF's overflow:hidden container can still be scrolled by focus/scrollIntoView, which shifts the
      // background and controls up and leaves a blank strip; clip makes it unscrollable.
      className="overflow-clip!"
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
