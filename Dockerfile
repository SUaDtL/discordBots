# syntax=docker/dockerfile:1

# Multi-stage build for the discordBots monorepo. One image per bot (ADR-0003:
# one OS process per bot). The same Dockerfile builds either bot, selected at
# build time via the BOT_SLUG build arg (e.g. dungeon-herald, arbiter-self-assign).

# ---- builder ----------------------------------------------------------------
# Compiles the whole workspace once (tsc -b walks the project references), then
# the runtime stage copies only the built output it needs.
FROM node:24-slim AS builder
WORKDIR /app

# Manifests first so `npm ci` can be cached when only source changes.
COPY package.json package-lock.json ./
COPY packages/ ./packages/
COPY bots/ ./bots/
COPY tools/ ./tools/
COPY tsconfig.base.json tsconfig.json ./

# Clean, reproducible install from the lockfile (dev deps included for tsc).
RUN npm ci

# Build all workspaces via project references.
RUN npx tsc -b

# ---- runtime ----------------------------------------------------------------
FROM node:24-slim AS runtime

# Which bot this image runs. Provided at build time (docker build --build-arg
# BOT_SLUG=... / compose build args).
ARG BOT_SLUG
ENV BOT_SLUG=${BOT_SLUG}
ENV NODE_ENV=production

WORKDIR /app

# Bring over installed deps and the compiled workspace. Root package.json keeps
# the "type": "module" + workspace resolution intact at runtime.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/bots ./bots
COPY --from=builder /app/tools ./tools

# Durable reminder/menu state lives under the bot's data/ dir (ADR-0004). Create
# it and hand ownership to the non-root `node` user (the base image ships one).
# A named volume is mounted here by compose so state survives restarts.
RUN mkdir -p "bots/${BOT_SLUG}/data" \
  && chown -R node:node "bots/${BOT_SLUG}"

# Drop root: run as the unprivileged `node` user that ships with the base image.
USER node

# Start the bot. `sh -c` lets ${BOT_SLUG} expand; `exec` replaces the shell with
# node so node becomes PID 1 and receives SIGTERM directly (clean shutdown under
# `restart: unless-stopped`). The path is absolute (/app/...) so the launch guard
# (import.meta.url === pathToFileURL(process.argv[1]).href) fires and main()
# actually runs in-container.
CMD ["sh", "-c", "exec node \"/app/bots/${BOT_SLUG}/dist/index.js\""]
