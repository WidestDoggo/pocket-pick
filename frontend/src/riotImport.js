// Thin client for the backend's Riot mastery proxy.
//
// The Riot *Web* API can't be called from the browser (no CORS), so this goes
// through the local FastAPI backend, which holds no key — we pass it per
// request in the X-Riot-Key header. In dev, Vite proxies /api -> :8787.

export async function fetchMastery({ apiKey, riotId, region }) {
  const params = new URLSearchParams({ riotId, region });
  let res;
  try {
    res = await fetch(`/api/riot/mastery?${params.toString()}`, {
      headers: { "X-Riot-Key": apiKey },
    });
  } catch {
    throw new Error(
      "Couldn't reach the backend. Start it with `uvicorn app:app --port 8787` in /backend.",
    );
  }
  if (!res.ok) {
    throw new Error(`Backend error (HTTP ${res.status}).`);
  }
  const data = await res.json();
  if (data.status !== "ok") {
    throw new Error(data.message || "Riot import failed.");
  }
  return data;
}
