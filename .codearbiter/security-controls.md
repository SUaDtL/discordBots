# Security Controls

Thin by design — this is a personal, non-multi-tenant bot workspace. Banned-primitive posture +
trust boundaries only.

## Secrets
- **Bot tokens** are the only secrets. Sourced from **environment variables** (`DISCORD_TOKEN_<SLUG>`)
  only. Never committed, logged, printed, embedded in source, tests, fixtures, or error messages.
- On the eventual cloud host ([CONFIRM-01]), the token is a platform secret, not a file.

## Crypto / randomness
- **No application cryptography** (no hashing, signing, encryption, key derivation, or TLS config in
  app code — discord.js owns the transport TLS).
- **RNG:** dice rolls use Node's `crypto.randomInt` for unbiased integer ranges (avoids `Math.random`
  modulo bias). Not security-strength-critical, but unbiased distribution matters for player trust.
- **Banned:** no home-rolled crypto; no `Math.random` for anything requiring fairness; never disable
  TLS verification.

## Trust boundaries
- **Discord is the only external surface** (gateway + REST via discord.js v14). The bot trusts
  Discord's identity of interactions; it does not accept input from any other network source.
- **Command input** (`/roll` dice strings) is untrusted text → the parser must reject malformed and
  absurd input with a friendly error/cap, never crash, never evaluate unbounded work (explosion +
  dice-count caps).
- **Least-privilege intents/permissions per bot** (ADR-0003). dungeon-herald: Scheduled Events
  (read), Send Messages + Embed Links in `#table-talk`, Use Application Commands. NOT: Message
  Content, Manage Roles, Manage Channels, Server Members.

## Data / PII
- **No member PII stored or logged.** The reminder store holds only event IDs + start times.
- **No DMs / no mass-DM**; bot accounts only; respect rate limits (Discord ToS, carried from
  discordArbiter).

## Supply chain
- discord.js pinned at major v14; re-audit before any major bump. New/changed dependencies vetted via
  `/ca:add-dep` before install.
