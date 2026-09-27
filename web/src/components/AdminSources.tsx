import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { fetchAdminSources, fetchMeta } from '../api'
import type { SourceHealth } from '../types'
import { ErrorState } from './ErrorState'

// docs/07-DESIGN-SYSTEM.md: FRESH ok, AGEING warn, STALE danger. Icon + text, never colour alone.
const CHIP: Record<SourceHealth, { className: string; icon: string }> = {
  FRESH: { className: 'bg-ok-050 text-ok-700 ring-ok-700/25', icon: '✓' },
  AGEING: { className: 'bg-warn-050 text-warn-700 ring-warn-700/25', icon: '!' },
  STALE: { className: 'bg-danger-050 text-danger-700 ring-danger-700/25', icon: '✕' },
}

const COLUMNS = ['Step', 'Department', 'Source URL', 'Verified on', 'Health', 'Age (days)']

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return 'Official source'
  }
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-ink-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-ink-200 bg-ink-050 text-xs font-semibold tracking-wide text-ink-600 uppercase">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-200">{children}</tbody>
      </table>
    </div>
  )
}

// Loading state: same table shape with ghost cells, in RoadmapSkeleton's style.
function AdminSourcesSkeleton() {
  const ghost = 'h-3 rounded-lg bg-ink-200/70'
  return (
    <div aria-busy="true" aria-label="Loading sources" className="motion-safe:animate-pulse">
      <div className={`mb-4 w-56 ${ghost}`} />
      <TableShell>
        {Array.from({ length: 6 }, (_, row) => (
          <tr key={row}>
            {COLUMNS.map((c) => (
              <td key={c} className="px-4 py-4">
                <div className={`w-20 ${ghost}`} />
              </td>
            ))}
          </tr>
        ))}
      </TableShell>
    </div>
  )
}

export function AdminSources() {
  const sourcesQuery = useQuery({ queryKey: ['adminSources'], queryFn: fetchAdminSources })
  const metaQuery = useQuery({ queryKey: ['meta'], queryFn: fetchMeta, staleTime: Infinity })

  const sources = sourcesQuery.data
  const meta = metaQuery.data
  const error = sourcesQuery.error ?? metaQuery.error

  let body
  if (error)
    body = (
      <ErrorState
        message={`Couldn't load sources: ${error.message}`}
        code={'code' in error ? String(error.code) : undefined}
        onRetry={() => {
          if (sourcesQuery.error) sourcesQuery.refetch()
          if (metaQuery.error) metaQuery.refetch()
        }}
      />
    )
  else if (!sources || !meta) body = <AdminSourcesSkeleton />
  else {
    body = (
      <>
        <p className="mb-4 text-sm text-ink-600">
          {sources.meta.count} sources · {sources.meta.stale} stale · {sources.meta.ageing} ageing
        </p>
        <TableShell>
          {sources.items.map((s) => (
            <tr key={s.stepId}>
              <td className="px-4 py-3 font-medium text-ink-900">{s.title}</td>
              <td className="px-4 py-3 text-ink-700">{s.department}</td>
              <td className="px-4 py-3">
                <a href={s.sourceUrl} target="_blank" rel="noopener" className="text-brand-600 underline hover:text-brand-700">
                  {hostname(s.sourceUrl)}
                </a>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-ink-700">{s.verifiedOn}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${CHIP[s.sourceHealth].className}`}
                >
                  <span aria-hidden="true">{CHIP[s.sourceHealth].icon}</span>
                  {meta.enumLabels.sourceHealth[s.sourceHealth]}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-700 tabular-nums">{s.ageDays}</td>
            </tr>
          ))}
        </TableShell>
      </>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6 motion-safe:animate-fade-up">
      <h2 className="mb-1 text-lg font-semibold">Admin sources</h2>
      {body}
    </div>
  )
}
