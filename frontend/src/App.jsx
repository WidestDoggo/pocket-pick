import React, { useEffect, useMemo, useState } from "react";
import { ROLES, estimateRole } from "./champions.js";
import { recommend } from "./DraftEngine.js";
import { useDraftSync } from "./useDraftSync.js";
import { ChampionIcon } from "./components/ChampionIcon.jsx";
import { ChampionSelectModal } from "./components/ChampionSelectModal.jsx";
import { ProfilePanel } from "./components/ProfilePanel.jsx";
import { Recommendations } from "./components/Recommendations.jsx";

const PROFILE_KEY = "lol-draft-companion:profile";
const MODE_KEY = "lol-draft-companion:mode";
const MY_PICK_KEY = "lol-draft-companion:myPick";

const ROLE_SHORT = { TOP: "TOP", JUNGLE: "JG", MID: "MID", ADC: "ADC", SUPPORT: "SUP" };

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

function liveTeamToBoard(slots) {
  const used = [];
  return Array.from({ length: 5 }, (_, i) => {
    const cell = slots?.[i];
    if (!cell || !cell.championName) return null;
    const role = estimateRole({ name: cell.championName, riotId: cell.championId }, used);
    if (role) used.push(role);
    return { name: cell.championName, riotId: cell.championId, role };
  });
}

export default function App() {
  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || "manual");
  const [profile, setProfile] = useState(loadProfile);
  const [myRole, setMyRole] = useState("MID");
  const [manualBlue, setManualBlue] = useState(emptyTeam);
  const [manualRed, setManualRed] = useState(emptyTeam);
  const [myPickIndex, setMyPickIndex] = useState(() => {
    const raw = localStorage.getItem(MY_PICK_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 && n < 5 ? n : null;
  });
  const [modal, setModal] = useState(null);

  const isLive = mode === "live";
  const { state: liveState } = useDraftSync(isLive);

  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);
  useEffect(() => {
    if (myPickIndex == null) localStorage.removeItem(MY_PICK_KEY);
    else localStorage.setItem(MY_PICK_KEY, String(myPickIndex));
  }, [myPickIndex]);

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

  const openSlot = (team, slot) => {
    if (isLive) return;
    setModal({ team, slot });
  };

  const pickChampion = (champ) => {
    if (!modal) return;
    const setter = modal.team === "blue" ? setManualBlue : setManualRed;
    setter((prev) => {
      const next = [...prev];
      const used = next
        .filter((s, i) => s && i !== modal.slot)
        .map((s) => s.role)
        .filter(Boolean);
      const role = estimateRole(champ, used);
      next[modal.slot] = { name: champ.name, riotId: champ.riotId, role };
      return next;
    });
    if (modal.team === "blue" && modal.slot === myPickIndex) {
      const used = manualBlue
        .filter((s, i) => s && i !== modal.slot)
        .map((s) => s.role)
        .filter(Boolean);
      const role = estimateRole(champ, used);
      if (role) setMyRole(role);
    }
    setModal(null);
  };

  const setSlotRole = (team, slot, role) => {
    if (isLive) return;
    const setter = team === "blue" ? setManualBlue : setManualRed;
    setter((prev) => {
      const next = [...prev];
      if (next[slot]) next[slot] = { ...next[slot], role };
      return next;
    });
    if (team === "blue" && slot === myPickIndex && role) setMyRole(role);
  };

  const setMyPick = (slot) => {
    if (isLive) return;
    setMyPickIndex((prev) => (prev === slot ? null : slot));
    const slotRole = manualBlue[slot]?.role;
    if (slotRole) setMyRole(slotRole);
  };

  const changeMyRole = (role) => {
    setMyRole(role);
    if (myPickIndex != null && manualBlue[myPickIndex]) {
      setSlotRole("blue", myPickIndex, role);
    }
  };

  const fillMyPick = (rec) => {
    if (isLive || myPickIndex == null) return;
    setManualBlue((prev) => {
      const next = [...prev];
      const used = next
        .filter((s, i) => s && i !== myPickIndex)
        .map((s) => s.role)
        .filter(Boolean);
      const role = myRole || estimateRole(rec, used);
      next[myPickIndex] = { name: rec.name, riotId: rec.riotId, role };
      return next;
    });
  };

  const swapPick = (targetSlot) => {
    if (isLive || myPickIndex == null || targetSlot === myPickIndex) return;
    setManualBlue((prev) => {
      const next = [...prev];
      [next[myPickIndex], next[targetSlot]] = [next[targetSlot], next[myPickIndex]];
      return next;
    });
    setMyPickIndex(targetSlot);
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
    setMyPickIndex(null);
  };

  const statusBadge = () => {
    if (!isLive) return { label: "Manual Draft", cls: "good" };
    switch (liveState.status) {
      case "live":
        return { label: "Live Draft", cls: "good" };
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
    <div className="app-screen">
      <header className="pp-header">
        <div className="pp-header-inner">
          <div className="pp-brand">
            <span className="pp-brand-title">⚔ Pocket&nbsp;Pick</span>
            <span className="pp-brand-sub">Draft Companion</span>
          </div>

          <div className="pp-mode-pill">
            <button
              type="button"
              className={`pp-mode-btn ${isLive ? "active" : ""}`}
              onClick={() => setMode("live")}
            >
              Live
            </button>
            <button
              type="button"
              className={`pp-mode-btn ${!isLive ? "active" : ""}`}
              onClick={() => setMode("manual")}
            >
              Manual
            </button>
          </div>

          <div className="pp-header-status">
            <span className={`pp-status-pill ${badge.cls}`}>
              <span className="pp-status-dot" />
              {badge.label}
            </span>
          </div>
        </div>
      </header>

      {isLive && liveState.status !== "live" && (
        <div className="pp-banner">
          {liveState.message} You can switch to{" "}
          <button type="button" className="linklike" onClick={() => setMode("manual")}>
            Manual Mode
          </button>{" "}
          to draft by hand.
        </div>
      )}

      <main className="pp-main">
        {isLive ? (
          <div className="pp-glow pp-glow-blue" aria-hidden />
        ) : (
          <div className="pp-glow pp-glow-gold" aria-hidden />
        )}

        <aside className="pp-sidebar pp-sidebar-left">
          <div className="pp-section-label">Your Profile</div>
          <div className="pp-panel-card">
            <ProfilePanel profile={profile} setProfile={setProfile} defaultOpen />
          </div>
        </aside>

        <section className="pp-board">
          <div className="pp-board-header">
            <div className="pp-section-label">Draft Board</div>
            <div className="pp-board-actions">
              {!isLive && (
                <button type="button" className="btn ghost small" onClick={resetManual}>
                  Reset
                </button>
              )}
              <span className="muted pp-board-meta">Pick order · Ranked Solo</span>
            </div>
          </div>

          <div className="pp-team-label pp-team-blue">
            <span className="pp-team-dot" />
            <span className="pp-team-name">Blue Side</span>
            <span className="muted">· Your Team</span>
          </div>
          <div className="pp-slots-grid">
            {blue.map((champ, i) => (
              <DraftSlot
                key={`b-${i}`}
                index={i}
                champ={champ}
                team="blue"
                size={72}
                readOnly={isLive}
                isSelf={(isLive && liveState.blue?.[i]?.isSelf) || i === myPickIndex}
                canMark={!isLive}
                myPickIndex={myPickIndex}
                onSlotClick={() => openSlot("blue", i)}
                onSetMyPick={() => setMyPick(i)}
                onSwap={() => swapPick(i)}
                onRoleChange={(role) => setSlotRole("blue", i, role)}
              />
            ))}
          </div>

          <div className="pp-vs">
            <div className="pp-vs-line" />
            <span className="pp-vs-text">VS</span>
            <div className="pp-vs-line pp-vs-line-right" />
          </div>

          <div className="pp-team-label pp-team-red">
            <span className="pp-team-dot" />
            <span className="pp-team-name">Red Side</span>
            <span className="muted">· Enemy</span>
          </div>
          <div className="pp-slots-grid pp-slots-enemy">
            {red.map((champ, i) => (
              <DraftSlot
                key={`r-${i}`}
                index={i}
                champ={champ}
                team="red"
                size={56}
                readOnly={isLive}
                onSlotClick={() => openSlot("red", i)}
                onRoleChange={(role) => setSlotRole("red", i, role)}
              />
            ))}
          </div>
        </section>

        <aside className="pp-sidebar pp-sidebar-right">
          <div className="pp-section-label">Recommendations</div>
          <div className="pp-panel-card">
            <Recommendations
              result={result}
              myRole={myRole}
              onRoleChange={changeMyRole}
              roles={ROLES}
              profileEmpty={profileEmpty}
              onPick={isLive ? null : fillMyPick}
              myPickSet={!isLive && myPickIndex != null}
            />
          </div>
        </aside>
      </main>

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
    </div>
  );
}

function DraftSlot({
  index,
  champ,
  team,
  size,
  readOnly,
  isSelf = false,
  canMark = false,
  myPickIndex = null,
  onSlotClick,
  onSetMyPick,
  onSwap,
  onRoleChange,
}) {
  const isAlly = team === "blue";
  const hasMyPick = myPickIndex != null;
  const showSwap = canMark && hasMyPick && index !== myPickIndex;

  return (
    <div className={`pp-slot ${isAlly ? "pp-slot-ally" : "pp-slot-enemy"}`}>
      <div className="pp-slot-top">
        <span className="pp-slot-pick">Pick {index + 1}</span>
        {canMark && (
          <button
            type="button"
            className={`pp-my-pick-btn ${index === myPickIndex ? "active" : ""}`}
            onClick={onSetMyPick}
            title={index === myPickIndex ? "Your pick (click to clear)" : "Set as my pick"}
            aria-pressed={index === myPickIndex}
          >
            {index === myPickIndex ? "★" : "☆"}
          </button>
        )}
        {showSwap && (
          <button
            type="button"
            className="pp-swap-btn"
            onClick={onSwap}
            title="Swap your pick position with this slot"
            aria-label={`Swap with Pick ${index + 1}`}
          >
            ⇄
          </button>
        )}
      </div>

      <button
        type="button"
        className={`pp-slot-icon-btn ${champ ? "filled" : "empty"} ${readOnly ? "readonly" : ""} ${isSelf ? "self" : ""}`}
        onClick={onSlotClick}
        disabled={readOnly}
      >
        {champ ? (
          <ChampionIcon name={champ.name} size={size} />
        ) : (
          <span className="pp-slot-empty" style={{ width: size, height: size }}>
            +
          </span>
        )}
        {isSelf && <span className="pp-you-badge">YOU</span>}
      </button>

      <span className="pp-slot-name">{champ ? champ.name : "—"}</span>

      {champ &&
        (readOnly ? (
          <span className={`pp-role-pill ${isAlly ? "ally" : "enemy"}`}>
            {ROLE_SHORT[champ.role] || "?"}
          </span>
        ) : (
          <select
            className={`pp-role-select ${isAlly ? "ally" : "enemy"}`}
            value={champ.role || ""}
            onChange={(e) => onRoleChange(e.target.value)}
            title="Role"
          >
            {!champ.role && <option value="">Role…</option>}
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_SHORT[r]}
              </option>
            ))}
          </select>
        ))}
    </div>
  );
}
