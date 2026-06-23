/* apply-enrichment.js — surgically patch data/cards.js with VERIFIED lounge-term
 * changes from the enrichment workflow. Reads a JSON file of confirmed changes:
 *   [{ id, domesticVisits, period, railway, newConfidence, confirmedSource }]
 * For each, finds that card's block in cards.js (by id) and rewrites ONLY the
 * domesticVisits / period / railway / confidence / verify fields. Every other
 * card stays byte-for-byte unchanged, so the git diff is small and reviewable.
 *
 * HONESTY GUARD: only applies entries that carry a confirmedSource (i.e. the
 * adversarial verifier independently confirmed the term). Anything else is skipped.
 *
 * Run: node scripts/apply-enrichment.js /tmp/ll-confirmed.json
 */
const fs = require("fs");
const path = require("path");
const CARDS = path.join(__dirname, "..", "data", "cards.js");
const inputPath = process.argv[2];
if (!inputPath) { console.error("usage: node scripts/apply-enrichment.js <confirmed.json>"); process.exit(1); }

const confirmed = JSON.parse(fs.readFileSync(inputPath, "utf8"));
// accept either {confirmed:[...]} or a bare array
const changes = Array.isArray(confirmed) ? confirmed : (confirmed.confirmed || []);

// sanity: load current cards via shim so we can validate ids + see current values
global.window = {};
require(CARDS);
const byId = new Map(window.LL_CARDS.map((c) => [c.id, c]));

let src = fs.readFileSync(CARDS, "utf8");
const applied = [], skipped = [];

function fieldRe(field) {
  // matches `field: <value>` where value runs until the next comma-then-space-key
  // or the closing brace. Conservative: value is everything up to the next `, <key>:`
  return new RegExp("(" + field + ":\\s*)([^,}]*?)(\\s*(?:,\\s*[a-zA-Z]+:|\\s*}))");
}

for (const ch of changes) {
  const guard = ch.confirmedSource || ch.confirmed === true;
  if (!guard) { skipped.push({ id: ch.id, why: "no confirmedSource (not independently verified)" }); continue; }
  if (!byId.has(ch.id)) { skipped.push({ id: ch.id, why: "id not found in cards.js" }); continue; }

  // isolate this card's block: from the `{` that opens this card to its MATCHING
  // closing `}`. We must brace-count, because a nested spendGate object like
  // `spendGate: { amount: 50000, ... }` contains its own `},` that would
  // otherwise be mistaken for the card's end (silent partial-apply bug).
  const idTok = 'id: "' + ch.id + '"';
  const start = src.indexOf(idTok);
  if (start < 0) { skipped.push({ id: ch.id, why: "block not located in raw source" }); continue; }
  const braceStart = src.lastIndexOf("{", start);
  if (braceStart < 0) { skipped.push({ id: ch.id, why: "could not find block open" }); continue; }
  // walk forward from braceStart, tracking depth + string state, to the matching close
  let depth = 0, inStr = false, strCh = "", braceEnd = -1;
  for (let i = braceStart; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === "\\") { i++; continue; }
      if (c === strCh) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) { braceEnd = i; break; } }
  }
  if (braceEnd < 0) { skipped.push({ id: ch.id, why: "could not bound block (unbalanced braces)" }); continue; }
  let block = src.slice(braceStart, braceEnd + 1);
  const before = block;

  function setField(field, value) {
    const re = fieldRe(field);
    if (re.test(block)) {
      block = block.replace(re, (m, p1, _old, p3) => p1 + value + p3);
    }
  }
  if (ch.domesticVisits !== undefined && ch.domesticVisits !== null) {
    const v = ch.domesticVisits === "unlimited" ? '"unlimited"' : JSON.stringify(ch.domesticVisits);
    setField("domesticVisits", v);
  }
  if (ch.period) setField("period", JSON.stringify(ch.period));
  if (ch.railway !== undefined && ch.railway !== null) setField("railway", String(!!ch.railway));
  if (ch.newConfidence) setField("confidence", JSON.stringify(ch.newConfidence));
  if (ch.confirmedSource) {
    // tag the verify field with the confirming host (keep it short)
    let host = ch.confirmedSource;
    try { host = new URL(ch.confirmedSource).host.replace(/^www\./, ""); } catch (e) {}
    setField("verify", JSON.stringify(host + " (verified 2026-06-22)"));
  }

  if (block !== before) {
    src = src.slice(0, braceStart) + block + src.slice(braceEnd + 1);
    applied.push({ id: ch.id, domesticVisits: ch.domesticVisits, period: ch.period, conf: ch.newConfidence });
  } else {
    skipped.push({ id: ch.id, why: "no field changed" });
  }
}

fs.writeFileSync(CARDS, src);
console.log("APPLIED " + applied.length + " verified changes:");
applied.forEach((a) => console.log("  " + a.id + " -> " + a.domesticVisits + "/" + a.period + " (" + a.conf + ")"));
console.log("SKIPPED " + skipped.length + ":");
skipped.forEach((s) => console.log("  " + s.id + " — " + s.why));
