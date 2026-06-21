/* expand-cards-2.js — UPI / fintech / co-branded credit cards (2026-06-22).
 *
 * Source: bankbazaar RuPay/UPI catalogues + cardinsider per-card pages, scraped
 * 2026-06-22. Covers UPI-app cards, fintech co-brands, and RuPay co-brands not
 * in the first batch. Honest: most UPI/fintech cards have NO lounge benefit; a
 * few have spend-gated lounge. All confidence "low" with verify links. Dedupes
 * by id + normalized name against the existing dataset.
 *
 * Run: node scripts/expand-cards-2.js
 */
const fs = require("fs");
const path = require("path");
const CARDS_PATH = path.join(__dirname, "..", "data", "cards.js");

global.window = {};
require(CARDS_PATH);
const existing = window.LL_CARDS;
const existingIds = new Set(existing.map((c) => c.id));
const existingNames = new Set(existing.map((c) => c.name.toLowerCase().replace(/[^a-z0-9]/g, "")));

function tier(t) {
  switch (t) {
    case "none":      return { domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false };
    case "entryGate": return { domesticVisits: 1, period: "quarter", spendGate: { amount: 50000, per: "quarter", note: "Lounge access typically needs prior-quarter spend on this tier." }, programs: ["dreamfolks"], railway: false };
    case "mid":       return { domesticVisits: 8, period: "year", spendGate: null, programs: ["dreamfolks"], railway: false };
    case "rupay":     return { domesticVisits: 2, period: "quarter", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true };
    case "rupayLite": return { domesticVisits: 2, period: "year", spendGate: null, programs: ["rupay", "dreamfolks"], railway: true };
    case "railway":   return { domesticVisits: 4, period: "year", spendGate: null, programs: ["dreamfolks", "rupay"], railway: true };
    default: throw new Error("unknown tier " + t);
  }
}
function mk(id, name, issuer, network, t, opts = {}) {
  const base = tier(t);
  return Object.assign({
    id, name, issuer, network,
    domesticVisits: base.domesticVisits, period: base.period, spendGate: base.spendGate,
    programs: base.programs, railway: base.railway,
    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast",
    eligibility: "UPI/fintech/co-brand; scraped 2026-06-22.",
    feeNote: base.programs.length ? "Lounge tier estimated, verify exact terms." : "No lounge benefit — baseline.",
    confidence: "low",
    verify: opts.verify || "issuer/co-brand official site (scraped 2026-06-22)",
  }, opts);
}

const NEW = [
  // ---- UPI-app / fintech credit cards ----
  mk("slice-upi", "slice UPI Credit Card", "slice Bank", "rupay", "none", { ltf: true, eligibility: "App-based UPI credit line, fast KYC.", verify: "slice.bank.in (no lounge)" }),
  mk("phonepe-sbi-select-black", "PhonePe SBI SELECT BLACK", "SBI", "visa", "mid", { ease: 3, eligibility: "PhonePe co-brand on SBI.", verify: "sbicard.com" }),
  mk("phonepe-sbi-select", "PhonePe SBI SELECT", "SBI", "visa", "mid", { ease: 3, eligibility: "PhonePe co-brand on SBI.", verify: "sbicard.com" }),
  mk("axis-fibe", "Axis Fibe (Fibe co-brand)", "Axis", "rupay", "none", { ltf: true, eligibility: "Fibe (EarlySalary) fintech co-brand, RuPay UPI.", verify: "axis.bank.in" }),
  mk("amazon-pay-icici-confirmed", "Amazon Pay ICICI (no lounge)", "ICICI", "visa", "none", { ltf: true, ease: 5, eligibility: "Very widely held lifetime-free; confirmed NO lounge.", verify: "icici.bank.in (no lounge, forex 1.99%)" }),

  // ---- RuPay co-brands (bankbazaar RuPay catalogue) ----
  mk("csb-edge", "CSB Bank Edge RuPay", "CSB Bank", "rupay", "none", { ltf: true, eligibility: "CSB RuPay UPI, lifetime free.", verify: "csb.co.in" }),
  mk("kotak-metro", "Kotak Metro Cash & Carry RuPay", "Kotak", "rupay", "none", { ltf: true, eligibility: "Wholesale co-brand, RuPay.", verify: "kotak.bank.in" }),
  mk("kotak-iocl-rupay", "Kotak IOCL RuPay", "Kotak", "rupay", "rupayLite", { eligibility: "Fuel co-brand, RuPay UPI.", verify: "kotak.bank.in" }),
  mk("union-select-rupay", "Union Bank Select RuPay", "Union Bank", "rupay", "rupay", { ltf: true, ease: 4, eligibility: "Union Bank RuPay UPI.", verify: "unionbankofindia.co.in" }),
  mk("union-divaa-rupay", "Union Bank Divaa RuPay", "Union Bank", "rupay", "rupayLite", { ease: 4, eligibility: "Women-focused RuPay.", verify: "unionbankofindia.co.in" }),
  mk("iob-classic-rupay", "Indian Overseas Bank Classic RuPay", "Indian Overseas Bank", "rupay", "none", { ease: 4, eligibility: "IOB RuPay UPI.", verify: "iob.in" }),
  mk("iob-select-rupay", "Indian Overseas Bank Select RuPay", "Indian Overseas Bank", "rupay", "rupayLite", { ease: 4, eligibility: "IOB RuPay UPI.", verify: "iob.in" }),
  mk("pnb-platinum-rupay", "PNB Platinum RuPay", "Punjab National Bank", "rupay", "rupayLite", { ease: 4, eligibility: "PNB RuPay UPI.", verify: "pnbindia.in" }),
  mk("pnb-select-rupay", "PNB Select RuPay", "Punjab National Bank", "rupay", "rupay", { ease: 4, eligibility: "PNB RuPay UPI.", verify: "pnbindia.in" }),
  mk("pnb-emt-rupay", "PNB EaseMyTrip RuPay Platinum", "Punjab National Bank", "rupay", "railway", { ease: 4, eligibility: "Travel co-brand, RuPay.", verify: "pnbindia.in" }),
  mk("canara-platinum-rupay", "Canara Bank RuPay Platinum", "Canara Bank", "rupay", "rupayLite", { ease: 4, eligibility: "Canara RuPay UPI.", verify: "canarabank.com" }),
  mk("uco-platinum-rupay", "UCO Bank RuPay Platinum", "UCO Bank", "rupay", "rupayLite", { ease: 4, eligibility: "UCO RuPay UPI.", verify: "ucobank.com" }),
  mk("tmb-wings-rupay", "TMB WINGS RuPay", "Tamilnad Mercantile Bank", "rupay", "rupay", { ease: 4, eligibility: "TMB RuPay UPI.", verify: "tmb.in" }),
  mk("tmb-phoenix-rupay", "TMB Phoenix RuPay", "Tamilnad Mercantile Bank", "rupay", "rupayLite", { ease: 4, eligibility: "TMB RuPay UPI.", verify: "tmb.in" }),
  mk("sbm-enkash-rupay", "SBM EnKash RuPay Business", "SBM Bank", "rupay", "none", { eligibility: "Business RuPay co-brand.", verify: "sbmbank.co.in" }),

  // ---- BoB co-brands not yet added ----
  mk("bob-tiara-rupay", "BoB Tiara RuPay", "Bank of Baroda", "rupay", "rupay", { ease: 4, eligibility: "Women-focused RuPay.", verify: "bobcard.co.in" }),
  mk("bob-cma-one", "BoB CMA One RuPay", "Bank of Baroda", "rupay", "none", { ltf: true, eligibility: "CMA professionals, RuPay.", verify: "bobcard.co.in" }),
  mk("bob-icai", "BoB ICAI Exclusive RuPay", "Bank of Baroda", "rupay", "rupayLite", { eligibility: "Chartered accountants, RuPay.", verify: "bobcard.co.in" }),
  mk("bob-icsi", "BoB ICSI Diamond RuPay", "Bank of Baroda", "rupay", "rupayLite", { eligibility: "Company secretaries, RuPay.", verify: "bobcard.co.in" }),

  // ---- Reliance co-brands ----
  mk("reliance-sbi", "Reliance SBI Card", "SBI", "visa", "none", { ease: 4, eligibility: "Reliance retail co-brand.", verify: "sbicard.com" }),

  // ---- IDFC Power+ (RuPay variant) ----
  mk("idfc-power-plus", "IDFC FIRST Power+ RuPay", "IDFC FIRST", "rupay", "none", { ease: 4, eligibility: "HPCL fuel co-brand, RuPay UPI.", verify: "idfcfirst.bank.in" }),
];

const added = [], skipped = [];
NEW.forEach((c) => {
  const nameKey = c.name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (existingIds.has(c.id) || existingNames.has(nameKey)) { skipped.push(c.id); return; }
  existingIds.add(c.id); existingNames.add(nameKey);
  added.push(c);
});

function ser(c) {
  const sg = c.spendGate ? `{ amount: ${c.spendGate.amount}, per: ${JSON.stringify(c.spendGate.per)}, note: ${JSON.stringify(c.spendGate.note)} }` : "null";
  const dv = c.domesticVisits === "unlimited" ? '"unlimited"' : c.domesticVisits;
  return `  { id: ${JSON.stringify(c.id)}, name: ${JSON.stringify(c.name)}, issuer: ${JSON.stringify(c.issuer)}, network: ${JSON.stringify(c.network)},\n` +
    `    domesticVisits: ${dv}, period: ${JSON.stringify(c.period)}, spendGate: ${sg}, programs: ${JSON.stringify(c.programs)}, railway: ${c.railway},\n` +
    `    ease: ${c.ease}, ltf: ${c.ltf}, fyf: ${c.fyf}, approvalSpeed: ${JSON.stringify(c.approvalSpeed)},\n` +
    `    eligibility: ${JSON.stringify(c.eligibility)}, feeNote: ${JSON.stringify(c.feeNote)}, confidence: ${JSON.stringify(c.confidence)}, verify: ${JSON.stringify(c.verify)} },`;
}

const block = "\n  // ==================================================================\n" +
  "  // ====  UPI / FINTECH / CO-BRAND CARDS (2026-06-22, best-effort)  ===\n" +
  "  // ==================================================================\n" +
  "  // UPI-app cards, fintech co-brands, RuPay co-brands. Most have NO lounge\n" +
  "  // (flagged baseline); a few spend-gated. confidence low, verify links.\n" +
  added.map(ser).join("\n") + "\n";

let src = fs.readFileSync(CARDS_PATH, "utf8");
const lastIdx = src.lastIndexOf("\n];");
if (lastIdx < 0) throw new Error("could not find array close");
src = src.slice(0, lastIdx) + "\n" + block + "];\n";
fs.writeFileSync(CARDS_PATH, src);
console.log(`added ${added.length}, skipped ${skipped.length} dupes`);
if (skipped.length) console.log("skipped:", skipped.join(", "));
