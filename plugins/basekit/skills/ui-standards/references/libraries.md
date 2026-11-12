# Default UI libraries

Reviewed 2026-11-12. For new React projects. The project's existing choice
always wins, and other frameworks have their own equivalents. Confirm the
current version and API from documentation before use.

| Need | Default | Use instead of |
| --- | --- | --- |
| Component set | shadcn/ui on Tailwind, added through its CLI | hand-written buttons, dialogs, menus |
| Behaviour primitives | Radix or Base UI; React Aria for strict accessibility needs | custom focus and dismissal logic |
| Icons | lucide-react | inline SVG copies |
| Forms | React Hook Form with a zod resolver, or TanStack Form | manual state and validation |
| Server data | TanStack Query, or the framework's loader/server components | `useEffect` plus `fetch` |
| Tables | TanStack Table; add TanStack Virtual for long lists | custom sort, filter, paginate |
| Charts | Recharts for standard charts; visx or ECharts for unusual ones | drawing SVG by hand |
| Dates | date-fns or Day.js; react-day-picker for pickers | manual date math |
| Animation | Motion; CSS transitions for simple cases | hand-tuned keyframes for layout |
| Drag and drop | dnd-kit | pointer event handlers |
| Toasts | Sonner | custom portals |
| Command palette | cmdk | custom fuzzy lists |
| Rich text | Tiptap or Lexical | contenteditable |
| Maps | MapLibre GL | embedding screenshots |
| Class merging | clsx with tailwind-merge | string concatenation |
| Schema validation | zod, shared with the server | duplicated rules |
| Component tests | Vitest with Testing Library | |
| End-to-end and visual | Playwright | manual clicking |

## Tools Claude can use for UI work

- `frontend-design` skill (Anthropic): design direction.
- shadcn skill (`npx skills add shadcn/ui`): project-aware component adds.
- context7: current docs for any library above.
- Playwright CLI or the Playwright plugin: open, click, screenshot.
- Figma plugin: read frames, components and tokens when designs are in Figma.
- TypeScript language server plugin: type errors after each edit.

## Other frameworks

Vue: shadcn-vue or the project's kit, VeeValidate or FormKit, TanStack Query
for Vue, Pinia. Svelte: shadcn-svelte or Skeleton, Superforms, TanStack Query
for Svelte. React Native: the platform kit the project uses, React Hook Form,
TanStack Query, Reanimated. The ladder is the same in every framework.
