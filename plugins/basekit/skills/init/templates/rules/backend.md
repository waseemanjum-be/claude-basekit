---
paths:
  - "src/server/**"
  - "src/api/**"
  - "services/**"
  - "app/**/*.py"
---

# Backend rules for this repository

Apply the `engineering-standards` skill here. Project specifics:

- Config module: `{{CONFIG_MODULE}}`. Add keys there with a default and a line
  in `.env.example`. No environment lookups elsewhere.
- A literal that could vary by environment, customer or time is a defect unless
  it carries a `hardcoded: <reason>` comment.
- Errors: {{PROJECT_ERROR_PATTERN}}. No bare catch, no silent fallback.
- Outbound calls: timeout from config, retries only when idempotent.
- Schema changes: a migration in `{{MIGRATIONS_DIR}}`, in the same change.
- End with the "Decisions and deviations" block.
