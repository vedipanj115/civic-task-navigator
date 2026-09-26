# 09 — Integration Plan

## 1. Branching

- `main` is **protected**: pull request + 1 approval, squash merge.
- Branch names: `feat/m1-roadmap-graph`, `fix/m2-cycle-detection`, `data/m3-fssai-step`, `chore/m4-ci`.
- One branch, one concern. A branch that lives longer than a phase is too big.
- Nobody pushes directly to `main`, including M4. A fix for a red `main` goes through a PR like everything else.

## 2. Merge protocol

Before opening a PR:

```powershell
git checkout main
git pull origin main
git checkout <your-branch>
git merge main            # resolve conflicts here, not in the PR
npm i
npm run typecheck
npm run lint
npm test
npm run build
```

Then push and open a PR. Every PR states what changed, which docs section it implements, and that checks pass.

**Conflicts:** you resolve conflicts only in files you own. A conflict in someone else's file means one of you edited outside your lane — stop and talk before resolving.

## 3. Review

M4 reviews everything. A second reviewer is welcome but not required. A review checks:

1. Does it match the spec section it claims to implement?
2. Does it touch only files the author owns?
3. Do the checks pass?
4. Any invented facts? (a step without a `sourceUrl` is an automatic request for changes)
5. Any hardcoded enum label, hex colour or magic number that belongs in the contract or tokens?

Target review turnaround is 15 minutes. Say so out loud if you cannot manage it, so the author can work on something else.

## 4. Frozen documents

`02`, `03`, `04` and `07` are frozen. To change one:

1. Open an issue labelled `contract` describing the problem and the proposed change.
2. M4 and the affected owner agree in the issue.
3. M4 edits the doc **and** every affected file in one commit.
4. M4 posts in the group: "contract changed: …, please pull main".

Never edit a frozen doc inside a feature PR. That is how two people end up building against different versions.

## 5. Checkpoints

At each checkpoint in `08 § 3`, M4 pulls `main`, runs the full check suite, walks the demo path, and posts a one-line status: green, or what is red and who owns it. If a checkpoint is missed, **cut scope, do not extend the phase**. The cut list is in `01-PRD.md § 4` P1, in that order.

## 6. Integration risks

| Risk | Early warning | Control |
|---|---|---|
| Frontend blocked on backend | M1 idle waiting for `/v1/roadmap` | M1 works against a fixture response file until CP2; the shapes are frozen so this is safe |
| Backend blocked on data | M2 has an engine and nothing to run it on | M3 curates **one** procedure completely before starting the second |
| Engine disagrees with the oracle | Tests fail after a data change | The oracle is regenerated only through a `contract` issue; otherwise fix the engine |
| Everyone merges at once at the end | Three PRs open in the last hour | Merge at every checkpoint, not at the end |
| Data with no source | A step renders without a source link | Loader validation rejects it; CI fails |

## 7. Definition of done for a PR

- Implements the spec section it names
- Only files the author owns
- `typecheck`, `lint`, `test`, `build` all pass
- Checked in the browser if it touches the UI
- No `console.log` of payloads, no commented-out code, no secrets
- Docs updated in the same PR if behaviour described in `06` changed
