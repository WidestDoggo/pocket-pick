// Champion dataset for the Draft Companion.
//
// This is intentionally self-contained (no external API / images). Each entry
// carries the metadata the DraftEngine needs to reason about team comps:
//
//   riotId  -> numeric id used by the LCU API (for Live Sync name matching)
//   name    -> display name (also matched against LCU `championName`)
//   roles   -> ["TOP","JUNGLE","MID","ADC","SUPPORT"]
//   damage  -> "AD" | "AP" | "MIXED" | "TRUE"
//   tags    -> trait vocabulary consumed by the engine, e.g.
//              engage, frontline, tank, peel, poke, mobility, cc, dive,
//              antiTank, scaling, waveclear, splitpush, sustain, hypercarry,
//              assassin, enchanter, pick, lowMobility
//
// The list covers the most-picked champions across roles. It is easy to extend:
// just add another object with the same shape.

export const CHAMPIONS = [
  // --- Top ------------------------------------------------------------------
  { riotId: 122, name: "Darius", roles: ["TOP"], damage: "AD", tags: ["frontline", "antiTank", "lowMobility", "sustain"] },
  { riotId: 86, name: "Garen", roles: ["TOP"], damage: "AD", tags: ["frontline", "tank", "antiTank", "lowMobility"] },
  { riotId: 24, name: "Jax", roles: ["TOP", "JUNGLE"], damage: "MIXED", tags: ["splitpush", "scaling", "mobility", "antiTank"] },
  { riotId: 92, name: "Riven", roles: ["TOP"], damage: "AD", tags: ["mobility", "dive", "assassin", "engage"] },
  { riotId: 54, name: "Malphite", roles: ["TOP"], damage: "AP", tags: ["frontline", "tank", "engage", "cc", "antiTank", "lowMobility"] },
  { riotId: 75, name: "Nasus", roles: ["TOP"], damage: "AD", tags: ["scaling", "splitpush", "frontline", "lowMobility", "sustain"] },
  { riotId: 58, name: "Renekton", roles: ["TOP"], damage: "AD", tags: ["frontline", "dive", "engage", "sustain"] },
  { riotId: 78, name: "Poppy", roles: ["TOP", "JUNGLE"], damage: "AD", tags: ["frontline", "tank", "peel", "cc", "antiDive"] },
  { riotId: 17, name: "Teemo", roles: ["TOP"], damage: "AP", tags: ["poke", "splitpush", "lowMobility"] },
  { riotId: 14, name: "Sion", roles: ["TOP"], damage: "AD", tags: ["frontline", "tank", "engage", "cc"] },
  { riotId: 23, name: "Tryndamere", roles: ["TOP"], damage: "AD", tags: ["splitpush", "scaling", "hypercarry", "mobility"] },
  { riotId: 39, name: "Irelia", roles: ["TOP", "MID"], damage: "AD", tags: ["mobility", "dive", "scaling", "cc"] },
  { riotId: 114, name: "Fiora", roles: ["TOP"], damage: "AD", tags: ["splitpush", "scaling", "antiTank", "mobility", "hypercarry"] },
  { riotId: 79, name: "Gnar", roles: ["TOP"], damage: "MIXED", tags: ["frontline", "engage", "poke", "cc"] },
  { riotId: 516, name: "Ornn", roles: ["TOP"], damage: "AP", tags: ["frontline", "tank", "engage", "cc", "antiTank", "lowMobility"] },
  { riotId: 875, name: "Sett", roles: ["TOP", "SUPPORT"], damage: "AD", tags: ["frontline", "engage", "cc", "sustain"] },
  { riotId: 887, name: "Gwen", roles: ["TOP"], damage: "AP", tags: ["antiTank", "scaling", "mobility", "splitpush"] },

  // --- Jungle ---------------------------------------------------------------
  { riotId: 64, name: "Lee Sin", roles: ["JUNGLE"], damage: "AD", tags: ["mobility", "dive", "pick", "engage"] },
  { riotId: 121, name: "Kha'Zix", roles: ["JUNGLE"], damage: "AD", tags: ["assassin", "pick", "mobility", "dive"] },
  { riotId: 11, name: "Master Yi", roles: ["JUNGLE"], damage: "AD", tags: ["hypercarry", "scaling", "mobility", "splitpush"] },
  { riotId: 234, name: "Viego", roles: ["JUNGLE"], damage: "AD", tags: ["scaling", "mobility", "dive", "assassin"] },
  { riotId: 60, name: "Elise", roles: ["JUNGLE"], damage: "AP", tags: ["pick", "dive", "engage"] },
  { riotId: 76, name: "Nidalee", roles: ["JUNGLE"], damage: "AP", tags: ["poke", "mobility", "pick"] },
  { riotId: 33, name: "Rammus", roles: ["JUNGLE"], damage: "MIXED", tags: ["frontline", "tank", "engage", "antiTank", "cc"] },
  { riotId: 113, name: "Sejuani", roles: ["JUNGLE"], damage: "AP", tags: ["frontline", "tank", "engage", "cc", "antiDive"] },
  { riotId: 154, name: "Zac", roles: ["JUNGLE"], damage: "AP", tags: ["frontline", "tank", "engage", "cc"] },
  { riotId: 32, name: "Amumu", roles: ["JUNGLE", "SUPPORT"], damage: "AP", tags: ["frontline", "tank", "engage", "cc"] },
  { riotId: 421, name: "Rek'Sai", roles: ["JUNGLE"], damage: "AD", tags: ["dive", "engage", "mobility"] },
  { riotId: 203, name: "Kindred", roles: ["JUNGLE"], damage: "AD", tags: ["scaling", "hypercarry", "poke", "mobility"] },
  { riotId: 200, name: "Bel'Veth", roles: ["JUNGLE"], damage: "AD", tags: ["scaling", "hypercarry", "mobility", "antiTank"] },
  { riotId: 245, name: "Ekko", roles: ["JUNGLE", "MID"], damage: "AP", tags: ["assassin", "mobility", "dive", "cc"] },
  { riotId: 5, name: "Xin Zhao", roles: ["JUNGLE"], damage: "AD", tags: ["frontline", "dive", "engage", "cc"] },

  // --- Mid ------------------------------------------------------------------
  { riotId: 103, name: "Ahri", roles: ["MID"], damage: "AP", tags: ["pick", "mobility", "poke", "assassin"] },
  { riotId: 1, name: "Annie", roles: ["MID", "SUPPORT"], damage: "AP", tags: ["engage", "cc", "lowMobility"] },
  { riotId: 134, name: "Syndra", roles: ["MID"], damage: "AP", tags: ["poke", "pick", "cc", "scaling", "lowMobility"] },
  { riotId: 61, name: "Orianna", roles: ["MID"], damage: "AP", tags: ["poke", "cc", "engage", "scaling", "lowMobility"] },
  { riotId: 7, name: "LeBlanc", roles: ["MID"], damage: "AP", tags: ["assassin", "pick", "mobility"] },
  { riotId: 238, name: "Zed", roles: ["MID"], damage: "AD", tags: ["assassin", "pick", "mobility", "dive"] },
  { riotId: 91, name: "Talon", roles: ["MID"], damage: "AD", tags: ["assassin", "pick", "mobility", "dive"] },
  { riotId: 99, name: "Lux", roles: ["MID", "SUPPORT"], damage: "AP", tags: ["poke", "pick", "cc", "lowMobility"] },
  { riotId: 101, name: "Xerath", roles: ["MID", "SUPPORT"], damage: "AP", tags: ["poke", "cc", "lowMobility"] },
  { riotId: 112, name: "Viktor", roles: ["MID"], damage: "AP", tags: ["scaling", "waveclear", "poke", "lowMobility"] },
  { riotId: 50, name: "Swain", roles: ["MID", "SUPPORT"], damage: "AP", tags: ["frontline", "sustain", "cc", "engage"] },
  { riotId: 13, name: "Ryze", roles: ["MID"], damage: "AP", tags: ["scaling", "waveclear", "lowMobility"] },
  { riotId: 4, name: "Twisted Fate", roles: ["MID"], damage: "AP", tags: ["pick", "poke", "waveclear", "lowMobility"] },
  { riotId: 105, name: "Fizz", roles: ["MID"], damage: "AP", tags: ["assassin", "mobility", "dive", "pick"] },
  { riotId: 246, name: "Qiyana", roles: ["MID"], damage: "AD", tags: ["assassin", "pick", "engage", "cc", "mobility"] },
  { riotId: 142, name: "Zoe", roles: ["MID"], damage: "AP", tags: ["poke", "pick", "lowMobility"] },
  { riotId: 136, name: "Aurelion Sol", roles: ["MID"], damage: "AP", tags: ["scaling", "poke", "waveclear"] },

  // --- ADC ------------------------------------------------------------------
  { riotId: 22, name: "Ashe", roles: ["ADC"], damage: "AD", tags: ["poke", "cc", "engage", "lowMobility", "pick"] },
  { riotId: 51, name: "Caitlyn", roles: ["ADC"], damage: "AD", tags: ["poke", "scaling", "lowMobility"] },
  { riotId: 222, name: "Jinx", roles: ["ADC"], damage: "AD", tags: ["scaling", "hypercarry", "waveclear", "lowMobility"] },
  { riotId: 67, name: "Vayne", roles: ["ADC", "TOP"], damage: "AD", tags: ["antiTank", "scaling", "hypercarry", "mobility"] },
  { riotId: 236, name: "Lucian", roles: ["ADC"], damage: "AD", tags: ["mobility", "poke", "dive"] },
  { riotId: 81, name: "Ezreal", roles: ["ADC"], damage: "MIXED", tags: ["poke", "mobility", "scaling"] },
  { riotId: 145, name: "Kai'Sa", roles: ["ADC"], damage: "MIXED", tags: ["scaling", "hypercarry", "dive", "mobility"] },
  { riotId: 202, name: "Jhin", roles: ["ADC"], damage: "AD", tags: ["poke", "pick", "cc", "lowMobility"] },
  { riotId: 429, name: "Kalista", roles: ["ADC"], damage: "AD", tags: ["mobility", "antiTank", "dive"] },
  { riotId: 498, name: "Xayah", roles: ["ADC"], damage: "AD", tags: ["scaling", "peel", "cc", "mobility"] },
  { riotId: 18, name: "Tristana", roles: ["ADC"], damage: "AD", tags: ["scaling", "hypercarry", "mobility", "dive"] },
  { riotId: 110, name: "Varus", roles: ["ADC"], damage: "MIXED", tags: ["poke", "cc", "engage", "lowMobility"] },
  { riotId: 96, name: "Kog'Maw", roles: ["ADC"], damage: "MIXED", tags: ["scaling", "hypercarry", "antiTank", "lowMobility"] },
  { riotId: 21, name: "Miss Fortune", roles: ["ADC"], damage: "AD", tags: ["poke", "waveclear", "lowMobility"] },

  // --- Support --------------------------------------------------------------
  { riotId: 412, name: "Thresh", roles: ["SUPPORT"], damage: "AP", tags: ["engage", "peel", "pick", "cc"] },
  { riotId: 555, name: "Pyke", roles: ["SUPPORT"], damage: "AD", tags: ["pick", "assassin", "mobility", "engage", "cc"] },
  { riotId: 53, name: "Blitzcrank", roles: ["SUPPORT"], damage: "AP", tags: ["pick", "engage", "cc", "lowMobility"] },
  { riotId: 89, name: "Leona", roles: ["SUPPORT"], damage: "AP", tags: ["engage", "frontline", "tank", "cc"] },
  { riotId: 111, name: "Nautilus", roles: ["SUPPORT"], damage: "AP", tags: ["engage", "frontline", "tank", "cc", "pick"] },
  { riotId: 117, name: "Lulu", roles: ["SUPPORT"], damage: "AP", tags: ["enchanter", "peel", "cc", "sustain"] },
  { riotId: 16, name: "Soraka", roles: ["SUPPORT"], damage: "AP", tags: ["enchanter", "sustain", "scaling", "peel"] },
  { riotId: 40, name: "Janna", roles: ["SUPPORT"], damage: "AP", tags: ["enchanter", "peel", "cc", "antiDive"] },
  { riotId: 267, name: "Nami", roles: ["SUPPORT"], damage: "AP", tags: ["enchanter", "peel", "cc", "sustain"] },
  { riotId: 350, name: "Yuumi", roles: ["SUPPORT"], damage: "AP", tags: ["enchanter", "sustain", "peel", "scaling"] },
  { riotId: 497, name: "Rakan", roles: ["SUPPORT"], damage: "AP", tags: ["engage", "peel", "cc", "mobility"] },
  { riotId: 235, name: "Senna", roles: ["SUPPORT", "ADC"], damage: "AD", tags: ["poke", "scaling", "peel", "lowMobility"] },
  { riotId: 25, name: "Morgana", roles: ["SUPPORT", "MID"], damage: "AP", tags: ["peel", "pick", "cc", "antiDive"] },
  { riotId: 201, name: "Braum", roles: ["SUPPORT"], damage: "AP", tags: ["frontline", "tank", "peel", "cc", "antiDive"] },
  { riotId: 161, name: "Vel'Koz", roles: ["SUPPORT", "MID"], damage: "AP", tags: ["poke", "cc", "lowMobility"] },
  { riotId: 43, name: "Karma", roles: ["SUPPORT"], damage: "AP", tags: ["enchanter", "poke", "peel", "cc"] },
];

// Quick lookups for the rest of the app.
export const CHAMPIONS_BY_ID = Object.fromEntries(
  CHAMPIONS.map((c) => [c.riotId, c]),
);

export const CHAMPIONS_BY_NAME = Object.fromEntries(
  CHAMPIONS.map((c) => [c.name.toLowerCase(), c]),
);

export const ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"];

export function findChampion({ riotId, name }) {
  if (riotId && CHAMPIONS_BY_ID[riotId]) return CHAMPIONS_BY_ID[riotId];
  if (name && CHAMPIONS_BY_NAME[name.toLowerCase()]) {
    return CHAMPIONS_BY_NAME[name.toLowerCase()];
  }
  return null;
}
