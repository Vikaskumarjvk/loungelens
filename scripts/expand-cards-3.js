/* expand-cards-3.js — final co-brand sweep + precise-term corrections (2026-06-22).
 * Net-new: CheQ AU, SaveMax RBL, Etihad BoB. Plus corrects au-ixigo with the
 * exact lounge terms scraped from cardinsider (2/qtr, prior-quarter ₹50k gate).
 * Run: node scripts/expand-cards-3.js
 */
const fs = require("fs");
const path = require("path");
const CARDS_PATH = path.join(__dirname, "..", "data", "cards.js");

global.window = {};
require(CARDS_PATH);
const existing = window.LL_CARDS;
const existingIds = new Set(existing.map((c) => c.id));
const existingNames = new Set(existing.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "")));

function mk(c) {
  return Object.assign({
    ease: 4, ltf: false, fyf: true, approvalSpeed: "normal",
    eligibility: "Co-brand; scraped 2026-06-22.", feeNote: "Verify exact terms.",
    confidence: "low", verify: "issuer official site (scraped 2026-06-22)",
  }, c);
}

const NEW = [
  mk({ id: "cheq-au", name: "CheQ AU Credit Card", issuer: "AU Small Finance", network: "visa",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false,
    ease: 4, approvalSpeed: "fast", eligibility: "CheQ fintech co-brand on AU.", feeNote: "No lounge benefit — baseline.", verify: "aubank.in (verify)" }),
  mk({ id: "rbl-savemax", name: "SaveMax RBL (BankBazaar co-brand)", issuer: "RBL", network: "mastercard",
    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false,
    ease: 4, approvalSpeed: "fast", eligibility: "BankBazaar co-brand on RBL.", feeNote: "No lounge benefit — baseline.", verify: "rbl.bank.in (verify)" }),
  mk({ id: "bob-etihad", name: "Etihad Guest BoB (Premium)", issuer: "Bank of Baroda", network: "visa",
    domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks", "priority"], railway: false,
    ease: 2, eligibility: "Etihad airline co-brand.", feeNote: "Premium tier: domestic + Priority Pass + Etihad miles. Verify exact visits.", verify: "bobcard.co.in" }),
];

// corrections to existing cards (precise terms learned this session)
const CORRECTIONS = {
  "au-ixigo": {
    domesticVisits: 2, period: "quarter",
    spendGate: { amount: 50000, per: "quarter", note: "2 domestic lounge/quarter needs ₹50k prior-quarter spend (per cardinsider 2026-06-22)." },
    railway: true, programs: ["dreamfolks", "priority", "rupay"],
    verify: "aubank.in (lounge: 2/qtr spend-gated + 8 railway/yr + 1 intl PP)",
  },
};

// ---- apply corrections in-place (string replace on the card's line) ----
let src = fs.readFileSync(CARDS_PATH, "utf8");
let correctedCount = 0;
Object.keys(CORRECTIONS).forEach((id) => {
  const cur = existing.find((c) => c.id === id);
  if (!cur) return;
  const upd = Object.assign({}, cur, CORRECTIONS[id]);
  // re-serialize the full object line for this id and swap it
  const sg = upd.spendGate ? `{ amount: ${upd.spendGate.amount}, per: ${JSON.stringify(upd.spendGate.per)}, note: ${JSON.stringify(upd.spendGate.note)} }` : "null";
  const dv = upd.domesticVisits === "unlimited" ? '"unlimited"' : upd.domesticVisits;
  const newLine = `  { id: ${JSON.stringify(upd.id)}, name: ${JSON.stringify(upd.name)}, issuer: ${JSON.stringify(upd.issuer)}, network: ${JSON.stringify(upd.network)},\n` +
    `    domesticVisits: ${dv}, period: ${JSON.stringify(upd.period)}, spendGate: ${sg}, programs: ${JSON.stringify(upd.programs)}, railway: ${upd.railway},\n` +
    `    ease: ${upd.ease}, ltf: ${upd.ltf}, fyf: ${upd.fyf}, approvalSpeed: ${JSON.stringify(upd.approvalSpeed)},\n` +
    `    eligibility: ${JSON.stringify(upd.eligibility)}, feeNote: ${JSON.stringify(upd.feeNote)}, confidence: ${JSON.stringify(upd.confidence)}, verify: ${JSON.stringify(upd.verify)} },`;
  // match the existing object block starting at this id up to the closing `},`
  const re = new RegExp("  \\{ id: \"" + id + "\"[\\s\\S]*?\\},");
  if (re.test(src)) { src = src.replace(re, newLine); correctedCount++; }
});

// ---- dedupe + append new ----
const added = [], skipped = [];
NEW.forEach((c) => {
  const nameKey = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (existingIds.has(c.id) || existingNames.has(nameKey)) { skipped.push(c.id); return; }
  existingIds.add(c.id); existingNames.add(nameKey); added.push(c);
});
function ser(c) {
  const sg = c.spendGate ? `{ amount: ${c.spendGate.amount}, per: ${JSON.stringify(c.spendGate.per)}, note: ${JSON.stringify(c.spendGate.note)} }` : "null";
  const dv = c.domesticVisits === "unlimited" ? '"unlimited"' : c.domesticVisits;
  return `  { id: ${JSON.stringify(c.id)}, name: ${JSON.stringify(c.name)}, issuer: ${JSON.stringify(c.issuer)}, network: ${JSON.stringify(c.network)},\n` +
    `    domesticVisits: ${dv}, period: ${JSON.stringify(c.period)}, spendGate: ${sg}, programs: ${JSON.stringify(c.programs)}, railway: ${c.railway},\n` +
    `    ease: ${c.ease}, ltf: ${c.ltf}, fyf: ${c.fyf}, approvalSpeed: ${JSON.stringify(c.approvalSpeed)},\n` +
    `    eligibility: ${JSON.stringify(c.eligibility)}, feeNote: ${JSON.stringify(c.feeNote)}, confidence: ${JSON.stringify(c.confidence)}, verify: ${JSON.stringify(c.verify)} },`;
}
if (added.length) {
  const block = "\n  // ====  CO-BRAND SWEEP 3 (2026-06-22)  ====\n" + added.map(ser).join("\n") + "\n";
  const lastIdx = src.lastIndexOf("\n];");
  src = src.slice(0, lastIdx) + "\n" + block + "];\n";
}
fs.writeFileSync(CARDS_PATH, src);
console.log(`added ${added.length}, corrected ${correctedCount}, skipped ${skipped.length}`);
if (skipped.length) console.log("skipped:", skipped.join(", "));
