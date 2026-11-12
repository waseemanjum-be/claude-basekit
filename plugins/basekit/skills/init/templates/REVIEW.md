# Review guide

Read by Claude's code review and by the Basekit reviewers.

## Always flag

- A secret, token or key in any file, test, log line or commit.
- A literal URL, timeout, limit, threshold, model name or feature switch
  outside `{{CONFIG_MODULE}}` without a `hardcoded: <reason>` comment.
- Behaviour an operator cannot change that they plausibly need to.
- Swallowed errors, fallback values that hide failure, calls without a timeout.
- A schema change without a migration; a new query pattern without an index.
- Changed behaviour with no test, or a test that cannot fail.
- A hand-written UI widget where {{COMPONENT_LIBRARY}} has one.
- {{PROJECT_SPECIFIC_MUST_FLAG}}

## Do not flag

- Formatting and import order (the formatter owns these).
- {{PATTERNS_THAT_LOOK_WRONG_BUT_ARE_INTENDED}}

## Skip

- `{{GENERATED_OR_VENDORED_PATHS}}`

## Severity in this project

- Blocker: data loss, auth or tenant isolation, a live secret, a broken
  migration.
- High: wrong result in a realistic case, a missing permission check.
- Medium: will cause rework or an incident under load.
- Low: cheap to fix, worth fixing.
