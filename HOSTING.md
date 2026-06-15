# Hosting

Run the bots in Docker (Docker Desktop). Each bot runs as its own container —
one OS process per bot (ADR-0003) — built from the shared multi-stage
`Dockerfile` and wired up by `docker-compose.yml`.

## 1. Configure secrets

Copy the example env file and fill in your tokens:

```sh
cp .env.example .env
```

Then edit `.env` and set:

- `DISCORD_APPLICATION_ID` — your Discord application id (used to register slash commands).
- `DISCORD_TOKEN_DUNGEON_HERALD` — bot token for `dungeon-herald`.
- `DISCORD_TOKEN_ARBITER_SELF_ASSIGN` — bot token for `arbiter-self-assign`.

`.env` is gitignored — never commit real tokens. Each bot only ever reads its
own `DISCORD_TOKEN_<SLUG>` (least-privilege, one token per process).

## 2. Build the images

```sh
docker compose build
```

This builds one image per bot (`discordbots-dungeon-herald`,
`discordbots-arbiter-self-assign`), each with the correct `BOT_SLUG`.

## 3. Start the bots

```sh
docker compose up -d
```

Both services start detached and `restart: unless-stopped`, so they come back
after a crash or a host reboot.

## 4. View in Docker Desktop

Open **Docker Desktop → Containers**. The compose project appears with its two
containers (`dungeon-herald`, `arbiter-self-assign`). Click a container to see
logs, environment, and the mounted volume. You can also stream logs from the CLI:

```sh
docker compose logs -f
```

## 5. Register slash commands (per bot)

Slash commands are registered by each bot's `deploy-commands` script. Run it
once per bot (and again whenever a command definition changes). Requires
`DISCORD_APPLICATION_ID` to be set in `.env`:

```sh
docker compose run --rm dungeon-herald node bots/dungeon-herald/dist/deploy-commands.js
docker compose run --rm arbiter-self-assign node bots/arbiter-self-assign/dist/deploy-commands.js
```

`--rm` removes the one-off container when the command finishes.

## Durable state (named volumes)

Each bot's durable state (`reminders.json` for dungeon-herald,
`menu-location.json` for arbiter-self-assign) lives under that bot's
`/app/bots/<slug>/data` directory. Compose mounts a **named volume** there
(`dungeon-herald-data`, `arbiter-self-assign-data`) so this state survives
container restarts, rebuilds, and host reboots — preserving the exactly-once /
catch-up reminder guarantees (ADR-0004).

Inspect or remove the volumes:

```sh
docker volume ls
docker compose down            # stop containers, KEEP volumes (state preserved)
docker compose down -v         # stop containers AND delete volumes (wipes state)
```
