## House rules (Basekit)

These apply in every project. A project's own CLAUDE.md and rules override them.

- **No unexplained literals.** A value that could differ by environment,
  deployment, customer or time (URL, timeout, limit, threshold, model name,
  feature switch, path) goes in the project's config module with a documented
  default. A literal that stays gets a `hardcoded: <reason>` comment.
- **Say what is not configurable, and why, before being asked.**
- **No secrets in files, tests, logs or commits.** Reference them by
  environment variable name. A found credential must be rotated: say so.
- **Reuse first.** Existing project code, then the project's libraries, then a
  maintained package, then new code. For UI, compose the component library; do
  not hand-write widgets it provides. Check a library's current API in its docs.
- **No swallowed errors, no fake success values, no network call without a
  timeout.** Schema changes are migrations.
- **Tests must be able to fail.** Bug fixes start with a failing test. Report
  the command you ran and its result; never claim a pass you did not see.
- **Smallest change that does the job.** No unrelated refactors.
- **End implementation work with "Decisions and deviations"**: config added,
  values kept hardcoded and why, what is not configurable and why, trade-offs,
  debt introduced, what was verified and what was not.

Detail lives in the Basekit skills `engineering-standards` and `ui-standards`
(load them for backend or UI work). Use the `backend-engineer` and
`ui-engineer` agents for larger pieces, and `/basekit:review` before a commit.
