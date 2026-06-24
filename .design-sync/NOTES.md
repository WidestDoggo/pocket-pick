# Design Sync — Repo Notes

## Project
- **projectId**: `0f4154d0-5338-489a-bd07-f0407a7c993e`  ("Pocket Pick UI" on claude.ai/design)
- **pkg**: `lol-draft-companion-frontend`
- **globalName**: `window.PocketPickUI`

## JS-only, no TypeScript, no dist

This repo has no `.d.ts` files and no `dist/` directory. The converter needs two workarounds:

1. **`--entry frontend/src/index.js`** — points the bundler at the barrel export instead of a package `dist/`. Without this the converter throws `ENOENT` looking for the package in `node_modules/`.
2. **`componentSrcMap`** in config — without `.d.ts` files, zero PascalCase exports are discovered. The `componentSrcMap` explicitly maps each component name to its source file relative to `frontend/` (the PKG_DIR, from `package.json` location).

**PKG_DIR = `frontend/`** (not `frontend/src/`) — always resolved from the nearest `package.json` up from the entry point. Config paths like `cssEntry` and `componentSrcMap` values are relative to PKG_DIR.

## Build command

```
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules frontend/node_modules --entry frontend/src/index.js --out ./ds-bundle
```

## Re-sync command

```
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules frontend/node_modules --entry frontend/src/index.js --out ./ds-bundle
```

## ProfilePanel — collapsible by default

`ProfilePanel` starts with `useState(false)` internally — it renders as a collapsed header strip. Previews use an `AutoOpen` wrapper that clicks `.profile-toggle` via `useEffect` to force-open it. See `.design-sync/previews/ProfilePanel.tsx`.

There is no `defaultOpen` prop — if one is added later, simplify the previews to just pass `defaultOpen={true}`.

## ChampionSelectModal — header crops in screenshots

The modal uses `position: fixed; inset: 0` for its backdrop, with the inner modal taking `max-height: 86vh`. In an 800px-tall Playwright iframe the champion grid fills the view and the header (title, search bar, role chips) crops above the visible area. This is a known limitation of the screenshot approach with fixed overlays.

The champion grid (the primary UI surface the design agent needs) is clearly visible. Graded `good`.

If the crop matters later: try `viewport.height: 1200` in config overrides for `ChampionSelectModal`.

## What's NOT committed

- `ds-bundle/` — generated output, gitignored
- `.ds-sync/` — converter scripts staged by the skill, gitignored
- `.design-sync/.cache/` — screenshot cache and grade files, gitignored
