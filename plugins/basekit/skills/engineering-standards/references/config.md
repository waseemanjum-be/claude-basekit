# Configuration in practice

## The test

Ask of every literal: could a different environment, deployment, customer or
date need a different value? If yes, it is configuration. If no, it stays, with
a `hardcoded: <reason>` comment when the reason is not obvious from the name.

Usually configuration: base URLs, hosts, ports, credentials, bucket and queue
names, timeouts, retry and backoff numbers, rate limits, page and batch sizes,
pool sizes, cache TTLs, cron expressions, thresholds, model names and
parameters, feature switches, log level, CORS origins, file locations, locale
and currency defaults, third-party account identifiers.

Usually not configuration: protocol and format constants (HTTP status codes,
header names, MIME types), mathematical constants, enum members, schema field
names, values fixed by a specification, test data inside tests.

## Shape

1. One module owns configuration: `config.ts`, `settings.py`, `config.go`.
2. It declares a schema with types, defaults and required keys.
3. It loads once at startup from the environment (and a file if the project
   uses one), validates, and exports an immutable object.
4. Invalid or missing required config stops startup with one message listing
   every problem, not the first one.
5. Everything else receives config by import or injection. Nothing else reads
   the environment.
6. Secrets are config keys too, but they are never logged and never given a
   default.

## Layers, lowest to highest precedence

defaults in code -> config file checked into the repo (non-secret) ->
environment variables -> runtime flags from a flag service (if the project has
one). Document the precedence where the config module lives.

## Feature flags

- Name says what turning it on does: `checkout_v2_enabled`, not `flag_17`.
- Default is the safe, existing behaviour.
- Record an owner and a removal condition when adding it.
- Both sides of the flag are tested until the flag is removed.
- Remove the flag and the dead branch when the rollout completes.

## Per-language sketches

TypeScript:

```ts
// config.ts
import { z } from "zod";

const Schema = z.object({
  DATABASE_URL: z.string().url(),
  HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  PAYMENTS_RETRY_MAX: z.coerce.number().int().min(0).default(3),
  CHECKOUT_V2_ENABLED: z.coerce.boolean().default(false),
});

const parsed = Schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid configuration: ${parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
}
export const config = Object.freeze(parsed.data);
```

Python:

```python
# settings.py
from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", frozen=True)
    database_url: PostgresDsn
    http_timeout_s: float = 10.0
    payments_retry_max: int = 3
    checkout_v2_enabled: bool = False

settings = Settings()  # raises with every invalid field listed
```

Go: a struct populated once in `main`, validated, and passed down. No package
level `os.Getenv` calls outside the config package.

## When the owner asks for something quick

Still no unexplained literals. A quick version is: add the key to the config
module with a default, use it, add the line to `.env.example`. That is three
small edits, and it is cheaper than the follow-up question.
