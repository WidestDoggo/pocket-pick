"""Personalized LoL Draft Companion — FastAPI backend.

Responsibilities
----------------
* Expose a tiny, dependency-light HTTP + WebSocket API.
* Bridge the local League Client (LCU) champ-select session to the frontend.
* Always fail *soft*: when the client is closed or LCU access is disabled the
  endpoints return a well-formed ``offline`` payload so the React app can
  seamlessly fall back to Manual Standalone Mode.

Run with::

    uvicorn app:app --reload --port 8787
"""

from __future__ import annotations

import asyncio
from typing import Any, Optional

import httpx
from fastapi import FastAPI, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from lcu import LcuCredentials, get_champion_names, make_client, read_lockfile
from riot import fetch_mastery

app = FastAPI(title="LoL Draft Companion", version="1.0.0")

# The dev frontend runs on Vite (5173). Allow it plus common localhost ports.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSION_PATH = "/lol-champ-select/v1/session"
EMPTY_TEAM = [None, None, None, None, None]


def _empty_state(status: str, message: str) -> dict[str, Any]:
    """A safe, fully-formed payload used for every non-live outcome."""

    return {
        "status": status,  # offline | no-session | error
        "mode": "lcu",
        "message": message,
        "blue": [
            {"slot": i, "championId": 0, "championName": None,
             "completed": False, "isSelf": False}
            for i in range(5)
        ],
        "red": [
            {"slot": i, "championId": 0, "championName": None,
             "completed": False, "isSelf": False}
            for i in range(5)
        ],
        "localPlayerCellId": -1,
    }


def _normalize_team(
    cells: list[dict[str, Any]],
    names: dict[int, str],
    local_cell_id: int,
) -> list[dict[str, Any]]:
    """Convert raw LCU player cells into the frontend's slot schema."""

    slots: list[dict[str, Any]] = []
    for index, cell in enumerate(cells[:5]):
        champion_id = cell.get("championId") or cell.get("championPickIntent") or 0
        slots.append(
            {
                "slot": index,
                "championId": champion_id,
                "championName": names.get(champion_id),
                # A locked-in pick has a confirmed championId (not just intent).
                "completed": bool(cell.get("championId")),
                "isSelf": cell.get("cellId") == local_cell_id,
            }
        )

    # Pad to a consistent 5 slots so the UI never has to guess.
    while len(slots) < 5:
        slots.append(
            {"slot": len(slots), "championId": 0, "championName": None,
             "completed": False, "isSelf": False}
        )
    return slots


def _fetch_session(creds: LcuCredentials) -> dict[str, Any]:
    """Pull and normalize the active champ-select session."""

    with make_client(creds) as client:
        try:
            resp = client.get(SESSION_PATH)
        except httpx.HTTPError as exc:  # connection refused, timeout, etc.
            return _empty_state("offline", f"Could not reach LCU API: {exc!s}")

        if resp.status_code == 404:
            return _empty_state(
                "no-session", "Client is open but you are not in champ select."
            )
        if resp.status_code != 200:
            return _empty_state(
                "error", f"LCU responded with HTTP {resp.status_code}."
            )

        try:
            session = resp.json()
        except ValueError:
            return _empty_state("error", "LCU returned an unreadable session payload.")

        names = get_champion_names(client)

    local_cell_id = session.get("localPlayerCellId", -1)
    blue = _normalize_team(session.get("myTeam", []), names, local_cell_id)
    red = _normalize_team(session.get("theirTeam", []), names, local_cell_id)

    return {
        "status": "live",
        "mode": "lcu",
        "message": "Connected to champ select.",
        "blue": blue,
        "red": red,
        "localPlayerCellId": local_cell_id,
    }


def get_draft_state() -> dict[str, Any]:
    """Top-level resolver shared by the HTTP and WebSocket endpoints."""

    creds = read_lockfile()
    if creds is None:
        return _empty_state(
            "offline",
            "League client not detected. Manual Standalone Mode is available.",
        )
    return _fetch_session(creds)


@app.get("/api/health")
def health() -> dict[str, Any]:
    creds: Optional[LcuCredentials] = read_lockfile()
    return {"ok": True, "lcuDetected": creds is not None}


@app.get("/api/draft-state")
def draft_state() -> dict[str, Any]:
    """Polling endpoint — returns the current (or fallback) draft state."""

    return get_draft_state()


@app.get("/api/riot/mastery")
def riot_mastery(
    riotId: str = "",
    region: str = "NA",
    x_riot_key: str = Header(default=""),
) -> dict[str, Any]:
    """Proxy the Riot Web API to fetch a player's top champion masteries.

    The developer key is passed in the ``X-Riot-Key`` header (never persisted).
    Used by the profile setup UI to *suggest* the user's mains; fail-soft.
    """

    return fetch_mastery(x_riot_key, riotId, region)


@app.websocket("/ws/draft-state")
async def draft_state_socket(websocket: WebSocket) -> None:
    """Push draft updates roughly twice a second while the socket is open."""

    await websocket.accept()
    last_payload: Optional[str] = None
    try:
        while True:
            # The LCU calls are blocking httpx; run them off the event loop.
            state = await asyncio.to_thread(get_draft_state)
            # Only emit when something actually changed to keep the wire quiet.
            serialized = str(state)
            if serialized != last_payload:
                await websocket.send_json(state)
                last_payload = serialized
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        return
    except Exception:  # noqa: BLE001 — never let the socket crash the server.
        try:
            await websocket.close()
        except RuntimeError:
            pass


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Personalized LoL Draft Companion API",
        "docs": "/docs",
        "state": "/api/draft-state",
        "socket": "/ws/draft-state",
    }
