"""League Client Update (LCU) API access helpers.

This module is responsible for:
  * Locating and parsing the League client ``lockfile``.
  * Issuing authenticated HTTPS requests against the local LCU API.
  * Resolving champion ids -> names using data served locally by the client.

Everything here degrades gracefully: if the client is not running, or the
lockfile cannot be found, callers receive a clear, structured signal instead
of an exception so the frontend can fall back to Manual Standalone Mode.
"""

from __future__ import annotations

import base64
import os
import platform
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import httpx

# The LCU uses a self-signed certificate on loopback. Verification is therefore
# intentionally disabled for these *local-only* (127.0.0.1) requests.
_LCU_TIMEOUT = httpx.Timeout(4.0, connect=2.0)


@dataclass
class LcuCredentials:
    """Connection details parsed from the client lockfile."""

    process: str
    pid: int
    port: int
    password: str
    protocol: str

    @property
    def base_url(self) -> str:
        return f"{self.protocol}://127.0.0.1:{self.port}"

    @property
    def auth_header(self) -> str:
        token = base64.b64encode(f"riot:{self.password}".encode()).decode()
        return f"Basic {token}"


def _candidate_lockfile_paths() -> list[Path]:
    """Return every reasonable location the lockfile might live in.

    The first match wins. Users can always override detection by setting the
    ``LCU_LOCKFILE`` environment variable to an absolute path.
    """

    override = os.environ.get("LCU_LOCKFILE")
    if override:
        return [Path(override)]

    system = platform.system()
    paths: list[Path] = []

    if system == "Windows":
        paths += [
            Path(r"C:/Riot Games/League of Legends/lockfile"),
            Path(os.path.expandvars(r"%LOCALAPPDATA%/Riot Games/League of Legends/lockfile")),
        ]
    elif system == "Darwin":  # macOS
        paths += [
            Path("/Applications/League of Legends.app/Contents/LoL/lockfile"),
            Path.home() / "Applications/League of Legends.app/Contents/LoL/lockfile",
        ]
    else:  # Linux (e.g. Lutris / Wine prefixes) — best-effort guesses.
        home = Path.home()
        paths += [
            home / "Games/league-of-legends/drive_c/Riot Games/League of Legends/lockfile",
            home / ".wine/drive_c/Riot Games/League of Legends/lockfile",
        ]

    return paths


def read_lockfile() -> Optional[LcuCredentials]:
    """Locate and parse the lockfile, returning ``None`` when unavailable."""

    for path in _candidate_lockfile_paths():
        try:
            if not path.is_file():
                continue
            raw = path.read_text(encoding="utf-8").strip()
        except (OSError, PermissionError):
            continue

        # Format: <name>:<pid>:<port>:<password>:<protocol>
        parts = raw.split(":")
        if len(parts) != 5:
            continue
        name, pid, port, password, protocol = parts
        try:
            return LcuCredentials(
                process=name,
                pid=int(pid),
                port=int(port),
                password=password,
                protocol=protocol,
            )
        except ValueError:
            continue

    return None


def make_client(creds: LcuCredentials) -> httpx.Client:
    """Build a pre-authenticated httpx client for the local LCU API."""

    return httpx.Client(
        base_url=creds.base_url,
        headers={"Authorization": creds.auth_header, "Accept": "application/json"},
        verify=False,  # noqa: S501 — local self-signed cert, loopback only.
        timeout=_LCU_TIMEOUT,
    )


# --- Champion id -> name resolution -----------------------------------------
# The client serves a static champion summary locally; we cache it so we only
# pay the lookup cost once per backend lifetime.
_champion_name_cache: dict[int, str] = {}


def get_champion_names(client: httpx.Client) -> dict[int, str]:
    """Return a ``{championId: name}`` map sourced from the local client."""

    global _champion_name_cache
    if _champion_name_cache:
        return _champion_name_cache

    try:
        resp = client.get("/lol-game-data/assets/v1/champion-summary.json")
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return {}

    names: dict[int, str] = {}
    for entry in data:
        cid = entry.get("id")
        name = entry.get("name")
        if isinstance(cid, int) and cid > 0 and name:
            names[cid] = name
    _champion_name_cache = names
    return names
