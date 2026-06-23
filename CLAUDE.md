# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A local, privacy-friendly **League of Legends draft assistant**. During champ select it analyzes the board and recommends the top 2 picks **drawn strictly from the user's own profile** (Mains per role + tagged Pocket Picks). Runs in two modes toggled in the UI header:

- **LCU Live Sync** — the FastAPI backend reads the local League client `lockfile` and streams the live champ-select session to the dashboard (read-only draft slots).
- **Manual Desktop Mode** — fully offline; the user clicks slots to pick champions manually. The backend is not contacted at all in this mode.

No external image/asset/CDN dependencies — champion "portraits" are deterministic CSS gradients + initials.

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
- `app.py` — exposes `GET /api/draft-state` (poll), `GET /api/health`, and `WS /ws/draft-state` (pushes ~2×/sec, only on change). Normalizes the LCU `myTeam`/`theirTeam` cells into a fixed 5-slot schema (`blue`/`red`).

**Fail-soft is the core invariant:** when the client is closed, not in champ select, or unreachable, every endpoint returns a well-formed payload with `status` of `offline`/`no-session`/`error` (never an exception). This is what lets the frontend silently fall back to Manual Mode. Preserve this when editing backend code — `_empty_state()` in `app.py` is the canonical fallback shape.

### Frontend (`frontend/src/`)
- `champions.js` — self-contained champion dataset. Each entry: `riotId`, `name`, `roles`, `damage` (`AD`/`AP`/`MIXED`/`TRUE`), and `tags` (the **trait vocabulary**: `engage`, `frontline`, `tank`, `peel`, `poke`, `antiTank`, `cc`, `dive`, `assassin`, `scaling`, etc.). `findChampion({riotId, name})` matches by id first, then case-insensitive name. Extend by adding objects of the same shape.
- `DraftEngine.js` — the recommendation algorithm, three passes:
  1. `analyzeDraft()` — reads ally comp gaps + enemy threats from the board into weighted "needs".
  2. `scoreCandidate()` — grades each profile champion against those needs (Mains get a small comfort bonus over Pocket Picks).
  3. `recommend()` — returns top picks + a one-sentence rationale. The candidate pool is built **exclusively** from the user's Mains (for `myRole`) and Pocket Picks, minus champions already taken on either team.
  Pocket-Pick archetypes map onto the trait vocabulary via `ARCHETYPE_TAGS`, so a user's tag (e.g. "Anti-Tank") directly influences scoring.
- `useDraftSync.js` — hook that subscribes to the backend when Live mode is enabled. Prefers WebSocket, transparently falls back to HTTP polling (1.5s) on socket error/close. When disabled it tears down connections and never touches the backend.
- `App.jsx` — top-level dashboard. Owns `mode`, `profile`, `myRole`, and the manual boards. Both the LCU live payload and manual picks are converted to a shared `{name, riotId}` board shape before being fed to `recommend()`. **Profile and mode are persisted in `localStorage`** (keys `lol-draft-companion:profile` / `:mode`), exportable/importable as JSON.

### The trait vocabulary is the contract
`champions.js` tags, `DraftEngine.js` needs/scoring, and the Pocket-Pick `ARCHETYPE_TAGS` all share one trait string vocabulary. Adding a new trait means touching all three to be meaningful. The `riotId` in `champions.js` is also what links a live LCU pick to its metadata, so ids must match Riot's.

## Gotchas

- Champ-select cells distinguish a locked pick (`championId`) from a hover/intent (`championPickIntent`); `completed` is true only for a confirmed `championId`.
- Not affiliated with Riot Games. The tool only reads the public champ-select session via the official LCU API — it does not read game memory or automate gameplay.
