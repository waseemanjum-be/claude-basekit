---
name: init
description: Set up this repository with the Basekit baseline.
argument-hint: "[dry-run]"
disable-model-invocation: true
---

# /basekit:init

Arguments: `$ARGUMENTS`

Set this repository up so the standards apply here without the owner repeating
them. Never overwrite a file: merge, and show a diff for anything that exists.
With `dry-run`, stop after step 3.

Templates are in `${CLAUDE_SKILL_DIR}/templates/`.

## 1. Learn the project (read only)

- Languages and frameworks: `package.json`, `pyproject.toml`, `go.mod`,
  `Cargo.toml`, `pom.xml`, lockfiles, framework config.
- The real commands for install, dev, build, test, lint, type check, format
  and migrations. Take them from `package.json` scripts, `Makefile`,
  `justfile`, CI workflows or the README. Do not invent a command; if one is
  missing, record "none found".
- Layout: where backend, frontend, tests, config and migrations live.
- Existing conventions: the config module, error and logging helpers, test
  framework, component library and tokens (`components.json`, theme files).
- What is already there: `CLAUDE.md`, `AGENTS.md`, `.claude/`, `REVIEW.md`,
  `.env.example`, `.gitignore`, secret scanning in CI.

## 2. Check installed tools

Ask the owner which plugins are installed, or look at `/plugin` output if it
is already in the conversation. Work out what fits this project:

- the language-server plugin for each language found (TypeScript, Python, Go,
  Rust and others are in Anthropic's marketplace);
- for a UI project: a browser tool such as Playwright CLI, shadcn's own skill
  if `components.json` exists, Figma's plugin only if the owner uses Figma;
- `basekit-guard`, if it is not installed: it adds the secret guard, the
  review gate on commits and the vetted-plugin registry
  (`/basekit-guard:status` lists what the registry recommends).

## 3. Show the plan

List every file you would create or change, the stack plugins you recommend
with their install commands, and anything you could not determine. Wait for
the owner's go-ahead.

## 4. Write the baseline

1. **`CLAUDE.md`** from `templates/CLAUDE.md`. Fill every placeholder with
   facts from step 1. Delete sections that would be empty. Keep it under about
   80 lines: it is loaded in every session. If a `CLAUDE.md` exists, add only
   what is missing.
2. **`.claude/rules/`** from `templates/rules/`. Copy only the files that
   apply, and change each `paths:` list to this repository's real directories.
   These load only when Claude touches matching files, so they cost nothing
   elsewhere.
3. **`.claude/settings.json`**: merge in deny rules that keep real secret
   files out of Claude's reads. Adjust the paths to where this project keeps
   secrets, and keep every existing key:

   ```json
   {
     "permissions": {
       "deny": [
         "Read(./.env)",
         "Read(./.env.local)",
         "Read(./.env.production)",
         "Read(./.env.*.local)",
         "Read(./secrets/**)",
         "Read(./**/*.pem)",
         "Read(./**/*.key)"
       ]
     }
   }
   ```
4. **`REVIEW.md`** from `templates/REVIEW.md`, with the project's own
   priorities and paths to skip.
5. **`.env.example`**: create if the project reads environment variables and
   has none. Names and placeholders only, grouped, each with a comment.
6. **`.gitignore`**: make sure `.env`, `.env.*` (but not `.env.example`),
   `*.pem`, `*.key` and `.claude/settings.local.json` are ignored.

## 5. Offer, do not impose

- The stack plugins from step 2, as `claude plugin install <name>@<marketplace>
  --scope project` commands the owner can run or approve.
- A config module, if the project reads the environment in many places: point
  at the `engineering-standards` reference and offer it as a separate task.
- Secret scanning in CI (gitleaks) if absent: offer the workflow as a separate
  change.

## 6. Finish

List the files written, the commands recorded in `CLAUDE.md`, and what was left
for the owner to decide. Suggest `/basekit:review` after the next change to
confirm the setup behaves as expected.
