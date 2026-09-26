import { useMemo } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  Position,
  type Edge,
  type Node,
  type NodeProps,
} from 'reactflow'
import type { RoadmapResponse } from '../types'

const COL_WIDTH = 440 // leaves room for edge labels between 240px nodes
const ROW_HEIGHT = 130

function StageLabel({ data }: NodeProps<{ label: string }>) {
  return (
    <div className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
      {data.label}
    </div>
  )
}

const nodeTypes = { stage: StageLabel }

type Props = {
  roadmap: RoadmapResponse
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function RoadmapGraph({ roadmap, selectedId, onSelect }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []
    roadmap.stages.forEach(({ stage, steps }, col) => {
      const x = col * COL_WIDTH
      nodes.push({
        id: `stage-${stage}`,
        type: 'stage',
        position: { x, y: 0 },
        data: { label: `Stage ${stage}` },
        selectable: false,
      })
      steps.forEach((step, row) => {
        nodes.push({
          id: step.id,
          position: { x, y: 40 + row * ROW_HEIGHT },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          // RF's own CSS is unlayered, so Tailwind overrides need `!`
          className: `w-60! text-left! ${step.id === selectedId ? 'border-indigo-500! ring-2! ring-indigo-500!' : ''}`,
          data: {
            label: (
              <>
                <div className="text-sm font-semibold text-slate-900">{step.title}</div>
                <div className="mt-1 text-slate-500">
                  {step.fee} · {step.processingTime}
                </div>
              </>
            ),
          },
        })
        for (const dep of step.dependsOn) {
          edges.push({
            id: `${dep}->${step.id}`,
            source: dep,
            target: step.id,
            type: 'smoothstep',
            label: step.dependencyReason[dep],
            labelStyle: { fontSize: 10, fill: '#475569' },
            markerEnd: { type: MarkerType.ArrowClosed },
          })
        }
      })
    })
    return { nodes, edges }
  }, [roadmap, selectedId])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      onNodeClick={(_, node) => {
        if (node.type !== 'stage') onSelect(node.id)
      }}
      onPaneClick={() => onSelect(null)}
      fitView
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}
