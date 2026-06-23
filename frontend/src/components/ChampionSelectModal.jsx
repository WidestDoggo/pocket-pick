import React, { useMemo, useState } from "react";
import { CHAMPIONS, ROLES } from "../champions.js";
import { ChampionIcon } from "./ChampionIcon.jsx";

/**
 * A searchable, role-filterable champion grid shown when a slot is clicked in
 * Manual Standalone Mode.
 */
export function ChampionSelectModal({ team, slot, taken, onPick, onClear, onClose }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CHAMPIONS.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (roleFilter !== "ALL" && !c.roles.includes(roleFilter)) return false;
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [query, roleFilter]);

  const teamLabel = team === "blue" ? "Blue (Allies)" : "Red (Enemies)";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Select Champion</h2>
            <p className="muted">
              {teamLabel} · Slot {slot + 1}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-controls">
          <input
            autoFocus
            className="search"
            placeholder="Search champions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="role-filters">
            <button
              className={roleFilter === "ALL" ? "chip active" : "chip"}
              onClick={() => setRoleFilter("ALL")}
            >
              All
            </button>
            {ROLES.map((r) => (
              <button
                key={r}
                className={roleFilter === r ? "chip active" : "chip"}
                onClick={() => setRoleFilter(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="champion-grid">
          {results.map((c) => {
            const isTaken = taken.has(c.name.toLowerCase());
            return (
              <button
                key={c.riotId}
                className={`champion-cell ${isTaken ? "disabled" : ""}`}
                disabled={isTaken}
                onClick={() => onPick(c)}
                title={isTaken ? `${c.name} is already drafted` : c.name}
              >
                <ChampionIcon name={c.name} size={48} />
                <span className="champion-cell-name">{c.name}</span>
              </button>
            );
          })}
          {results.length === 0 && (
            <p className="muted empty">No champions match your search.</p>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn ghost" onClick={onClear}>
            Clear Slot
          </button>
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
