# Basekit

A starter kit for Claude Code, so the same instructions do not have to be
repeated in every project. Install it once; nothing has to be mentioned in a
prompt afterwards.

- **Standards Claude applies unprompted.** Configuration over hardcoded
  values, secrets, error handling, tests, reuse before writing. Every
  implementation ends with a "Decisions and deviations" report: what was made
  configurable, what stayed hardcoded and why, what is not configurable and why.
- **Five agents.** `ui-engineer` and `backend-engineer` build.
  `code-reviewer`, `test-auditor` and `security-auditor` review, read-only.
- **Hooks that make it automatic.** A secret guard on writes and commits, a
  note after each edit that points at hardcoded values, a review gate that
  stops an unreviewed code commit, a check that the reply includes the
  decisions report, and a daily toolkit check.
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
2. registers this folder as a local marketplace and installs its two plugins,
   `basekit` and `basekit-guard`;
3. offers the three core plugins: `frontend-design`, `context7`,
   `security-guidance`;
4. offers a short house-rules block for your user `CLAUDE.md`, between
   markers, with a backup.

`node setup.js --dry-run` prints the plan only. `--yes` accepts everything.
`--uninstall` removes both plugins and the rules block.

Keep the cloned folder: the plugins load from it in place, so your edits to
the rules and the registry apply after `/reload-plugins`.

**Without cloning.** Inside a Claude Code session:

```
/plugin marketplace add waseemanjum-be/claude-basekit
/plugin install basekit-guard@basekit-marketplace
```

That installs both plugins, and the hooks supply the house rules themselves at
session start. It skips the three third-party core plugins, and because the
plugins then run from Claude Code's cache, `/basekit-guard:scout` and
`/basekit:learn` cannot save changes to them.

## Two plugins

| Plugin | Contains | Where to get it |
| --- | --- | --- |
| `basekit` | The standards skills, the five agents, `/basekit:review`, `/basekit:init`, `/basekit:learn`. Instructions only | This repository's marketplace, and Anthropic's plugin directory once listed |
| `basekit-guard` | The hooks and their scripts, the vetted registry, `/basekit-guard:status`, `/basekit-guard:scout`. Depends on `basekit` | This repository's marketplace only |

They are separate because Anthropic's plugin directory holds plugins that run
hook commands or ship scripts for review unless the publisher is a Verified
organization. `basekit` alone gives Claude the standards and the reviewers;
`basekit-guard` is what makes them apply without being asked.

## What runs without being asked

This is what `basekit-guard` adds. With `basekit` alone, Claude still has the
standards and the reviewers, but nothing enforces them.

| When | What happens | Switch |
| --- | --- | --- |
| Session starts | The house rules are in context: from your `CLAUDE.md` block, or supplied by the plugin when there is none | `BASEKIT_INJECT_RULES` |
| First backend or UI edit in a session | Claude is pointed at the matching standards skill | `BASEKIT_STANDARDS_NUDGE` |
| Every edit to source | Literals that look like configuration are noted to Claude | `BASEKIT_CONFIG_LINT` |
| Every write, and every commit | Credential-shaped strings are blocked | `BASEKIT_SECRET_GUARD` |
| Claude finishes a turn that added code | If the reply has no "Decisions and deviations" block, Claude is sent back once to add it | `BASEKIT_REPORT_CHECK` |
| Claude runs `git commit` on code | The commit is stopped until the three reviewers have run in that session. With must-fix findings Claude shows them instead of committing | `BASEKIT_REVIEW_ON_COMMIT` |
| New session in a repository with no `CLAUDE.md` | You are told once that `/basekit:init` has not been run there | `BASEKIT_INIT_HINT` |
| Once a day | Installed plugins are compared with the vetted registry | `BASEKIT_SCAN_INTERVAL_HOURS` |

The review gate applies to commits Claude makes, not to ones you type in your
own terminal. It skips commits that add fewer than 10 lines of code and commits
of documentation only. To commit without a review, tell Claude to, and it adds
`[skip review]` to the commit message. A full review runs three subagents, so
it costs tokens on every gated commit; `BASEKIT_REVIEW_AGENTS=code-reviewer`
runs one, and `BASEKIT_REVIEW_ON_COMMIT=remind` or `off` relaxes the gate.

## Commands, for when you want them

| When | Do |
| --- | --- |
| New repository | `/basekit:init` records its commands, layout and conventions |
| A review outside a commit | `/basekit:review` (add `quick` for one reviewer, `fix` to apply the must-fix items) |
| You corrected Claude | `/basekit:learn` turns the correction into a rule |
| What is installed, what does it cost | `/basekit-guard:status` |
| Looking for new tools | `/basekit-guard:scout`, or `/basekit-guard:scout <name>` to vet one |

To call an agent directly: `@agent-basekit:code-reviewer look at the auth changes`.

## What happens at session start

At most once every 24 hours, a hook compares your installed and available
plugins with the registry. If something needs attention you get one short
note: a missing core plugin, something installed that is not vetted, a vetted
name installed from an unexpected marketplace, or new plugins in the areas
this kit covers. Otherwise it prints nothing and costs nothing. It never
installs, updates or removes anything.

Finding new tools on the web and judging them is `/basekit-guard:scout`. It reads
each candidate's source without running it and records a verdict only when you
approve. `docs/VETTING.md` explains why this is not automatic.

## Token cost

| Piece | Always-on tokens |
| --- | --- |
| `basekit` (5 skills, 5 agents) | ~530 |
| `basekit-guard` (2 commands, hooks) | ~85 |
| House rules (your `CLAUDE.md` block, or supplied by the plugin) | ~440 |
| `frontend-design` | ~80 |
| `context7`, `security-guidance`, language servers | 0 |

Figures are from `claude plugin details`. Four of the seven skills are
user-invoked only, and the reference files load only when needed. The hooks
themselves add no context; their notes are a sentence or two when they fire.
The larger cost is the review on each gated commit, described above.

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

Defaults are in `plugins/basekit-guard/config.defaults.json`. Override with
`BASEKIT_<KEY>` environment variables, per user or per project:

| Variable | Default | Meaning |
| --- | --- | --- |
| `BASEKIT_SECRET_GUARD` | `block` | `block`, `warn` or `off` |
| `BASEKIT_CONFIG_LINT` | `advise` | `advise` or `off` |
| `BASEKIT_REVIEW_ON_COMMIT` | `require` | `require`, `remind` or `off` |
| `BASEKIT_REVIEW_AGENTS` | all three | comma-separated reviewers the gate waits for |
| `BASEKIT_REVIEW_MIN_LINES` | `10` | added code lines below which a commit is not gated |
| `BASEKIT_REPORT_CHECK` | `on` | `on` or `off` |
| `BASEKIT_REPORT_MIN_LINES` | `15` | added source lines before the report check applies |
| `BASEKIT_STANDARDS_NUDGE` | `on` | `on` or `off` |
| `BASEKIT_INJECT_RULES` | `auto` | `auto` or `off` |
| `BASEKIT_INIT_HINT` | `on` | `on` or `off` |
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
  plugins/basekit/              instructions only
    agents/                     5 agents
    skills/                     2 standards skills, review, init, learn
  plugins/basekit-guard/        automation
    hooks/hooks.json            hooks on 5 events
    scripts/                    session-rules, session-scan, secret-guard, review-gate,
                                config-lint, report-check, vet-plugin
    registry.json               vetted tools (machine-readable)
    config.defaults.json        every default in one place
    user-rules.md               the house rules
    skills/                     status, scout
```

## Changing it

Edit the files here, then `/reload-plugins` in a session. Run
`node tests/run-tests.js` and `claude plugin validate` on both plugin folders
after changing scripts or frontmatter. The rules are yours: tighten wording in the
skills, add project patterns with `/basekit:learn`, change verdicts through
`/basekit-guard:scout`.

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
- The review gate and report check steer Claude; they are not a lock. The gate
  gives way after three stops so it can never trap a session, and a direct
  instruction from you outranks the report check.
- The reviewers are Claude with instructions. They verify before reporting,
  and they can still be wrong.
- Verdicts in the registry are a dated read of each tool's source, not an
  audit, and those tools change weekly.
- Hooks need `node` on PATH. On Windows, Claude Code runs them without a
  shell, so no Git Bash is required.
