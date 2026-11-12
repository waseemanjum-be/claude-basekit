---
name: engineering-standards
description: "House rules for backend, API, data, CLI and shared code: configuration over literals, secrets, error handling, tests, dependencies. Use before implementing, refactoring or fixing code."
user-invocable: false
---

# Engineering standards

These are the owner's standing rules. Apply them without being asked. Where the
repository already has a convention, follow the repository and say so.

The owner should never have to ask "why is this hardcoded?" or "why can't I
configure this?". Either it is configurable, or the reason is written down
before they ask.

## 1. Configuration, not literals

A value belongs in configuration if it can differ by environment, deployment,
customer, or over time. That covers URLs, hosts, ports, credentials, timeouts,
retry counts, limits, page sizes, pool sizes, thresholds, schedules, file
locations, model names, feature switches and third-party identifiers.

- One typed config module per service. Load and validate at startup. Fail fast
  with a message naming the missing or invalid key.
- Code reads config through that module. No environment lookups scattered
  through the code, and the module reads only the keys it declares.
- Every key has a documented default or is marked required. Update
  `.env.example` and the config docs in the same change.
- A literal that should stay in code gets a comment on or above the line:
  `hardcoded: <reason>` (a protocol constant, a mathematical fact, a value the
  spec fixes). No comment means it is a defect.
- Behaviour an operator may need to turn off, or a risky new path, sits behind
  a flag with a stated default and removal condition.

Details and per-language patterns: [references/config.md](references/config.md)

## 2. Secrets

Never in source, tests, fixtures, logs, error messages, commits or client
bundles. Read by name from the environment or secret manager. `.env.example`
holds names and placeholders only. If a real credential shows up anywhere, stop
and tell the owner it must be rotated.

## 3. Boundaries validate, the core trusts

Parse and validate everything that crosses a boundary (HTTP input, queue
messages, files, env, third-party responses) with a schema at the edge. Past
the edge, rely on types. Authorise every operation on the server, per resource.
Parameterised queries only.

## 4. Failure is designed

- No empty `catch`, no swallowed errors, no fallback value that hides a failure.
- Errors carry context (what was attempted, with which identifiers) and a type
  the caller can branch on.
- Every network or IO call has a timeout, bounded retries with backoff where
  the operation is idempotent, and a decision about what happens when it fails.
- Multi-step writes that must agree run in a transaction or are idempotent and
  resumable.

## 5. Data changes are migrations

Schema changes ship as migrations, reversible where the engine allows. List
endpoints paginate. New query patterns get an index or a note on why not. No
query inside a loop over rows.

## 6. Observable by default

Structured logs with a correlation id at request and job boundaries. No
secrets or personal data in logs. New critical paths get a metric or an
explicit log event someone can alert on.

## 7. Tests prove behaviour

- A bug fix starts with a test that fails for the right reason.
- Cover the unhappy paths: invalid input, timeouts, empty and boundary values,
  permission denied.
- A test must be able to fail. No assertion-free tests, no asserting on a mock
  you just configured, no sleeps, no dependence on wall-clock, order or network
  unless that is the thing under test.
- Run the suite and report the command and result. Never claim a pass you did
  not see.

More: [references/testing.md](references/testing.md)

## 8. Reuse before writing

Search the repository for an existing helper first. For solved problems (auth,
crypto, validation, dates, retries, parsing, queues) use a maintained library,
and confirm its current API from documentation (context7 if installed) instead
of memory. Never hand-roll crypto or auth. New dependency: check it is
maintained, the licence fits, and pin it through the lockfile.

Default libraries per stack: [references/stack-defaults.md](references/stack-defaults.md)

## 9. Small, honest changes

Smallest diff that does the job. No drive-by refactors. No speculative
abstraction; extract on the third use. Delete dead code. No TODO without an
owner or issue. Docs, `.env.example`, migrations and tests change in the same
commit as the behaviour.

## 10. Report decisions before being asked

End every implementation task with this block. Omit a line only when it is
truly empty.

```
Decisions and deviations
- Config added: <key = default, where documented>
- Kept hardcoded: <value, file:line, reason>
- Not configurable: <behaviour, why, what it would take>
- Trade-offs: <what was chosen over what, and why>
- Debt introduced: <shortcut, risk, suggested follow-up>
- Verified: <commands run and their results>
- Not verified: <what could not be run or checked>
```

More on API, data and concurrency rules: [references/backend.md](references/backend.md)
