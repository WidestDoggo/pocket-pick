// DraftEngine — local, deterministic draft recommendation logic.
//
// The engine answers a single question: given the champions currently on the
// board and the user's *personal* champion pool, what are the two best picks
// for them right now, and why?
//
// It works in three passes:
//   1. analyzeDraft()   — read ally comp gaps + enemy threats from the board.
//   2. scoreCandidate() — grade each of the user's champions against those needs.
//   3. recommend()      — return the top 2 with a one-sentence rationale.
//
// Everything is filtered *strictly* through the user's saved profile: the
// engine will never suggest a champion the player has not registered as a Main
// (for their role) or a Pocket Pick.

import { findChampion } from "./champions.js";

// Pocket Pick archetypes map onto the trait vocabulary used in champions.js.
// This lets a user tag a champ as e.g. "Anti-Tank" and have the engine treat
// it as fulfilling the antiTank need even if metadata is sparse.
export const ARCHETYPES = [
  "Engage",
  "Anti-Tank",
  "AP Flex",
  "AD Carry",
  "Scaling Poke",
  "Pick / Catch",
  "Peel / Protect",
  "Frontline",
  "Assassin / Dive",
];

const ARCHETYPE_TAGS = {
  Engage: ["engage", "cc"],
  "Anti-Tank": ["antiTank"],
  "AP Flex": ["apDamage"],
  "AD Carry": ["adDamage", "scaling"],
  "Scaling Poke": ["poke", "scaling"],
  "Pick / Catch": ["pick", "cc"],
  "Peel / Protect": ["peel", "antiDive"],
  Frontline: ["frontline", "tank"],
  "Assassin / Dive": ["dive", "assassin"],
};

function resolveTeam(slots) {
  // slots: array of {riotId?, name?} | null  ->  array of champion objects.
  return (slots || [])
    .filter(Boolean)
    .map((slot) => findChampion(slot))
    .filter(Boolean);
}

function has(team, tag) {
  return team.some((c) => c.tags.includes(tag));
}

function count(team, tag) {
  return team.filter((c) => c.tags.includes(tag)).length;
}

/**
 * Inspect the board and return a structured read of ally gaps + enemy threats.
 */
export function analyzeDraft(blueSlots, redSlots) {
  const allies = resolveTeam(blueSlots);
  const enemies = resolveTeam(redSlots);

  const allyAP = allies.filter((c) => c.damage === "AP" || c.damage === "MIXED").length;
  const allyAD = allies.filter((c) => c.damage === "AD" || c.damage === "MIXED").length;

  const needs = {}; // tag -> weight

  const addNeed = (tag, weight, note) => {
    needs[tag] = { weight, note };
  };

  // --- Ally composition gaps ------------------------------------------------
  if (allies.length > 0) {
    if (!has(allies, "frontline") && !has(allies, "tank")) {
      addNeed("frontline", 4, "your team has no frontline to absorb damage");
    }
    if (!has(allies, "engage")) {
      addNeed("engage", 3, "your team lacks a reliable engage tool");
    }
    if (!has(allies, "peel") && !has(allies, "enchanter")) {
      addNeed("peel", 2, "no one can peel for your carries");
    }
    if (allyAP === 0) {
      addNeed("apDamage", 3, "your damage is fully physical and easy to itemize against");
    }
    if (allyAD === 0) {
      addNeed("adDamage", 3, "your damage is fully magical and easy to itemize against");
    }
    if (count(allies, "cc") < 1) {
      addNeed("cc", 2, "your team is short on crowd control");
    }
  }

  // --- Enemy threats --------------------------------------------------------
  const threats = [];
  const enemyTanks = count(enemies, "tank") + count(enemies, "frontline");
  const enemyDive = count(enemies, "dive") + count(enemies, "assassin");
  const enemyMobility = count(enemies, "mobility");
  const enemyLowMobility = count(enemies, "lowMobility");
  const enemyPoke = count(enemies, "poke");

  if (enemyTanks >= 2) {
    addNeed("antiTank", 4, "the enemy is stacking durable frontline");
    threats.push("Heavy frontline / tanks");
  }
  if (enemyDive >= 2) {
    addNeed("peel", 3, "the enemy has multiple dive threats");
    addNeed("antiDive", 3, "the enemy can collapse on your backline");
    threats.push("Heavy dive composition");
  }
  if (enemyLowMobility >= 2 && enemyMobility === 0) {
    addNeed("pick", 3, "immobile enemies are easy to catch out");
    threats.push("Low-mobility / catchable");
  }
  if (enemyPoke >= 2) {
    addNeed("engage", 2, "you must close the gap on a poke comp");
    threats.push("Poke / siege");
  }

  return {
    allies,
    enemies,
    needs,
    threats,
    damageSplit: { ad: allyAD, ap: allyAP },
  };
}

// Translate a champion + its profile archetype into the full set of tags the
// scorer should consider (real metadata tags + archetype-derived tags).
function effectiveTags(champion, archetype) {
  const tags = new Set(champion.tags);
  // Damage type contributes the synthetic apDamage / adDamage tags.
  if (champion.damage === "AP" || champion.damage === "MIXED") tags.add("apDamage");
  if (champion.damage === "AD" || champion.damage === "MIXED") tags.add("adDamage");
  if (archetype && ARCHETYPE_TAGS[archetype]) {
    ARCHETYPE_TAGS[archetype].forEach((t) => tags.add(t));
  }
  return tags;
}

function scoreCandidate(candidate, analysis) {
  const tags = effectiveTags(candidate.champion, candidate.archetype);
  let score = 0;
  let topNeed = null;
  let topWeight = 0;

  for (const [tag, info] of Object.entries(analysis.needs)) {
    if (tags.has(tag)) {
      score += info.weight;
      if (info.weight > topWeight) {
        topWeight = info.weight;
        topNeed = info;
      }
    }
  }

  // A small comfort bonus: a designated Main edges out a flex Pocket Pick when
  // they are otherwise equal in value.
  if (candidate.source === "main") score += 0.5;

  return { score, topNeed };
}

function buildReason(candidate, topNeed, analysis) {
  const name = candidate.champion.name;
  if (topNeed) {
    return `${name} directly addresses that ${topNeed.note}.`;
  }
  // No specific gap — fall back to a comfort / flexibility rationale.
  if (candidate.source === "main") {
    return `${name} is one of your mains and is a safe, comfortable pick into this board.`;
  }
  return `${name} is a flexible pocket pick that keeps your draft adaptable.`;
}

/**
 * Produce the top recommendations for the player.
 *
 * @param {Object}   opts
 * @param {Array}    opts.blue        Ally slots (5) — {riotId?,name?}|null.
 * @param {Array}    opts.red         Enemy slots (5).
 * @param {Object}   opts.profile     { mains: {ROLE:[name]}, pocketPicks:[{name,archetype}] }
 * @param {string}   opts.myRole      The player's role, e.g. "MID".
 * @param {number}   [opts.limit=2]   How many recommendations to return.
 * @returns {{ analysis, recommendations: Array }}
 */
export function recommend({ blue, red, profile, myRole, limit = 2 }) {
  const analysis = analyzeDraft(blue, red);

  // Names already on the board (either team) are unavailable to pick.
  const taken = new Set(
    [...resolveTeam(blue), ...resolveTeam(red)].map((c) => c.name.toLowerCase()),
  );

  // Assemble the candidate pool strictly from the user's profile.
  const pool = [];
  const seen = new Set();

  const addCandidate = (name, source, archetype) => {
    if (!name) return;
    const champion = findChampion({ name });
    if (!champion) return;
    const key = champion.name.toLowerCase();
    if (seen.has(key) || taken.has(key)) return;
    seen.add(key);
    pool.push({ champion, source, archetype });
  };

  const mains = (profile?.mains?.[myRole] || []);
  mains.forEach((n) => addCandidate(n, "main", null));
  (profile?.pocketPicks || []).forEach((p) => addCandidate(p.name, "pocket", p.archetype));

  const scored = pool
    .map((candidate) => {
      const { score, topNeed } = scoreCandidate(candidate, analysis);
      return {
        name: candidate.champion.name,
        riotId: candidate.champion.riotId,
        source: candidate.source,
        archetype: candidate.archetype || null,
        score,
        reason: buildReason(candidate, topNeed, analysis),
      };
    })
    .sort((a, b) => b.score - a.score);

  return { analysis, recommendations: scored.slice(0, limit) };
}
