export interface Edge {
  from: string;
  to: string;
}

/**
 * Cycle detection via DFS with a recursion stack, exactly as
 * docs/03-DEPENDENCY-SPEC.md § 4 specifies: "Run cycle detection (DFS with
 * a recursion stack) on the ... graph." Returns the stepIds forming a
 * cycle, in order, if one exists; otherwise null.
 *
 * Deliberately generic (nodes are plain strings, not `Step`) so both the
 * boot-time data loader (validating the full, unpruned graph) and the
 * dependency engine (validating the applicability-pruned graph, per
 * docs/03 § 4) can share one implementation instead of two.
 */
export function findCycle(nodes: string[], edges: Edge[]): string[] | null {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node, []);
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
  }

  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  function visit(node: string): string[] | null {
    state.set(node, 'visiting');
    stack.push(node);

    for (const next of adjacency.get(node) ?? []) {
      const nextState = state.get(next);
      if (nextState === 'visiting') {
        const cycleStart = stack.indexOf(next);
        return stack.slice(cycleStart).concat(next);
      }
      if (nextState !== 'done') {
        const found = visit(next);
        if (found) return found;
      }
    }

    stack.pop();
    state.set(node, 'done');
    return null;
  }

  for (const node of nodes) {
    if (!state.has(node)) {
      const found = visit(node);
      if (found) return found;
    }
  }

  return null;
}
