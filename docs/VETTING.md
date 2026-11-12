# Vetting record

Reviewed 2026-11-12 against Claude Code 2.1.322. `plugins/basekit-guard/registry.json`
is the machine-readable version of this page; `/basekit-guard:scout` keeps both
current.

## Method and limits

- Each tool's repository was shallow-cloned and read: hooks, MCP config,
  `bin/`, install scripts, licence, telemetry and privacy sections. Nothing was
  executed or installed, apart from the three core plugins during the installer
  test.
- "Always-on tokens" is the figure Claude Code itself prints with
  `claude --plugin-dir <dir> plugin details <name>`. It counts skill and agent
  listings. It does not count context a plugin's hooks inject, MCP tool calls,
  or model calls a plugin makes on its own.
- Savings percentages quoted by tool authors were not reproduced. Check any of
  them on your own work with `/usage`, which attributes usage to plugins,
  skills and MCP servers.
- The read was done with Claude Code working through each repository. It is a
  careful first read on one day, not a security audit, and every one of these
  projects ships new code weekly.
- Maintainers: if a statement about your project is wrong or out of date, open
  an issue with a link to the source and it will be corrected.

## Verdicts on widely recommended tools

| Tool | Verdict | Always-on tokens | One-line reason |
| --- | --- | --- | --- |
| superpowers | Optional, recommended for feature work | ~848, plus ~800 injected at session start | MIT, one hook, no network in the hook, listed by Anthropic pinned to a commit |
| claude security | `security-guidance` is core; `claude-security` optional | 0 and ~778 | Both are Anthropic's. The first guards every change, the second is an on-demand deep scan |
| claude code setup | Optional | ~141 | Anthropic's read-only recommender. Use once per project |
| claude HUD | Optional | ~98 | MIT, no dependencies, no hooks, no network calls found in its source |
| playwright | Optional, CLI first | 0 (MCP plugin) | Microsoft recommends its CLI plus skills over the MCP server for coding agents |
| graphify | Optional, large repos | n/a (CLI) | Apache-2.0, local parsing, logging off by default. PyPI name is `graphifyy` |
| caveman | Caution | ~1,991 | Costs more context than the built-in Concise output style, which costs none |
| claude-mem | Caution | ~2,890 | Hooks on every tool call, background worker, analytics on by default |
| headroom | Caution | n/a (proxy) | All traffic through a local proxy, beacon on by default, drops the 1M context window unless flagged |
| gstack | Caution | ~1,300 (listing estimate) | Large; overlaps superpowers; sends code to outside reviewers by default |
| task observer | Caution | ~12,700 each time it loads | Its value is skill improvement. It is not a token saver |
| omnirouter (OmniRoute) | Avoid for this kit | n/a | In the path of every prompt and credential; subscription routing conflicts with Anthropic's terms |

## Is OmniRoute actually good?

As engineering, yes: MIT, very active, one local endpoint in front of 389
providers with fallback strategies. As a base for your projects, no, for four
reasons.

1. **Terms.** Two of its headline uses are pooling free-tier keys and routing
   subscription quota. Anthropic stated
   in February 2026 that OAuth tokens from Free, Pro and Max accounts may be
   used only in Claude Code and claude.ai, and that using them in any other
   tool breaks the consumer terms. API keys are fine; subscriptions are not.
2. **Attack surface.** It holds every provider credential and sees every
   prompt. It ships a TLS-intercepting mode that installs its own certificate
   authority to capture tools that ignore proxy settings. Its changelog
   references 38 distinct CVE or GHSA identifiers, a mix of its own advisories
   and dependency fixes: evidence of active patching, and of how much there is
   to patch. The repository is about 1.1 GB.
3. **It changes what you are measuring.** Requests fall through to other
   models, so "the reviewer found nothing" stops meaning the same thing from
   one run to the next.
4. **Claude Code loses features behind a custom base URL.** Headroom's own
   issue tracker documents the 1M context window dropping to 200k behind a
   proxy unless a flag is set.

If you need several providers for a product you are building, use API keys
through a gateway you run. Claude Code's documentation covers that setup.

## Tool by tool

### superpowers (obra/superpowers) - optional
MIT. Repository head is 7.0.2; Anthropic's directory pins 6.4.2 to a commit.
15 skills (brainstorming, writing and executing plans, test-driven
development, systematic debugging, verification before completion, code review
request and response, worktrees, subagent-driven development). One hook:
`SessionStart` on startup, clear and compact, which injects its
`using-superpowers` skill (3.2 KB). The hook script contains no network calls.
It complements Basekit: superpowers is process, Basekit is standards. Install
it from Anthropic's marketplace so you get the pinned commit.

### Claude security - `security-guidance` core, `claude-security` optional
Both are Anthropic plugins.

`security-guidance` 2.0.17 has three layers: regex warnings on edits for about
25 dangerous patterns, a model review of the diff when a turn ends, and an
agentic review on `git commit` and push that reads related files. It needs
Python 3.8+. The two model layers default to the newest Opus, so they add
usage. Dials: `SECURITY_REVIEW_MODEL`, `ENABLE_STOP_REVIEW=0`,
`ENABLE_CODE_SECURITY_REVIEW=0`, `SECURITY_GUIDANCE_DISABLE=1`.

`claude-security` 0.11.0 is the in-session version of Anthropic's hosted
Claude Security product: it maps the codebase, hunts, has three verifiers vote
on each finding, and can produce patch files. Its README says it adds no
isolation of its own and recommends sandbox-runtime for code you do not trust.
A scan asks you to confirm time and token cost. Enable it for audits.

### claude-code-setup - optional
Anthropic plugin, one skill, read-only by its own description. Run it at the
start of a project next to `/basekit:init`, then disable it.

### claude-hud (jarrodwatts/claude-hud) - optional
MIT, 0.15.3, last commit 2026-11-10. `package.json` declares no runtime
dependencies. No hooks. No network or process-spawning calls were found in
`src`. The README says the HUD runs under Node's
permission model so it cannot start programs or read credentials. Needs Node
22.18+. It comes from the author's own marketplace, which Anthropic does not
review; leave auto-update off and update when you choose to. A status line
costs no model tokens beyond the ~98 for its one skill.

### Playwright - optional, CLI first
`microsoft/playwright-cli` (Apache-2.0). Its README states that coding agents
favour CLI workflows exposed as skills because they avoid loading tool schemas
and accessibility trees into context, and keeps the MCP server for long
exploratory loops that need persistent state. The `playwright` plugin in
Anthropic's marketplace runs `npx @playwright/mcp@latest`, which is unpinned.
Anthropic's cost guide makes the same general point: prefer CLI tools to MCP
servers where both exist.

### graphify (safishamsi/graphify) - optional
Apache-2.0, last commit 2026-11-11. Parses code locally with tree-sitter and
no model call; documents, PDFs, images and video use your assistant's model or
a configured key. The query log is off unless you enable it. A hosted product
is advertised in the CLI output. Its installer adds instructions to CLAUDE.md
and a PreToolUse hook that steers Claude to the graph before raw file
searches. The PyPI package is named
`graphifyy`; mistyping it installs something else. Worth trying on a large
unfamiliar codebase. On a small project, a language-server plugin gives precise
navigation with no extra moving parts.

### caveman (JuliusBrussee/caveman) - caution
Apache-2.0 since 3.0.0, version 4.1.0, last commit 2026-11-08. The project has
grown from one skill into a CLI, proxy, engine and hosted cloud. Its privacy
section says: the skill sends nothing, the CLI sends usage statistics by
default, and Auto mode sends your prompts to Caveman Cloud after you sign in.
The plugin registers four hooks and lists 23 skills and 3 agents, about 1,991
tokens in every session. Claude Code now has a Concise output style built in.
Also note that Anthropic's built-in directory lists a plugin called `caveman`
from a different repository (akramsystems/caveman, 1.1.2). That one was not
reviewed.

### claude-mem (thedotmack/claude-mem) - caution
`package.json` says Apache-2.0 (older write-ups say AGPL-3.0). Version 15.18.1,
last commit 2026-11-12, more than 300 releases. Hooks on nine events, including
PostToolUse for every tool and PreToolUse for Read, Bash, Grep and Glob. A
background worker, an MCP server, 30 skills. The README states anonymous usage
analytics are on by default and cloud sync is opt-in. At least one CVE is published against past versions. It compresses
sessions with model calls, so it spends tokens to save them. Claude Code's own
auto memory and CLAUDE.md cover the common case. Consider it only if you
measure a real gap.

### headroom (headroomlabs-ai/headroom) - caution
Apache-2.0, last commit 2026-11-11. A local proxy (or library, or MCP server)
that compresses tool output and context. The authors report 47 to 92 percent
savings on tool-heavy workloads. An anonymous beacon is on by default
(`HEADROOM_TELEMETRY=off`). Issue 1158 documents the 1M context window falling to 200k behind
the proxy unless `--1m` is passed. Compression decides what the model sees,
which matters most in exactly the debugging sessions where one log line is the
answer.

### gstack (garrytan/gstack) - caution
MIT, last commit 2026-11-12. 71 `SKILL.md` files, 64 with descriptions at the
top level. Needs Bun. Installs by cloning into `~/.claude/skills` and running
`./setup`. Telemetry is opt-in; an update check against GitHub is on by
default; "outside reviews" are on by default and send code to Codex or Claude
Code under your own login. It covers the same ground as superpowers with a
product-team framing. Running both doubles the context cost and gives Claude
two competing processes.

### task-observer (rebelytics/one-skill-to-rule-them-all) - caution
CC-BY-4.0, version 3.10.0, last commit 2026-11-09. One skill whose `SKILL.md`
is 50.7 KB, about 12,700 tokens, with a description that asks to be used
during any multi-step task. It logs corrections and proposes skill updates
with your approval. That is useful, and it is the opposite of a token reducer.
`/basekit:learn` does the narrow version on demand. The built-in directory has
a plugin with a similar name that is not this one.

## Picks by job

**UI, without writing from scratch**
- Core: `frontend-design` (Anthropic, ~80 tokens), `context7` (current library
  docs), Basekit's `ui-standards` skill and `ui-engineer` agent.
- Per project: the shadcn skill (`npx skills add shadcn/ui`) where
  `components.json` exists, Playwright CLI, the TypeScript language server
  plugin, Figma's plugin if designs live there.
- Caution: `impeccable` (three hooks, its README says the first edit can
  download its engine, and it fetches design directions from its own site),
  `ui-ux-pro-max` (~1,067 always-on tokens, needs Python), Vercel's
  `web-design-guidelines` (fetches its rules from a URL at run time).

**Backend that explains itself**
- Core: Basekit's `engineering-standards` skill, `backend-engineer` agent,
  the config lint hook, the house-rules block, and `context7`.
- Per project: the language-server plugin for the stack. Anthropic's cost
  guide lists these as a way to cut file reads.

**Review for flaws, debt and leaks**
- Core: `/basekit:review` (code-reviewer, test-auditor, security-auditor), the
  secret guard hook, `security-guidance`.
- Also: Claude Code's built-in `/code-review`, gitleaks locally and in CI.
- For audits: `claude-security`. Optional: semgrep's plugin.

## What the research turned up that shapes the kit

1. **A plugin name is not an identity.** The same name points at different
   repositories in different catalogues (`caveman` above; look-alikes for
   task-observer and headroom). The registry records the repository, setup
   installs only when the catalogue entry's source matches it, and the scan
   flags a vetted name installed from an unexpected marketplace.
2. **Anthropic does not vouch for third-party plugin contents.** Its trust
   warning says it does not control what plugins include and cannot verify
   they work as intended or will not change. Entries are pinned to commits,
   which stops silent changes but is not a review of the code.
3. **Plugin code runs outside the sandbox with your privileges.** Hooks,
   monitors, MCP servers and language servers are not covered by permission
   rules. That is why nothing is installed at session start.
4. **Skills are a real attack path.** A January 2026 write-up showed a
   marketplace skill redirecting a dependency install to an attacker's source.
   The vetting script looks for registry redirects, fetch-and-run, hidden
   characters and "do not tell the user" instructions.
5. **Token savers have their own bill.** Measured always-on cost: caveman
   ~1,991, claude-mem ~2,890, ui-ux-pro-max ~1,067, superpowers ~848,
   claude-security ~778, Basekit ~600, claude-hud ~98, frontend-design ~80,
   language servers and MCP plugins 0.
6. **Much of this is built in now.** `/code-review`, the Concise output style,
   `/usage` attribution, `/context`, auto memory, `/doctor`, deferred MCP tool
   loading, and `claude plugin details` for projected token cost.

## Why the session scan does not search the web or install anything

The first idea for this kit was a boot-time scan that also pulled in new tools
from the web. The kit splits that in two on purpose.

- **Every session (at most once a day):** a local check of installed and
  available plugins against the registry. About one second, no network request
  of its own, zero tokens when there is nothing to report. It reads Claude
  Code's marketplace catalogues, which Claude Code refreshes itself.
- **On demand (`/basekit-guard:scout`):** web discovery plus a read of each
  candidate's source, ending in a recommendation you approve.

A web search in every session would cost tokens in every session, and
installing unreviewed code automatically is the one behaviour this whole
exercise argues against. If you want discovery on a schedule, run
`/basekit-guard:scout` as a weekly scheduled task and read its report.

## Not verified

- No third-party tool was run, so runtime behaviour is taken from source and
  documentation.
- Authors' savings figures.
- `figma` and `semgrep` plugin token costs.
- rtk beyond its README and licence.
- The library defaults in the two standards skills come from general knowledge
  as of this date, not from a fresh survey. The skills tell Claude to confirm
  current APIs before use.

## Sources

Claude Code documentation
- https://code.claude.com/docs/en/plugins-reference
- https://code.claude.com/docs/en/plugins/security
- https://code.claude.com/docs/en/plugins/cli-reference
- https://code.claude.com/docs/en/plugins/anthropic-marketplaces
- https://code.claude.com/docs/en/hooks.md
- https://code.claude.com/docs/en/skills
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/costs.md

Repositories read
- https://github.com/anthropics/claude-plugins-official
- https://github.com/obra/superpowers
- https://github.com/JuliusBrussee/caveman
- https://github.com/jarrodwatts/claude-hud
- https://github.com/safishamsi/graphify
- https://github.com/thedotmack/claude-mem
- https://github.com/headroomlabs-ai/headroom (and issue 1158)
- https://github.com/garrytan/gstack
- https://github.com/diegosouzapw/OmniRoute
- https://github.com/microsoft/playwright-cli
- https://github.com/rebelytics/one-skill-to-rule-them-all
- https://github.com/pbakaus/impeccable
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://github.com/vercel-labs/agent-skills
- https://github.com/rtk-ai/rtk
- https://github.com/gitleaks/gitleaks
- https://ui.shadcn.com/docs/skills.md

Reporting
- https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access
- https://www.sentinelone.com/blog/marketplace-skills-and-dependency-hijack-in-claude-code
- https://releasealert.dev/github/thedotmack/claude-mem/cves
