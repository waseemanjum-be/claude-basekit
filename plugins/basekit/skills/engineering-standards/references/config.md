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
3. It loads once at startup, reads only the keys it declares, by name,
   validates them, and exports an immutable object. It never copies or passes
   around the whole environment.
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
  API_BASE_URL: z.string().url(),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  PAYMENTS_RETRY_MAX: z.coerce.number().int().min(0).default(3),
  // z.coerce.boolean() would turn the string "false" into true.
  CHECKOUT_V2_ENABLED: z.enum(["true", "false"]).default("false").transform((v) => v === "true"),
});

type Source = Record<string, string | undefined>;

// The entry point calls this once with the runtime's variables. Taking them as
// an argument keeps the module testable and limits it to the keys named here.
export function loadConfig(source: Source) {
  const parsed = Schema.safeParse({
    API_BASE_URL: source.API_BASE_URL,
    REQUEST_TIMEOUT_MS: source.REQUEST_TIMEOUT_MS,
    PAYMENTS_RETRY_MAX: source.PAYMENTS_RETRY_MAX,
    CHECKOUT_V2_ENABLED: source.CHECKOUT_V2_ENABLED,
  });
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid configuration: ${problems.join("; ")}`);
  }
  return Object.freeze(parsed.data);
}
```

Python:

```python
# settings.py
from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(frozen=True)
    api_base_url: AnyUrl
    request_timeout_s: float = 10.0
    payments_retry_max: int = 3
    checkout_v2_enabled: bool = False

settings = Settings()  # reads only these fields; raises with every invalid one listed
```

Go: a struct populated once in `main`, validated, and passed down. No lookups
of runtime variables outside the config package.

## When the owner asks for something quick

Still no unexplained literals. A quick version is: add the key to the config
module with a default, use it, add the line to `.env.example`. That is three
small edits, and it is cheaper than the follow-up question.
