/*
 * Tests for geo-engine.js + live-data.js pure functions. Node-run.
 *   node tests-live.js
 * Network fetchers are NOT exercised here (that's the live-API smoke test);
 * we test the math + parsing that everything else depends on.
 */
"use strict";
const assert = require("assert");
global.window = global;
const G = require("./geo-engine.js");
const L = require("./live-data.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// ---- geo: distance (validate against known real-world distances) ---------
ok("DEL-BOM ~1135km (real great-circle)", () => {
  const km = G.distanceKm("DEL", "BOM");
  assert.ok(km > 1100 && km < 1170, "DEL-BOM should be ~1135km, got " + km);
});
ok("HYD-GOI ~530km (real great-circle)", () => {
  const km = G.distanceKm("HYD", "GOI");
  assert.ok(km > 490 && km < 560, "HYD-GOI ~530km, got " + km);
});
ok("BLR-DEL ~1710km", () => {
  const km = G.distanceKm("BLR", "DEL");
  assert.ok(km > 1650 && km < 1770, "BLR-DEL ~1710km, got " + km);
});
ok("DEL-JFK ~11000km (intl long-haul)", () => {
  const km = G.distanceKm("DEL", "JFK");
  assert.ok(km > 11000 && km < 11800, "DEL-JFK ~11300km, got " + km);
});
ok("distance is symmetric", () => assert.strictEqual(G.distanceKm("DEL", "BOM"), G.distanceKm("BOM", "DEL")));
ok("distance same airport = 0", () => assert.strictEqual(G.distanceKm("DEL", "DEL"), 0));
ok("unknown airport -> null", () => assert.strictEqual(G.distanceKm("DEL", "ZZZ"), null));
ok("case-insensitive codes", () => assert.strictEqual(G.distanceKm("del", "bom"), G.distanceKm("DEL", "BOM")));

// ---- geo: flight time estimate ------------------------------------------
ok("DEL-BOM flight time ~2-2.5h", () => {
  const m = G.flightTimeMin("DEL", "BOM");
  assert.ok(m > 100 && m < 160, "DEL-BOM ~2h13m, got " + m + "m");
});
ok("flight time null on unknown", () => assert.strictEqual(G.flightTimeMin("DEL", "ZZZ"), null));
ok("fmtDuration formats hours+mins", () => { assert.strictEqual(G.fmtDuration(133), "2h 13m"); assert.strictEqual(G.fmtDuration(45), "45m"); });

// ---- geo: train-vs-fly heuristic ----------------------------------------
ok("short hop leans train", () => {
  // find/realize a <350km pair: HYD-GOI is ~480 (medium). Use a close pair: DEL-JAI
  const t = G.trainVsFly("DEL", "JAI"); // ~240km
  assert.ok(t && (t.lean === "train" || t.lean === "either"), "DEL-JAI should lean train/either, got " + (t && t.lean) + " @ " + (t && t.km) + "km");
});
ok("long route leans fly", () => {
  const t = G.trainVsFly("DEL", "BLR");
  assert.strictEqual(t.lean, "fly");
});
ok("trainVsFly null on unknown", () => assert.strictEqual(G.trainVsFly("DEL", "ZZZ"), null));
ok("hasCoords true/false", () => { assert.strictEqual(G.hasCoords("DEL"), true); assert.strictEqual(G.hasCoords("ZZZ"), false); });

// ---- FX conversion math (the heart of real currency) --------------------
// Frankfurter gives rates relative to a base. Simulate base=USD, rates per 1 USD.
const RATES = { INR: 94.74, EUR: 0.92, GBP: 0.79, SGD: 1.35 }; // per 1 USD
const BASE = "USD";
ok("convert same currency = identity", () => assert.strictEqual(L.convert(500, "INR", "INR", BASE, RATES), 500));
ok("convert USD->INR uses rate", () => {
  // 10 USD -> 10 * 94.74 = 947.40
  assert.strictEqual(L.convert(10, "USD", "INR", BASE, RATES), 947.4);
});
ok("convert INR->USD is inverse", () => {
  // 947.40 INR -> 10 USD
  assert.strictEqual(L.convert(947.4, "INR", "USD", BASE, RATES), 10);
});
ok("convert cross-rate (neither is base) INR->EUR", () => {
  // 1 USD = 94.74 INR and 0.92 EUR  => 94.74 INR = 0.92 EUR => 1000 INR = 9.71 EUR
  const v = L.convert(1000, "INR", "EUR", BASE, RATES);
  assert.ok(Math.abs(v - 9.71) < 0.05, "1000 INR ~ 9.71 EUR, got " + v);
});
ok("convert round-trips (USD->INR->USD)", () => {
  const inr = L.convert(123, "USD", "INR", BASE, RATES);
  const back = L.convert(inr, "INR", "USD", BASE, RATES);
  assert.ok(Math.abs(back - 123) < 0.01, "round trip ~123, got " + back);
});
ok("convert unknown currency -> null (no fake number)", () => {
  assert.strictEqual(L.convert(100, "INR", "ZZZ", BASE, RATES), null);
});
ok("convert with no rates -> null", () => assert.strictEqual(L.convert(100, "INR", "USD", BASE, null), null));

// ---- weather parsing (pure) ---------------------------------------------
ok("parseWeather maps days + derives flags", () => {
  const daily = {
    time: ["2026-10-05", "2026-10-06", "2026-10-07"],
    temperature_2m_max: [31, 33, 30],
    temperature_2m_min: [24, 25, 23],
    precipitation_probability_max: [70, 20, 10],
  };
  const w = L.parseWeather(daily);
  assert.strictEqual(w.days.length, 3);
  assert.strictEqual(w.lowMin, 23);
  assert.strictEqual(w.peakRain, 70);
  assert.strictEqual(w.suggest.monsoon, true, "70% rain -> monsoon flag");
  assert.strictEqual(w.suggest.cold, false, "min 23 not cold");
});
ok("parseWeather cold flag for low temps", () => {
  const w = L.parseWeather({ time: ["d1"], temperature_2m_max: [14], temperature_2m_min: [6], precipitation_probability_max: [5] });
  assert.strictEqual(w.suggest.cold, true, "min 6 -> cold");
  assert.strictEqual(w.suggest.monsoon, false);
});
ok("parseWeather null on empty", () => assert.strictEqual(L.parseWeather(null), null));

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
