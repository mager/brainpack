# 🧠 brainpack

**Platform-agnostic CLI for managing portable AI agent brains.**

[![npm version](https://img.shields.io/npm/v/brainpack.svg)](https://www.npmjs.com/package/brainpack)
[![license](https://img.shields.io/npm/l/brainpack.svg)](LICENSE)

Your AI agent has a brain — a folder of text files that define its personality, memory, skills, and instructions. **brainpack** makes it easy to version, sync, export, and move that brain across machines and platforms.

Works with **OpenClaw**, **Cursor**, **Claude Code**, **Windsurf**, **Cline**, **GitHub Copilot**, or any custom setup. If your agent's brain is a folder of files, brainpack can manage it.

## Install

```bash
npm install -g brainpack
```

Or use directly:

```bash
npx brainpack init
```

## Quick Start

```bash
# Initialize your agent's brain directory
cd ~/.openclaw/workspace  # or wherever your brain lives
brainpack init

# Push to remote (git commit + push in one command)
brainpack push

# On another machine, clone and pull
git clone git@github.com:you/my-brain.git ~/.openclaw/workspace
cd ~/.openclaw/workspace
brainpack pull

# See what's changed
brainpack diff

# Snapshot before experiments
brainpack snapshot pre-experiment

# Export for offline transfer
brainpack export

# Import on a new machine
brainpack import brainpack-export-2026-02-21.tar.gz
```

## Commands

| Command | Description |
|---------|-------------|
| `brainpack init` | Initialize directory as a brainpack (auto-detects platform) |
| `brainpack push` | Stage, commit, and push brain to remote |
| `brainpack pull` | Pull latest brain state from remote |
| `brainpack snapshot <name>` | Tag current state as a named snapshot |
| `brainpack snapshot --list` | List all snapshots |
| `brainpack snapshot --restore <name>` | Restore a snapshot |
| `brainpack export [file]` | Export brain as `.tar.gz` |
| `brainpack import <file>` | Import a brain archive |
| `brainpack diff` | Show uncommitted changes and untracked files |
| `brainpack status` | Show brain status, remote, platform, file count |
| `brainpack secrets` | Show excluded secrets + setup guide for new machines |
| `brainpack secrets --check` | Check which secret files exist vs missing |

## Platform Detection

brainpack auto-detects your setup:

| Platform | Detection |
|----------|-----------|
| `openclaw` | `SOUL.md` or `AGENTS.md` |
| `cursor` | `.cursor/` or `.cursorrules` |
| `claude-code` | `CLAUDE.md` or `.claude/` |
| `windsurf` | `.windsurf/` or `.windsurfrules` |
| `cline` | `.cline/` or `.clinerules` |
| `roo-code` | `.roo/` or `.roorules` |
| `codex` | `.codex/` or `codex.md` |
| `aider` | `.aider.conf.yml` or `.aiderignore` |
| `continue` | `.continue/` |
| `goose` | `.goosehints` |
| `devin` | `devin.md` |
| `bolt` | `.bolt/` |
| `replit` | `.replit` |
| `copilot` | `.github/copilot-instructions.md` |
| `amp` | `.amp/` |
| `generic` | Fallback for any setup |

## The Manifest

`brainpack init` creates a `brainpack.json`:

```json
{
  "name": "my-agent",
  "version": "1.0.0",
  "platform": "openclaw",
  "brainPath": ".",
  "ignore": ["TOOLS.md", ".env", "*.key", ".openclaw/", ".pi/"],
  "created": "2026-02-21T16:55:00.000Z"
}
```

Files in the `ignore` list are excluded from exports and added to `.gitignore`. Keep secrets out of your brain repo.

## Vision

AI agents are becoming as personal as dotfiles. The tools, APIs, and platforms will keep changing — but the core of what makes *your* agent yours (its personality, memory, instructions, skills) should be portable, versionable, and platform-independent.

`brainpack` is the `git` workflow for your agent's mind. Treat your brain like source code: commit it, branch it, snapshot it before big changes, share it across teams, export it for safekeeping. Platform lock-in should stop at the tool layer, not the thought layer.

## Contributing

PRs welcome. Keep it minimal and dependency-light.

## License

[MIT](LICENSE)
