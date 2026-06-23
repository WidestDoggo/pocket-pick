# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local, privacy-friendly **League of Legends draft assistant**. During champ select it analyzes the board and recommends the top 2 picks **drawn strictly from the user's own profile** (Mains per role + tagged Pocket Picks). Runs in two modes toggled in the UI header:

- **LCU Live Sync** — the FastAPI backend reads the local League client `lockfile` and streams the live champ-select session to the dashboard (read-only draft slots).
- **Manual Desktop Mode** — fully offline; the user clicks slots to pick champions manually. The backend is not contacted at all in this mode.

No external image/asset/CDN dependencies — champion "portraits" are deterministic CSS gradients + initials.

The board is laid out by **pick order** (Pick 1…5), not fixed role lanes. Each slot carries an estimated `role` (`estimateRole()` in `champions.js`, greedy over the team's already-assigned roles): your own team's roles are editable via per-slot dropdowns; enemy roles are auto-estimated with manual override. Recommendations come entirely from the local, deterministic `DraftEngine` (no AI, no external calls) over a profile-derived candidate pool (`buildPool()`).

## Commands

Backend (only needed for Live Sync; `cd backend`):
```bash
python -m venv .venv && .venv\Scripts\activate   # Windows; use `source .venv/bin/activate` elsewhere
pip install -r requirements.txt
uvicorn app:app --reload --port 8787
LCU_LOCKFILE="C:/path/to/lockfile" uvicorn app:app --port 8787   # override lockfile auto-detection
```

Frontend (`cd frontend`):
```bash
npm install
npm run dev        # http://localhost:5173, proxies /api and /ws to :8787
npm run build      # static bundle -> dist/
npm run preview
```

There is **no test suite and no linter configured** in this repo.

## Architecture

The recommendation logic is **100% client-side**. The backend's only job is to bridge the live champ-select session into the frontend; it does no analysis.

### Backend (`backend/`)
- `lcu.py` — locates and parses the client `lockfile` (`name:pid:port:password:protocol`), builds an authenticated httpx client against `https://127.0.0.1:<port>` (self-signed cert, `verify=False`, loopback only), and resolves `championId -> name` from `champion-summary.json` (cached for backend lifetime).
- `riot.py` — proxy for the Riot *Web* API (developer key), separate from the LCU bridge. `fetch_mastery()` resolves a `GameName#TAG` + region to top champion masteries (account-v1 regional routing → champion-mastery-v4 platform routing). Browsers can't call Riot directly (no CORS), so this exists to power the profile-setup "import my mains" feature. Same fail-soft contract: returns `{status, message, champions}`, never raises. The key is passed per request and never persisted server-side.
- `app.py` — exposes `GET /api/draft-state` (poll), `GET /api/health`, `GET /api/riot/mastery` (key in `X-Riot-Key` header), and `WS /ws/draft-state` (pushes ~2×/sec, only on change). Normalizes the LCU `myTeam`/`theirTeam` cells into a fixed 5-slot schema (`blue`/`red`).

**Fail-soft is the core invariant:** when the client is closed, not in champ select, or unreachable, every endpoint returns a well-formed payload with `status` of `offline`/`no-session`/`error` (never an exception). This is what lets the frontend silently fall back to Manual Mode. Preserve this when editing backend code — `_empty_state()` in `app.py` is the canonical fallback shape.

### Frontend (`frontend/src/`)
- `champions.js` / `champions.curated.js` / `champions.data.js` — the champion dataset, split three ways. Each entry: `riotId`, `name`, `roles`, `damage` (`AD`/`AP`/`MIXED`/`TRUE`), and `tags` (the **trait vocabulary**: `engage`, `frontline`, `tank`, `peel`, `poke`, `antiTank`, `cc`, `dive`, `assassin`, `scaling`, etc.).
  - `champions.curated.js` — hand-tuned, authoritative entries (high-fidelity roles/tags). **Edit champions here.**
  - `champions.data.js` — **auto-generated**, the full ~170-champion roster (every champion in the game). Curated entries are merged with auto-derived ones (lanes/tags approximated from Riot Data Dragon + Meraki). Do not hand-edit.
  - `champions.js` — facade: re-exports `CHAMPIONS` from `champions.data.js` and provides `findChampion({riotId, name})` (id first, then case-insensitive name), `estimateRole()`, `ROLES`, `ROLE_LABELS`.
  - To add/refine a champion or pull a new patch's champions: edit `champions.curated.js`, then run `node scripts/generate-champions.mjs` (a build-time tool — the app makes no CDN calls at runtime). The generator is the only thing that fetches Data Dragon/Meraki.
- `DraftEngine.js` — the recommendation algorithm, three passes:
  1. `analyzeDraft()` — reads ally comp gaps + enemy threats from the board into weighted "needs".
  2. `scoreCandidate()` — grades each profile champion against those needs (Mains get a small comfort bonus over Pocket Picks).
  3. `recommend()` — returns top picks + a one-sentence rationale. The candidate pool is built **exclusively** from the user's Mains (for `myRole`) and Pocket Picks, minus champions already taken on either team.
  Pocket-Pick archetypes map onto the trait vocabulary via `ARCHETYPE_TAGS`, so a user's tag (e.g. "Anti-Tank") directly influences scoring.
- `useDraftSync.js` — hook that subscribes to the backend when Live mode is enabled. Prefers WebSocket, transparently falls back to HTTP polling (1.5s) on socket error/close. When disabled it tears down connections and never touches the backend.
- `App.jsx` — top-level dashboard. Owns `mode`, `profile`, `myRole`, and the manual boards. Both the LCU live payload and manual picks are converted to a shared `{name, riotId, role}` board shape (slots indexed by pick order) before being fed to `recommend()`. **Profile and mode are persisted in `localStorage`** (keys `lol-draft-companion:profile` / `:mode`); profile is exportable/importable as JSON.
- `riotImport.js` + the import UI in `ProfilePanel.jsx` — optional "import my mains from Riot mastery". Calls the backend proxy (`/api/riot/mastery`), maps each returned `championId` to a dataset champion via `findChampion({riotId})`, and offers suggest-and-confirm "Add main" buttons (champions absent from `champions.js` are shown as unsupported). Riot key / Riot ID / region persist in `localStorage` (`:riotKey` / `:riotId` / `:region`).

### The trait vocabulary is the contract
`champions.js` tags, `DraftEngine.js` needs/scoring, and the Pocket-Pick `ARCHETYPE_TAGS` all share one trait string vocabulary. Adding a new trait means touching all three to be meaningful. The `riotId` in `champions.js` is also what links a live LCU pick to its metadata, so ids must match Riot's.

## Gotchas

- Champ-select cells distinguish a locked pick (`championId`) from a hover/intent (`championPickIntent`); `completed` is true only for a confirmed `championId`.
- Not affiliated with Riot Games. The tool only reads the public champ-select session via the official LCU API — it does not read game memory or automate gameplay.
