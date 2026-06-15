# Sprint Spec — arbiterGaming Self-Assign Role Bot

**Slug:** arbiter-self-assign
**Date:** 2026-06-15
**Stage:** 1
**Source:** charter `../discordArbiter/charters/arbiter-self-assign-bot.md` + user decisions (UI style,
roster, color exclusivity, straight-to-sprint).

## Problem
arbiterGaming members should self-serve cosmetic **color** roles and opt-in **game-ping** roles in
`#roles` without bothering a mod. The guild isn't Community-enabled (no native onboarding), so a real
bot runtime is required. Bot #2 in the `discordBots` monorepo — the first real exercise of the
`tools/new-bot` convention.

## Scope (in)
- A role-selection UI in `#roles` (guild `1119021914086703194`, channel `1515850507103633641`):
  **select-menu for colors** (single-select), **toggle buttons for game pings + GameNight** (decided).
- The bot **owns exactly 12 roles** and ensures they exist on startup.
- Component interaction handlers (color select, ping toggle, admin `/post-role-menu`).
- Per-guild persistence of the menu message id so the UI re-binds after restart.
- Reuse `@discord-bots/bot-core` (config loader, idempotent command registration). Generate the bot
  via `tools/new-bot` to validate the per-bot convention.

## Scope (out)
- **Live Discord operator steps** — create the app, set the token, place the bot's role above the 12,
  invite with Manage Roles, run the bot. `[NEEDS-TRIAGE: operator-live-verify]`.
- Any role outside the 12; any moderation; the tier roles (Admin/Mod/Member/Founding Four); auto-mod.
- Dice / scheduled events (that's dungeon-herald).

## The 12 managed roles (the ONLY roles the bot may create/modify/assign)
- **Colors** (cosmetic: no permissions, not hoisted): Red `#E74C3C`, Orange `#E67E22`, Yellow
  `#F1C40F`, Green `#2ECC71`, Cyan `#1ABC9C`, Blue `#3498DB`, Pink `#E84393`.
- **Game pings** (mentionable, no permissions, no color): **Helldivers** + **3 config placeholders**
  (`[CONFIRM-03]` — operator renames in config before live deploy).
- **GameNight** (mentionable, no permissions).

## Acceptance criteria
- **AC-01** — On startup (and on demand), the bot creates any of its 12 roles that are missing, with
  the exact name; colors get the palette hex, no permissions, not hoisted; game-ping/GameNight roles
  are mentionable, no color, no permissions; all positioned below the bot's own highest role. Existing
  roles with a managed name are adopted, not duplicated.
- **AC-02** (safety-critical) — The bot never creates, edits, deletes, or assigns any role NOT in its
  12 managed set (matched by name). Tier roles and all others are never touched. Proven by tests that
  feed a guild containing non-managed roles and assert zero operations on them.
- **AC-03** — The bot posts a selection message in `#roles`: a string-select listing the 7 colors
  (min 0 / max 1), and button row(s) for the game pings + GameNight. Component custom IDs are stable
  and namespaced (e.g. `selfassign:color`, `selfassign:ping:<role>`).
- **AC-04** — Selecting a color assigns that color role and removes any OTHER managed color role the
  member holds (single color at a time).
- **AC-05** — Clicking a game-ping/GameNight button toggles that role: add if absent, remove if held.
- **AC-06** — Every interaction replies EPHEMERALLY to the invoking member ("You're now Blue", "Added
  Helldivers", "Removed GameNight"); nothing is posted publicly per interaction.
- **AC-07** — An admin-gated `/post-role-menu` command (re)posts the menu in `#roles`; usable only by
  members with Manage Roles/admin; registered idempotently via bot-core.
- **AC-08** — The menu survives a restart: the posted message id is persisted per guild and the bot
  re-binds (stable custom IDs make handlers work after restart); if the stored message is gone, it
  reposts cleanly.
- **AC-09** — Least-privilege: the client requests exactly `[Guilds, GuildMembers]` intents
  (GuildMembers required to read/modify member roles) and NO others (no MessageContent). Requires the
  Manage Roles permission. Asserted without login.
- **AC-10** — No member PII stored or logged: persisted state is only `{guildId, channelId,
  messageId}`; no per-user data; no usernames/IDs of members in logs.
- **AC-11** — Token from env `DISCORD_TOKEN_ARBITER_SELF_ASSIGN`; never hardcoded or logged.
- **AC-12** — The bot is scaffolded via `tools/new-bot` and conforms to the per-bot convention; it
  reuses `@discord-bots/bot-core` for config + command registration.

## Open questions
- `[CONFIRM-03]` — names of the 3 placeholder game-ping roles (Helldivers is fixed). Config-driven;
  operator sets real names before the live run. Does not block the build (placeholders are config
  defaults, clearly flagged).

## Security note (gates remain hard stops)
This bot mutates roles under the **GuildMembers privileged intent** + **Manage Roles**. The "only-12"
boundary (AC-02), least-privilege intents (AC-09), and no-PII (AC-10) are hard acceptance criteria and
security-review gates. Any reviewer CRITICAL halts the sprint. Token from env only (AC-11).
