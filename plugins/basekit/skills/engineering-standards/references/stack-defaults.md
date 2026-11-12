# Default libraries per stack

Reviewed 2026-11-12. These are starting points for a new project. An existing
project's choices always win. Before using any of them, confirm the current
version and API from its documentation (context7 if installed): library
interfaces change faster than this file.

## TypeScript / Node

| Need | Default | Notes |
| --- | --- | --- |
| Config and validation | zod | one schema for env, one per boundary |
| HTTP server | the project's framework (Fastify, Hono, Express, Next.js routes) | do not add a second |
| HTTP client | built-in `fetch` with a timeout via `AbortSignal.timeout` | retries only for idempotent calls |
| Database | Drizzle or Prisma with migrations | raw SQL through parameterised queries |
| Logging | pino | structured JSON |
| Tests | Vitest; Playwright for end-to-end | |
| Lint and format | ESLint with typescript-eslint, Prettier or Biome | whichever the repo has |
| Jobs | BullMQ (Redis) or the platform's queue | |

## Python

| Need | Default | Notes |
| --- | --- | --- |
| Config | pydantic-settings | frozen settings object |
| Validation | pydantic | |
| HTTP server | FastAPI or the project's framework | |
| HTTP client | httpx with explicit timeouts; tenacity for retries | |
| Database | SQLAlchemy 2 with Alembic | |
| Logging | structlog or stdlib logging with JSON formatter | |
| Tests | pytest | fixtures over setup methods |
| Lint, format, types | ruff, and pyright or mypy | |
| Packaging | uv | lockfile committed |

## Go

| Need | Default | Notes |
| --- | --- | --- |
| Config | a typed struct loaded in `main` (envconfig or koanf) | |
| HTTP | net/http with chi or the stdlib mux | |
| Database | pgx with sqlc; golang-migrate or goose | |
| Logging | log/slog | |
| Tests | stdlib testing with testify where it helps | table-driven |
| Lint | golangci-lint | |

## Any stack

- Secrets scanning: gitleaks locally and in CI.
- Dependency audit in CI with the ecosystem's tool (`npm audit`, `pip-audit`,
  `govulncheck`).
- Containers: pinned base image digest, non-root user, no secrets in layers.
- CI runs lint, type check, tests and the secret scan on every pull request.
