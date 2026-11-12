# Security

## Reporting a problem

Use GitHub's private vulnerability reporting for this repository: the
**Security** tab, then **Report a vulnerability**. Please do not open a public
issue for something that could put users at risk.

Worth reporting:

- a way to make the secret guard, config lint or session scan run code, write
  outside their data directory, or leak the content they inspect;
- a hook input that crashes a script in a way that blocks a session;
- a credential format the secret guard should block and does not (a public
  issue is fine for this one, with a fake example);
- anything in the skills or agents that could be used to steer Claude against
  the person who installed the kit.

## What this kit runs on your machine

The `basekit` plugin is instructions only: skills and agents. The `basekit-guard`
plugin runs six Node scripts as Claude Code hooks, with no dependencies and no
network requests of their own:

| Hook | Script | Reads | Writes |
| --- | --- | --- | --- |
| SessionStart | `scripts/session-rules.js` | whether your user `CLAUDE.md` has the Basekit block, whether the repository has a `CLAUDE.md` | a list of repositories already hinted, in the data directory |
| SessionStart | `scripts/session-scan.js` | output of `claude plugin list`, `registry.json` | a state file in the data directory |
| PreToolUse | `scripts/secret-guard.js` | the text of the pending write, or the staged diff | nothing |
| PreToolUse, SubagentStop | `scripts/review-gate.js` | the staged diff, the name of a finished reviewer | a per-session state file in the data directory |
| PostToolUse | `scripts/config-lint.js` | the file that was just edited | the same per-session state file |
| Stop | `scripts/report-check.js` | Claude's last reply | the same per-session state file |

The data directory is the plugin's own folder under `~/.claude/plugins/data/`.
Session state files are removed after seven days.

`setup.js` runs only `claude plugin` commands and edits one marked block in
your user `CLAUDE.md`, after asking. Nothing here pipes a download to a shell.

Before installing, you can check all of that yourself:

```
node plugins/basekit-guard/scripts/vet-plugin.js .
claude --plugin-dir plugins/basekit plugin details basekit
claude --plugin-dir plugins/basekit-guard plugin details basekit-guard
```

## What it does not protect you from

The guards are pattern matchers that fail open. They catch common mistakes and
miss others. Run a secret scanner such as gitleaks in CI, and review any
third-party plugin's source yourself before installing it, whatever the
registry here says about it.
