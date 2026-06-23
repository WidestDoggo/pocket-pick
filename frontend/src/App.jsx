import React, { useEffect, useMemo, useState } from "react";
import { ROLES } from "./champions.js";
import { recommend } from "./DraftEngine.js";
import { useDraftSync } from "./useDraftSync.js";
import { ChampionIcon } from "./components/ChampionIcon.jsx";
import { ChampionSelectModal } from "./components/ChampionSelectModal.jsx";
import { ProfilePanel } from "./components/ProfilePanel.jsx";
import { Recommendations } from "./components/Recommendations.jsx";

const PROFILE_KEY = "lol-draft-companion:profile";
const MODE_KEY = "lol-draft-companion:mode";

const EMPTY_PROFILE = {
  mains: { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
  pocketPicks: [],
};

const emptyTeam = () => Array.from({ length: 5 }, () => null);

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return EMPTY_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      mains: { ...EMPTY_PROFILE.mains, ...(parsed.mains || {}) },
      pocketPicks: parsed.pocketPicks || [],
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

// Convert the backend's live slot payload into the {name, riotId} shape the
// rest of the app uses.
function liveTeamToBoard(slots) {
  return Array.from({ length: 5 }, (_, i) => {
    const cell = slots?.[i];
    if (!cell || !cell.championName) return null;
    return { name: cell.championName, riotId: cell.championId };
  });
}

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || "manual");
  const [profile, setProfile] = useState(loadProfile);
  const [myRole, setMyRole] = useState("MID");

  // Manual-mode boards (local, editable).
  const [manualBlue, setManualBlue] = useState(emptyTeam);
  const [manualRed, setManualRed] = useState(emptyTeam);

  // Modal state for manual champion selection.
  const [modal, setModal] = useState(null); // { team, slot } | null

  const isLive = mode === "live";
  const { state: liveState } = useDraftSync(isLive);

  // Persist profile + mode.
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  // The board shown + analyzed depends on the active mode.
  const blue = isLive ? liveTeamToBoard(liveState.blue) : manualBlue;
  const red = isLive ? liveTeamToBoard(liveState.red) : manualRed;

  const taken = useMemo(() => {
    const s = new Set();
    [...blue, ...red].forEach((c) => c && s.add(c.name.toLowerCase()));
    return s;
  }, [blue, red]);

  const result = useMemo(
    () => recommend({ blue, red, profile, myRole }),
    [blue, red, profile, myRole],
  );

  const profileEmpty =
    profile.pocketPicks.length === 0 &&
    Object.values(profile.mains).every((arr) => arr.length === 0);

  // --- Manual editing handlers ---------------------------------------------
  const openSlot = (team, slot) => {
    if (isLive) return; // read-only in live mode
    setModal({ team, slot });
  };

  const pickChampion = (champ) => {
    if (!modal) return;
    const setter = modal.team === "blue" ? setManualBlue : setManualRed;
    setter((prev) => {
      const next = [...prev];
      next[modal.slot] = { name: champ.name, riotId: champ.riotId };
      return next;
    });
    setModal(null);
  };

  const clearSlot = () => {
    if (!modal) return;
    const setter = modal.team === "blue" ? setManualBlue : setManualRed;
    setter((prev) => {
      const next = [...prev];
      next[modal.slot] = null;
      return next;
    });
    setModal(null);
  };

  const resetManual = () => {
    setManualBlue(emptyTeam());
    setManualRed(emptyTeam());
  };

  const statusBadge = () => {
    if (!isLive) return { label: "Manual Mode", cls: "manual" };
    switch (liveState.status) {
      case "live":
        return { label: "Live · Champ Select", cls: "live" };
      case "no-session":
        return { label: "Client open · No champ select", cls: "warn" };
      case "error":
        return { label: "LCU Error", cls: "warn" };
      default:
        return { label: "Client not detected", cls: "offline" };
    }
  };
  const badge = statusBadge();

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">⟡</span>
          <div>
            <h1>Draft Companion</h1>
            <p className="tagline">Personalized League of Legends draft assistant</p>
          </div>
        </div>

        <div className="mode-toggle">
          <span className={!isLive ? "active" : ""}>Manual Desktop</span>
          <button
            className={`switch ${isLive ? "on" : ""}`}
            role="switch"
            aria-checked={isLive}
            onClick={() => setMode(isLive ? "manual" : "live")}
          >
            <span className="knob" />
          </button>
          <span className={isLive ? "active" : ""}>LCU Live Sync</span>
        </div>

        <div className={`status-pill ${badge.cls}`}>
          <span className="dot" />
          {badge.label}
        </div>
      </header>

      {isLive && liveState.status !== "live" && (
        <div className="banner">
          {liveState.message} You can switch to{" "}
          <button className="linklike" onClick={() => setMode("manual")}>
            Manual Desktop Mode
          </button>{" "}
          to draft by hand.
        </div>
      )}

      <ProfilePanel profile={profile} setProfile={setProfile} />

      <main className="board-area">
        <div className="teams">
          <TeamColumn
            title="Blue Team"
            subtitle="Allies"
            color="blue"
            slots={blue}
            readOnly={isLive}
            onSlotClick={(slot) => openSlot("blue", slot)}
            highlightSelf={isLive ? liveState.blue : null}
          />
          <div className="versus">VS</div>
          <TeamColumn
            title="Red Team"
            subtitle="Enemies"
            color="red"
            slots={red}
            readOnly={isLive}
            onSlotClick={(slot) => openSlot("red", slot)}
            highlightSelf={isLive ? liveState.red : null}
          />
        </div>

        <Recommendations
          result={result}
          myRole={myRole}
          onRoleChange={setMyRole}
          roles={ROLES}
          profileEmpty={profileEmpty}
        />
      </main>

      {!isLive && (
        <div className="board-actions">
          <button className="btn ghost" onClick={resetManual}>
            Reset Board
          </button>
        </div>
      )}

      {modal && (
        <ChampionSelectModal
          team={modal.team}
          slot={modal.slot}
          taken={taken}
          onPick={pickChampion}
          onClear={clearSlot}
          onClose={() => setModal(null)}
        />
      )}

      <footer className="app-footer">
        <span>
          {isLive
            ? "Live Sync reads champ select from your local League client."
            : "Manual Mode runs fully offline — click any slot to draft."}
        </span>
      </footer>
    </div>
  );
}

function TeamColumn({ title, subtitle, color, slots, readOnly, onSlotClick, highlightSelf }) {
  const roleLabels = ["Top", "Jungle", "Mid", "Bot", "Support"];
  return (
    <section className={`team-column ${color}`}>
      <header className="team-header">
        <h2>{title}</h2>
        <span className="team-sub">{subtitle}</span>
      </header>
      <ul className="slot-list">
        {slots.map((champ, i) => {
          const isSelf = highlightSelf?.[i]?.isSelf;
          return (
            <li key={i}>
              <button
                className={`draft-slot ${champ ? "filled" : "empty"} ${
                  readOnly ? "readonly" : ""
                } ${isSelf ? "self" : ""}`}
                onClick={() => onSlotClick(i)}
                disabled={readOnly}
              >
                <ChampionIcon name={champ?.name} size={48} />
                <div className="slot-text">
                  <span className="slot-role">{roleLabels[i]}</span>
                  <span className="slot-name">
                    {champ ? champ.name : readOnly ? "—" : "Empty · click to pick"}
                  </span>
                </div>
                {isSelf && <span className="you-badge">YOU</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
