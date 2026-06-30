/* Tests for IT.reschedule — change a trip's start date / nights without losing items. */
const I = require("./itinerary-engine.js");

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; } else { fail++; console.log("FAIL:", name); } }
function eq(name, a, b) { ok(name + " (" + JSON.stringify(a) + " === " + JSON.stringify(b) + ")", a === b); }

function trip() {
  const t = I.newTrip({ title: "Goa", to: "Goa", depart: "2026-07-13", nights: 2, adults: 2, seed: 1 }); // 3 days
  I.addItem(t, 0, { time: "15:00", kind: "note", title: "Settle in" }, 1);
  I.addItem(t, 1, { time: "10:00", kind: "activity", title: "Beach" }, 2);
  I.addItem(t, 2, { time: "10:00", kind: "note", title: "Checkout" }, 3);
  return t;
}

function countItems(t) { return t.days.reduce((n, d) => n + d.items.length, 0); }

// ---- re-date: same length, new start ----
let t = trip();
I.reschedule(t, "2026-08-01", 2);
eq("re-date keeps day count", t.days.length, 3);
eq("re-date day 0", t.days[0].date, "2026-08-01");
eq("re-date day 1", t.days[1].date, "2026-08-02");
eq("re-date day 2 (departure)", t.days[2].date, "2026-08-03");
eq("re-date sets trip.depart", t.depart, "2026-08-01");
eq("re-date keeps all items", countItems(t), 3);

// ---- grow: more nights -> more days, items kept, new days empty ----
t = trip();
I.reschedule(t, "2026-07-13", 4); // 2 -> 4 nights = 5 days
eq("grow day count (nights+1)", t.days.length, 5);
eq("grow sets nights", t.nights, 4);
eq("grow keeps all original items", countItems(t), 3);
eq("grow last day dated correctly", t.days[4].date, "2026-07-17");
ok("grow new days are empty", t.days[3].items.length === 0 && t.days[4].items.length === 0);
ok("grow original day-1 item intact", t.days[1].items.some((i) => i.title === "Beach"));

// ---- shrink: fewer nights -> items from dropped days MOVED, never lost ----
t = trip(); // 3 days, item on each
I.reschedule(t, "2026-07-13", 1); // 1 night = 2 days; day 2's "Checkout" must survive
eq("shrink day count", t.days.length, 2);
eq("shrink sets nights", t.nights, 1);
eq("shrink LOSES NOTHING (all 3 items survive)", countItems(t), 3);
ok("shrink moved dropped item to new last day", t.days[1].items.some((i) => i.title === "Checkout"));
ok("shrink new last day also keeps its own item", t.days[1].items.some((i) => i.title === "Beach"));
ok("shrink new last day re-sorted by time", (() => {
  const times = t.days[1].items.map((i) => i.time);
  return times.slice().sort().join(",") === times.join(",");
})());

// ---- extreme shrink to 1 night from a long trip: still nothing lost ----
let big = I.newTrip({ title: "Big", to: "X", depart: "2026-07-13", nights: 5, adults: 1, seed: 9 }); // 6 days
for (let d = 0; d < 6; d++) I.addItem(big, d, { kind: "note", title: "item-" + d }, 100 + d);
I.reschedule(big, "2026-07-13", 1); // -> 2 days
eq("extreme shrink day count", big.days.length, 2);
eq("extreme shrink keeps every item (6)", countItems(big), 6);
ok("extreme shrink: items 1..5 all folded into last day", ["item-1","item-2","item-3","item-4","item-5"].every((x) => big.days[1].items.some((i) => i.title === x)));

// ---- guards / edge cases ----
t = trip();
I.reschedule(t, "2026-07-13", 0); // clamp to >=1 night
ok("nights clamped to >=1", t.nights >= 1 && t.days.length >= 2);

t = trip();
I.reschedule(t, "not-a-date", 2); // invalid date -> keep prior depart, still re-date
eq("invalid date falls back to prior depart", t.depart, "2026-07-13");
ok("invalid date still produces dated days", t.days[0].date === "2026-07-13");

// no-date trip can be given dates via reschedule
let nd = I.newTrip({ title: "ND", to: "Y", depart: "", nights: 2, adults: 1, seed: 5 });
I.reschedule(nd, "2026-09-01", 2);
eq("no-date trip gets dated", nd.days[0].date, "2026-09-01");

// null trip doesn't throw
ok("null trip returns gracefully", (() => { try { I.reschedule(null, "2026-07-13", 2); return true; } catch (e) { return false; } })());

// determinism
const a = trip(); I.reschedule(a, "2026-07-20", 3);
const b = trip(); I.reschedule(b, "2026-07-20", 3);
ok("deterministic", JSON.stringify(a.days.map((d) => d.date)) === JSON.stringify(b.days.map((d) => d.date)));

console.log("==== " + pass + " passed, " + fail + " failed ====");
if (fail) process.exit(1);
