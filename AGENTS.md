# AGENTS.md

This repository is `kace`, a standalone port of Ace from the browser DOM to
Quark. Treat most of `src/` as Ace core code with Quark-specific platform
adaptations layered into renderer, input, events, scrolling, tooltips, and
autocomplete.

## Project Shape

- `index.tsx` is the small demo application entry point. It creates a Quark
  `Application`, `Window`, and `Text`, then calls `ace.edit(...)`.
- `src/ace.ts` is the public Ace-style entry point. Its `edit()` function
  accepts a Quark `Text` node and creates `EditSession`, `VirtualRenderer`, and
  `Editor`.
- `src/virtual_renderer.ts` is the main Quark renderer. It owns the editor
  container, gutter, scroller, content layers, cursor, markers, font metrics,
  and scroll driver.
- `src/lib/dom.ts` is the compatibility layer for Ace's old DOM helpers. Keep
  DOM-like helper behavior here instead of scattering ad hoc replacements.
- `src/keyboard/textinput.ts` adapts Ace text input to Quark `InputSink`,
  including command keys, clipboard access, and IME composition.
- `src/layer/`, `src/mouse/`, `src/autocomplete.ts`, and `src/tooltip.ts`
  contain many of the high-risk Quark porting changes.
- `build/` and `out/` contain generated or packaged artifacts. Do not edit them
  by hand unless the task is specifically about generated output.

## Working Rules

- Prefer existing Ace APIs and local Quark adapter patterns over introducing
  new abstractions.
- When changing platform behavior, first look for the nearest adapter:
  `src/lib/dom.ts`, `src/lib/event.ts`, `src/keyboard/textinput.ts`,
  `src/scrollbar.ts`, or `src/virtual_renderer.ts`.
- Avoid reintroducing browser globals such as `document`, `window`,
  `HTMLElement`, or `CSSStyleDeclaration` in runtime code. Tests and legacy
  browser-only fixtures may still contain them.
- Keep changes narrow. Ace has many modes, commands, and tests; broad refactors
  are easy to make but hard to validate in this port.
- Preserve IME behavior. Changes around `InputInsert`, `InputMarked`, and
  `InputUnmark` need manual checks with composition input when possible.
- Preserve editor measurement behavior. Font metrics, line height, character
  width, gutter width, and scroll positions are tightly coupled.
- Use ASCII for new files and edits unless the surrounding file already uses
  non-ASCII text or the change specifically requires it.

## Validation

Run this before handing off most code changes:

```sh
npx tsc --noEmit
```

There is currently no package script or non-empty Makefile. If you add a new
repeatable verification path, prefer wiring it into `package.json` scripts and
documenting it here.

For UI-facing changes, manually run the Quark demo from `index.tsx` using the
project's normal Quark app workflow, then check at least:

- editor creation and initial rendering
- typing plain ASCII text
- typing CJK or other IME-composed text
- selection and cursor movement
- copy, cut, and paste
- vertical and horizontal scrolling
- syntax mode changes such as `ace/mode/typescript`
- autocomplete or tooltip behavior if touched

## Notes For Future Porting

- Many old `.js` tests remain from upstream Ace and still assume a browser DOM.
  Do not assume they exercise the Quark runtime unchanged.
- Quark views use properties and events that only resemble DOM APIs. Prefer
  `View`, `Text`, `Label`, `Morph`, `Box`, `InputSink`, `Scroll`, and Quark
  event methods directly when editing runtime code.
- CSS is applied through Quark CSS helpers and generated theme modules. Keep
  class names compatible with Ace where possible because themes and token
  rendering depend on them.
- If a browser-specific Ace feature cannot be ported faithfully, leave a short
  comment explaining the Quark limitation and keep the public API behavior as
  close as practical.
