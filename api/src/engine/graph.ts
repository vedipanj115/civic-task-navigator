import type { Edge } from '../lib/dag';

/**
 * docs/03-DEPENDENCY-SPEC.md § 5 — Kahn's algorithm, by layers:
 *   stage(s) = 1                                            if s has no prerequisites
 *   stage(s) = 1 + max(stage(p) for p in prerequisites(s))  otherwise
 *
 * `edges` point prerequisite -> dependent (from = dependsOnStepId, to = stepId),
 * matching lib/dag.ts's convention. Assumes the graph is already known to be
 * acyclic (call findCycle first) — an undetected cycle would leave some nodes
 * unstaged, which callers should treat as a bug, not silently paper over.
 */
export function assignStages(nodes: string[], edges: Edge[]): Map<string, number> {
  const indegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const node of nodes) {
    indegree.set(node, 0);
    dependents.set(node, []);
  }
  for (const edge of edges) {
    indegree.set(edge.to, (indegree.get(edge.to) ?? 0) + 1);
    dependents.get(edge.from)?.push(edge.to);
  }

  const stage = new Map<string, number>();
  let frontier = nodes.filter((node) => indegree.get(node) === 0);
  let currentStage = 1;

  while (frontier.length > 0) {
    for (const node of frontier) stage.set(node, currentStage);

    const next: string[] = [];
    for (const node of frontier) {
      for (const dependent of dependents.get(node) ?? []) {
        const remaining = (indegree.get(dependent) ?? 0) - 1;
        indegree.set(dependent, remaining);
        if (remaining === 0) next.push(dependent);
      }
    }

    frontier = next;
    currentStage += 1;
  }

  return stage;
}

/**
 * docs/03 § 7 — longest weighted path through the DAG, per node's own
 * `weight`. This is the standard critical-path recurrence:
 *   cp(s) = weight(s) + max(cp(p) for p in prerequisites(s), default 0)
 * and the answer is max(cp(s) for all s). Steps that share a stage but
 * aren't on each other's path never get summed together — only the
 * heaviest chain of dependencies counts, which is what "steps in the
 * same stage count once, not added together" (docs/03 § 7) means.
 */
export function longestPath(nodes: string[], edges: Edge[], weight: (node: string) => number): number {
  const prerequisitesOf = new Map<string, string[]>();
  for (const node of nodes) prerequisitesOf.set(node, []);
  for (const edge of edges) prerequisitesOf.get(edge.to)?.push(edge.from);

  const memo = new Map<string, number>();

  function costOf(node: string): number {
    const cached = memo.get(node);
    if (cached !== undefined) return cached;
    const prereqs = prerequisitesOf.get(node) ?? [];
    const base = prereqs.length === 0 ? 0 : Math.max(...prereqs.map(costOf));
    const value = weight(node) + base;
    memo.set(node, value);
    return value;
  }

  let max = 0;
  for (const node of nodes) max = Math.max(max, costOf(node));
  return max;
}
