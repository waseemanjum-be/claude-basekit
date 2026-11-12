# Basekit plugin

Engineering standards, five agents and three guard hooks for Claude Code, plus
a registry of vetted third-party tools and a session-start check against it.

Install with `node setup.js` from a clone of the repository (see the README
at its root), or inside a Claude Code session:

```
/plugin marketplace add waseemanjum-be/claude-basekit
/plugin install basekit@basekit-marketplace
```

## What it adds

| Component | What it does |
| --- | --- |
| Skill `engineering-standards` | Config over literals, secrets, errors, data, tests, reuse, and the "Decisions and deviations" report. Loaded by Claude for backend work. |
| Skill `ui-standards` | Reuse ladder, states, accessibility, tokens, browser verification. Loaded by Claude for UI work. |
| Agents `backend-engineer`, `ui-engineer` | Builders that follow the two skills. |
| Agents `code-reviewer`, `test-auditor`, `security-auditor` | Read-only reviewers. |
| `/basekit:review` | Runs the three reviewers in parallel and merges the findings. |
| `/basekit:init` | Sets a repository up: CLAUDE.md, path-scoped rules, secret-file deny rules, REVIEW.md. |
| `/basekit:status` | Vetted tools installed, token cost, unvetted installs, what is new. |
| `/basekit:scout` | Finds and vets new tools from source; updates the registry on approval. |
| `/basekit:learn` | Turns a session's corrections into standing rules. |
| Hook: session scan | Once a day at most, compares installed and available plugins with `registry.json`. |
| Hook: secret guard | Blocks writes and commits that contain credential-shaped strings. |
| Hook: config lint | After an edit, notes literals that look like configuration. Advisory. |

## Settings

Defaults are in `config.defaults.json`. Override any key with an environment
variable `BASEKIT_<KEY>`, for example in the `env` block of a Claude Code
settings file:

```json
{ "env": { "BASEKIT_SECRET_GUARD": "warn", "BASEKIT_SCAN_INTERVAL_HOURS": "72" } }
```

## Requirements

Node 18 or later on PATH (the hooks are Node scripts with no dependencies).
`gitleaks` is optional; the commit guard uses it when present.
