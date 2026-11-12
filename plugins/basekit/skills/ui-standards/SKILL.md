---
name: ui-standards
description: "House rules for UI work: reuse existing components and libraries before writing any, cover every state, accessibility, responsiveness. Use before writing UI code."
user-invocable: false
---

# UI standards

Do not write from scratch what the project, its component library or a
maintained package already provides. Hand-written dropdowns, modals, date
pickers, tables and form validation are defects unless the reason is stated.

## 1. The reuse ladder

Stop at the first rung that fits, and say which rung you used.

1. **The project.** Search for an existing component, hook, token or pattern.
   Read `components.json`, the design-system package, `tailwind.config`, theme
   files and a neighbouring page before creating anything.
2. **The project's component library**, through its own tooling. With
   shadcn/ui, add components with the CLI (`npx shadcn@latest add <name>`) and
   compose them; never paste a lookalike. With MUI, Mantine, Chakra, Ant or a
   company system, use its components and theme API.
3. **Headless primitives** for behaviour (focus traps, roving tabindex,
   dismissal, positioning): Radix, Base UI, React Aria, Headless UI, Ark.
4. **A purpose-built library** for the hard widgets. Defaults:
   [references/libraries.md](references/libraries.md)
5. **Custom code**, only when nothing above fits. State why in the report, and
   build it on a headless primitive where one exists.

Confirm the current API of any library from its documentation (context7 if
installed) before using it. Check bundle cost before adding a dependency, and
never add a second library for a job the project already has one for.

## 2. Design direction

For new screens or a visual rework, load the `frontend-design` skill if it is
installed and settle direction (type, colour, spacing, density) before writing
components. Reuse the project's tokens; add a token instead of a one-off value.

## 3. Every component handles every state

Loading, empty, error, partial, success, disabled, read-only, long content,
missing optional data, slow network, and permission denied. Destructive
actions confirm or can be undone. Async actions show progress and prevent
double submission.

## 4. Accessibility is part of done

- Semantic elements first; ARIA only to fill gaps.
- Everything works by keyboard, with a visible focus state and a sensible
  order. Focus moves into and returns from overlays.
- Inputs have labels, errors are tied to their field and announced.
- Text contrast meets WCAG AA. Meaning never depends on colour alone.
- Honour reduced-motion. Hit targets are at least 24 by 24 CSS pixels.
- Images have alt text or are marked decorative.

## 5. Responsive and resilient

Design from the narrowest supported width up. No fixed pixel layouts, no
horizontal scroll at phone width, text wraps or truncates deliberately, and
layouts survive long words, long names and right-to-left text.

## 6. No magic values

Colours, spacing, radii, shadows, z-index, breakpoints, durations and copy
that will be translated come from tokens, theme or the i18n catalogue. API base
URLs, feature switches and limits come from config (see the
`engineering-standards` skill). A one-off value needs a `hardcoded: <reason>`
comment.

## 7. Data and forms

Fetch through the project's data layer (TanStack Query, SWR, RTK Query, server
components) with caching, cancellation and error handling. Validate forms with
a schema shared with the server where possible. Never trust the client for
authorisation.

## 8. Verify in a browser

Run the app and look at it. Use Playwright CLI, the Playwright plugin or
Claude's Chrome integration to open the page, exercise the flow at phone and
desktop widths, check the console for errors, and capture a screenshot. Report
what was checked. If nothing could be run, say so.

## 9. Report

End with the "Decisions and deviations" block from `engineering-standards`,
plus:

```
- Reuse: <existing components and libraries used, ladder rung>
- Written from scratch: <what, and why nothing existing fit>
- States covered: <list>   Not covered: <list>
- Checked in browser: <widths, flows, screenshot path>
```
