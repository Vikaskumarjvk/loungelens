/* Tests for the "share a trip as a link" codec in itinerary-engine.js.
 * node tests-triplink.js
 *
 * This is a no-backend superpower: the WHOLE trip rides inside a URL, and a
 * friend who opens the link rebuilds the identical trip on their own device —
 * no server, no upload, no account. So it's tested hard:
 *  - round-trip fidelity: encode -> decode reproduces every field + every item
 *  - unicode / emoji titles survive (base64url is byte-safe, not latin1)
 *  - every item kind maps cleanly through the short-code table
 *  - empty / dateless trips still round-trip
 *  - garbage / tampered / truncated codes decode to null (never throw, never
 *    fabricate a trip)
 *  - HONESTY: personal check-state (packing ticks) is NOT shared; the recipient
 *    starts fresh. Day dates are recomputed from depart, not trusted from wire.
 *  - determinism: same trip -> same code every time
 *  - fresh ids on rebuild so an imported trip can't clobber an existing one
 */
"use strict";
const assert = require("assert");
global.window = global;
const IT = require("./itinerary-engine.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// build a realistic trip the way the app does
function sampleTrip() {
  const t = IT.newTrip({ id: "trip-9", title: "Goa", from: "DEL", to: "Goa", depart: "2026-08-02", nights: 3, adults: 2, notes: "beach + old town" });
  IT.addItem(t, 0, { time: "08:00", kind: "flight", title: "Flight DEL → GOI", note: "compare + book", link: "https://www.google.com/travel/flights?q=DEL+to+GOI" }, 1);
  IT.addItem(t, 0, { time: "14:00", kind: "hotel", title: "Hotel check-in · Goa", note: "book on a compare site", link: "https://www.google.com/travel/hotels/Goa" }, 2);
  IT.addItem(t, 1, { time: "10:00", kind: "activity", title: "Beach time in Goa 🏖️", note: "tap to open the live map search", link: "https://www.google.com/maps/search/beaches%20in%20Goa" }, 3);
  IT.addItem(t, 1, { time: "20:00", kind: "food", title: "Local food crawl", note: "", link: "https://www.google.com/maps/search/best%20local%20food%20in%20Goa" }, 4);
  IT.addItem(t, 3, { time: "11:00", kind: "hotel", title: "Hotel check-out", note: "", link: "" }, 5);
  // give it some personal check-state that must NOT be shared
  t.packing.checked["documents-passport"] = true;
  return t;
}

// ---- round-trip fidelity -------------------------------------------------
ok("encode -> decode reproduces all trip meta", () => {
  const t = sampleTrip();
  const code = IT.encodeTripToCode(t);
  assert.ok(typeof code === "string" && code.length > 0);
  const r = IT.decodeTripFromCode(code, { id: "trip-new", seedStart: 1 });
  assert.strictEqual(r.title, "Goa");
  assert.strictEqual(r.from, "DEL");
  assert.strictEqual(r.to, "Goa");
  assert.strictEqual(r.depart, "2026-08-02");
  assert.strictEqual(r.nights, 3);
  assert.strictEqual(r.adults, 2);
  assert.strictEqual(r.notes, "beach + old town");
  assert.strictEqual(r.days.length, 4, "3 nights -> 4 days");
});
ok("every item round-trips with time/kind/title/note/link intact", () => {
  const t = sampleTrip();
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 1 });
  // day 0 has 2, day 1 has 2, day 2 has 0, day 3 has 1
  assert.strictEqual(r.days[0].items.length, 2);
  assert.strictEqual(r.days[1].items.length, 2);
  assert.strictEqual(r.days[2].items.length, 0);
  assert.strictEqual(r.days[3].items.length, 1);
  const f = r.days[0].items.find((x) => x.kind === "flight");
  assert.strictEqual(f.time, "08:00");
  assert.strictEqual(f.title, "Flight DEL → GOI");
  assert.strictEqual(f.note, "compare + book");
  assert.ok(f.link.indexOf("google.com/travel/flights") !== -1);
});
ok("every kind survives the short-code mapping", () => {
  const t = IT.newTrip({ id: "k", title: "Kinds", to: "Goa", depart: "2026-08-02", nights: 6, adults: 1 });
  const kinds = ["flight", "hotel", "lounge", "cab", "food", "activity", "note"];
  kinds.forEach((k, i) => IT.addItem(t, i, { time: "09:00", kind: k, title: k + " item" }, i + 1));
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 1 });
  kinds.forEach((k, i) => assert.strictEqual(r.days[i].items[0].kind, k, k + " preserved"));
});

// ---- unicode / emoji -----------------------------------------------------
ok("emoji + non-latin titles survive (byte-safe base64url)", () => {
  const t = IT.newTrip({ id: "u", title: "गोवा 🏝️ trip", to: "Goa", depart: "2026-08-02", nights: 2, adults: 1, notes: "café · beaches — nightlife" });
  IT.addItem(t, 1, { time: "12:00", kind: "food", title: "थाली + à la carte 🍽️", note: "spicy 🌶️", link: "https://www.google.com/maps/search/food" }, 1);
  const code = IT.encodeTripToCode(t);
  assert.ok(/^[A-Za-z0-9_-]+$/.test(code), "code is URL-safe (no +, /, =)");
  const r = IT.decodeTripFromCode(code, { seedStart: 1 });
  assert.strictEqual(r.title, "गोवा 🏝️ trip");
  assert.strictEqual(r.notes, "café · beaches — nightlife");
  assert.strictEqual(r.days[1].items[0].title, "थाली + à la carte 🍽️");
  assert.strictEqual(r.days[1].items[0].note, "spicy 🌶️");
});

// ---- honesty contract ----------------------------------------------------
ok("personal packing check-state is NOT shared (recipient starts fresh)", () => {
  const t = sampleTrip();
  assert.ok(t.packing.checked["documents-passport"], "sender had a checked item");
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 1 });
  assert.deepStrictEqual(r.packing.checked, {}, "recipient's packing starts empty");
});
ok("day dates are recomputed from depart, not trusted from the wire", () => {
  const t = sampleTrip();
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 1 });
  assert.strictEqual(r.days[0].date, "2026-08-02");
  assert.strictEqual(r.days[1].date, "2026-08-03");
  assert.strictEqual(r.days[3].date, "2026-08-05", "arrival + 3 = departure day");
});
ok("no fabricated data: an item with no link stays link-less", () => {
  const t = sampleTrip();
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 1 });
  const checkout = r.days[3].items[0];
  assert.strictEqual(checkout.title, "Hotel check-out");
  assert.strictEqual(checkout.link, "", "empty link is preserved, never invented");
});

// ---- fresh ids -----------------------------------------------------------
ok("decoded trip takes the id we pass (so it can't clobber an existing trip)", () => {
  const t = sampleTrip();
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { id: "trip-42", seedStart: 100 });
  assert.strictEqual(r.id, "trip-42");
  assert.notStrictEqual(r.id, t.id, "new id, not the sender's id");
});
ok("decoded item ids are freshly minted from the passed seed", () => {
  const t = sampleTrip();
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 500 });
  const ids = [];
  r.days.forEach((d) => d.items.forEach((it) => ids.push(it.id)));
  assert.strictEqual(new Set(ids).size, ids.length, "all item ids unique");
  assert.ok(ids.every((id) => /^it-\d+$/.test(id)), "ids follow the it-<seed> pattern");
});

// ---- empty / edge --------------------------------------------------------
ok("a trip with no items still round-trips (structure only)", () => {
  const t = IT.newTrip({ id: "e", title: "Empty", to: "Goa", depart: "2026-08-02", nights: 2, adults: 1 });
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 1 });
  assert.strictEqual(r.title, "Empty");
  assert.strictEqual(r.days.length, 3);
  assert.strictEqual(IT.countItems(r), 0);
});
ok("a dateless trip round-trips (no depart)", () => {
  const t = IT.newTrip({ id: "nd", title: "Someday Goa", to: "Goa", nights: 3, adults: 2 });
  const r = IT.decodeTripFromCode(IT.encodeTripToCode(t), { seedStart: 1 });
  assert.strictEqual(r.depart, "");
  assert.strictEqual(r.nights, 3);
  assert.strictEqual(r.days[0].date, null);
});

// ---- garbage / tamper resistance -----------------------------------------
ok("garbage strings decode to null, never throw", () => {
  ["", "not a code", "!!!", "%%%", "aGVsbG8", "12345", "----", "____"].forEach((s) => {
    let r; assert.doesNotThrow(() => { r = IT.decodeTripFromCode(s); });
    assert.strictEqual(r, null, "garbage '" + s + "' -> null");
  });
});
ok("null / undefined code -> null", () => {
  assert.strictEqual(IT.decodeTripFromCode(null), null);
  assert.strictEqual(IT.decodeTripFromCode(undefined), null);
});
ok("a valid base64url of non-trip JSON -> null (wrong version/shape)", () => {
  const bad = Buffer.from(JSON.stringify({ hello: "world" }), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  assert.strictEqual(IT.decodeTripFromCode(bad), null);
});
ok("a truncated valid code -> null (doesn't build a half trip)", () => {
  const code = IT.encodeTripToCode(sampleTrip());
  const cut = code.slice(0, Math.floor(code.length / 2));
  let r; assert.doesNotThrow(() => { r = IT.decodeTripFromCode(cut); });
  assert.strictEqual(r, null);
});
ok("encodeTripToCode(null) -> null", () => { assert.strictEqual(IT.encodeTripToCode(null), null); });

// ---- determinism ---------------------------------------------------------
ok("same trip -> identical code every time", () => {
  const a = IT.encodeTripToCode(sampleTrip());
  const b = IT.encodeTripToCode(sampleTrip());
  assert.strictEqual(a, b);
});

// ---- realistic size sanity ----------------------------------------------
ok("a full 7-night trip encodes to a link that fits a real URL", () => {
  const t = IT.newTrip({ id: "big", title: "Bangkok", to: "Bangkok", depart: "2026-09-01", nights: 7, adults: 2 });
  for (let d = 0; d < 8; d++) {
    for (let i = 0; i < 4; i++) {
      IT.addItem(t, d, { time: "10:00", kind: "activity", title: "Explore Bangkok day " + d + " slot " + i, note: "tap to open the live map search", link: "https://www.google.com/maps/search/things%20to%20do%20in%20Bangkok" }, d * 10 + i + 1);
    }
  }
  const code = IT.encodeTripToCode(t);
  // browsers happily handle URLs into the tens of thousands of chars; assert
  // we're well under a conservative shareable ceiling.
  assert.ok(code.length < 8000, "share code stays under 8k chars (was " + code.length + ")");
  const r = IT.decodeTripFromCode(code, { seedStart: 1 });
  assert.strictEqual(IT.countItems(r), 32);
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
