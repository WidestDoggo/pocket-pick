"""Riot *Web* API proxy — champion-mastery import for profile setup.

This is separate from the LCU bridge (``lcu.py``). The LCU reads the *local*
client and needs no key; this talks to Riot's public developer API to fetch the
user's champion-mastery list so the frontend can suggest their main champions.

Browsers cannot call the Riot API directly (it sends no CORS headers and the
key would be exposed), so the request is proxied through this backend. Like the
rest of the backend it fails *soft*: every outcome returns a well-formed dict
with a ``status`` and a human-readable ``message`` instead of raising.

The developer key (``RGAPI-…``) is passed per request from the frontend; nothing
is persisted server-side.
"""

from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

# Region code -> (platform host, account-v1 regional routing cluster).
# Platform routing serves champion-mastery; regional routing serves account-v1.
REGION_ROUTING: dict[str, tuple[str, str]] = {
    "NA": ("na1", "americas"),
    "BR": ("br1", "americas"),
    "LAN": ("la1", "americas"),
    "LAS": ("la2", "americas"),
    "OCE": ("oc1", "americas"),
    "EUW": ("euw1", "europe"),
    "EUNE": ("eun1", "europe"),
    "TR": ("tr1", "europe"),
    "RU": ("ru", "europe"),
    "KR": ("kr", "asia"),
    "JP": ("jp1", "asia"),
}


def _err(message: str) -> dict[str, Any]:
    return {"status": "error", "message": message, "champions": []}


def fetch_mastery(api_key: str, riot_id: str, region: str, count: int = 12) -> dict[str, Any]:
    """Resolve a Riot ID to its top champion masteries.

    Returns ``{status, message, gameName, tagLine, champions:[{championId,
    championPoints, championLevel}]}``. ``champions`` is empty on any failure.
    """

    if not api_key:
        return _err("No Riot API key provided.")

    routing = REGION_ROUTING.get((region or "").upper())
    if routing is None:
        return _err(f"Unsupported region '{region}'.")
    platform, regional = routing

    if "#" not in (riot_id or ""):
        return _err("Riot ID must be in the form GameName#TAG.")
    game_name, tag_line = riot_id.rsplit("#", 1)
    game_name, tag_line = game_name.strip(), tag_line.strip()
    if not game_name or not tag_line:
        return _err("Riot ID must be in the form GameName#TAG.")

    headers = {"X-Riot-Token": api_key}
    try:
        with httpx.Client(timeout=8.0, headers=headers) as client:
            acct = client.get(
                f"https://{regional}.api.riotgames.com/riot/account/v1/accounts/"
                f"by-riot-id/{quote(game_name)}/{quote(tag_line)}"
            )
            if acct.status_code in (401, 403):
                return _err(
                    "Riot API key rejected — it may be expired. "
                    "Developer keys last only ~24h; regenerate it on the Riot portal."
                )
            if acct.status_code == 404:
                return _err(f"Riot ID '{game_name}#{tag_line}' not found in {region.upper()}.")
            if acct.status_code == 429:
                return _err("Rate limited by Riot (HTTP 429) — wait a moment and retry.")
            if acct.status_code != 200:
                return _err(f"Account lookup failed (HTTP {acct.status_code}).")

            puuid = acct.json().get("puuid")
            if not puuid:
                return _err("Account lookup returned no PUUID.")

            mastery = client.get(
                f"https://{platform}.api.riotgames.com/lol/champion-mastery/v4/"
                f"champion-masteries/by-puuid/{puuid}/top",
                params={"count": count},
            )
            if mastery.status_code != 200:
                return _err(f"Mastery lookup failed (HTTP {mastery.status_code}).")
            rows = mastery.json()
    except httpx.HTTPError as exc:  # timeout, connection error, etc.
        return _err(f"Could not reach Riot API: {exc!s}")
    except ValueError:
        return _err("Riot API returned an unreadable payload.")

    champions = [
        {
            "championId": row.get("championId"),
            "championPoints": row.get("championPoints", 0),
            "championLevel": row.get("championLevel", 0),
        }
        for row in rows
        if row.get("championId")
    ]
    return {
        "status": "ok",
        "message": f"Found {len(champions)} champions for {game_name}#{tag_line}.",
        "gameName": game_name,
        "tagLine": tag_line,
        "champions": champions,
    }
