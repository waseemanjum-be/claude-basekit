# {{PROJECT_NAME}}

{{ONE_SENTENCE_WHAT_THIS_IS}}

## Commands

| Task | Command |
| --- | --- |
| Install | `{{INSTALL}}` |
| Run locally | `{{DEV}}` |
| Test (all) | `{{TEST}}` |
| Test (one file) | `{{TEST_ONE}}` |
| Lint | `{{LINT}}` |
| Type check | `{{TYPECHECK}}` |
| Format | `{{FORMAT}}` |
| Migrate | `{{MIGRATE}}` |

Run lint, type check and the relevant tests before saying a change is done.

## Layout

- `{{BACKEND_DIR}}`: {{WHAT}}
- `{{FRONTEND_DIR}}`: {{WHAT}}
- `{{TESTS_DIR}}`: {{WHAT}}
- Configuration lives in `{{CONFIG_MODULE}}`. Nothing else reads the environment.
- Migrations live in `{{MIGRATIONS_DIR}}`.

## Conventions in this repository

- Errors: {{HOW_ERRORS_ARE_RAISED_AND_HANDLED}}
- Logging: {{LOGGER_AND_FORMAT}}
- Data access: {{ORM_OR_QUERY_LAYER}}
- UI: {{COMPONENT_LIBRARY}}, tokens in `{{TOKENS_FILE}}`, data layer {{DATA_LAYER}}
- Tests: {{FRAMEWORK}}, {{WHERE_FIXTURES_LIVE}}, {{REAL_DB_OR_MOCKED}}

## Project rules beyond the house standards

- {{RULE_SPECIFIC_TO_THIS_PROJECT}}

## Do not touch without asking

- {{GENERATED_VENDORED_OR_SENSITIVE_PATHS}}

## Compact instructions

When compacting, keep: the task and its acceptance criteria, files changed and
why, commands run with their results, open findings from reviews, and the
current "Decisions and deviations" list.
