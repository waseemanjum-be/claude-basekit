# Basekit

A starter kit for Claude Code, so the same instructions do not have to be
repeated in every project.

- **Standards Claude applies unprompted.** Configuration over hardcoded
  values, secrets, error handling, tests, reuse before writing. Every
  implementation ends with a "Decisions and deviations" report: what was made
  configurable, what stayed hardcoded and why, what is not configurable and why.
- **Five agents.** `ui-engineer` and `backend-engineer` build.
  `code-reviewer`, `test-auditor` and `security-auditor` review, read-only.
- **Three guard hooks.** A secret guard that blocks credential-shaped strings
  in writes and commits, a config lint that points at literals after each edit,
  and a daily toolkit check.
- **A vetted registry** of third-party plugins and tools, with a verdict,
  measured token cost and the reason for each. See `docs/VETTING.md`.

## Install

Needs Claude Code and Node 18 or later. Pick one route, not both.

**Full setup (recommended).** Clone it and let setup walk you through:

```
git clone https://github.com/waseemanjum-be/claude-basekit.git
cd claude-basekit
node setup.js
```

(`./install.sh` and `.\install.ps1` do the same.) Setup shows each step and
asks before it acts:

1. validates the kit with `claude plugin validate`;
2. registers this folder as a local marketplace and installs the `basekit`
   plugin from it;
3. offers the three core plugins: `frontend-design`, `context7`,
   `security-guidance`;
4. offers a 28-line house-rules block for your user `CLAUDE.md`, between
   markers, with a backup.

`node setup.js --dry-run` prints the plan only. `--yes` accepts everything.
`--uninstall` removes the plugin and the rules block.

Keep the cloned folder: the plugin loads from it in place, so your edits to
the rules and the registry apply after `/reload-plugins`.

**Plugin only.** Inside a Claude Code session:

```
/plugin marketplace add waseemanjum-be/claude-basekit
/plugin install basekit@basekit-marketplace
```

This gives you the skills, agents, hooks and commands. It skips the three core
plugins and the house-rules block, and because the plugin then runs from Claude
Code's cache, `/basekit:scout` and `/basekit:learn` cannot save changes to it.

## Use

| When | Do |
| --- | --- |
| New repository | `/basekit:init` |
| Backend work | Just ask. Claude loads `engineering-standards`; for larger pieces it uses `backend-engineer` |
| UI work | Just ask. Claude loads `ui-standards`; for larger pieces it uses `ui-engineer` |
| Before a commit | `/basekit:review` (add `quick` for one reviewer, `fix` to apply the must-fix items) |
| You corrected Claude | `/basekit:learn` turns the correction into a rule |
| What is installed, what does it cost | `/basekit:status` |
| Looking for new tools | `/basekit:scout`, or `/basekit:scout <name>` to vet one |

To call an agent directly: `@agent-basekit:code-reviewer look at the auth changes`.

## What happens at session start

At most once every 24 hours, a hook compares your installed and available
plugins with the registry. If something needs attention you get one short
note: a missing core plugin, something installed that is not vetted, a vetted
name installed from an unexpected marketplace, or new plugins in the areas
this kit covers. Otherwise it prints nothing and costs nothing. It never
installs, updates or removes anything.

Finding new tools on the web and judging them is `/basekit:scout`. It reads
each candidate's source without running it and records a verdict only when you
approve. `docs/VETTING.md` explains why this is not automatic.

## Token cost

| Piece | Always-on tokens |
| --- | --- |
| `basekit` plugin (7 skills, 5 agents) | ~579 |
| House-rules block in user `CLAUDE.md` | ~400 |
| `frontend-design` | ~80 |
| `context7`, `security-guidance`, language servers | 0 |

Figures are from `claude plugin details`. Five of the seven skills are
user-invoked only, and the reference files load only when needed.

`security-guidance` makes its own model calls when a turn ends and on commit.
To spend less, set one of these in the `env` block of `~/.claude/settings.json`:

```json
{ "env": { "ENABLE_STOP_REVIEW": "0" } }
```

keeps the commit and push reviews and drops the per-turn one;
`"SECURITY_REVIEW_MODEL"` selects a cheaper model.

Habits that save more than any plugin: `/clear` between unrelated tasks, a
language-server plugin for typed code, CLI tools instead of MCP servers where
both exist, the built-in Concise output style, and `/usage` to see where
tokens actually went.

## Settings

Defaults are in `plugins/basekit/config.defaults.json`. Override with
`BASEKIT_<KEY>` environment variables, per user or per project:

| Variable | Default | Meaning |
| --- | --- | --- |
| `BASEKIT_SECRET_GUARD` | `block` | `block`, `warn` or `off` |
| `BASEKIT_CONFIG_LINT` | `advise` | `advise` or `off` |
| `BASEKIT_SCAN_INTERVAL_HOURS` | `24` | minimum hours between toolkit checks |
| `BASEKIT_SCOUT_STALE_DAYS` | `14` | when the check starts suggesting a scout run |

A literal that should stay in code: add `hardcoded: <reason>` on or above the
line. A deliberate fake credential in a test: add `basekit:allow-secret` on
the line.

## Layout

```
claude-basekit/
  setup.js  install.sh  install.ps1
  docs/VETTING.md               verdicts and evidence
  tests/run-tests.js            node tests/run-tests.js
  plugins/basekit/
    registry.json               vetted tools (machine-readable)
    config.defaults.json        every default in one place
    user-rules.md               the block setup writes to your CLAUDE.md
    agents/                     5 agents
    skills/                     2 standards skills, 5 commands, templates
    hooks/hooks.json            3 hooks
    scripts/                    session-scan, secret-guard, config-lint, vet-plugin
```

## Changing it

Edit the files here, then `/reload-plugins` in a session. Run
`node tests/run-tests.js` and `claude plugin validate plugins/basekit` after
changing scripts or frontmatter. The rules are yours: tighten wording in the
skills, add project patterns with `/basekit:learn`, change verdicts through
`/basekit:scout`.

## About the verdicts

The registry and `docs/VETTING.md` give an opinion on other people's projects:
which to install, which to treat with care, and why. Each verdict is dated,
cites what was read, and was produced with Claude Code reading the project's
source. It is a careful first read, not an audit, and these projects change
weekly. If you maintain one of them and something here is wrong or out of
date, open an issue with a link and it will be corrected.

## Contributing

See `CONTRIBUTING.md`. Security reports: `SECURITY.md`.

## Limits

- The secret guard and config lint are pattern matchers. They catch the common
  cases and miss others; they fail open. Run gitleaks in CI as the real gate.
- The reviewers are Claude with instructions. They verify before reporting,
  and they can still be wrong.
- Verdicts in the registry are a dated read of each tool's source, not an
  audit, and those tools change weekly.
- Hooks need `node` on PATH. On Windows, Claude Code runs them without a
  shell, so no Git Bash is required.
