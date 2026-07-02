/* Tests for money-engine.js — the offline "Money here" converter.
 * node tests-money.js
 *
 * The honest, offline way to answer "how much is this in my money?" at a stall
 * with no signal: convert at a rate the USER pinned (or a live ECB rate the app
 * hands in), plain arithmetic, clearly labelled. So this pins:
 *  - convert: foreign -> home at a home-per-foreign rate, correct + rounded
 *  - reverse: home -> foreign
 *  - zero-decimal currencies (JPY/KRW/IDR/VND) round to whole units
 *  - Indian vs western thousands grouping
 *  - honesty: no rate -> no number (never invents a rate)
 *  - cheat sheet ladder is deterministic
 *  - garbage inputs never throw, return ok:false
 *  - determinism
 */
"use strict";
const assert = require("assert");
const M = require("./money-engine.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// ---- convert (the core) --------------------------------------------------
ok("converts foreign -> home at the pinned rate", () => {
  // 1 THB = 2.4 INR; a 250 THB plate = 600 INR
  const r = M.convert(250, 2.4, "INR");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.homeRounded, 600);
});
ok("fractional rate rounds to 2dp for INR", () => {
  const r = M.convert(199, 2.437, "INR"); // 484.963
  assert.strictEqual(r.homeRounded, 484.96);
});
ok("no rate -> ok:false, never fabricates a number", () => {
  const r = M.convert(250, null, "INR");
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "no-rate");
  assert.strictEqual(r.home, undefined);
});
ok("rate must be positive (0 or negative -> no-rate)", () => {
  assert.strictEqual(M.convert(100, 0, "INR").ok, false);
  assert.strictEqual(M.convert(100, -3, "INR").ok, false);
});
ok("non-numeric amount -> enter-amount, no throw", () => {
  let r; assert.doesNotThrow(() => { r = M.convert("abc", 2.4, "INR"); });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, "enter-amount");
});
ok("zero amount is valid (0 home)", () => {
  const r = M.convert(0, 2.4, "INR");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.homeRounded, 0);
});

// ---- zero-decimal currencies --------------------------------------------
ok("home JPY rounds to whole yen", () => {
  const r = M.convert(10, 0.53, "JPY"); // 5.3 -> 5
  assert.strictEqual(r.homeRounded, 5);
});
ok("foreign IDR reverse rounds to whole rupiah", () => {
  // 1 IDR = 0.0053 INR; 100 INR -> 100/0.0053 = 18867.9 -> 18868 IDR
  const r = M.convertHomeToForeign(100, 0.0053, "IDR");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.foreignRounded, 18868);
});

// ---- reverse -------------------------------------------------------------
ok("home -> foreign divides by the rate", () => {
  // 1 THB = 2.4 INR; 100 INR buys 41.67 THB
  const r = M.convertHomeToForeign(100, 2.4, "THB");
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.foreignRounded, 41.67);
});
ok("reverse with no rate -> ok:false", () => {
  assert.strictEqual(M.convertHomeToForeign(100, null, "THB").ok, false);
});

// ---- formatting ----------------------------------------------------------
ok("INR uses Indian grouping + symbol", () => {
  assert.strictEqual(M.fmt(1234567.5, "INR"), "₹ 12,34,567.5");
});
ok("USD uses western grouping + symbol", () => {
  assert.strictEqual(M.fmt(1234567.5, "USD"), "$ 1,234,567.5");
});
ok("JPY formats with no decimals", () => {
  assert.strictEqual(M.fmt(1234.7, "JPY"), "¥ 1,235");
});
ok("unknown currency falls back to the code, no symbol", () => {
  assert.strictEqual(M.fmt(1000, "XYZ"), "1,000 XYZ");
});
ok("negative numbers group correctly", () => {
  assert.strictEqual(M.fmt(-2500, "USD"), "$ -2,500");
});

// ---- known / symbol ------------------------------------------------------
ok("known() is true for supported currencies, false otherwise", () => {
  assert.strictEqual(M.known("thb"), true);
  assert.strictEqual(M.known("INR"), true);
  assert.strictEqual(M.known("ZZZ"), false);
});
ok("symbol() returns the glyph or empty string", () => {
  assert.strictEqual(M.symbol("GBP"), "£");
  assert.strictEqual(M.symbol("ZZZ"), "");
});

// ---- rateFromLive (carry a live-derived rate, validate only) -------------
ok("rateFromLive passes a positive number through", () => {
  assert.strictEqual(M.rateFromLive(2.44), 2.44);
});
ok("rateFromLive rejects junk -> null (caller then shows 'pin a rate')", () => {
  assert.strictEqual(M.rateFromLive(0), null);
  assert.strictEqual(M.rateFromLive(-1), null);
  assert.strictEqual(M.rateFromLive(null), null);
  assert.strictEqual(M.rateFromLive("abc"), null);
});

// ---- cheat sheet ---------------------------------------------------------
ok("cheatSheet converts a deterministic ladder", () => {
  const sheet = M.cheatSheet(2.4, "INR");
  assert.deepStrictEqual(sheet.map((x) => x.foreign), [10, 50, 100, 500, 1000, 5000]);
  assert.strictEqual(sheet[2].home, 240); // 100 THB -> 240 INR
});
ok("cheatSheet honours a custom ladder", () => {
  const sheet = M.cheatSheet(0.53, "INR", [100, 1000]);
  assert.deepStrictEqual(sheet.map((x) => x.foreign), [100, 1000]);
  assert.strictEqual(sheet[0].home, 53);
});
ok("cheatSheet with no rate -> empty (nothing fabricated)", () => {
  assert.deepStrictEqual(M.cheatSheet(null, "INR"), []);
});

// ---- blankMoney ----------------------------------------------------------
ok("blankMoney defaults home INR, uppercases, null rate", () => {
  const m = M.blankMoney(null, "thb");
  assert.strictEqual(m.home, "INR");
  assert.strictEqual(m.foreign, "THB");
  assert.strictEqual(m.rate, null);
  assert.strictEqual(m.pinnedNote, "");
});

// ---- currencyForCode (pre-fill foreign currency from destination) --------
ok("currencyForCode maps intl destinations to their currency (fact, not a rate)", () => {
  assert.strictEqual(M.currencyForCode("BKK"), "THB");
  assert.strictEqual(M.currencyForCode("DXB"), "AED");
  assert.strictEqual(M.currencyForCode("SIN"), "SGD");
  assert.strictEqual(M.currencyForCode("LHR"), "GBP");
  assert.strictEqual(M.currencyForCode("JFK"), "USD");
});
ok("currencyForCode returns INR for Indian airports", () => {
  assert.strictEqual(M.currencyForCode("GOI"), "INR");
  assert.strictEqual(M.currencyForCode("del"), "INR");
});
ok("currencyForCode returns null for unknown codes (user picks manually)", () => {
  assert.strictEqual(M.currencyForCode("ZZZ"), null);
  assert.strictEqual(M.currencyForCode(""), null);
  assert.strictEqual(M.currencyForCode(null), null);
});

// ---- determinism ---------------------------------------------------------
ok("same inputs -> identical result", () => {
  const a = JSON.stringify(M.convert(777, 2.4, "INR"));
  const b = JSON.stringify(M.convert(777, 2.4, "INR"));
  assert.strictEqual(a, b);
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
