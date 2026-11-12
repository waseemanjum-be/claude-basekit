---
paths:
  - "tests/**"
  - "**/*.test.*"
  - "**/*.spec.*"
  - "**/test_*.py"
  - "**/*_test.go"
---

# Test rules for this repository

- Framework: {{TEST_FRAMEWORK}}. Run one file with `{{TEST_ONE}}`.
- A test must be able to fail: assert on observable results, not on values the
  test configured on a mock.
- Cover invalid input, boundaries, dependency failure and permission denied for
  each changed behaviour.
- No sleeps, real clocks, randomness or network without control. Use
  {{CLOCK_AND_FIXTURE_HELPERS}}.
- No `.only`, `.skip` or commented-out tests left behind without a linked issue.
- A bug fix includes a test that failed before the fix.
- Report the command you ran and the counts.
