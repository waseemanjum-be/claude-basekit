# Privacy

Applies to the `basekit` and `basekit-guard` plugins and the files in this
repository. Last updated: 2026-11-16.

## Short version

Basekit collects nothing. There is no telemetry, no analytics, no account and
no server. Nothing in this repository sends data to its author or to any third
party.

## `basekit`

Markdown instructions only: skills and agents. It contains no code, starts no
process and makes no network request.

## `basekit-guard`

Runs Node scripts on your machine as Claude Code hooks. The scripts have no
dependencies and make no network requests of their own.

| What they read | Why |
| --- | --- |
| The text of a pending file write, and the staged git diff | to stop a secret before it is written or committed |
| The file Claude just edited | to note values that look like hardcoded configuration |
| Claude's last reply in the session | to check that the decisions report is there |
| Output of `claude plugin list`, and `registry.json` | the daily check of installed plugins against the vetted list |
| Whether your user `CLAUDE.md` holds the Basekit block | to decide whether to add the house rules to the session |

What they store: small JSON state files in the plugin's own folder under
`~/.claude/plugins/data/`. They hold timestamps and counters, plugin ids, the
paths of repositories already given the setup hint, and per session: the names
of source files edited in the current turn, the config notes already shown
(file, rule and the flagged line of code), and which reviewers ran for the
current commit. Per-session files are removed after seven days. Uninstalling
the plugin removes the folder, unless you pass `--keep-data`.

A flagged line is kept as written, so a value hardcoded on that line sits in
the state file until the file is removed. The secret guard itself stores
nothing, and reports a found secret masked: its first four characters and its
length.

## Where your data does go

- **Your Claude Code session.** Skill text and hook messages (for example
  "possible secret at `config.ts:12`", with the value masked) become part of
  the session. Anthropic handles that under your own agreement with Anthropic,
  the same as everything else in the conversation.
- **Tools you already have.** The scripts call `git` and `claude plugin list`,
  and `gitleaks` if it is installed. Any network use by those tools is their
  own behaviour.
- **GitHub.** If you open an issue or a pull request here, GitHub's privacy
  statement applies to what you post.

`setup.js` runs `claude plugin` commands and, after asking, edits one marked
block in your user `CLAUDE.md`. It keeps a backup next to the file.

## Check it yourself

```
node plugins/basekit-guard/scripts/vet-plugin.js .
```

`SECURITY.md` lists every script with what it reads and writes.

## Changes and questions

Changes to this page are made in this repository, so the history is public.
Questions: open an issue at
https://github.com/waseemanjum-be/claude-basekit/issues
