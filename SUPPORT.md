# Support

Basekit is maintained by one person in spare time. There is no paid support.

| You have | Go to |
| --- | --- |
| A bug, a false positive, a wrong registry verdict | [Open an issue](https://github.com/waseemanjum-be/claude-basekit/issues) |
| A security problem | Private report: **Security** tab, then **Report a vulnerability**. See `SECURITY.md` |
| A question about setup or settings | `README.md`, then an issue if it is not answered there |
| A change to propose | `CONTRIBUTING.md` |

## What to include in a bug report

- Output of `claude --version` and `node --version`, and your operating system
- Plugin versions: `claude plugin list`
- What you did, what you expected, what happened
- For a hook problem: the hook's message as shown in the session. Mask any
  secret first.

For a quick health check, run `/basekit-guard:status` in a session, or
`node tests/run-tests.js` from a clone of this repository.
