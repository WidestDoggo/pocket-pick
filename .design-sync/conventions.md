# Pocket Pick UI — Design Conventions

## No provider wrapper needed

All components render standalone. There is no context provider, theme provider, or Redux store to mount. Components only require the props defined in their `.d.ts` files.

## Required CSS import

Every design must include the design system's `styles.css` (already injected by the runtime). This stylesheet provides:

1. **CSS custom property tokens** — defined on `:root`:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0a0e17` | deepest background |
| `--bg-2` | `#111726` | secondary background |
| `--panel` | `#151c2c` | card / panel surface |
| `--panel-2` | `#1b2436` | nested panel |
| `--border` | `#26314a` | all borders |
| `--text` | `#e6ebf5` | primary text |
| `--muted` | `#8693ad` | secondary / placeholder text |
| `--blue` | `#3b82f6` | active / focus accent |
| `--blue-glow` | `rgba(59,130,246,0.35)` | glow shadows on blue |
| `--red` | `#ef4444` | danger / error |
| `--red-glow` | `rgba(239,68,68,0.35)` | glow shadows on red |
| `--gold` | `#c8a558` | brand accent (LoL gold) |
| `--accent` | `#5eead4` | teal highlight |
| `--good` | `#34d399` | success / online |
| `--warn` | `#f59e0b` | warning |
| `--radius` | `14px` | standard border-radius |
| `--shadow` | `0 8px 30px rgba(0,0,0,0.45)` | panel drop shadow |

2. **Component CSS** — `_ds_bundle.css` is `@import`ed from `styles.css`; all class-based styling is automatically available.

## Background wrapping

Components are designed for a dark background. Wrap any component in a container with `background: var(--bg)` (or `#0a0e17`) before placing other elements around it:

```jsx
<div style={{ background: 'var(--bg)', padding: '16px', minHeight: '100vh' }}>
  <YourComponent />
</div>
```

## CSS class vocabulary

When composing layouts using raw elements alongside these components, use the app's utility classes:

| Class | Purpose |
|---|---|
| `.muted` | `color: var(--muted)` secondary text |
| `.btn` | base button style (no variant) |
| `.chip` | small pill tag (role indicator) |
| `.tag` | archetype / pocket-pick badge |
| `.reco-card` | recommendation card container |
| `.status-pill` | live/offline status indicator pill |
| `.panel` | standard card surface with `--panel` bg and `--shadow` |

## Idiomatic snippet — recommendation panel in a page

```jsx
import { Recommendations, ChampionIcon } from 'lol-draft-companion-frontend';

const profile = {
  mains: { TOP: ['Garen'], JUNGLE: ['Vi'], MID: ['Ahri'], ADC: ['Jinx'], SUPPORT: ['Thresh'] },
  pocketPicks: [{ name: 'Zed', archetype: 'Assassin' }],
};

export default function DraftPage() {
  return (
    <div style={{ background: 'var(--bg)', padding: '24px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {['Ahri', 'Jinx', 'Thresh'].map(name => (
          <ChampionIcon key={name} name={name} size={48} />
        ))}
      </div>
      <Recommendations
        result={null}
        profile={profile}
        myRole="MID"
        myPickSet={false}
      />
    </div>
  );
}
```

## Champion "portraits" — no images

Champion icons are deterministic CSS gradients derived from the champion name. There are no external CDN dependencies. The `ChampionIcon` component accepts `name` (string) and `size` (number, px) — portrait color and initials are computed automatically.

## Role constants

Valid role values across all components: `'TOP'` | `'JUNGLE'` | `'MID'` | `'ADC'` | `'SUPPORT'`

## ProfilePanel — collapsed by default

`ProfilePanel` renders in a collapsed state (shows only a toggle header). To display it expanded in designs, either render it inside a wrapper that clicks the `.profile-toggle` button after mount, or show it with a visual note that it expands on interaction.

## ChampionSelectModal — fixed-position overlay

`ChampionSelectModal` renders as a full-screen fixed overlay. In designs, place it at the root of the page rather than nested inside other positioned elements to avoid stacking context clipping.
