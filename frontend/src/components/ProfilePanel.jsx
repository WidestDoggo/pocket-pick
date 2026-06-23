import React, { useRef, useState } from "react";
import { CHAMPIONS, ROLES } from "../champions.js";
import { ARCHETYPES } from "../DraftEngine.js";

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
export function ProfilePanel({ profile, setProfile }) {
  const [open, setOpen] = useState(false);
  const [mainDrafts, setMainDrafts] = useState({});
  const [pickName, setPickName] = useState("");
  const [pickArchetype, setPickArchetype] = useState(ARCHETYPES[0]);
  const fileRef = useRef(null);

  const addMain = (role) => {
    const name = (mainDrafts[role] || "").trim();
    if (!name) return;
    setProfile((p) => {
      const current = p.mains[role] || [];
      if (current.some((n) => n.toLowerCase() === name.toLowerCase())) return p;
      return { ...p, mains: { ...p.mains, [role]: [...current, name] } };
    });
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
