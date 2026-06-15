<!-- SPDX-License-Identifier: MIT -->

# Dungeon Herald

A Discord bot for **Dot_E's Server** (`1119021914086703194`) serving Dot's Dungeon's tabletop table:

- **`/roll <dice>`** — full TTRPG dice notation: `2d6+3`, `1d20 adv`/`dis`, `4d6kh3` (keep/drop), `3d6!`
  (exploding), multi-term `2d6+1d4+1`. Unbiased rolls; invalid/absurd input gets a friendly error, never a crash.
- **`/nextsession`** — replies with the soonest upcoming scheduled event, or "no sessions scheduled".
- **Reminder** — ~30 minutes before each scheduled event, posts an embed to `#table-talk` and pings
  `@Players` **exactly once**, with catch-up if the bot was down at the fire moment.

Built from the discordArbiter `dungeon-herald` projectCharter. Part of the `discordBots` monorepo.

---

## Operator setup (live run)

These are the steps to take the bot live — they require your bot token and a live server, so they are
performed by you (the operator), not by the build.

### 1. Create the bot application

1. In the [Discord Developer Portal](https://discord.com/developers/applications), create an
   application (or reuse one). Note its **Application ID**.
2. Under **Bot**, create a bot and copy its **token**.
3. **Privileged intents: leave them OFF.** Dungeon Herald is least-privilege — it uses only the
   non-privileged `Guilds` and `GuildScheduledEvents` intents. Do **not** enable Message Content or
   Server Members.

### 2. Invite the bot to the server

Invite it to Dot_E's Server with the `bot` and `applications.commands` scopes, and these channel
permissions on **`#table-talk`**: **View Channel**, **Send Messages**, **Embed Links**. (The
`@Players` ping works via `allowed_mentions` and does not need Mention Everyone or a mentionable role.)
The `@Players` role and `#table-talk` channel must exist in the guild.

### 3. Provide secrets via environment (never commit these)

| Variable                       | Value                          |
| ------------------------------ | ------------------------------ |
| `DISCORD_TOKEN_DUNGEON_HERALD` | the bot token from step 1      |
| `DISCORD_APPLICATION_ID`       | the Application ID from step 1 |

The bot reads the token from `DISCORD_TOKEN_DUNGEON_HERALD` only; it is never logged or written to disk.

### 4. Build, register commands, run

From the **repo root**:

```bash
npm install
npx tsc -b                                  # compile all workspaces to dist/
npm run deploy-commands -w @discord-bots/dungeon-herald   # one-time, and after any command change (idempotent)
npm start -w @discord-bots/dungeon-herald   # start the always-on bot process
```

`deploy-commands` lists existing guild commands first and registers only what's missing, so it is safe
to re-run.

### 5. Verify it works

In Dot_E's Server:

- `/roll 2d6+3` → two d6 + 3 and a correct total; `/roll 1d20 adv` keeps the higher of 2d20;
  `/roll 4d6kh3` drops the lowest die; `/roll 1000d1000` → a friendly cap message (no crash).
- `/nextsession` → the soonest scheduled event, or "no sessions scheduled".
- Create a scheduled event starting in ~31 minutes. At ~30 minutes before, a reminder embed posts to
  `#table-talk` and pings `@Players` — exactly once. Restarting the bot before the event does not
  re-send it.

---

## Runtime notes

- **Durable state:** the reminder dedup store lives at `bots/dungeon-herald/data/reminders.json`
  (gitignored). It holds only `{eventId, startTime}` — no member PII. It must persist across restarts
  for exactly-once/catch-up to hold.
- **Hosting (`[CONFIRM-01]`):** the bot is a plain always-on Node process. On an
  **ephemeral-filesystem host**, `reminders.json` is wiped on redeploy and exactly-once/catch-up will
  break — mount a persistent volume or use an external store before deploying to such a host.
- **Reschedule/cancel (`[CONFIRM-02]`):** current behavior — once an event is reminded it is never
  reminded again, even if rescheduled later; cancelled events simply never fire.

## Development

```bash
npm test -w @discord-bots/dungeon-herald    # unit tests (mocked Discord; no live connection)
npm run typecheck -w @discord-bots/dungeon-herald
```

The bot imports the shared `@discord-bots/dice` (roll engine) and `@discord-bots/bot-core` (config,
reminder store/scheduler, command registration) workspace packages.
