# 01 — Architecture Breakdown

`discordBots` is a **multi-bot monorepo** (npm workspaces) housing Discord bots built from
discordArbiter `projectCharter` handoffs. First inhabitant: **dungeon-herald**.

## Component map

```
discordBots/                         (npm workspaces root: bots/*, packages/*, tools/*)
│
├── packages/
│   ├── dice/            Pure TTRPG dice parser + evaluator (no Discord deps)
│   │                     tokenize → parse(AST) → evaluate(RNG) → format
│   │                     grammar: NdM±K multi-term, adv/dis, kh/kl/dh/dl, explode(!), cap
│   │                     exhaustively unit-tested; reusable by any bot
│   └── bot-core/        Shared bot scaffolding:
│                          • config loader (env→token/intents + per-bot config: channel/role/guild)
│                          • command/event registration helpers
│                          • RemindedStore interface (+ JSON impl)
│                          • the per-bot config CONVENTION the generator reproduces
│
├── bots/
│   └── dungeon-herald/  One OS process (own token, least-privilege intents)
│        ├── src/        entrypoint, /roll handler (uses packages/dice),
│        │               /nextsession handler (list_events), reminder poller
│        └── data/       reminders.json  (durable reminded-event store)
│
├── tools/
│   └── new-bot/         Generator: scaffolds bots/<slug>/ from the bot-core convention
│
├── deploy-commands      Script: register slash commands (after list_commands check)
├── tsconfig.base.json   Shared strict TS config
├── LICENSE              MIT (2026 Brennon Huff)
└── .codearbiter/        Workspace project state
```

## Responsibilities & connections

| Component | Owns | Depends on |
|---|---|---|
| `packages/dice` | dice grammar parse + unbiased eval + formatting | (nothing — pure) |
| `packages/bot-core` | config load, registration helpers, `RemindedStore` iface + JSON impl | discord.js |
| `bots/dungeon-herald` | command handlers, reminder poller, this bot's config + data | dice, bot-core, discord.js |
| `tools/new-bot` | scaffold a new bot folder to the convention | bot-core convention |
| `deploy-commands` | REST registration of slash-command shapes | discord.js, bot config |

## System diagram (runtime — dungeon-herald)

```
  Discord (Gateway+REST)
        │  ▲                        ┌─────────────────────────────┐
 slash  │  │ interaction reply      │  bots/dungeon-herald process │
 cmds   ▼  │                        │                             │
   /roll ─────────────────────────► │  /roll  → packages/dice     │
   /nextsession ──────────────────► │  /nextsession → list_events │
        │                           │                             │
        │   list_events (poll ~60s) │  poller ──► window check     │
        │ ◄─────────────────────────│            [start-30m,start) │
        │                           │              │              │
        │   embed + @Players ping   │              ▼              │
   #table-talk ◄────────────────────│  send reminder, mark ID ──► reminders.json
        │   (allowed_mentions.role) │                             │
        └───────────────────────────┴─────────────────────────────┘
```

## Integrations

| Integration | Type | Protocol | Owner | Notes |
|---|---|---|---|---|
| Discord Gateway | async | WebSocket (discord.js v14) | Discord | interactions, least-privilege intents |
| Discord REST | sync | HTTPS (discord.js v14) | Discord | command registration, list_events, send message/embed |
| reminders.json | sync | local file via `RemindedStore` iface | this bot | swap to SQLite later (ADR-0004) |

Auth: bot token via env (`DISCORD_TOKEN_<SLUG>`), never committed/logged. Role ping uses explicit
`allowed_mentions.roles` (does not rely on server role-mentionable setting).

## Accepted architectural decisions (DRAFT → /adr in Phase 5)
- ADR-0001 Multi-bot monorepo via npm workspaces
- ADR-0002 Node + TypeScript + discord.js v14 (+ vitest)
- ADR-0003 One OS process per bot
- ADR-0004 Durable reminder state: per-bot JSON behind a storage interface (supersedes charter "stateless")

## Open architectural decisions
- **[CONFIRM-01] Hosting target** — self-host now → cloud later (user note). COUPLED to persistence:
  an ephemeral-FS host loses `reminders.json` on redeploy and breaks exactly-once/catch-up; decide a
  persistent volume / external store WITH the host. Decide before first deploy.
- **[CONFIRM-02] Event reschedule/cancel semantics** — proposed default: once reminded, never
  re-remind even if rescheduled later; cancelled events never fire. Confirm before reminder build.
