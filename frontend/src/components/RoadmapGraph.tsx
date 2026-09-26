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
import type { Status } from '../progress'
import type { RoadmapResponse, Step } from '../types'

const NODE_W = 256 // Tailwind w-64
const GAP = 200 // horizontal room between columns for arrow lanes + labels
const COL_WIDTH = NODE_W + GAP
const ROW_HEIGHT = 112
const TOP = 72 // first step row, below the stage header
const LABEL_SPACING = 22 // min vertical distance between labels in one gap

const CARD: Record<Status, string> = {
  available: 'border-slate-300 bg-white',
  blocked: 'border-dashed border-slate-300 bg-slate-100 text-slate-400',
  done: 'border-emerald-500 bg-emerald-50',
}

type StepNodeData = { step: Step; status: Status; waitingOn: string[]; isSelected: boolean }

function StepNode({ data: { step, status, waitingOn, isSelected } }: NodeProps<StepNodeData>) {
  const statusLine = {
    done: <span className="font-medium text-emerald-700">✓ Done</span>,
    available: <span className="font-medium text-indigo-600">Ready to start</span>,
    blocked: <span>Waiting on {waitingOn.join(', ')}</span>,
  }[status]

  return (
    <div
      className={`h-[84px] w-64 cursor-pointer rounded-lg border px-3 py-2 text-xs shadow-sm ${CARD[status]} ${
        isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0!" />
      <div className={`truncate text-sm font-semibold ${status === 'blocked' ? '' : 'text-slate-900'}`}>
        {step.title}
      </div>
      <div className={`mt-0.5 truncate ${status === 'blocked' ? '' : 'text-slate-500'}`}>
        {step.fee} · {step.processingTime}
      </div>
      <div className="mt-1.5 truncate" title={status === 'blocked' ? `Waiting on ${waitingOn.join(', ')}` : undefined}>
        {statusLine}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  )
}

function StageHeader({ data }: NodeProps<{ stage: number; done: number; total: number }>) {
  return (
    <div className="flex w-64 items-baseline justify-between border-b-2 border-slate-300 pb-2"
    >
      <span className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
        Stage {data.stage}
      </span>
      <span className="text-xs text-slate-500">
        {data.done}/{data.total} done
      </span>
    </div>
  )
}

type WhyEdgeData = { label: string; labelX: number; labelOffsetY: number; laneX?: number }

// Smoothstep edge with its own vertical lane (laneX) and a label nudged clear of its neighbours.
function WhyEdge(props: EdgeProps<WhyEdgeData>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, style } = props
  const data = props.data!
  const [path, , labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    centerX: data.laneX,
  })
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{ transform: `translate(-50%, -50%) translate(${data.labelX}px, ${labelY + data.labelOffsetY}px)` }}
          className="absolute rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] leading-tight whitespace-nowrap text-slate-600"
        >
          {data.label}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}

const nodeTypes = { step: StepNode, stage: StageHeader }
const edgeTypes = { why: WhyEdge }

type Link = { source: Step; target: Step; srcCol: number; srcRow: number; tgtCol: number; tgtRow: number }

// ponytail: an edge that skips a stage runs straight through the column between; route around it if real data has those.
function buildEdges(links: Link[], status: Map<string, Status>): Edge<WhyEdgeData>[] {
  const edges: Edge<WhyEdgeData>[] = []
  const byGap = new Map<number, Link[]>()
  for (const l of links) byGap.set(l.tgtCol, [...(byGap.get(l.tgtCol) ?? []), l])
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
      const desired = ((l.srcRow + l.tgtRow) / 2) * ROW_HEIGHT
      let y = desired
      let hit: number | undefined
      while ((hit = placed.find((p) => Math.abs(p - y) < LABEL_SPACING)) !== undefined) y = hit + LABEL_SPACING
      placed.push(y)
      offsets.set(l, y - desired)
    }

    const push = (l: Link, laneX: number | undefined, labelX: number) => {
      const color = status.get(l.source.id) === 'done' ? '#10b981' : '#94a3b8'
      edges.push({
        id: `${l.source.id}->${l.target.id}`,
        source: l.source.id,
        target: l.target.id,
        type: 'why',
        style: { stroke: color, strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color },
        data: { label: l.target.dependencyReason[l.source.id] ?? '', laneX, labelX, labelOffsetY: offsets.get(l) ?? 0 },
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

type Props = {
  roadmap: RoadmapResponse
  status: Map<string, Status>
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function RoadmapGraph({ roadmap, status, selectedId, onSelect }: Props) {
  const pos = new Map<string, { col: number; row: number; step: Step }>()
  roadmap.stages.forEach(({ steps }, col) => steps.forEach((step, row) => pos.set(step.id, { col, row, step })))

  const nodes: Node[] = roadmap.stages.flatMap(({ stage, steps }, col) => [
    {
      id: `stage-${stage}`,
      type: 'stage',
      position: { x: col * COL_WIDTH, y: 0 },
      data: { stage, done: steps.filter((s) => status.get(s.id) === 'done').length, total: steps.length },
      selectable: false,
    },
    ...steps.map((step, row) => ({
      id: step.id,
      type: 'step',
      position: { x: col * COL_WIDTH, y: TOP + row * ROW_HEIGHT },
      data: {
        step,
        status: status.get(step.id)!,
        waitingOn: step.dependsOn.filter((d) => pos.has(d) && status.get(d) !== 'done').map((d) => pos.get(d)!.step.title),
        isSelected: step.id === selectedId,
      },
    })),
  ])

  const links: Link[] = [...pos.values()].flatMap(({ col, row, step }) =>
    step.dependsOn
      .filter((d) => pos.has(d))
      .map((d) => {
        const src = pos.get(d)!
        return { source: src.step, target: step, srcCol: src.col, srcRow: src.row, tgtCol: col, tgtRow: row }
      }),
  )

  return (
    <ReactFlow
      nodes={nodes}
      edges={buildEdges(links, status)}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      onNodeClick={(_, node) => onSelect(node.type === 'step' ? node.id : null)}
      onPaneClick={() => onSelect(null)}
      fitView
      fitViewOptions={{ padding: 0.15 }}
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
