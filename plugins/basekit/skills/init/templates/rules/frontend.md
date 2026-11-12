---
paths:
  - "src/components/**"
  - "src/app/**"
  - "src/pages/**"
  - "**/*.tsx"
  - "**/*.vue"
  - "**/*.svelte"
---

# Frontend rules for this repository

Apply the `ui-standards` skill here. Project specifics:

- Component library: {{COMPONENT_LIBRARY}}. Add components with
  `{{ADD_COMPONENT_COMMAND}}`; compose existing ones before creating new ones.
- Shared components live in `{{COMPONENTS_DIR}}`. Search there first.
- Tokens: `{{TOKENS_FILE}}`. No raw colour, spacing, radius or z-index values.
- Data fetching: {{DATA_LAYER}}. No `useEffect` plus `fetch`.
- Forms: {{FORM_LIBRARY}} with a schema.
- Every new component covers loading, empty, error and disabled states and
  works by keyboard.
- Check the result in a browser at phone and desktop widths before reporting.
