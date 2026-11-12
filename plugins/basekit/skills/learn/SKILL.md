---
name: learn
description: Turn this session's corrections into standing rules.
argument-hint: "[what to capture, optional]"
disable-model-invocation: true
---

# /basekit:learn

Focus, if given: `$ARGUMENTS`

## 1. Find what the owner had to tell you

Go through this conversation and list each time the owner:

- corrected a decision ("why is this hardcoded", "use the existing component",
  "don't mock that");
- repeated an instruction they had given before;
- rejected or reverted your work, and why;
- stated a preference, convention or constraint you did not know;
- asked a question whose answer should have been in your final report.

Ignore one-off task details. Keep what would apply again.

## 2. Draft a rule for each

One or two sentences: the rule, then the reason. Concrete enough to check.
"Timeouts and retry counts come from `config.ts`; a literal in a service file
is a defect, because ops tunes them per environment." Not "follow best
practices".

## 3. Choose where each rule lives

| The rule is about | Put it in |
| --- | --- |
| This repository only | the project `CLAUDE.md`, or a path-scoped file in `.claude/rules/` when it applies to one area |
| All the owner's projects, any stack | the owner's `~/.claude/CLAUDE.md`, under "My additions", below the managed Basekit block (never inside the block: setup rewrites it) |
| A general engineering or UI standard worth keeping in the kit | the relevant skill under `${CLAUDE_PLUGIN_ROOT}/skills/`, if that folder is the owner's kit repository and not the plugin cache |
| Something a script can enforce every time | a hook: say so, and propose it instead of a sentence |

Before adding, read the target file. If the rule is already there, the problem
is that it was not followed: tighten the wording or propose a hook instead of
adding a duplicate. If two rules conflict, show both and ask.

## 4. Show, then write

Present every proposed change as a diff, grouped by file. Apply only the ones
the owner approves.

## 5. Keep the files lean

If a `CLAUDE.md` passes roughly 200 lines, propose moving detail into a skill
or a `.claude/rules/` file: everything in `CLAUDE.md` is paid for in every
session.
