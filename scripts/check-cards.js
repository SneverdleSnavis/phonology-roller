// Parser check: fills every built-in card with random rolls (dealing phoneme hands too) and prints the result,
// plus the named lists, tags and families the card list uses. Then it plays random games through the
// language profile (Phase 3), rolling only values that aren't crossed out, and reports any clash that
// still reaches a deck, any card left with nothing to roll, and how long the pile check takes. The game layer
// (Phase 7) is played too: power-ups become tokens (at most 3), Re-roll and Flip tokens change a random kept card,
// curses change the cards drawn while they last, and the deck is checked again after each change.
// Usage: node scripts/check-cards.js [path/to/phonology-challenge.html] [games]
//
// It pulls the pure parsing and rendering code out of the page (everything between
// 'use strict' and the Dice section) and runs it in Node, so no browser is needed.
const fs = require("fs");
const path = require("path");

const file = process.argv[2] || path.join(__dirname, "..", "phonology-challenge.html");
const GAMES = +(process.argv[3] || 30);
const html = fs.readFileSync(file, "utf8");
const a = html.indexOf("'use strict';");
const b = html.indexOf("/* ---------- Dice");
if (a < 0 || b < 0) throw new Error("Couldn't find the parser section markers in " + file);

const harness = `
globalThis.matchMedia = () => ({ matches: false });
${html.slice(a, b)}
const { cards, problems, lists } = parseLibrary(DEFAULT_SOURCE);
console.log(cards.length + " cards" + (problems.length ? ", problems: " + JSON.stringify(problems) : ""));
for (const d of Object.values(lists)) {
  const uses = cards.reduce((n, c) => n + c.slots.filter((s) => s.list === d.name).length, 0);
  const typed = d.types ? " · types: " + d.options.map((o, i) => o + (d.types[i] ? "=" + d.types[i] : "")).join(", ") : "";
  console.log("@" + d.name.padEnd(9) + " " + d.options.length + " options, used " + uses + "x" + typed + (d.warnings.length ? "  !! " + d.warnings.join(" / ") : "") + (uses ? "" : "  !! not used"));
}
let warned = 0;
for (const c of cards) {
  const values = [];
  for (let i = 0; i < c.slots.length; i++) {
    const sl = c.slots[i];
    if (condState(sl.cond, values) === "unmet") { values[i] = { skipped: true }; continue; }
    if (sl.kind === "pool") {
      const hand = dealHand(sl, values.filter((v) => v && v.sym).map((v) => v.sym));
      if (!hand.length) { values[i] = { n: 0, of: 0, sym: null, label: "no phoneme" }; continue; }
      const n = rollValue(hand.length);
      values[i] = { n, of: hand.length, sym: hand[n - 1], label: phonemeLabel(hand[n - 1]) };
      continue;
    }
    let n;
    do { n = rollValue(sl.sides); } while (sl.options && n > sl.options.length);
    const label = sl.options ? sl.options[n - 1] : String(n * (sl.mult || 1) + (sl.offset || 0));
    values[i] = { n, label };
  }
  if (c.warnings.length) warned++;
  console.log(
    c.rank.padEnd(4) + " " + c.name.padEnd(26) + " | " + c.slots.map(dieName).join(" ").padEnd(18) + " | " +
    ruleText(c, values) + (c.warnings.length ? "  !! " + c.warnings.join(" / ") : "")
  );
}
console.log(warned + " card(s) with warnings");
const fams = {};
for (const c of cards) if (c.family) (fams[c.family] = fams[c.family] || []).push(c.name);
const tagged = {};
for (const c of cards) for (const k of Object.keys(c.tags)) tagged[k] = (tagged[k] || 0) + 1;
console.log("Tags: " + (Object.entries(tagged).map(([k, n]) => k + " on " + n).join(", ") || "none"));
console.log("Families: " + (Object.entries(fams).map(([f, n]) => f + " (" + n.join(", ") + ")").join("; ") || "none"));
const ids = new Set(cards.map((c) => c.id));
const lost = Object.values(RENAMED_IDS).filter((id) => !ids.has(id));
if (lost.length) console.log("!! RENAMED_IDS points at ids that no longer exist: " + lost.join(", "));
if (isLegacyDefault(DEFAULT_SOURCE)) console.log("!! DEFAULT_SOURCE is listed in LEGACY_DEFAULTS, so it would never load.");
const table = phonemes(), bands = {};
for (const p of table) bands[p.band] = (bands[p.band] || 0) + 1;
console.log(\`Phoneme table: \${table.length} of \${PHOIBLE_DATA.split(" ").filter(Boolean).length} PHOIBLE segments readable (\${Object.entries(bands).map(([b, n]) => n + " " + b).join(", ")}).\`);

// Cursed wording: every ceiling card under Exact count, and a few cards under Multiplier.
const fillRandom = (c) => { const v = []; c.slots.forEach((sl, i) => { if (condState(sl.cond, v) === "unmet") { v[i] = { skipped: true }; return; } const o = slotCandidates(sl, v, profileBase([], (id) => null, universeFrom(lists))); const x = o[rollValue(o.length) - 1]; v[i] = x ? (x.sym ? { n: x.n, label: x.label, sym: x.sym } : { n: x.n, label: x.label }) : { n: 0, sym: null, label: "none" }; }); return v; };
for (const c of cards.filter(isCeiling)) console.log("Exact count  | " + ruleText(cursedCard(c, [{ kind: "exact-count", name: "Exact count" }]), fillRandom(cursedCard(c, [{ kind: "exact-count", name: "Exact count" }]))));
for (const c of cards.filter((c) => cursesFor(c, [{ kind: "multiplier", name: "Multiplier", factor: 3 }]).length).slice(0, 4)) {
  const cc = cursedCard(c, [{ kind: "multiplier", name: "Multiplier", factor: 3 }]);
  console.log("Multiplier×3 | " + cc.slots.map(dieName).join(" ") + " | " + ruleText(cc, fillRandom(cc)));
}
const oddsCards = cards.filter((c) => cursesFor(c, [{ kind: "long-odds", name: "Long odds" }]).length);
console.log("Long odds acts on " + oddsCards.length + " cards: " + oddsCards.map((c) => c.name).join(", "));
for (const l of ["place", "manner", "vheight", "special"]) console.log("  @" + l + ": " + lists[l].options.map((o) => o + " " + (optionFreq({ list: l }, o) == null ? "?" : optionFreq({ list: l }, o).toFixed(0) + "%")).join(", "));

// Random games through the profile, with the game layer on: power-ups become tokens (at most 3), curses change
// the cards drawn while they last, and tokens are spent on kept cards at random.
const byId = new Map(cards.map((c) => [c.id, c])), uni = universeFrom(lists);
let worst = 0, forced = 0, crossed = 0, bad = 0, stuck = 0, keptN = 0;
const asideKinds = {}, mods = { tokens: 0, gaveUp: 0, changed: 0, curses: 0, cursedKept: 0, cleansed: 0, ended: 0 };
const cardFor = (id) => byId.get(id);
// Fills every empty slot of a card with a random value that isn't crossed out. null if one has nothing left.
function fill(card, values, base) {
  for (let i = 0; i < card.slots.length; i++) {
    if (values[i]) continue;
    if (condState(card.slots[i].cond, values) === "unmet") { values[i] = { skipped: true }; continue; }
    const st = slotChoices(card, values, i, base);
    crossed += st.crossed.length;
    if (!st.ok.length) { stuck++; console.log("!! nothing left to roll on " + card.name + (card.cursedBy ? " (cursed by " + card.cursedBy.map(curseLabel).join(", ") + ")" : "")); return null; }
    if (st.ok.length === 1 && st.crossed.length) forced++;
    const c = st.ok[rollValue(st.ok.length) - 1];
    values[i] = c.sym ? { n: c.n, label: c.label, sym: c.sym } : { n: c.n, label: c.label };
  }
  return values;
}
for (let g = 0; g < ${GAMES}; g++) {
  const deck = [];
  let tokens = [], curses = [];
  let pile = shuffle(cards.flatMap(copyIds));
  for (let turn = 0; turn < 30; turn++) {
    const t0 = Date.now();
    const base = profileBase(deck, cardFor, uni);
    const fams = new Map();
    deck.forEach((e) => { const c = byId.get(e.cardId); if (c && c.family) fams.set(c.family, e.name); });
    const drawn = (c) => cursedCard(c, cursesFor(c, curses));
    const open = pile.filter((id) => { const r = blockReason(drawn(byId.get(baseIdOf(id))), base, fams); if (r) asideKinds[r.kind] = (asideKinds[r.kind] || 0) + 1; return !r; });
    worst = Math.max(worst, Date.now() - t0);
    if (!open.length) break;
    const pid = open[0], card = drawn(byId.get(baseIdOf(pid)));
    pile = pile.filter((id) => id !== pid);
    // Spend a Re-roll, Flip or Cleanse token now and then.
    const tok = tokens[rollValue(tokens.length + 2) - 1];
    if (tok && tok.kind === "cleanse" && curses.length) { curses.splice(rollValue(curses.length) - 1, 1); tokens = tokens.filter((t) => t !== tok); mods.cleansed++; }
    if (tok && (tok.kind === "reroll" || tok.kind === "flip")) {
      const targets = modTargets(tok.kind, deck, cardFor, uni);
      if (targets.length) {
        tokens = tokens.filter((t) => t !== tok);
        const t = targets[rollValue(targets.length) - 1], sl = t.slots[rollValue(t.slots.length) - 1];
        const changed = changedSlots(t.card, sl.i);
        const values = clearSlots(t.values, changed);
        if (sl.flip) values[sl.i] = { n: sl.flip.n, label: sl.flip.label, flipped: tok.name };
        if (fill(t.card, values, t.base)) {
          deck[deck.indexOf(t.entry)] = changedEntry(t.entry, t.card, values, changed, tok.name);
          mods.changed++;
          const after = profileBase(deck, cardFor, uni);
          if (after.clashes.length) { bad++; console.log("!! clash after " + tok.name + " changed " + t.card.name + ": " + after.clashes.map((c) => c.text).join(" / ")); }
        }
      }
    }
    if (card.modifier) {
      if (tokens.length >= 3) { mods.gaveUp++; tokens.splice(rollValue(4) - 1, 1); }
      if (tokens.length < 3) { tokens.push({ kind: card.modifier, name: card.name }); mods.tokens++; }
      continue;
    }
    if (card.curse) {
      const values = fill(card, [], base) || [];
      const k = curseFrom(card, values);
      curses = curses.filter((x) => x.kind !== k.kind).concat(k);
      mods.curses++;
      continue;
    }
    const values = fill(card, [], base) || [];
    const e = { id: "e" + turn, cardId: card.id, name: card.name, createdAt: turn, rolled: rolledFacts(card, values), rolls: rollSummary(card, values) };
    if (card.cursedBy) { e.curse = card.cursedBy; mods.cursedKept++; }
    const syms = values.filter((v) => v && v.sym).map((v) => v.sym);
    if (syms.length) e.phonemes = syms;
    deck.push(e); keptN++;
    // The counters count kept cards; Exact count only the ceiling cards it changed.
    const hit = new Set((card.cursedBy || []).map((k) => k.kind));
    curses.forEach((k) => { if (k.kind !== "exact-count" || hit.has("exact-count")) k.left--; });
    mods.ended += curses.filter((k) => k.left <= 0).length;
    curses = curses.filter((k) => k.left > 0);
    const after = profileBase(deck, cardFor, uni);
    if (after.clashes.length) { bad++; console.log("!! clash after keeping " + card.name + (card.cursedBy ? " (cursed)" : "") + ": " + after.clashes.map((c) => c.text).join(" / ")); }
  }
}
console.log(\`Profile: ${GAMES} games, \${keptN} cards kept (\${mods.cursedKept} cursed), \${crossed} values crossed out, \${forced} set without a roll, \${bad} clashes reached a deck, \${stuck} cards stuck. Set-aside checks: \${Object.entries(asideKinds).map(([k, n]) => k + " " + n).join(", ") || "none"}. Game layer: \${mods.tokens} tokens taken, \${mods.gaveUp} given up at the cap, \${mods.changed} kept cards changed, \${mods.curses} curses taken, \${mods.ended} ran out, \${mods.cleansed} cleansed. Slowest pile check: \${worst} ms.\`);
`;
new Function(harness)();
