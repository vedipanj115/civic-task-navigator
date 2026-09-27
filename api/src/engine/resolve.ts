import type { City, Procedure, ResolveCandidate, ResolveResponse } from '@cn/shared';

const AMBIGUOUS_MARGIN = 0.15;
const RESOLVE_THRESHOLD = 0.6;
const RECOGNISED_THRESHOLD = 0.3;

// docs/03 § 9.1 — filler phrases stripped before matching. Longest first so
// "how do i" is removed whole rather than leaving a stray "i".
const FILLER_PHRASES = [
  'how do i',
  'i want to',
  'i need to',
  'i would like to',
  'i d like to',
  'can you help me',
  'help me',
  'please',
];

function normalize(text: string): string {
  let s = text.toLowerCase();
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' '); // strip punctuation
  s = s.replace(/\s+/g, ' ').trim();
  for (const phrase of FILLER_PHRASES) {
    s = s.replace(new RegExp(`\\b${phrase}\\b`, 'g'), ' ');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function tokenize(text: string): string[] {
  return text.length === 0 ? [] : text.split(' ');
}

function candidateTokenSet(procedure: Procedure): Set<string> {
  const combined = [procedure.name, ...procedure.synonyms].join(' ');
  return new Set(tokenize(normalize(combined)));
}

interface ScoredCandidate {
  procedureId: string;
  name: string;
  score: number;
}

function toResolveCandidate(c: ScoredCandidate): ResolveCandidate {
  return { procedureId: c.procedureId, name: c.name, score: c.score };
}

/**
 * docs/03-DEPENDENCY-SPEC.md § 9. Assumes `query` is already known to be
 * non-empty — the /v1/resolve route validates that and raises
 * VALIDATION_FAILED itself (docs/04 § 3.5), since that's the only error
 * case; everything else here is a 200 with `resolved: false`.
 */
export function resolveTask(query: string, procedures: Procedure[], city?: City): ResolveResponse {
  const scoped = city ? procedures.filter((p) => p.city === city) : procedures;
  const normalizedQuery = normalize(query);

  // docs/03 § 9.2 — exact match against name or a synonym, before scoring.
  for (const procedure of scoped) {
    const exactForms = [procedure.name, ...procedure.synonyms].map(normalize);
    if (exactForms.includes(normalizedQuery)) {
      return {
        resolved: true,
        procedureId: procedure.procedureId,
        confidence: 1,
        candidates: [{ procedureId: procedure.procedureId, name: procedure.name, score: 1 }],
      };
    }
  }

  // docs/03 § 9.3 — token overlap scoring.
  const queryTokens = tokenize(normalizedQuery);
  const queryTokenSet = new Set(queryTokens);

  const scored: ScoredCandidate[] = scoped
    .map((procedure) => {
      const candidateTokens = candidateTokenSet(procedure);
      const matched = [...queryTokenSet].filter((t) => candidateTokens.has(t)).length;
      const score = queryTokens.length === 0 ? 0 : matched / queryTokens.length;
      return { procedureId: procedure.procedureId, name: procedure.name, score };
    })
    .sort((a, b) => b.score - a.score || a.procedureId.localeCompare(b.procedureId));

  const [top, second] = scored;

  // docs/03 § 9.5 — two candidates within 0.15 of each other → ambiguous.
  if (top && second && top.score - second.score <= AMBIGUOUS_MARGIN && top.score >= RECOGNISED_THRESHOLD) {
    return {
      resolved: false,
      procedureId: null,
      confidence: top.score,
      candidates: scored.filter((c) => c.score >= RECOGNISED_THRESHOLD).map(toResolveCandidate),
    };
  }

  // docs/03 § 9.4 — score >= 0.6 and a clear winner → resolve directly.
  if (top && top.score >= RESOLVE_THRESHOLD) {
    return {
      resolved: true,
      procedureId: top.procedureId,
      confidence: top.score,
      candidates: scored.filter((c) => c.score > 0).map(toResolveCandidate),
    };
  }

  // docs/03 § 9.6 — no candidate >= 0.3 → unrecognised; return all procedures for the picker.
  // Also covers the one gap the spec leaves open (a lone candidate scoring
  // between 0.3 and 0.6 with no close rival): §9's rule is "never silently
  // pick a low-confidence match", and 0.6 is the only stated resolve bar, so
  // anything under it falls back to the picker rather than guessing.
  return {
    resolved: false,
    procedureId: null,
    confidence: top?.score ?? 0,
    candidates: scored.map(toResolveCandidate),
  };
}
