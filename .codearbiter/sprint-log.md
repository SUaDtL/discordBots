# Sprint Log — dungeon-herald-mvp

Append-only audit of autonomous decisions made during `/ca:sprint`. `low`-confidence entries are
the user's morning-review set. Hard gates are never auto-decided — they halt and surface.

Started: 2026-06-14 · Branch: `sprint/dungeon-herald-mvp` · Spec/plan: `.codearbiter/{specs,plans}/dungeon-herald-mvp.md`

---

## D-01 — Sprint scope = MVP incl. generator
- **Decision point:** "the entire build" — what's in scope.
- **Options:** (a) MVP T-01..T-29 incl. new-bot generator; (b) MVP minus generator; (c) MVP + v1.
- **SMARTS:** v1 (T-15..18) is blocked on external inputs (2nd charter, hosting decision) — Reliable/Testable Weak to build now. Generator was a decompose build-now decision (in MVP).
- **Chosen:** (a). User confirmed at the Phase-1 gate ("Approve — run it").
- **Strength:** strong · **Confidence:** high

## D-02 — No genesis commit; build on feature branch
- **Decision point:** repo has 0 commits + no remote; how to establish a base.
- **Options:** (a) direct genesis commit on main, then branch; (b) build on a feature branch off unborn main, commit-gate makes the first commit.
- **SMARTS:** H-01 hook prohibits direct commit to main (correctly). (a) is impossible. (b) keeps the only commit on the sanctioned commit-gate path.
- **Chosen:** (b). Governance state + code land together as the initial import on `sprint/dungeon-herald-mvp`.
- **Strength:** strong · **Confidence:** high

## D-03 — Execution granularity = per-component author agents
- **Decision point:** subagent-driven-development says one fresh subagent per task (29 micro-tasks).
- **Options:** (a) one agent per micro-task (29 fresh contexts); (b) one fresh author agent per component (foundation, dice, bot-core, dungeon-herald, new-bot), each implementing its tasks test-first in a coherent context.
- **SMARTS:** Maintainable/Reliable favor (b) — a dice parser is tightly coupled (shared AST types); 11 fresh contexts would re-derive and drift the type shape. Component == the quality-review batch boundary the skill itself uses ("once per scope over combined diff"). Testable: identical tests either way. Non-SMARTS: (a) costs ~3–4x the tokens for worse coherence.
- **Chosen:** (b). Each component is still a fresh context, test-first via tdd, reviewed, and fresh-verified; plan task statuses flip per component as their verification passes.
- **Strength:** strong · **Confidence:** high

## D-04 — Landing target = new public GitHub repo
- **Decision point:** no git remote exists; the sprint auto-opens a PR at finish, which needs a remote.
- **User input:** "may need to create a repo. it can be public" (2026-06-14).
- **Chosen:** at the finishing step, create a PUBLIC GitHub repo via `gh`, push `main` + the feature branch, and open the PR there. Consistent with the MIT license / "public framework left open" posture. Not done mid-build.
- **Strength:** n/a (user-directed) · **Confidence:** high

## ACCEPT — Foundation (T-01..T-06)
- Fresh-verified by orchestrator: `npm run lint` exit 0, `npm run typecheck` exit 0, `npm test` exit 0, workspaces = [packages/*, bots/*, tools/*]. Marked ACCEPTED.
- Note: vitest v4 needs `passWithNoTests: true` (no placeholder test added); root `tsconfig.json` solution file added for `tsc -b`. Dev tooling only — no runtime deps, no security/dependency-review trigger.

## ACCEPT — packages/dice (T-07..T-17)
- Fresh-verified by orchestrator: `vitest run packages/dice` → 98/98 pass; `tsc -b` exit 0; `eslint .` exit 0. Live: `1000d1000`→friendly cap error (AC-07), `2d6+3`(rng=max)→total 15 + render (AC-01,05), `abc`→error (AC-06). adv/keepdrop/explode covered across 11 test files (AC-02,03,04). RNG = crypto.randomInt, no Math.random in code (AC-08).
- Quality review: dice touches no auth/secrets/deploy/migration domain; crypto.randomInt is pre-approved game-dice in security-controls.md → tdd gates + coverage are the bar, no reviewer dispatch (compliant with subagent-driven-development Phase 4). Consolidated security review deferred to the bot-core/dungeon-herald scope where token/intents live.
- Caps chosen: MAX_DICE_PER_TERM=100, MAX_SIDES=1000, MAX_TOTAL_DICE=500, MAX_TERMS=50, EXPLODE_ITERATIONS_CAP=100.

## ACCEPT — packages/bot-core (T-18..T-22)
- Fresh-verified: vitest bot-core 27/27, full suite 125/125, tsc -b exit 0, lint exit 0. discord.js ^14.26.4 (within major 14).
- Quality review (Phase 4, security/dep scope) — 3 reviewers dispatched over the combined diff:
  - auth-crypto-reviewer: PASS, 0 blocks. Token env-only; error excludes token value; crypto.randomInt; store only {eventId,startTime}.
  - dependency-reviewer: PASS. discord.js@14.26.4 within major-14 pin; Apache-2.0 ⇄ MIT compatible; official registry + sha512 + provenance; no install scripts; 0 vulns.
  - security-reviewer: PASS, 0 CRITICAL/HIGH. 2 LOW recorded (non-blocking): (1) register-commands casts Discord GET response without Array.isArray guard — robustness only, Discord trusted; (2) synthetic FAKE_TOKEN in config.test.ts — acceptable.
- No CRITICAL/HIGH → Phase 4 gate cleared. LOW findings noted for user review; not blocking.

## ACCEPT — bots/dungeon-herald (T-23..T-28)
- Fresh-verified: vitest bot 28/28, full suite 153/153, tsc -b exit 0, lint exit 0. Intents = [Guilds, GuildScheduledEvents] (65537), no privileged intents; no token in console calls.
- Quality review (Phase 4): security-reviewer over the bot diff → PASS, 0 findings across all 5 criteria (least-privilege AC-15, no-PII AC-16, token handling, allowedMentions role-only AC-11, no injection/egress). No new dep/crypto/migration surface (token delegated to already-reviewed bot-core).
- send-then-mark ordering gives exactly-once + catch-up + retry-on-failure; reminder payload = event name + start timestamp only.

## ACCEPT — tools/new-bot (T-29)
- Fresh-verified: vitest new-bot 22/22, full suite 175/175, tsc -b exit 0, lint exit 0. bots/ contains only dungeon-herald; no stray coverage dir.
- Generator reproduces the per-bot convention (package.json, tsconfig, config skeleton w/ REPLACE_ME placeholders + least-privilege intents, guarded index, data/.gitkeep). Slug validation rejects empty/traversal/spaces; refuses overwrite.
- Typecheck-of-generated-output: structural + TS-parse validity in temp dir (full cross-resolution needs workspace node_modules symlinks; convention copied from the already-tsc-green dungeon-herald). Reasonable.
- NEEDS-TRIAGE from agent resolved inline: added `coverage/` to .gitignore (foundation file, trivial robustness fix; not under .codearbiter).

## PLAN COMPLETE — all 29 tasks ACCEPTED
- Full suite: 23 files, 175 tests, all green. tsc -b clean, eslint clean. Proceeding to Phase 3 (commit-gate → finishing).

## NEEDS-TRIAGE (non-blocking findings for user review)
- **[NEEDS-TRIAGE: explosion-render-length]** A pathological near-cap exploding roll (e.g. `3d6!` with many max rolls) can render 100+ dice into a string exceeding Discord's 2000-char message limit, which Discord would reject — `/roll` would then fail to reply. Rare under fair RNG, not a spec AC, surfaced by the all-max behavioral-proof RNG. Suggested follow-up: truncate/summarize the render past a safe length, or lower EXPLODE_ITERATIONS_CAP. Low severity.
- **[NEEDS-TRIAGE: operator-live-verify]** (carried from plan) Live Discord verify — invite bot, set DISCORD_TOKEN_DUNGEON_HERALD, run deploy-commands, observe a real reminder — operator action post-PR.
- **[NEEDS-TRIAGE: secrets-scanner]** tech-stack.md defines no dedicated secrets-scan tool; commit-gate Phase 4 used grep + the auth-crypto/security reviewers. Consider adding gitleaks/trufflehog.

## Phase 3 landing — commits
- Commit 1 (chore): monorepo foundation + tooling -> d2b9180.
- Commit 2 (chore/governance): codeArbiter project state + sprint artifacts -> 8176eb5.
- Commit 3 (feat): dungeon-herald bot system (dice, bot-core, bot, generator) -> 6fb2b1a.
- Process-guard redirects complied with (not spec failures): H-01 (no direct commit/push to main → feature branch + API-created baseline main), H-03 (no directory staging → explicit file paths).
- Landing: public repo https://github.com/SUaDtL/discordBots created; main initialized at scaffold commit d2b9180 via GitHub API (bootstrap; bot system stays in the PR); PR #1 opened (base main ← sprint/dungeon-herald-mvp). NOT merged — merge decision is the user's per /sprint.

## SPRINT COMPLETE
- 29/29 tasks ACCEPTED. 175 tests green. 4 reviewers PASS (0 CRITICAL/HIGH). Auto-decisions: D-01..D-04, all high-confidence/user-directed — zero low-confidence calls to review. Open items: 3 NEEDS-TRIAGE + 2 CONFIRM (all non-blocking, in open-questions.md / above).

---

# Sprint 2 — arbiter-self-assign (started 2026-06-15)
Branch: `sprint/arbiter-self-assign` · spec/plan: `.codearbiter/{specs,plans}/arbiter-self-assign.md`
User approved spec+plan at the Phase-1 gate ("Approve — run it"). UI decisions: select-menu colors
(single-select) + toggle buttons for pings/GameNight. Roster: Helldivers + 3 placeholders (config).

## D-05 — Hosting via Docker (resolves [CONFIRM-01] direction)
- User: "can this be in a docker container for hosting? easier to see in docker desktop" (2026-06-15).
- Decision: containerize as a DEDICATED follow-up PR after this bot lands — one image per bot
  (ADR-0003 one-process-per-bot) + docker-compose for Docker Desktop + named volumes per bot `data/`
  (also fixes the ephemeral-FS persistence risk for dungeon-herald's reminders.json). Not folded into
  this sprint (cross-cutting; covers both bots). [CONFIRM-01] now leaning "self-host via Docker".
- Strength: n/a (user-directed) · Confidence: high

## ACCEPT — bot-core JsonValueStore (T-02) + arbiter-self-assign (T-01,T-03..T-12)
- Fresh-verified: vitest bot 52/52, full suite 239/239, tsc -b exit 0, lint exit 0, format:check exit 0.
- Intents exactly [Guilds, GuildMembers] (privileged GuildMembers required for role mutation; no MessageContent). Behavioral proof: catalog=12; isManagedRole Admin=false/Blue=true; forged roleByKey('ping-admin')=undefined.
- Quality review (Phase 4): security-reviewer over the role-mutation/privileged-intent surface → PASS, 0 CRITICAL/HIGH. Make-or-break checks pass: only-12 boundary (ensure-roles iterates catalog; handlers resolve via trusted map) + custom-id forgery resistance (forged key → undefined → ephemeral reject) + admin gate on /post-role-menu + no-PII + env-only token.
  - 2 LOW findings. #1 (role-editor mutation layer lacked a managed-set guard) — APPLIED: added isManagedRole guard in asMemberRoleEditor add/remove + 3 guard tests (defense-in-depth for AC-02). #2 (name-based identity not unique in Discord) — NOTED, non-blocking (single-tenant operator-controlled guild).
- [NEEDS-TRIAGE: new-bot-convention] The generator + dungeon-herald use a Windows-fragile launch guard (`import.meta.url === file://${process.argv[1]}`) that silently no-ops on Windows (relative argv). Works on Linux/Docker (the hosting target). arbiter-self-assign uses the robust pathToFileURL idiom. FIX the generator + dungeon-herald guards in the Docker PR.
- Added `.gitattributes` (eol=lf) to fix Windows-CRLF vs Linux-LF format:check inconsistency; `prettier --write .` normalized the tree.

## SPRINT 2 landing — commits in progress
