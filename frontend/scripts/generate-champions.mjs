// Champion-roster generator.
//
// Produces `src/champions.data.js` — the full ~170-champion dataset the app
// imports — by merging two sources:
//   1. CURATED (src/champions.curated.js) — hand-tuned, authoritative. Always wins.
//   2. Auto-generated entries for every other champion in the game, derived from
//      Riot Data Dragon (canonical id/name/class/damage) + Meraki Analytics
//      (adaptive damage type + subclass roles).
//
// Lane positions are not published as static data anywhere, so they come from
// the LANES table below (hand-authored) with a class-based heuristic fallback.
// All of these are user-overridable in the app, so approximate is fine.
//
// Usage:  node scripts/generate-champions.mjs
// This is a BUILD-TIME tool — the app itself never hits a CDN at runtime.

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { CURATED } from "../src/champions.curated.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/champions.data.js");

// Hand-authored primary (and common secondary) lanes for champions not in the
// curated set. Anything missing here falls back to a class-based guess.
const LANES = {
  Aatrox: ["TOP"], Akshan: ["MID", "ADC"], Alistar: ["SUPPORT"], Ambessa: ["TOP"],
  Anivia: ["MID"], Aphelios: ["ADC"], Aurora: ["MID", "TOP"], Azir: ["MID"],
  Bard: ["SUPPORT"], Brand: ["SUPPORT", "MID"], Briar: ["JUNGLE"], Camille: ["TOP", "JUNGLE"],
  Cassiopeia: ["MID"], Corki: ["MID", "ADC"], Diana: ["JUNGLE", "MID"], "Dr. Mundo": ["TOP", "JUNGLE"],
  Draven: ["ADC"], Evelynn: ["JUNGLE"], Fiddlesticks: ["JUNGLE", "SUPPORT"], Galio: ["MID", "SUPPORT"],
  Gangplank: ["TOP"], Graves: ["JUNGLE"], Gragas: ["JUNGLE", "TOP"], Hecarim: ["JUNGLE"],
  Heimerdinger: ["MID", "SUPPORT"], Hwei: ["MID", "SUPPORT"], Illaoi: ["TOP"], Ivern: ["JUNGLE"],
  "Jarvan IV": ["JUNGLE", "TOP"], Jayce: ["TOP", "MID"], "K'Sante": ["TOP"], Karthus: ["JUNGLE", "MID"],
  Kassadin: ["MID"], Katarina: ["MID"], Kayn: ["JUNGLE"], Kennen: ["TOP", "MID"],
  Kled: ["TOP"], Lillia: ["JUNGLE"], Lissandra: ["MID"], Malzahar: ["MID"],
  Maokai: ["SUPPORT", "TOP"], Mel: ["MID", "SUPPORT"], Milio: ["SUPPORT"], Naafiri: ["MID", "JUNGLE"],
  Neeko: ["MID", "SUPPORT"], Nilah: ["ADC"], Nocturne: ["JUNGLE"], "Nunu & Willump": ["JUNGLE"],
  Olaf: ["TOP", "JUNGLE"], Pantheon: ["TOP", "SUPPORT"], Quinn: ["TOP", "ADC"], Rell: ["SUPPORT"],
  "Renata Glasc": ["SUPPORT"], Rengar: ["JUNGLE", "TOP"], Rumble: ["TOP", "MID"], Samira: ["ADC"],
  Seraphine: ["SUPPORT", "MID"], Shaco: ["JUNGLE", "SUPPORT"], Shen: ["TOP", "SUPPORT"], Shyvana: ["JUNGLE"],
  Singed: ["TOP"], Sivir: ["ADC"], Skarner: ["JUNGLE"], Smolder: ["ADC"],
  Sona: ["SUPPORT"], Sylas: ["MID", "JUNGLE"], "Tahm Kench": ["TOP", "SUPPORT"], Taliyah: ["JUNGLE", "MID"],
  Taric: ["SUPPORT"], Trundle: ["JUNGLE", "TOP"], Udyr: ["JUNGLE"], Urgot: ["TOP"],
  Vex: ["MID"], Vi: ["JUNGLE"], Vladimir: ["MID", "TOP"], Volibear: ["JUNGLE", "TOP"],
  Wukong: ["JUNGLE", "TOP"], Yasuo: ["MID", "TOP"], Yone: ["MID", "TOP"], Yorick: ["TOP"],
  Yunara: ["ADC"], Zeri: ["ADC"], Ziggs: ["MID", "ADC"], Zilean: ["SUPPORT", "MID"],
  Zyra: ["SUPPORT", "MID"],
};

// Subclass / class token -> engine trait tags.
const SUBCLASS_TAGS = {
  TANK: ["tank", "frontline", "cc"],
  VANGUARD: ["frontline", "tank", "engage", "cc"],
  WARDEN: ["frontline", "tank", "peel", "cc"],
  JUGGERNAUT: ["frontline", "antiTank", "sustain", "lowMobility"],
  DIVER: ["dive", "engage", "frontline"],
  FIGHTER: ["frontline", "dive"],
  SKIRMISHER: ["mobility", "antiTank", "splitpush", "scaling"],
  SLAYER: ["mobility", "dive"],
  ASSASSIN: ["assassin", "mobility", "dive", "pick"],
  MARKSMAN: ["scaling", "hypercarry", "lowMobility"],
  MAGE: ["poke", "scaling"],
  BURST: ["pick", "poke", "cc"],
  BATTLEMAGE: ["scaling", "sustain", "cc"],
  ARTILLERY: ["poke", "lowMobility"],
  ENCHANTER: ["enchanter", "peel", "sustain", "cc"],
  CATCHER: ["pick", "cc", "poke", "peel"],
  CONTROLLER: ["peel", "cc"],
  SPECIALIST: ["splitpush", "poke"],
  SUPPORT: ["enchanter", "peel", "cc"],
};

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${res.status}: ${url}`);
  return res.json();
}

function deriveDamage(meraki, dd) {
  const a = dd.info?.attack ?? 0;
  const m = dd.info?.magic ?? 0;
  if (Math.abs(a - m) <= 1 && Math.min(a, m) >= 6) return "MIXED";
  if (meraki?.adaptiveType === "MAGIC_DAMAGE") return "AP";
  if (meraki?.adaptiveType === "PHYSICAL_DAMAGE") return "AD";
  if (dd.tags?.includes("Marksman")) return "AD";
  if (dd.tags?.includes("Mage")) return "AP";
  return m > a ? "AP" : "AD";
}

function deriveTags(meraki, dd) {
  const tokens = new Set();
  (meraki?.roles || []).forEach((r) => tokens.add(String(r).toUpperCase()));
  (dd.tags || []).forEach((t) => tokens.add(String(t).toUpperCase()));
  const tags = new Set();
  for (const tok of tokens) (SUBCLASS_TAGS[tok] || []).forEach((t) => tags.add(t));
  if (tags.size === 0) tags.add("scaling");
  return [...tags];
}

function deriveLanes(name, meraki, dd) {
  if (LANES[name]) return LANES[name];
  const tok = new Set([
    ...(meraki?.roles || []).map((r) => String(r).toUpperCase()),
    ...(dd.tags || []).map((t) => String(t).toUpperCase()),
  ]);
  if (tok.has("MARKSMAN")) return ["ADC"];
  if (tok.has("ENCHANTER") || tok.has("CATCHER") || tok.has("CONTROLLER") || tok.has("SUPPORT"))
    return ["SUPPORT"];
  if (tok.has("MAGE") || tok.has("BURST") || tok.has("BATTLEMAGE") || tok.has("ARTILLERY"))
    return ["MID"];
  if (tok.has("ASSASSIN")) return ["MID"];
  if (tok.has("VANGUARD")) return ["JUNGLE"];
  if (tok.has("JUGGERNAUT") || tok.has("DIVER") || tok.has("SKIRMISHER") || tok.has("FIGHTER") || tok.has("TANK"))
    return ["TOP"];
  return ["MID"];
}

function serializeEntry(c) {
  const roles = c.roles.map((r) => `"${r}"`).join(", ");
  const tags = c.tags.map((t) => `"${t}"`).join(", ");
  return `  { riotId: ${c.riotId}, name: ${JSON.stringify(c.name)}, roles: [${roles}], damage: "${c.damage}", tags: [${tags}] },`;
}

async function main() {
  const versions = await getJson("https://ddragon.leagueoflegends.com/api/versions.json");
  const version = versions[0];
  const ddData = (await getJson(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
  )).data;
  let merakiById = {};
  try {
    const meraki = await getJson(
      "https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json",
    );
    merakiById = Object.fromEntries(
      Object.values(meraki).map((m) => [Number(m.key), m]),
    );
  } catch (e) {
    console.warn("Meraki unavailable, falling back to Data Dragon classes only:", e.message);
  }

  const curatedById = new Map(CURATED.map((c) => [c.riotId, c]));
  const generated = [];

  for (const dd of Object.values(ddData)) {
    const riotId = Number(dd.key);
    if (curatedById.has(riotId)) continue; // curated wins
    const meraki = merakiById[riotId];
    generated.push({
      riotId,
      name: dd.name,
      roles: deriveLanes(dd.name, meraki, dd),
      damage: deriveDamage(meraki, dd),
      tags: deriveTags(meraki, dd),
    });
  }
  generated.sort((a, b) => a.name.localeCompare(b.name));

  const header = `// AUTO-GENERATED by scripts/generate-champions.mjs — do not edit by hand.
//
// Full champion roster for the Draft Companion. Hand-tuned entries come from
// champions.curated.js (authoritative); the rest are derived from Riot Data
// Dragon (v${version}) + Meraki Analytics. Lanes/tags for generated entries are
// approximate and user-overridable in the app. To refine a champion, edit it in
// champions.curated.js and re-run the generator.
//
// Shape: { riotId, name, roles, damage, tags } — see champions.curated.js.

export const CHAMPIONS = [
`;

  const curatedBlock =
    "  // --- Curated (hand-tuned) -------------------------------------------------\n" +
    CURATED.map(serializeEntry).join("\n");
  const generatedBlock =
    "\n\n  // --- Auto-generated (rest of roster) --------------------------------------\n" +
    generated.map(serializeEntry).join("\n");

  await writeFile(OUT, header + curatedBlock + generatedBlock + "\n];\n", "utf8");
  console.log(
    `Wrote ${CURATED.length + generated.length} champions (${CURATED.length} curated + ${generated.length} generated) to champions.data.js`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
