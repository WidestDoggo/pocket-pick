import React from "react";
import { ChampionIcon } from "./ChampionIcon.jsx";

/**
 * Renders the engine's draft analysis plus the top recommendations, filtered
 * through the user's personal profile.
 */
export function Recommendations({
  result,
  myRole,
  onRoleChange,
  roles,
  profileEmpty,
  onPick = null,
  myPickSet = false,
}) {
  const { analysis, recommendations } = result;
  const needs = Object.values(analysis.needs);
  const canPick = typeof onPick === "function";

  return (
    <aside className="reco-panel">
      <div className="reco-header">
        <h2>Recommendations</h2>
        <label className="role-select">
          Your role
          <select value={myRole} onChange={(e) => onRoleChange(e.target.value)}>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
      </div>

      {profileEmpty ? (
        <p className="muted">
          Add your Mains and Pocket Picks in <strong>Profile Configuration</strong>{" "}
          to unlock personalized advice.
        </p>
      ) : recommendations.length === 0 ? (
        <p className="muted">
          No eligible picks from your profile for this board — every candidate may
          already be drafted.
        </p>
      ) : (
        <>
          {canPick && !myPickSet && (
            <p className="muted reco-hint">
              Mark your pick slot (★) on Blue Team to fill it with one click.
            </p>
          )}
          <ol className="reco-list">
            {recommendations.map((rec, i) => {
              const actionable = canPick && myPickSet;
              const body = (
                <>
                  <span className="rank">#{i + 1}</span>
                  <ChampionIcon name={rec.name} size={52} />
                  <div className="reco-body">
                    <div className="reco-title">
                      <strong>{rec.name}</strong>
                      <span className={`source-badge ${rec.source}`}>
                        {rec.source === "main" ? "Main" : rec.archetype || "Pocket"}
                      </span>
                    </div>
                    <p className="reco-reason">{rec.reason}</p>
                  </div>
                  {actionable && <span className="reco-use">Use ↵</span>}
                </>
              );
              return (
                <li key={rec.name} className={`reco-card rank-${i + 1}`}>
                  {actionable ? (
                    <button
                      type="button"
                      className="reco-card-btn"
                      onClick={() => onPick(rec)}
                      title={`Fill your pick with ${rec.name}`}
                    >
                      {body}
                    </button>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div className="analysis-block">
        <h3>Team Analysis</h3>
        <div className="analysis-row">
          <span className="label">Damage split</span>
          <span>
            {analysis.damageSplit.ad} AD · {analysis.damageSplit.ap} AP
          </span>
        </div>
        <div className="analysis-row">
          <span className="label">Comp gaps</span>
          <span className="gap-tags">
            {needs.length === 0 ? (
              <em className="muted">Balanced</em>
            ) : (
              needs.map((n, idx) => (
                <span key={idx} className="gap-tag" title={n.note}>
                  {n.note}
                </span>
              ))
            )}
          </span>
        </div>
        <div className="analysis-row">
          <span className="label">Enemy threats</span>
          <span className="gap-tags">
            {analysis.threats.length === 0 ? (
              <em className="muted">None flagged</em>
            ) : (
              analysis.threats.map((t) => (
                <span key={t} className="threat-tag">
                  {t}
                </span>
              ))
            )}
          </span>
        </div>
      </div>
    </aside>
  );
}
