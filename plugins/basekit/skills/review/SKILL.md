---
name: review
description: Review current changes with the code, test and security specialists and merge the results.
argument-hint: "[scope: staged | <base-branch> | <path> | pr <number>] [quick] [fix]"
disable-model-invocation: true
---

# /basekit:review

Review scope and options from the user: `$ARGUMENTS`

## 1. Fix the scope

- No scope given: uncommitted changes plus commits on this branch that are not
  on the default branch. Find the default branch with
  `git symbolic-ref --short refs/remotes/origin/HEAD` and fall back to `main`.
- `staged`: only `git diff --staged`.
- A branch name: `git diff <branch>...HEAD`.
- A path: those files as they are now.
- `pr <number>`: `gh pr diff <number>` if the GitHub CLI is available.

State the scope in one line. If the diff is empty, say so and stop.

## 2. Run the specialists in parallel

Start these three subagents in one message so they run at the same time, each
with the exact scope from step 1 and the list of changed files:

- `basekit:code-reviewer`
- `basekit:test-auditor`
- `basekit:security-auditor`

With `quick`: run only `basekit:code-reviewer`, and ask it to include its
brief test and security passes.

Skip `test-auditor` when the scope contains no code or test files. Skip
`security-auditor` only when the scope is documentation alone.

## 3. Merge

- Drop duplicates; when two specialists report the same line, keep the more
  specific finding and note both sources.
- Re-check any finding marked unconfirmed or needs confirmation by opening the
  code yourself. Keep it only if you can say what would confirm it.
- Order by severity across all three.

## 4. Report

```
Review of <scope>
Verdict: BLOCK | FIX BEFORE MERGE | OK WITH NOTES | OK

Must fix
1. [SEVERITY] file:line  title  (code | tests | security)
   What / Why / Fix

Should fix
...

Debt register
- ...

Tests: <suite command and result from the auditor>
Checked by: code-reviewer, test-auditor, security-auditor
Not covered: <merged list>
```

Keep it to what the owner must decide or do. No summary of the diff.

## 5. Afterwards

- With `fix` in the arguments: apply the "Must fix" items one at a time,
  smallest change each, re-run the relevant check after each, then list what
  changed. Do not touch "Should fix" or debt items without being asked.
- Without `fix`: stop after the report and ask which items to fix.
- For a second opinion on a large or risky change, mention Claude Code's own
  `/code-review` (and `/code-review ultra` for the cloud multi-agent version).
