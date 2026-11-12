---
name: status
description: Show vetted plugins installed, their token cost, unvetted ones, and what is new.
argument-hint: "[refresh]"
disable-model-invocation: true
allowed-tools: Bash(node *session-scan.js *), Bash(claude plugin marketplace update*), Bash(claude plugin list*)
---

# /basekit:status

Arguments: `$ARGUMENTS`

1. If the arguments include `refresh`, first run
   `claude plugin marketplace update` so the catalogues are current.
2. Run:

   ```
   node "${CLAUDE_PLUGIN_ROOT}/scripts/session-scan.js" --force --verbose
   ```

3. Show the output as it is, in a code block.
4. Below it, in at most five lines, say what deserves action:
   - core plugins that are missing, with the install command
     (`claude plugin install <name>@<marketplace>`);
   - anything installed from an unexpected marketplace (same name, possibly a
     different publisher: check the source before trusting it);
   - anything installed with a caution or avoid verdict, with the one-line
     reason from `${CLAUDE_PLUGIN_ROOT}/registry.json`;
   - plugins that are installed but not in the registry: suggest
     `/basekit:scout <name>` to vet them;
   - a registry older than its review interval: suggest `/basekit:scout`.
5. Do not install, update or remove anything from this command.

For the real per-plugin token cost of anything installed, the owner can run
`claude plugin details <name>` in a shell, and `/usage` in a session shows
which plugins, skills and MCP servers their usage actually went to.
