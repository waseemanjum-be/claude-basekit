# Contributing

Issues and pull requests are welcome. Keep changes small and say what problem
they solve.

## Before you open a pull request

```
node tests/run-tests.js
claude plugin validate .
claude plugin validate plugins/basekit
node plugins/basekit/scripts/vet-plugin.js . --strict
```

CI runs the same checks on Linux, macOS and Windows.

## Changing a verdict in the registry

`plugins/basekit/registry.json` and `docs/VETTING.md` make claims about other
people's projects, so each change needs evidence:

- link the file, line, release note or issue that supports it;
- record the repository, not just the plugin name (names are reused across
  marketplaces);
- give the always-on token figure from
  `claude --plugin-dir <dir> plugin details <name>` when the tool is a plugin;
- state what you did not check;
- update the `reviewed` date and the matching section of `docs/VETTING.md`.

If you maintain a listed project and a statement is wrong or out of date, an
issue with a link is enough.

## Changing rules, skills or agents

- Skill and agent descriptions are loaded in every session. Keep them short and
  check the cost with `claude --plugin-dir plugins/basekit plugin details basekit`.
- A rule should be checkable. "Timeouts come from the config module" can be
  reviewed; "write clean code" cannot.
- Quote any frontmatter value that contains a colon.

## Changing the scripts

- No dependencies. Node 18 or later.
- A hook must never block a session because it crashed: exit 0 on unexpected
  errors.
- Never print a secret value. Mask it.
- New behaviour comes with a test in `tests/run-tests.js`.
- Defaults live in `plugins/basekit/config.defaults.json`. A literal that stays
  in code gets a `hardcoded: <reason>` comment.

## Releases

Users who install from the marketplace stay on the version in
`plugins/basekit/.claude-plugin/plugin.json` until it changes. Bump it when you
want them to receive an update.
