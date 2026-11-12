# Basekit Guard

Hooks that make the Basekit standards automatic, plus a registry of vetted
third-party tools with a daily check against it. Depends on the `basekit`
plugin, which holds the standards skills and the reviewer agents.

Install inside a Claude Code session (this also installs `basekit`):

```
/plugin marketplace add waseemanjum-be/claude-basekit
/plugin install basekit-guard@basekit-marketplace
```

## What runs, and when

| Hook | When | What it does |
| --- | --- | --- |
| Session rules | Session start, and after clear or compact | Supplies the house rules when your user `CLAUDE.md` has no Basekit block |
| Session scan | Session start, at most once a day | Compares installed and available plugins with `registry.json` |
| Secret guard | Before every write, and before `git commit` | Blocks credential-shaped strings |
| Review gate | Before `git commit` | Stops a code commit until the reviewers have run in the session |
| Edit notes | After every edit | Notes literals that look like configuration; names the matching standards skill once |
| Report check | When Claude finishes a turn | Sends Claude back once if a turn added code and the reply has no decisions report |

Commands: `/basekit-guard:status` (what is installed, what it costs, what is
new) and `/basekit-guard:scout` (find and vet new tools from their source).

## What the scripts touch

Seven Node scripts with no dependencies and no network requests of their own.
They read hook input, the staged diff and the file just edited, and write
small state files in the plugin's data directory. Nothing is installed,
updated or sent anywhere. The repository's `SECURITY.md` lists each one.

To inspect before installing:

```
node scripts/vet-plugin.js .
claude --plugin-dir . plugin details basekit-guard
```

## Settings

Defaults are in `config.defaults.json`. Override any key with an environment
variable `BASEKIT_<KEY>`, for example in the `env` block of a Claude Code
settings file:

```json
{ "env": { "BASEKIT_REVIEW_ON_COMMIT": "remind", "BASEKIT_SECRET_GUARD": "warn" } }
```

## Requirements

Node 18 or later on PATH. `gitleaks` is optional; the commit guard uses it
when present.

## Why this is a separate plugin

Anthropic's plugin directory holds plugins that run hook commands or ship
scripts for review unless the publisher is a Verified organization. Keeping
the instructions in `basekit` and the hooks here lets `basekit` be listed in
the directory while this plugin is installed from the repository's own
marketplace.
