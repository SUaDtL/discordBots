# Decision Log

Append-only. Newest entries appended at the end. Supersession is forward-only.

---

## DECISION-0001 — ADR-0001 — Multi-bot monorepo via npm workspaces

**Date:** 2026-06-14
**Status:** accepted
**Supersedes:** none
**Decided by:** brennonhuff@gmail.com
**Decision category:** repository-structure
**Artifact-section-hash:** n/a

### Variance summary
- **Artifact position:** charter implies one bot (dungeon-herald) seeded to a fresh project.
- **Scaffold position:** none (greenfield).
- **Status type:** open-decision-closure

### Decision
The repo is a multi-bot monorepo via npm workspaces, housing many chartered bots over time.
dungeon-herald is bot #1 under `bots/dungeon-herald/`; shared code in `packages/*`; generator in
`tools/new-bot`.

### SMARTS rationale
Maintainable: shared dice parser and config live once across bots. Scalable: new charters drop in as
sibling folders without new repos. Tooling kept minimal (npm workspaces) to avoid premature build
complexity.

### Implementation implication
Create workspace root `package.json`, `tsconfig.base.json`, `bots/`, `packages/`, `tools/`. ADR-0001.

---

## DECISION-0002 — ADR-0002 — Node.js + TypeScript + discord.js v14 stack

**Date:** 2026-06-14
**Status:** accepted
**Supersedes:** none
**Decided by:** brennonhuff@gmail.com
**Decision category:** technology-stack
**Artifact-section-hash:** n/a

### Variance summary
- **Artifact position:** charter mandates no stack ("codeArbiter owns the final call").
- **Scaffold position:** none (greenfield).
- **Status type:** open-decision-closure

### Decision
Node.js LTS, TypeScript (strict), discord.js v14 (major pinned), vitest. The dice parser is the
trust-critical component and is exhaustively unit-tested.

### SMARTS rationale
Testable: TypeScript + vitest give the dice AST static safety and fast deterministic tests.
Maintainable: ecosystem-consistent with discordArbiter's discord.js v14 pin; large community.

### Implementation implication
Workspace TS config, discord.js v14 dependency, vitest setup. ADR-0002.

---

## DECISION-0003 — ADR-0003 — One OS process per bot

**Date:** 2026-06-14
**Status:** accepted
**Supersedes:** none
**Decided by:** brennonhuff@gmail.com
**Decision category:** runtime-architecture
**Artifact-section-hash:** n/a

### Variance summary
- **Artifact position:** charter is silent on process model; emphasizes least-privilege per bot.
- **Scaffold position:** none (greenfield).
- **Status type:** open-decision-closure

### Decision
Each bot runs as its own OS process holding only its own token and least-privilege intents; shared
code imported from workspace packages.

### SMARTS rationale
Available: crash isolation — one bot down does not down the others. Securable: per-bot token/intent
isolation realizes the charter's least-privilege mandate; no shared-process token blast radius.

### Implementation implication
Each `bots/<slug>/` has its own entrypoint and token env var. ADR-0003.

---

## DECISION-0004 — ADR-0004 — Durable reminder state via per-bot JSON behind a storage interface

**Date:** 2026-06-14
**Status:** accepted
**Supersedes:** none
**Decided by:** brennonhuff@gmail.com
**Decision category:** state-persistence
**Artifact-section-hash:** n/a

### Variance summary
- **Artifact position:** charter says "State: none persistent... No database needed."
- **Scaffold position:** none (greenfield).
- **Status type:** open-decision-closure

### Decision
Persist a per-bot reminded-events store (event ID + start time) as a flat JSON file behind a narrow
`RemindedStore` interface, enabling exactly-once + catch-up reminders. Supersedes the charter's
stateless claim. Swappable to SQLite later via the interface.

### SMARTS rationale
Reliable: durable reminded-ID set is what makes exactly-once + catch-up correct across restarts.
Maintainable: the interface preserves a swap point without rewriting reminder logic. Zero external
dependencies at this scale.

### Implementation implication
`packages/bot-core` defines `RemindedStore` + JSON impl; `bots/dungeon-herald` uses it and writes
`data/reminders.json`. Couples to deferred hosting decision ([CONFIRM-01]) for FS persistence. ADR-0004.

---
