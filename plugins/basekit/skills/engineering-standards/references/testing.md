# Tests that can fail

## What to write

- One behaviour per test, named for the behaviour: `rejects_expired_token`.
- Arrange, act, assert. The assertion is about an observable result: a return
  value, a state change, an emitted event, a call across a real boundary.
- For each change cover: the main path, invalid input, the boundary values,
  the failure of each dependency you call, and the permission check.
- A bug fix adds a test that fails before the fix and passes after. Show both
  runs when you can.
- Integration tests use the real database, queue or HTTP layer when the
  project makes that cheap (containers, in-memory engines). Mock at the edge of
  the system, not between your own modules.

## What a reviewer rejects

- No assertion, or an assertion that cannot be false (`expect(true)`,
  `assert result is not None` after constructing it).
- Asserting on a mock's return value that the test itself configured.
- Mocking the unit under test.
- Snapshot of a large object used as the only assertion.
- `sleep`, real clocks, random values or network without control. Inject the
  clock and the random source.
- Tests that pass alone and fail together, or the reverse: shared state.
- A try/catch in the test that swallows the failure.
- Skipped, focused or commented-out tests left behind (`.skip`, `.only`,
  `xit`, `@pytest.mark.skip` without a linked issue).
- Coverage reached by executing lines without checking results.
- Changing an assertion to match new behaviour without stating that the
  behaviour change is intended.

## Proving a test can fail

When a test's value is in doubt, break the code it covers (flip a condition,
return early) and run it. If it still passes, the test checks nothing. Restore
the code afterwards.

## Reporting

State the exact command, the counts (passed, failed, skipped) and the names of
any failures. "Tests should pass" is not a result. If the suite could not be
run, say why and what was checked instead.
