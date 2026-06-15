<!-- SPDX-License-Identifier: MIT -->

# arbiter-self-assign

A self-serve role bot for **arbiterGaming** (`1119021914086703194`). Members pick a cosmetic **color**
and opt into **game-ping** roles in `#roles` without bothering a mod.

- **Color select** — a single-select menu of 7 colors (Red, Orange, Yellow, Green, Cyan, Blue, Pink).
  Picking one assigns it and removes any other color (one color at a time). Clearing removes it.
- **Ping toggles** — buttons for `Helldivers`, three operator-named game slots, and `GameNight`.
  Clicking adds the role if you lack it, removes it if you have it. These roles are mentionable.
- **`/post-role-menu`** — admin-only (Manage Roles). (Re)posts the menu in `#roles`.

The bot **owns exactly 12 roles** and ensures they exist on startup. It never creates, edits, deletes,
or assigns any role outside those 12 — tier roles (Admin/Mod/Member/Founding Four) and everything else
are never touched.

Built from the discordArbiter `arbiter-self-assign` charter. Scaffolded via `tools/new-bot`. Part of
the `discordBots` monorepo.

---

## Operator setup (live run)

These steps require your bot token and a live server, so they are performed by you (the operator), not
by the build. `[NEEDS-TRIAGE: operator-live-verify]`

### 1. Create the bot application

1. In the [Discord Developer Portal](https://discord.com/developers/applications), create an
   application (or reuse one). Note its **Application ID**.
2. Under **Bot**, create a bot and copy its **token**.
3. **Enable the privileged `Server Members Intent` (GuildMembers).** This bot _requires_ it to read
   and modify member roles. Leave **Message Content** and **Presence** OFF — they are not used.

### 2. Rename the placeholder ping roles (before deploy) — `[CONFIRM-03]`

Open `bots/arbiter-self-assign/src/roles.ts` and rename the three placeholder game-ping roles
(`Game Slot 2`, `Game Slot 3`, `Game Slot 4`, flagged `placeholder: true`) to the real game names.
`Helldivers` and `GameNight` are fixed. Rebuild after editing.

### 3. Place the bot's role ABOVE the 12 managed roles

A bot can only manage roles **below** its own highest role. After inviting the bot, drag its role in
**Server Settings → Roles** so it sits **above** all 12 managed roles (the bot creates them just below
its own highest role on startup, but if you create them by hand or reorder, keep the bot on top).

### 4. Invite the bot

Invite it to arbiterGaming with the `bot` and `applications.commands` scopes, and grant:

- **Manage Roles** (server permission — required to create/assign the 12 roles).
- On **`#roles`**: **View Channel** and **Send Messages** (to post the menu).

### 5. Provide secrets via environment (never commit these)

| Variable                            | Value                          |
| ----------------------------------- | ------------------------------ |
| `DISCORD_TOKEN_ARBITER_SELF_ASSIGN` | the bot token from step 1      |
| `DISCORD_APPLICATION_ID`            | the Application ID from step 1 |

The bot reads the token from `DISCORD_TOKEN_ARBITER_SELF_ASSIGN` only; it is never logged or written
to disk.

### 6. Build, register commands, run

From the **repo root**:

```bash
npm install
npx tsc -b                                                      # compile all workspaces to dist/
npm run deploy-commands -w @discord-bots/arbiter-self-assign    # one-time + after any command change (idempotent)
npm start -w @discord-bots/arbiter-self-assign                 # start the always-on bot process
```

On first start the bot ensures the 12 roles exist (positioned just below its own highest role) and
posts the menu in `#roles`.

### 7. Verify it works

In arbiterGaming, in `#roles`:

- Pick **Blue** in the select → you get the Blue role and an ephemeral "You're now Blue"; pick **Red**
  → Blue is removed and Red added (only one color). Clear the select → your color is removed.
- Click **Helldivers** → ephemeral "Added Helldivers"; click again → "Removed Helldivers".
- Confirm tier roles (Admin/Mod/Member) are untouched by any of the above.
- As an admin, run `/post-role-menu` → the menu (re)posts. As a non-admin, the command is hidden /
  rejected.
- Restart the bot → the existing menu still works (handlers re-bind via stable custom IDs); if the
  stored message was deleted, the bot reposts it.

---

## Runtime notes

- **Durable state:** the menu location lives at `bots/arbiter-self-assign/data/menu-location.json`
  (gitignored). It holds only `{guildId, channelId, messageId}` — no member PII. If it is lost, the
  bot simply reposts the menu on next start.
- **Least privilege (AC-09):** the client requests EXACTLY `[Guilds, GuildMembers]` — no Message
  Content, presences, or message intents.
- **Hosting (`[CONFIRM-01]`):** a plain always-on Node process. On an ephemeral-filesystem host the
  menu-location file is wiped on redeploy; the bot just reposts the menu (no data loss of consequence).

## Development

```bash
npm test -w @discord-bots/arbiter-self-assign     # unit tests (mocked Discord; no live connection)
npm run typecheck -w @discord-bots/arbiter-self-assign
```

Component handlers are unit-tested against narrow interfaces with mocked discord.js objects — no live
connection. The bot imports `@discord-bots/bot-core` (config token convention, `JsonValueStore`,
idempotent command registration).
