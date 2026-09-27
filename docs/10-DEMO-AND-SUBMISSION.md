# 10 — Demo and Submission

## 1. Deliverables checklist

- [ ] Public GitHub repository with a real commit history from all four members
- [ ] `README.md`: what it is, how to run it, the stack, the team, and an honest scope statement
- [ ] Architecture diagram (a clear image or a Mermaid block in the README)
- [ ] Recorded demo video
- [ ] Working local run: `npm i && npm run dev:api && npm run dev:web`
- [ ] `docs/` committed — the specs are evidence of how the team worked
- [ ] `docs/LEARNING-LOG.md` with entries from every member
- [ ] Deployed URL (bonus only; never at the cost of the demo)

## 2. Three-minute demo script

| Time | Beat | On screen |
|---|---|---|
| 0:00–0:20 | Problem | Four government tabs open, none referencing the others |
| 0:20–0:35 | Product | One line: "One sentence in, a dependency-aware roadmap out, every step linked to its official source" |
| 0:35–1:00 | Input | Type the task, pick the city, answer three questions |
| 1:00–1:30 | **WOW** | The roadmap assembles: 3 stages, blocked steps, parallel tracks, totals |
| 1:30–1:50 | Depth | Open a step: documents, fee, office, apply link, source with verified date; hover an edge for the blocking reason |
| 1:50–2:10 | **Second beat** | Tick off the Gumasta; two steps unblock, the estimate drops |
| 2:10–2:30 | Applicability | Show excluded steps with reasons; re-run with higher turnover and GST appears |
| 2:30–2:45 | Trust | Admin sources table with verified dates |
| 2:45–3:00 | Impact | Pages consolidated, days saved on the critical path, how the engine extends to another city |

**Rules for recording:** no live typing of long strings (pre-fill or use a short sentence); browser zoom at 125% so text is readable; close every other tab and notification; record one clean take rather than editing five; narrate what the judge should notice, not what you are clicking.

## 3. What judges will probe

| Question | Your answer |
|---|---|
| "Where does this data come from?" | Every step carries its official source URL and a verified-on date; show the admin table |
| "Is this just a checklist?" | No — show the dependency edges and the unlock transition |
| "What if the rules change?" | The admin view flags stale sources; the engine is data-driven, so a rule change is a data edit |
| "Does it work outside Mumbai?" | Not yet, deliberately. The engine is city-agnostic; only the dataset is scoped |
| "Where is the AI?" | There is none, on purpose. The problem is coordination, not prediction; a deterministic engine is testable and explainable |
| "What was hard?" | The dependency ordering and the data curation. Be specific; it is a better answer than "integration" |

## 4. Honest scope statement (put this in the README)

> This build covers Mumbai and one procedure bundle, opening a small food outlet. Every step, fee and document is taken from an official government page, linked and dated in the app. Rules vary by state and sometimes by ward; this is guidance to plan with, not legal advice, and should be confirmed on the linked official page before applying.

Judges respect a clear boundary far more than a vague claim of national coverage.

## 5. Final 60 minutes

1. Freeze features. Bugs only.
2. Full run-through on a clean browser profile.
3. `npm i` from a fresh clone to prove the README works.
4. Re-verify every source link opens.
5. Check the commit history shows all four members.
6. Record the demo. Keep the raw file.
7. Tag the submission: `git tag -a submission -m "Internal Hackathon 2026-27 submission" && git push origin submission`.

## 6. Event day (Mon 28 Sep)

- Sunday before midnight: last merge, tag `submission`, every laptop pulls `main` and runs it once.
- 9:30 reporting: start the API and web app on the presenting laptop before judging. Browser at 125%, other tabs closed.
- Keep the recorded demo on the desktop as a fallback.
- Each member can explain their own part in two minutes.
- Round 1 results Mon 3 pm; fix what the judges found before round 2 on Tuesday.
