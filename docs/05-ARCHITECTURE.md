# 05 — Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + TypeScript + Vite | The team has shipped this before |
| Styling | Tailwind CSS v4 with CSS custom-property tokens | Fast, consistent, no design bikeshedding |
| Graph | React Flow | Handles nodes, edges, panning and zoom; do not hand-roll SVG |
| Data fetching | TanStack Query | Caching, loading and error states for free |
| Routing | React Router | Four routes, nothing exotic |
| Backend | Node 22 + Express + TypeScript | Simple, fast to write, easy to reason about |
| Data store | JSON files loaded into memory at boot | Dataset is ~6 steps; a database adds setup risk and buys nothing |
| Shared types | `shared/` workspace, imported by both sides | One definition, no drift |
| Tests | `node --test` + `tsx` | Built in, no extra framework |

**Deliberate non-choices:** no database, no ORM, no auth library, no state-management library beyond TanStack Query, no CSS-in-JS, no monorepo tooling beyond npm workspaces. Each of these would cost setup time and buy nothing for a dataset this size.

## 2. Repo layout

```
civic-task-navigator/
├─ docs/           these specifications
├─ data/           procedure dataset + test oracle   (M3 owns)
│   ├─ procedures/proc_food_outlet_mumbai.json
│   ├─ documents.json
│   └─ expected-roadmaps.json
├─ shared/src/     domain.ts, api.ts, labels.ts      (M2 owns; labels.ts M1)
├─ api/src/        server.ts, routes/, engine/, data/ (M2 owns)
├─ web/src/        React app                          (M1 owns)
│   ├─ api/        typed client
│   ├─ components/ design-system primitives
│   ├─ pages/      the four screens
│   └─ styles/     tokens.css
├─ scripts/        seed and smoke scripts             (M4 owns)
└─ .github/workflows/ci.yml                           (M4 owns)
```

## 3. Data flow

```
Browser
  └─ TanStack Query → typed client (web/src/api/client.ts)
        └─ HTTP → Express router (api/src/routes)
              └─ procedure store (in-memory, loaded from data/ at boot)
              └─ dependency engine (pure functions, no I/O)
        ← Roadmap JSON
  └─ React Flow renders stages, nodes and labelled edges
  └─ Progress in localStorage → re-POSTs /v1/roadmap with completedStepIds
```

The engine is **pure**: same input, same output, no clock reads, no randomness. That is what makes `data/expected-roadmaps.json` a usable oracle and the demo reproducible.

## 4. Why the engine reads no clock

`sourceHealth` is the only date-dependent value, and it is computed at the API boundary, not inside the engine. Everything else is deterministic, so a test written today still passes next month.

## 5. Environments

| Var | Where | Default |
|---|---|---|
| `PORT` | api `.env` | `3001` |
| `DATA_DIR` | api `.env` | `../data` |
| `VITE_API_BASE_URL` | web `.env.local` | `http://localhost:3001/v1` |

`.env.example` files are committed; real `.env` files are not. **There are no secrets in this project by design.** If someone needs a key, that is a scope change, not a config change.

## 6. Running it

```
npm i                 # root, installs all workspaces
npm run dev:api       # api on :3001
npm run dev:web       # web on :5173
npm run typecheck     # all workspaces
npm run lint
npm test
npm run build
```

`npm run dev` runs both concurrently.

## 7. Deployment (bonus, not P0)

Frontend as a static build on any static host; backend as one small Node service. Do not start deployment until P0 works locally. A live URL is worth points only if the demo already works.

## 8. Performance

Non-issue at this size. The whole dataset fits in memory, the graph has under 15 nodes, and the roadmap computes in under a millisecond. Do not optimise; spend the time on data accuracy instead.
