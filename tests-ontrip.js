/* Tests for the live "on-trip companion" logic in itinerary-engine.js.
 * node tests-ontrip.js
 *
 * TripLens is strong BEFORE a trip; this makes it useful DURING one. tripStatus
 * places today against the trip's own dates (upcoming / ongoing / past), and
 * nextUp finds the next thing on the timeline. Both are pure — todayISO (and an
 * optional current HH:MM) are passed in, the engine never reads a clock. Honest:
 * it only ever points at an item the user actually planned; it invents nothing.
 *
 * All dates fixed so the math is deterministic.
 */
"use strict";
const assert = require("assert");
global.window = global;
const IT = require("./itinerary-engine.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// a 4-night Goa trip: depart 2026-08-10, 5 days (10th..14th), some items
function goaTrip() {
  const t = IT.newTrip({ id: "g", title: "Goa", from: "DEL", to: "Goa", depart: "2026-08-10", nights: 4, adults: 2 });
  IT.addItem(t, 0, { time: "08:00", kind: "flight", title: "Flight DEL → GOI" }, 1);
  IT.addItem(t, 0, { time: "14:00", kind: "hotel", title: "Hotel check-in" }, 2);
  IT.addItem(t, 1, { time: "10:00", kind: "activity", title: "Beach time" }, 3);
  IT.addItem(t, 1, { time: "20:00", kind: "food", title: "Dinner" }, 4);
  // day 2 (index 2) intentionally has NO items
  IT.addItem(t, 3, { time: "09:00", kind: "activity", title: "Old town walk" }, 5);
  IT.addItem(t, 4, { time: "11:00", kind: "hotel", title: "Hotel check-out" }, 6);
  return t;
}

// ---- tripStatus: phases --------------------------------------------------
ok("undated trip -> phase 'undated'", () => {
  const t = IT.newTrip({ id: "u", title: "Someday", to: "Goa", nights: 3, adults: 1 });
  const s = IT.tripStatus(t, "2026-08-10");
  assert.strictEqual(s.phase, "undated");
});
ok("before departure -> 'upcoming' with daysUntil", () => {
  const s = IT.tripStatus(goaTrip(), "2026-08-07");
  assert.strictEqual(s.phase, "upcoming");
  assert.strictEqual(s.daysUntil, 3);
  assert.strictEqual(s.label, "starts in 3 days");
});
ok("one day before -> 'starts tomorrow'", () => {
  const s = IT.tripStatus(goaTrip(), "2026-08-09");
  assert.strictEqual(s.phase, "upcoming");
  assert.strictEqual(s.daysUntil, 1);
  assert.strictEqual(s.label, "starts tomorrow");
});
ok("departure day -> 'ongoing' Day 1 of 5", () => {
  const s = IT.tripStatus(goaTrip(), "2026-08-10");
  assert.strictEqual(s.phase, "ongoing");
  assert.strictEqual(s.dayIndex, 0);
  assert.strictEqual(s.dayNumber, 1);
  assert.strictEqual(s.totalDays, 5);
  assert.strictEqual(s.label, "Day 1 of 5");
});
ok("mid-trip -> 'ongoing' correct day number", () => {
  const s = IT.tripStatus(goaTrip(), "2026-08-12");
  assert.strictEqual(s.phase, "ongoing");
  assert.strictEqual(s.dayNumber, 3);
  assert.strictEqual(s.label, "Day 3 of 5");
});
ok("last day (departure day) -> still 'ongoing' Day 5 of 5", () => {
  const s = IT.tripStatus(goaTrip(), "2026-08-14");
  assert.strictEqual(s.phase, "ongoing");
  assert.strictEqual(s.dayNumber, 5);
});
ok("day after the last day -> 'past'", () => {
  const s = IT.tripStatus(goaTrip(), "2026-08-15");
  assert.strictEqual(s.phase, "past");
  assert.strictEqual(s.daysSinceEnd, 1);
});
ok("long after -> 'past' with daysSinceEnd", () => {
  const s = IT.tripStatus(goaTrip(), "2026-09-01");
  assert.strictEqual(s.phase, "past");
  assert.strictEqual(s.daysSinceEnd, 18);
});
ok("tripStatus never reads a clock (no todayISO -> undated, no throw)", () => {
  const s = IT.tripStatus(goaTrip(), null);
  assert.strictEqual(s.phase, "undated");
});

// ---- nextUp: what's next on the timeline ---------------------------------
ok("upcoming trip -> next = first planned item, when 'soon'", () => {
  const n = IT.nextUp(goaTrip(), "2026-08-07");
  assert.ok(n);
  assert.strictEqual(n.when, "soon");
  assert.strictEqual(n.dayNumber, 1);
  assert.strictEqual(n.item.title, "Flight DEL → GOI");
});
ok("ongoing, morning -> next timed item today at/after now", () => {
  // on day 2 (index 1) at 09:00, next is the 10:00 Beach
  const n = IT.nextUp(goaTrip(), "2026-08-11", "09:00");
  assert.strictEqual(n.when, "today");
  assert.strictEqual(n.dayNumber, 2);
  assert.strictEqual(n.item.title, "Beach time");
});
ok("ongoing, afternoon -> skips past item, picks the evening one", () => {
  // day 2 at 15:00: 10:00 Beach is past, next is 20:00 Dinner
  const n = IT.nextUp(goaTrip(), "2026-08-11", "15:00");
  assert.strictEqual(n.item.title, "Dinner");
  assert.strictEqual(n.when, "today");
});
ok("ongoing, late night with nothing left today -> next day's first item", () => {
  // day 2 at 23:00: nothing after -> day 4 (index 3) Old town walk (day 3 empty)
  const n = IT.nextUp(goaTrip(), "2026-08-11", "23:00");
  assert.strictEqual(n.when, "later");
  assert.strictEqual(n.dayNumber, 4);
  assert.strictEqual(n.item.title, "Old town walk");
});
ok("ongoing on an EMPTY day -> looks forward to the next day with items", () => {
  // day 3 (index 2, 2026-08-12) has no items -> next is day 4 Old town walk
  const n = IT.nextUp(goaTrip(), "2026-08-12", "08:00");
  assert.strictEqual(n.when, "later");
  assert.strictEqual(n.item.title, "Old town walk");
});
ok("ongoing with no current time -> first item of today", () => {
  const n = IT.nextUp(goaTrip(), "2026-08-10");
  assert.strictEqual(n.when, "today");
  assert.strictEqual(n.item.title, "Flight DEL → GOI");
});
ok("past trip -> nextUp is null (nothing ahead, nothing invented)", () => {
  assert.strictEqual(IT.nextUp(goaTrip(), "2026-08-20"), null);
});
ok("undated trip -> nextUp is null", () => {
  const t = IT.newTrip({ id: "u", title: "Someday", to: "Goa", nights: 3, adults: 1 });
  assert.strictEqual(IT.nextUp(t, "2026-08-10"), null);
});
ok("trip with zero items -> nextUp null even when ongoing (never fabricates)", () => {
  const t = IT.newTrip({ id: "e", title: "Empty", to: "Goa", depart: "2026-08-10", nights: 2, adults: 1 });
  assert.strictEqual(IT.nextUp(t, "2026-08-10", "09:00"), null);
});
ok("last day after the final item -> nothing next", () => {
  // day 5 (index 4, 2026-08-14) at 12:00, after the 11:00 checkout -> null
  const n = IT.nextUp(goaTrip(), "2026-08-14", "12:00");
  assert.strictEqual(n, null);
});
ok("last day before its item -> that item is next", () => {
  const n = IT.nextUp(goaTrip(), "2026-08-14", "08:00");
  assert.strictEqual(n.item.title, "Hotel check-out");
  assert.strictEqual(n.when, "today");
});

// ---- determinism ---------------------------------------------------------
ok("same inputs -> identical status + nextUp", () => {
  const a = JSON.stringify([IT.tripStatus(goaTrip(), "2026-08-12"), IT.nextUp(goaTrip(), "2026-08-11", "15:00")]);
  const b = JSON.stringify([IT.tripStatus(goaTrip(), "2026-08-12"), IT.nextUp(goaTrip(), "2026-08-11", "15:00")]);
  assert.strictEqual(a, b);
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
