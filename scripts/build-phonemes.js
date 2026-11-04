// Builds the trimmed PHOIBLE table inside phonology-challenge.html.
// Usage: node scripts/build-phonemes.js path/to/phoible.csv [--min 3]
//
// Get the CSV from the PHOIBLE 2.0 release (CC BY 4.0):
//   https://raw.githubusercontent.com/phoible/dev/v2.0/data/phoible.csv
//
// For each segment it counts the languages (distinct Glottocodes) that have it, drops tones and merged
// "a|b" segments, keeps segments found in at least --min languages, and keeps only those the page's own
// describePhoneme() can read. It rewrites PHOIBLE_LANGS and PHOIBLE_DATA in place and lists what it dropped.
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const minAt = args.indexOf("--min");
const MIN = minAt >= 0 ? +args[minAt + 1] : 3;
if (!csvPath) { console.error("Usage: node scripts/build-phonemes.js path/to/phoible.csv [--min 3]"); process.exit(1); }
const page = path.join(__dirname, "..", "phonology-challenge.html");

function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const [head, ...rows] = parseCSV(fs.readFileSync(csvPath, "utf8"));
const col = (n) => { const i = head.indexOf(n); if (i < 0) throw new Error("No column " + n); return i; };
const G = col("Glottocode"), P = col("Phoneme"), C = col("SegmentClass");
const langs = new Set(), bySeg = new Map();
for (const r of rows) {
  if (r.length < head.length) continue;
  langs.add(r[G]);
  if (r[C] === "tone" || r[P].includes("|")) continue;
  if (!bySeg.has(r[P])) bySeg.set(r[P], new Set());
  bySeg.get(r[P]).add(r[G]);
}

// Load the page's parser section, as check-cards.js does.
const html = fs.readFileSync(page, "utf8");
const a = html.indexOf("'use strict';"), b = html.indexOf("/* ---------- Dice");
const lib = new Function(`globalThis.matchMedia = () => ({ matches: false });\n${html.slice(a, b)}\nreturn { describePhoneme };`)();

const kept = [], dropped = [];
for (const [sym, g] of [...bySeg].sort((x, y) => y[1].size - x[1].size || (x[0] < y[0] ? -1 : 1))) {
  if (g.size < MIN) continue;
  if (lib.describePhoneme(sym)) kept.push(`${sym}=${g.size}`);
  else dropped.push(`${sym}(${g.size})`);
}

const data = kept.join(" ");
let out = html.replace(/const PHOIBLE_LANGS = \d+;/, `const PHOIBLE_LANGS = ${langs.size};`);
out = out.replace(/const PHOIBLE_DATA = "[^"]*";/, () => `const PHOIBLE_DATA = "${data}";`);
if (out === html && !html.includes(`const PHOIBLE_DATA = "${data}";`)) throw new Error("Couldn't find PHOIBLE_LANGS / PHOIBLE_DATA in the page.");
fs.writeFileSync(page, out);
console.log(`${langs.size} languages. Kept ${kept.length} segments found in ${MIN}+ languages (${(data.length / 1024).toFixed(1)} KB).`);
console.log(`Dropped ${dropped.length} the parser can't read (diphthongs and unusual notation):`);
console.log(dropped.join(" "));
