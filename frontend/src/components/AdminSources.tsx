import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { fetchAdminSources, fetchMeta } from '../api'
import type { SourceHealth } from '../types'
import { ErrorState } from './ErrorState'

// docs/07-DESIGN-SYSTEM.md: FRESH ok, AGEING warn, STALE danger. Icon + text, never colour alone.
const CHIP: Record<SourceHealth, { className: string; icon: string }> = {
  FRESH: { className: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: '✓' },
  AGEING: { className: 'bg-amber-50 text-amber-700 ring-amber-200', icon: '!' },
  STALE: { className: 'bg-red-50 text-red-700 ring-red-200', icon: '✕' },
}

const COLUMNS = ['Step', 'Department', 'Source URL', 'Verified on', 'Health', 'Age (days)']

// Both dates as UTC midnight so the local timezone can't shift the count by a day.
const ageDays = (verifiedOn: string) =>
  Math.round((Date.parse(new Date().toLocaleDateString('en-CA')) - Date.parse(verifiedOn)) / 86_400_000)

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return 'Official source'
  }
}

function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}

// Loading state: same table shape with ghost cells, in RoadmapSkeleton's style.
function AdminSourcesSkeleton() {
  const ghost = 'h-3 rounded-lg bg-slate-200/70'
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
    const count = (h: SourceHealth) => sources.filter((s) => s.sourceHealth === h).length
    body = (
      <>
        <p className="mb-4 text-sm text-slate-500">
          {sources.length} sources · {count('STALE')} stale · {count('AGEING')} ageing
        </p>
        <TableShell>
          {sources.map((s) => (
            <tr key={s.stepId}>
              <td className="px-4 py-3 font-medium text-slate-900">{s.title}</td>
              <td className="px-4 py-3 text-slate-600">
                {s.department}
                <span className="block text-xs text-slate-500">{s.issuingOffice}</span>
              </td>
              <td className="px-4 py-3">
                <a href={s.sourceUrl} target="_blank" rel="noopener" className="text-indigo-600 underline hover:text-indigo-800">
                  {hostname(s.sourceUrl)}
                </a>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">{s.verifiedOn}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ${CHIP[s.sourceHealth].className}`}
                >
                  <span aria-hidden="true">{CHIP[s.sourceHealth].icon}</span>
                  {meta.enumLabels.sourceHealth[s.sourceHealth]}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600 tabular-nums">{ageDays(s.verifiedOn)}</td>
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
