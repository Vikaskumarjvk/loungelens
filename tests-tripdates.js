/* Tests for the end-date <-> nights bridge in itinerary-engine.js.
 * node tests-tripdates.js
 *
 * The trip stores `nights`, but a person thinks in "I get back on the 16th".
 * These helpers let the UI offer a real End-date picker while the model stays
 * nights-based. Pure + deterministic (Date.UTC, no clock).
 */
"use strict";
const assert = require("assert");
global.window = global;
const IT = require("./itinerary-engine.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// ---- endDateFor ----------------------------------------------------------
ok("end date = depart + nights (the day you travel home)", () => {
  assert.strictEqual(IT.endDateFor("2026-08-10", 4), "2026-08-14");
});
ok("1 night -> end is the next day", () => {
  assert.strictEqual(IT.endDateFor("2026-08-10", 1), "2026-08-11");
});
ok("crosses a month boundary correctly", () => {
  assert.strictEqual(IT.endDateFor("2026-08-30", 3), "2026-09-02");
});
ok("nights < 1 clamps to 1", () => {
  assert.strictEqual(IT.endDateFor("2026-08-10", 0), "2026-08-11");
  assert.strictEqual(IT.endDateFor("2026-08-10", -5), "2026-08-11");
});
ok("no valid depart -> empty string (nothing invented)", () => {
  assert.strictEqual(IT.endDateFor("", 3), "");
  assert.strictEqual(IT.endDateFor("not-a-date", 3), "");
});

// ---- nightsBetween -------------------------------------------------------
ok("nights = whole days between depart and end", () => {
  assert.strictEqual(IT.nightsBetween("2026-08-10", "2026-08-14"), 4);
});
ok("adjacent days -> 1 night", () => {
  assert.strictEqual(IT.nightsBetween("2026-08-10", "2026-08-11"), 1);
});
ok("crosses a month boundary", () => {
  assert.strictEqual(IT.nightsBetween("2026-08-30", "2026-09-02"), 3);
});
ok("end == depart -> null (a trip needs at least 1 night)", () => {
  assert.strictEqual(IT.nightsBetween("2026-08-10", "2026-08-10"), null);
});
ok("end before depart -> null (caller keeps old nights)", () => {
  assert.strictEqual(IT.nightsBetween("2026-08-10", "2026-08-08"), null);
});
ok("invalid dates -> null, never throws", () => {
  assert.strictEqual(IT.nightsBetween("", "2026-08-14"), null);
  assert.strictEqual(IT.nightsBetween("2026-08-10", ""), null);
  assert.strictEqual(IT.nightsBetween("junk", "junk"), null);
});

// ---- round-trip ----------------------------------------------------------
ok("endDateFor and nightsBetween are inverses", () => {
  for (let n = 1; n <= 30; n++) {
    const end = IT.endDateFor("2026-08-10", n);
    assert.strictEqual(IT.nightsBetween("2026-08-10", end), n, "round-trip nights=" + n);
  }
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
