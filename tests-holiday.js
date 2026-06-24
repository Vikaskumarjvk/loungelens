/* Tests for holiday-engine.js + data/holidays.js. node tests-holiday.js */
"use strict";
const assert = require("assert");
global.window = global;
require("./data/holidays.js");
const H = require("./holiday-engine.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// ---- date primitives (deterministic, no clock) --------------------------
ok("dow reads weekday from the string", () => {
  assert.strictEqual(H.dow("2026-01-26"), 1); // Republic Day 2026 is a Monday
  assert.strictEqual(H.DOW[H.dow("2026-01-26")], "Monday");
});
ok("isWeekend true for Sat/Sun only", () => {
  assert.strictEqual(H.isWeekend("2026-01-24"), true);  // Sat
  assert.strictEqual(H.isWeekend("2026-01-25"), true);  // Sun
  assert.strictEqual(H.isWeekend("2026-01-26"), false); // Mon
});
ok("addDays + daysBetween are consistent", () => {
  assert.strictEqual(H.addDays("2026-01-26", 3), "2026-01-29");
  assert.strictEqual(H.daysBetween("2026-01-24", "2026-01-26"), 2);
});
ok("addDays crosses a month boundary", () => assert.strictEqual(H.addDays("2026-01-31", 1), "2026-02-01"));

// ---- zeroLeaveBlock ------------------------------------------------------
ok("Monday holiday grabs the prior weekend with ZERO leave (3-day block)", () => {
  // 2026-01-26 Mon -> Sat 24, Sun 25, Mon 26
  const z = H.zeroLeaveBlock("2026-01-26");
  assert.strictEqual(z.start, "2026-01-24");
  assert.strictEqual(z.end, "2026-01-26");
  assert.strictEqual(z.days, 3);
});
ok("mid-week holiday alone is a 1-day block", () => {
  // find a Wednesday holiday: 2026-12-25 is a Friday; use a known Wed instead
  // 2026-05-01 (May Day) — check whatever weekday, block is just itself unless weekend-adjacent
  const z = H.zeroLeaveBlock("2026-07-15"); // arbitrary Wed 2026-07-15
  assert.strictEqual(H.dow("2026-07-15"), 3); // Wednesday
  assert.strictEqual(z.days, 1);
});

// ---- bridgeOptions -------------------------------------------------------
ok("Tuesday holiday -> 1 leave day (Mon) bridges to a 4-day weekend", () => {
  // pick a real Tuesday: 2026-12-29 is a Tuesday
  assert.strictEqual(H.dow("2026-12-29"), 2);
  const b = H.bridgeOptions("2026-12-29");
  const best = b[0];
  assert.strictEqual(best.leaveCount, 1, "one leave day");
  assert.strictEqual(best.side, "before", "take the Monday before");
  assert.ok(best.days >= 4, "at least a 4-day break, got " + best.days);
});
ok("Thursday holiday -> 1 leave day (Fri) bridges forward to a 4-day weekend", () => {
  // 2026-12-31 is a Thursday
  assert.strictEqual(H.dow("2026-12-31"), 4);
  const b = H.bridgeOptions("2026-12-31");
  const fwd = b.find((x) => x.side === "after");
  assert.ok(fwd && fwd.leaveCount === 1 && fwd.days >= 4, "Fri bridge gives 4+ days");
});
ok("bridges never exceed 2 leave days", () => {
  ["2026-01-26", "2026-12-29", "2026-12-31", "2026-07-15"].forEach((d) => {
    H.bridgeOptions(d).forEach((b) => assert.ok(b.leaveCount <= 2, d + " bridge leaveCount<=2"));
  });
});
ok("bridges sorted best-value first (days per leave day)", () => {
  const b = H.bridgeOptions("2026-07-15");
  for (let i = 1; i < b.length; i++) {
    assert.ok((b[i - 1].days / b[i - 1].leaveCount) >= (b[i].days / b[i].leaveCount), "value descending");
  }
});

// ---- assess --------------------------------------------------------------
ok("assess flags a holiday that falls ON a weekend (no day gained)", () => {
  // 2026-08-15 Independence Day — check its weekday
  const a = H.assess("2026-08-15", "Independence Day");
  if (a.fallsOnWeekend) assert.strictEqual(a.verdict, "on_weekend");
  else assert.notStrictEqual(a.verdict, "on_weekend");
});
ok("assess gives free_long_weekend for a Monday holiday", () => {
  const a = H.assess("2026-01-26", "Republic Day");
  assert.strictEqual(a.verdict, "free_long_weekend");
  assert.strictEqual(a.zeroLeave.days, 3);
});
ok("assess gives one_bridge for a Tuesday holiday", () => {
  const a = H.assess("2026-12-29", "Test Tue");
  assert.strictEqual(a.verdict, "one_bridge");
  assert.ok(a.best && a.best.leaveCount === 1);
});
ok("assess null on a bad date", () => assert.strictEqual(H.assess("nope"), null));

// ---- planYear ------------------------------------------------------------
ok("planYear expands fixed md into the year + assesses each", () => {
  const items = H.planYear(window.LL_HOLIDAYS.fixed, [], 2026);
  assert.strictEqual(items.length, window.LL_HOLIDAYS.fixed.length);
  items.forEach((it) => { assert.ok(/^2026-/.test(it.date)); assert.ok(it.assess); });
  // sorted by date
  for (let i = 1; i < items.length; i++) assert.ok(items[i - 1].date <= items[i].date);
});
ok("planYear folds in custom (movable-festival) dates the user added", () => {
  const items = H.planYear(window.LL_HOLIDAYS.fixed, [{ date: "2026-11-08", name: "Diwali (my calendar)" }], 2026);
  const diwali = items.find((x) => x.source === "custom");
  assert.ok(diwali && diwali.name === "Diwali (my calendar)");
  assert.ok(diwali.assess, "custom date gets the same long-weekend math");
});
ok("planYear ignores custom dates outside the chosen year", () => {
  const items = H.planYear([], [{ date: "2025-12-31", name: "last year" }], 2026);
  assert.strictEqual(items.length, 0);
});

// ---- honesty: shipped data is fixed-date only ----------------------------
ok("shipped holidays are all fixed-date (no movable festivals shipped)", () => {
  const names = window.LL_HOLIDAYS.fixed.map((h) => h.name.toLowerCase());
  ["diwali", "holi", "eid", "dussehra", "navratri", "raksha", "janmashtami"].forEach((mv) => {
    assert.ok(!names.some((n) => n.includes(mv)), "must not ship movable festival: " + mv);
  });
  // every shipped one has a valid MM-DD
  window.LL_HOLIDAYS.fixed.forEach((h) => assert.ok(/^\d{2}-\d{2}$/.test(h.md), "bad md: " + h.md));
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
