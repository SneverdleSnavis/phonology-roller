// Parser check: fills every built-in card with random rolls and prints the result.
// Usage: node scripts/check-cards.js [path/to/phonology-challenge.html]
//
// It pulls the pure parsing and rendering code out of the page (everything between
// 'use strict' and the Dice section) and runs it in Node, so no browser is needed.
const fs = require("fs");
const path = require("path");

const file = process.argv[2] || path.join(__dirname, "..", "phonology-challenge.html");
const html = fs.readFileSync(file, "utf8");
const a = html.indexOf("'use strict';");
const b = html.indexOf("/* ---------- Dice");
if (a < 0 || b < 0) throw new Error("Couldn't find the parser section markers in " + file);

const harness = `
globalThis.matchMedia = () => ({ matches: false });
${html.slice(a, b)}
const { cards, problems } = parseLibrary(DEFAULT_SOURCE);
console.log(cards.length + " cards" + (problems.length ? ", problems: " + JSON.stringify(problems) : ""));
let warned = 0;
for (const c of cards) {
  const values = [];
  for (let i = 0; i < c.slots.length; i++) {
    const sl = c.slots[i];
    if (condState(sl.cond, values) === "unmet") { values[i] = { skipped: true }; continue; }
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
`;
new Function(harness)();
