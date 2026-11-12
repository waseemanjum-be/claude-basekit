# Backend rules in more depth

## APIs

- Validate request bodies, params and headers with a schema; reject unknown
  fields where the framework allows it.
- Consistent error shape with a stable machine-readable code. Never leak stack
  traces, SQL or internal identifiers to clients.
- List endpoints paginate and cap page size from config.
- Mutations that clients may retry accept an idempotency key or are naturally
  idempotent.
- Authentication proves who; authorisation is checked per resource on every
  request, on the server. An id in the URL is not permission.
- Version breaking changes. Do not change the meaning of an existing field.
- Rate limits and body size limits come from config.

## Data

- Migrations are forward-only in production unless a down migration is tested.
  Destructive changes go in two steps: stop using, then drop.
- Wrap invariants that span statements in a transaction. Know the isolation
  level you rely on.
- Avoid N+1: fetch in sets, join, or batch.
- Add the index a new query needs, in the same change.
- Store time in UTC. Store money as integer minor units or a decimal type,
  never a float.
- Never build SQL by string concatenation with input.

## Concurrency and background work

- Jobs are idempotent and safe to run twice. Assume at-least-once delivery.
- Every job has a timeout, a retry policy with backoff and a dead-letter path.
- No unbounded queues, fan-out or in-memory growth. Bounds come from config.
- Shared mutable state needs a lock, a transaction or a single owner. Say
  which.
- Shut down gracefully: stop accepting work, finish or requeue what is in
  flight, within a configured deadline.

## Calling other services

- Timeout on every call. Retries only for idempotent operations, with backoff
  and jitter, capped by config.
- Treat responses as untrusted input: validate before use.
- Decide the degraded behaviour and write it down: fail the request, serve
  stale, queue for later. Do not invent a default value that looks like success.
- A circuit breaker or bulkhead where one slow dependency could exhaust the
  service.

## Security floor

- Secrets by reference only. Least privilege for every credential and role.
- Hash passwords with the framework's vetted function. Never write your own
  crypto, token format or session scheme.
- Encode output for its context (HTML, SQL, command line, URL). Never pass
  input to a command interpreter, dynamic code evaluation, a template or a
  deserialiser without a safe API.
- Validate redirect targets and outbound URLs against an allowlist (SSRF).
- File uploads: check type and size, store outside the web root, generate the
  name.
- Dependencies come from the default registry through the lockfile. Never add
  an alternate index or registry URL without the owner's explicit approval.

## Logging and metrics

- Structured, levelled, with correlation ids. One event per meaningful step,
  not per line of code.
- Never log secrets, tokens, full request bodies or personal data.
- Errors log once, where they are handled, with the context needed to act.
