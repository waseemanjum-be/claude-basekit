# Basekit

Engineering and UI standards that Claude applies without being asked, two
builder agents, and three read-only reviewers for code, tests and security.
This plugin is instructions only: skills and agents, with no hooks, scripts or
servers.

Install inside a Claude Code session:

```
/plugin marketplace add waseemanjum-be/claude-basekit
/plugin install basekit@basekit-marketplace
```

## What it adds

| Component | What it does |
| --- | --- |
| Skill `engineering-standards` | Configuration over literals, secrets, error handling, data, tests, reuse, and a closing "Decisions and deviations" report. Claude loads it for backend work. |
| Skill `ui-standards` | Reuse the project's components and libraries before writing any, cover every state, accessibility, tokens, browser verification. Claude loads it for UI work. |
| Agents `backend-engineer`, `ui-engineer` | Builders that follow the two skills. |
| Agents `code-reviewer`, `test-auditor`, `security-auditor` | Read-only reviewers. They verify a finding before reporting it. |
| `/basekit:review` | Runs the three reviewers in parallel and merges the findings into one report. Claude can also start it before a commit. |
| `/basekit:init` | Sets a repository up: CLAUDE.md, path-scoped rules, secret-file deny rules, REVIEW.md. Asks before writing. |
| `/basekit:learn` | Turns the corrections you made in a session into standing rules. |

## What you will notice

After implementation work, Claude ends with a short report: what it made
configurable, what it left hardcoded and why, what cannot be configured and
why, what it verified and what it did not. The aim is that you never have to
ask "why is this hardcoded?".

## Making it automatic

On its own this plugin relies on Claude choosing to load the skills. The
companion plugin `basekit-guard`, from the same marketplace, adds hooks that
enforce the rules: a secret guard, a review gate on commits, notes on hardcoded
values after each edit, and a check that the report was written. See the
repository README.

## Token cost

About 530 tokens in every session for the skill and agent listings. The
standards themselves load only when the work calls for them.
