import React, { useEffect, useRef, useState } from "react";
import { CHAMPIONS, ROLES, ROLE_LABELS, findChampion } from "../champions.js";
import { ARCHETYPES } from "../DraftEngine.js";
import { fetchMastery } from "../riotImport.js";
import { ChampionIcon } from "./ChampionIcon.jsx";

const RIOT_KEY_KEY = "lol-draft-companion:riotKey";
const RIOT_ID_KEY = "lol-draft-companion:riotId";
const RIOT_REGION_KEY = "lol-draft-companion:region";
const REGIONS = ["NA", "EUW", "EUNE", "KR", "BR", "JP", "LAN", "LAS", "OCE", "TR", "RU"];

// Datalist of all champion names — reused for the various name inputs.
function ChampionDatalist({ id }) {
  return (
    <datalist id={id}>
      {CHAMPIONS.map((c) => (
        <option key={c.riotId} value={c.name} />
      ))}
    </datalist>
  );
}

/**
 * Expandable settings panel for managing the user's personal profile:
 *   - Mains per role
 *   - Pocket Picks tagged by archetype/playstyle
 * Supports import/export of the raw JSON config.
 */
export function ProfilePanel({ profile, setProfile, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [mainDrafts, setMainDrafts] = useState({});
  const [pickName, setPickName] = useState("");
  const [pickArchetype, setPickArchetype] = useState(ARCHETYPES[0]);
  const fileRef = useRef(null);

  // --- Riot mastery import (profile setup helper) --------------------------
  const [riotKey, setRiotKey] = useState(() => localStorage.getItem(RIOT_KEY_KEY) || "");
  const [riotId, setRiotId] = useState(() => localStorage.getItem(RIOT_ID_KEY) || "");
  const [region, setRegion] = useState(() => localStorage.getItem(RIOT_REGION_KEY) || "NA");
  const [importState, setImportState] = useState({
    loading: false,
    error: null,
    suggestions: null,
  });
  // Per-suggestion chosen role (keyed by championId), defaults to primary role.
  const [roleChoice, setRoleChoice] = useState({});

  useEffect(() => localStorage.setItem(RIOT_KEY_KEY, riotKey), [riotKey]);
  useEffect(() => localStorage.setItem(RIOT_ID_KEY, riotId), [riotId]);
  useEffect(() => localStorage.setItem(RIOT_REGION_KEY, region), [region]);

  const runImport = async () => {
    setImportState({ loading: true, error: null, suggestions: null });
    try {
      const data = await fetchMastery({ apiKey: riotKey.trim(), riotId: riotId.trim(), region });
      const suggestions = data.champions.map((c) => ({
        championId: c.championId,
        points: c.championPoints,
        champ: findChampion({ riotId: c.championId }), // null if not in dataset
      }));
      setImportState({ loading: false, error: null, suggestions });
    } catch (e) {
      setImportState({ loading: false, error: e.message || "Import failed", suggestions: null });
    }
  };

  const isMain = (role, name) =>
    (profile.mains[role] || []).some((n) => n.toLowerCase() === name.toLowerCase());

  const addMainNamed = (role, name) => {
    if (!name) return;
    setProfile((p) => {
      const current = p.mains[role] || [];
      if (current.some((n) => n.toLowerCase() === name.toLowerCase())) return p;
      return { ...p, mains: { ...p.mains, [role]: [...current, name] } };
    });
  };

  const addMain = (role) => {
    const name = (mainDrafts[role] || "").trim();
    if (!name) return;
    addMainNamed(role, name);
    setMainDrafts((d) => ({ ...d, [role]: "" }));
  };

  const removeMain = (role, name) => {
    setProfile((p) => ({
      ...p,
      mains: { ...p.mains, [role]: p.mains[role].filter((n) => n !== name) },
    }));
  };

  const addPocketPick = () => {
    const name = pickName.trim();
    if (!name) return;
    setProfile((p) => {
      if (p.pocketPicks.some((pp) => pp.name.toLowerCase() === name.toLowerCase())) {
        return p;
      }
      return {
        ...p,
        pocketPicks: [...p.pocketPicks, { name, archetype: pickArchetype }],
      };
    });
    setPickName("");
  };

  const removePocketPick = (name) => {
    setProfile((p) => ({
      ...p,
      pocketPicks: p.pocketPicks.filter((pp) => pp.name !== name),
    }));
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "draft-profile.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.mains && parsed.pocketPicks) setProfile(parsed);
      } catch {
        // ignore invalid file
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <section className={`profile-panel ${open ? "open" : ""}`}>
      <button className="profile-toggle" onClick={() => setOpen((o) => !o)}>
        <span>⚙ Profile Configuration</span>
        <span className="chevron">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="profile-body">
          <ChampionDatalist id="champ-names" />

          <div className="profile-section riot-import">
            <h3>Import from Riot (mastery)</h3>
            <p className="muted">
              Pull your most-played champions and add them as mains with one click.
              Needs the backend running. Your key is stored only in this browser.
            </p>
            <div className="riot-fields">
              <input
                type="password"
                placeholder="Riot API key (RGAPI-…)"
                value={riotKey}
                onChange={(e) => setRiotKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
              <input
                placeholder="GameName#TAG"
                value={riotId}
                onChange={(e) => setRiotId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runImport()}
              />
              <select value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                className="btn small"
                onClick={runImport}
                disabled={importState.loading || !riotKey.trim() || !riotId.trim()}
              >
                {importState.loading ? "Loading…" : "Fetch"}
              </button>
            </div>
            <p className="riot-hint muted">
              No key? Get one at{" "}
              <a href="https://developer.riotgames.com/" target="_blank" rel="noreferrer">
                developer.riotgames.com
              </a>{" "}
              — note dev keys expire every ~24h.
            </p>

            {importState.error && <p className="riot-error">{importState.error}</p>}

            {importState.suggestions && (
              <ul className="mastery-list">
                {importState.suggestions.map((s) => {
                  if (!s.champ) {
                    return (
                      <li key={s.championId} className="mastery-row unknown">
                        <span className="muted">
                          Champion #{s.championId} · {s.points.toLocaleString()} pts — not in
                          the app's dataset yet
                        </span>
                      </li>
                    );
                  }
                  const roles = s.champ.roles;
                  const chosen = roleChoice[s.championId] || roles[0];
                  const already = isMain(chosen, s.champ.name);
                  return (
                    <li key={s.championId} className="mastery-row">
                      <ChampionIcon name={s.champ.name} size={36} />
                      <div className="mastery-info">
                        <strong>{s.champ.name}</strong>
                        <span className="muted">{s.points.toLocaleString()} pts</span>
                      </div>
                      <select
                        value={chosen}
                        onChange={(e) =>
                          setRoleChoice((rc) => ({ ...rc, [s.championId]: e.target.value }))
                        }
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                      <button
                        className="btn small"
                        disabled={already}
                        onClick={() => addMainNamed(chosen, s.champ.name)}
                      >
                        {already ? "Added ✓" : "Add main"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="profile-section">
            <h3>Mains by Role</h3>
            <div className="mains-grid">
              {ROLES.map((role) => (
                <div key={role} className="main-role">
                  <label>{role}</label>
                  <div className="tag-list">
                    {(profile.mains[role] || []).map((name) => (
                      <span key={name} className="tag">
                        {name}
                        <button onClick={() => removeMain(role, name)}>✕</button>
                      </span>
                    ))}
                  </div>
                  <div className="inline-add">
                    <input
                      list="champ-names"
                      placeholder="Add champion…"
                      value={mainDrafts[role] || ""}
                      onChange={(e) =>
                        setMainDrafts((d) => ({ ...d, [role]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && addMain(role)}
                    />
                    <button className="btn small" onClick={() => addMain(role)}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="profile-section">
            <h3>Pocket Picks</h3>
            <p className="muted">
              Situational champions tagged by the role they fill in a draft.
            </p>
            <div className="tag-list">
              {profile.pocketPicks.map((pp) => (
                <span key={pp.name} className="tag pocket">
                  {pp.name}
                  <em>{pp.archetype}</em>
                  <button onClick={() => removePocketPick(pp.name)}>✕</button>
                </span>
              ))}
              {profile.pocketPicks.length === 0 && (
                <span className="muted">No pocket picks yet.</span>
              )}
            </div>
            <div className="inline-add">
              <input
                list="champ-names"
                placeholder="Champion…"
                value={pickName}
                onChange={(e) => setPickName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPocketPick()}
              />
              <select
                value={pickArchetype}
                onChange={(e) => setPickArchetype(e.target.value)}
              >
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <button className="btn small" onClick={addPocketPick}>
                Add
              </button>
            </div>
          </div>

          <div className="profile-section io">
            <button className="btn ghost" onClick={exportJson}>
              ⬇ Export JSON
            </button>
            <button className="btn ghost" onClick={() => fileRef.current?.click()}>
              ⬆ Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={importJson}
            />
          </div>
        </div>
      )}
    </section>
  );
}
