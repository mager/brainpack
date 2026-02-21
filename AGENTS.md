# AGENTS.md — brainpack

A platform-agnostic CLI for managing portable AI agent brains.

## What This Is

brainpack packages, versions, and transports the text files that define an AI agent's identity — personality, memory, skills, instructions. It works across OpenClaw, Cursor, Claude Code, Windsurf, Cline, GitHub Copilot, or any custom setup.

## Architecture

- **Single-file CLI**: `bin/brainpack.js` (~430 lines)
- **Dependencies**: `commander` (CLI), `chalk` (colors), `tar` (export/import)
- **Git-backed**: Uses git for versioning, syncing, snapshots (tags)
- **Manifest**: `brainpack.json` stores brain metadata (name, platform, ignore list)

## Commands

`init` · `push` · `pull` · `snapshot` · `export` · `import` · `diff` · `status`

## Platform Detection

Auto-detects by checking for marker files. Supports 16 platforms:
OpenClaw, Cursor, Claude Code, Windsurf, Cline, Roo Code, Codex, Aider, Continue.dev, Goose, Devin, Bolt, Replit, GitHub Copilot, Amp, and generic fallback.

See README.md for the full detection table.

## Dev

```bash
npm install
node bin/brainpack.js --help     # test locally
chmod +x bin/brainpack.js        # make executable
```

## Style

- Keep it minimal. One file is fine.
- No unnecessary abstractions.
- Error messages should be helpful and human-readable.
- MIT licensed, PRs welcome.
