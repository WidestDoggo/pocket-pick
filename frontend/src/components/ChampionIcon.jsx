import React from "react";

// A dependency-free champion "portrait": initials on a deterministic gradient
// derived from the champion name. No external images required.
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

function initials(name) {
  const cleaned = name.replace(/[^A-Za-z' ]/g, "");
  const parts = cleaned.split(/[\s']/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

export function ChampionIcon({ name, size = 56 }) {
  if (!name) {
    return (
      <span
        className="champ-icon empty-icon"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        +
      </span>
    );
  }
  const hue = hashHue(name);
  const style = {
    width: size,
    height: size,
    fontSize: size * 0.36,
    background: `linear-gradient(135deg, hsl(${hue} 55% 32%), hsl(${(hue + 40) % 360} 60% 20%))`,
    borderColor: `hsl(${hue} 60% 45%)`,
  };
  return (
    <span className="champ-icon" style={style} title={name}>
      {initials(name)}
    </span>
  );
}
