/* fix-phonepe.js — correct PhonePe SBI lineup to match live data (2026-06-22).
 * Real lineup: "PhonePe SBI Purple" (no lounge) + "PhonePe SBI SELECT BLACK" (lounge).
 * My data had a wrong "PhonePe SBI SELECT" — replace it with the real Purple card.
 */
const fs = require("fs");
const path = require("path");
const CARDS_PATH = path.join(__dirname, "..", "data", "cards.js");
let src = fs.readFileSync(CARDS_PATH, "utf8");

// replace the phonepe-sbi-select object with the correct Purple card (no lounge)
const re = /  \{ id: "phonepe-sbi-select"[\s\S]*?\},/;
const purple =
  '  { id: "phonepe-sbi-purple", name: "PhonePe SBI Purple", issuer: "SBI", network: "visa",\n' +
  '    domesticVisits: 0, period: "year", spendGate: null, programs: [], railway: false,\n' +
  '    ease: 4, ltf: false, fyf: true, approvalSpeed: "fast",\n' +
  '    eligibility: "PhonePe co-brand on SBI, entry tier.", feeNote: "Rs 499. No lounge benefit — baseline (confirmed cardinsider 2026-06-22).", confidence: "low", verify: "sbicard.com (PhonePe SBI Purple, no lounge)" },';

if (re.test(src)) {
  src = src.replace(re, purple);
  fs.writeFileSync(CARDS_PATH, src);
  console.log("replaced phonepe-sbi-select -> phonepe-sbi-purple (no lounge)");
} else {
  console.log("phonepe-sbi-select not found — no change");
}
