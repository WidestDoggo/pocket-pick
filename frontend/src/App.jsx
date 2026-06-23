import React, { useEffect, useMemo, useState } from "react";
import { ROLES, ROLE_LABELS, estimateRole } from "./champions.js";
import { recommend } from "./DraftEngine.js";
import { useDraftSync } from "./useDraftSync.js";
import { ChampionIcon } from "./components/ChampionIcon.jsx";
import { ChampionSelectModal } from "./components/ChampionSelectModal.jsx";
import { ProfilePanel } from "./components/ProfilePanel.jsx";
import { Recommendations } from "./components/Recommendations.jsx";

const PROFILE_KEY = "lol-draft-companion:profile";
const MODE_KEY = "lol-draft-companion:mode";
const MY_PICK_KEY = "lol-draft-companion:myPick";

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

// Convert the backend's live slot payload into the {name, riotId, role} shape
// the rest of the app uses. Roles are estimated greedily in pick order.
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

  // Manual-mode boards (local, editable).
  const [manualBlue, setManualBlue] = useState(emptyTeam);
  const [manualRed, setManualRed] = useState(emptyTeam);

  // Which Blue pick slot is "mine" (manual mode). null = none designated.
  const [myPickIndex, setMyPickIndex] = useState(() => {
    const raw = localStorage.getItem(MY_PICK_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 && n < 5 ? n : null;
  });

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
  useEffect(() => {
    if (myPickIndex == null) localStorage.removeItem(MY_PICK_KEY);
    else localStorage.setItem(MY_PICK_KEY, String(myPickIndex));
  }, [myPickIndex]);

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
      // Auto-estimate the role from the champion + roles already on this team
      // (the user can override it via the per-slot dropdown).
      const used = next
        .filter((s, i) => s && i !== modal.slot)
        .map((s) => s.role)
        .filter(Boolean);
      const role = estimateRole(champ, used);
      next[modal.slot] = { name: champ.name, riotId: champ.riotId, role };
      return next;
    });
    // Auto-sync "Your role" when filling your own designated pick slot.
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
    // One source of truth: editing your own slot's role updates "Your role".
    if (team === "blue" && slot === myPickIndex && role) setMyRole(role);
  };

  // --- "My pick" handlers ---------------------------------------------------
  // Designate which Blue slot is mine; adopt its role if it already has one.
  const setMyPick = (slot) => {
    if (isLive) return;
    setMyPickIndex((prev) => (prev === slot ? null : slot));
    const slotRole = manualBlue[slot]?.role;
    if (slotRole) setMyRole(slotRole);
  };

  // "Your role" selector — also mirror onto the designated slot (if filled).
  const changeMyRole = (role) => {
    setMyRole(role);
    if (myPickIndex != null && manualBlue[myPickIndex]) {
      setSlotRole("blue", myPickIndex, role);
    }
  };

  // Fill the designated slot with a recommended champion.
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

  // Swap my pick position with another Blue slot — champions trade places and
  // the "YOU" marker follows me to the new position (mirrors a champ-select swap).
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
            subtitle="Allies · set your teammates' roles"
            color="blue"
            slots={blue}
            readOnly={isLive}
            onSlotClick={(slot) => openSlot("blue", slot)}
            onRoleChange={(slot, role) => setSlotRole("blue", slot, role)}
            highlightSelf={isLive ? liveState.blue : null}
            myPickIndex={isLive ? null : myPickIndex}
            onSetMyPick={isLive ? null : setMyPick}
            onSwap={isLive ? null : swapPick}
          />
          <div className="versus">VS</div>
          <TeamColumn
            title="Red Team"
            subtitle="Enemies · roles auto-estimated"
            color="red"
            slots={red}
            readOnly={isLive}
            onSlotClick={(slot) => openSlot("red", slot)}
            onRoleChange={(slot, role) => setSlotRole("red", slot, role)}
            highlightSelf={isLive ? liveState.red : null}
          />
        </div>

        <Recommendations
          result={result}
          myRole={myRole}
          onRoleChange={changeMyRole}
          roles={ROLES}
          profileEmpty={profileEmpty}
          onPick={isLive ? null : fillMyPick}
          myPickSet={!isLive && myPickIndex != null}
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

function TeamColumn({
  title,
  subtitle,
  color,
  slots,
  readOnly,
  onSlotClick,
  onRoleChange,
  highlightSelf,
  myPickIndex = null,
  onSetMyPick = null,
  onSwap = null,
}) {
  const canMark = !readOnly && typeof onSetMyPick === "function";
  return (
    <section className={`team-column ${color}`}>
      <header className="team-header">
        <h2>{title}</h2>
        <span className="team-sub">{subtitle}</span>
      </header>
      <ul className="slot-list">
        {slots.map((champ, i) => {
          // "YOU" comes from live self-detection, or the manually designated pick.
          const isSelf = highlightSelf?.[i]?.isSelf || i === myPickIndex;
          const hasMyPick = myPickIndex != null;
          return (
            <li key={i} className="slot-row">
              {canMark && (
                <button
                  className={`set-pick-btn ${i === myPickIndex ? "active" : ""}`}
                  onClick={() => onSetMyPick(i)}
                  title={i === myPickIndex ? "This is your pick (click to clear)" : "Set as my pick"}
                  aria-pressed={i === myPickIndex}
                >
                  {i === myPickIndex ? "★" : "☆"}
                </button>
              )}
              <button
                className={`draft-slot ${champ ? "filled" : "empty"} ${
                  readOnly ? "readonly" : ""
                } ${isSelf ? "self" : ""}`}
                onClick={() => onSlotClick(i)}
                disabled={readOnly}
              >
                <ChampionIcon name={champ?.name} size={48} />
                <div className="slot-text">
                  <span className="slot-role">Pick {i + 1}</span>
                  <span className="slot-name">
                    {champ ? champ.name : readOnly ? "—" : "Empty · click to pick"}
                  </span>
                </div>
                {isSelf && <span className="you-badge">YOU</span>}
              </button>

              {canMark && hasMyPick && i !== myPickIndex && (
                <button
                  className="swap-btn"
                  onClick={() => onSwap(i)}
                  title="Swap your pick position with this slot"
                  aria-label={`Swap your pick position with Pick ${i + 1}`}
                >
                  ⇄
                </button>
              )}

              {champ &&
                (readOnly ? (
                  <span className="role-tag" title="Estimated role">
                    {ROLE_LABELS[champ.role] || "?"}
                  </span>
                ) : (
                  <select
                    className="slot-role-select"
                    value={champ.role || ""}
                    onChange={(e) => onRoleChange(i, e.target.value)}
                    title="Role"
                  >
                    {!champ.role && <option value="">Role…</option>}
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ))}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
