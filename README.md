# Personalized LoL Draft Companion

A local, privacy-friendly **League of Legends draft assistant** that gives you
*personalized* champion recommendations during champ select.

It runs in two interchangeable modes, toggled by a single switch in the header:

| Mode | What it does |
| --- | --- |
| **LCU Live Sync** | A small Python (FastAPI) backend reads your local League client `lockfile` and streams the live champ-select session (hovered / locked champions for both teams) to the dashboard in real time. The draft slots become read-only and update automatically. |
| **Manual Desktop Mode** | Fully offline. The backend is disconnected and you click any slot to manually pick champions from a searchable grid — perfect for theory-crafting or planning a draft away from the client. |

In **both** modes the recommendation engine evaluates the board, finds your
team's composition gaps and the enemy's threats, and surfaces the **top 2
picks** — filtered strictly through **your saved profile** (Mains per role +
Pocket Picks tagged by archetype).

---

## Project structure

```
.
├── backend/
│   ├── app.py            # FastAPI server: /api/draft-state + /ws/draft-state
│   ├── lcu.py            # Lockfile discovery, LCU auth, champion-name resolution
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx                  # Dashboard: mode toggle, draft grid, panels
│       ├── DraftEngine.js           # Local recommendation algorithm
│       ├── champions.js             # Self-contained champion + trait dataset
│       ├── useDraftSync.js          # WebSocket/polling hook for Live Sync
│       ├── styles.css               # Premium dark "gaming" theme
│       └── components/
│           ├── ChampionIcon.jsx     # CSS-only champion portraits (no images)
│           ├── ChampionSelectModal.jsx
│           ├── ProfilePanel.jsx
│           └── Recommendations.jsx
└── README.md
```

No external image/asset/CDN dependencies — champion "portraits" are generated
from deterministic CSS gradients + initials.

---

## Getting started

### 1. Backend (optional — only needed for Live Sync)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8787
```

The backend auto-detects the League client lockfile on Windows/macOS/Linux.
You can override detection with an absolute path:

```bash
LCU_LOCKFILE="/path/to/lockfile" uvicorn app:app --port 8787
```

> If the client isn't running, the API simply returns a safe `offline` status —
> nothing crashes, and the frontend falls back to Manual Mode automatically.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

The Vite dev server proxies `/api` and `/ws` to the backend on port `8787`, so
Live Sync works out of the box during development.

To build a static bundle:

```bash
npm run build
npm run preview
```

---

## How the recommendation engine works

`DraftEngine.js` runs three passes (see inline docs for details):

1. **`analyzeDraft`** reads the board:
   - **Ally gaps** — missing frontline, no engage, no peel, lopsided AD/AP
     damage, low crowd control.
   - **Enemy threats** — stacked tanks (→ need anti-tank), multiple dive
     threats (→ need peel / anti-dive), immobile/catchable enemies (→ pick
     comp), poke/siege comps (→ need engage).
2. **`scoreCandidate`** grades each champion **from your profile only** against
   those weighted needs. Pocket-Pick archetypes (Engage, Anti-Tank, AP Flex,
   Scaling Poke, Pick/Catch, …) map onto the same trait vocabulary so your tags
   directly influence scoring.
3. **`recommend`** returns the top picks with a one-sentence analytical reason,
   e.g. *"Malphite directly addresses that the enemy is stacking durable
   frontline."*

Because the candidate pool is built **exclusively** from your Mains and Pocket
Picks, every suggestion is something you actually play.

---

## Profile configuration

Open **⚙ Profile Configuration** in the dashboard to:

- Add **Mains** for each role (TOP / JUNGLE / MID / ADC / SUPPORT).
- Add **Pocket Picks** and tag each by archetype/playstyle.
- **Export / Import** the whole profile as JSON.

Your profile and selected mode are persisted in `localStorage`, so they survive
reloads.

Example profile JSON:

```json
{
  "mains": {
    "TOP": ["Darius", "Ornn"],
    "JUNGLE": [],
    "MID": ["Ahri", "Syndra"],
    "ADC": [],
    "SUPPORT": ["Thresh"]
  },
  "pocketPicks": [
    { "name": "Malphite", "archetype": "Engage" },
    { "name": "Vayne", "archetype": "Anti-Tank" },
    { "name": "Orianna", "archetype": "AP Flex" }
  ]
}
```

---

## Notes & disclaimer

- The backend talks only to `127.0.0.1` (your own machine) using the
  credentials in the client lockfile. Nothing is sent anywhere else.
- This is an out-of-game companion tool that reads the public champ-select
  session via the official LCU API. It does **not** read game memory or
  automate gameplay.
- Not affiliated with or endorsed by Riot Games.
