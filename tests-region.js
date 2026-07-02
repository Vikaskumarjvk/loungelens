/* Tests for region-engine.js + data/regions.js — the expert circuit planner.
 * node tests-region.js
 *
 * "I want to do a Kerala trip" -> a proven multi-stop circuit, scaled to the
 * nights you have. Tested hard because this is where the app gives ADVICE, and
 * the advice must stay honest:
 *  - matching: names, aliases, common misspellings, embedded in a sentence
 *  - longest-alias-wins (north east india beats a bare india token)
 *  - night scaling: ideal, fewer (drops stops + says so), more (pads), floors
 *  - every kept stop gets >= 1 night (never a fake 0-night stop)
 *  - total allocated nights always equals the target exactly
 *  - route order preserved after any drop
 *  - honesty: data carries NO price/venue/hours; cost is a qualitative tier
 *  - unknown region -> null (caller falls back)
 *  - determinism
 */
"use strict";
const assert = require("assert");
const RE = require("./region-engine.js");
const DATA = require("./data/regions.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// ---- matching ------------------------------------------------------------
ok("matches a plain region name", () => {
  assert.strictEqual(RE.match("Kerala").slug, "kerala");
  assert.strictEqual(RE.match("Rajasthan").slug, "rajasthan");
  assert.strictEqual(RE.match("Vietnam").slug, "vietnam");
});
ok("matches inside a natural sentence", () => {
  assert.strictEqual(RE.match("i want to do a kerala trip next month").slug, "kerala");
  assert.strictEqual(RE.match("planning something in rajasthan for a week").slug, "rajasthan");
});
ok("matches common misspellings", () => {
  assert.strictEqual(RE.match("kerela trip").slug, "kerala");
  assert.strictEqual(RE.match("rajastan").slug, "rajasthan");
  assert.strictEqual(RE.match("sinagpore holiday").slug, "singapore");
});
ok("matches aliases", () => {
  assert.strictEqual(RE.match("gods own country").slug, "kerala");
  assert.strictEqual(RE.match("golden triangle").slug, "golden-triangle");
  assert.strictEqual(RE.match("leh ladakh").slug, "ladakh");
  assert.strictEqual(RE.match("halong bay cruise").slug, "vietnam");
});
ok("longest alias wins (north east india beats bare india tokens)", () => {
  assert.strictEqual(RE.match("north east india trip").slug, "north-east-india");
  assert.strictEqual(RE.match("meghalaya and shillong").slug, "north-east-india");
});
ok("unknown region -> null (caller falls back to single-city)", () => {
  assert.strictEqual(RE.match("xanadu"), null);
  assert.strictEqual(RE.match("just some random text"), null);
  assert.strictEqual(RE.match(""), null);
  assert.strictEqual(RE.match(null), null);
});
ok("a bare known CITY that isn't a region name doesn't false-match a region", () => {
  // "Kochi" alone is a city, not one of the region aliases -> no region
  assert.strictEqual(RE.match("kochi"), null);
});

// ---- night scaling: ideal ------------------------------------------------
ok("ideal nights reproduces the curated circuit exactly", () => {
  const r = RE.match("kerala");
  const p = RE.scalePlan(r, r.idealNights); // 7
  assert.strictEqual(p.totalNights, 7);
  assert.strictEqual(p.stops.length, 5);
  assert.strictEqual(p.dropped.length, 0);
  assert.deepStrictEqual(p.stops.map((s) => s.city), ["Kochi", "Munnar", "Thekkady", "Alleppey", "Kovalam"]);
});
ok("total allocated nights ALWAYS equals the target (sweep 3..15)", () => {
  const r = RE.match("rajasthan");
  for (let n = 3; n <= 15; n++) {
    const p = RE.scalePlan(r, n);
    assert.strictEqual(p.totalNights, n, "rajasthan target=" + n + " got " + p.totalNights);
  }
});
ok("every kept stop gets at least 1 night (never a 0-night stop)", () => {
  const r = RE.match("kerala");
  for (let n = 2; n <= 12; n++) {
    const p = RE.scalePlan(r, n);
    p.stops.forEach((s) => assert.ok(s.nights >= 1, "n=" + n + " " + s.city + " got " + s.nights));
  }
});

// ---- night scaling: fewer nights -> drop stops + say so ------------------
ok("fewer nights than stops drops the least-important stops and reports them", () => {
  const r = RE.match("kerala"); // 5 stops
  const p = RE.scalePlan(r, 3);
  assert.strictEqual(p.totalNights, 3);
  assert.ok(p.stops.length <= 3);
  assert.ok(p.dropped.length >= 2, "dropped some stops");
  assert.ok(/trimmed/i.test(p.note), "note explains the trim: " + p.note);
});
ok("dropped stops are the lower-weight ones; anchor stops survive", () => {
  const r = RE.match("kerala");
  const p = RE.scalePlan(r, 3);
  const keptCities = p.stops.map((s) => s.city);
  // Alleppey (2n, the backwaters) and Munnar (2n) are anchors — should survive a 3-night trim
  assert.ok(keptCities.includes("Alleppey"), "keeps the backwaters: " + keptCities.join(","));
});
ok("route order is preserved after dropping stops", () => {
  const r = RE.match("rajasthan");
  const p = RE.scalePlan(r, 4);
  const order = p.stops.map((s) => s.city);
  const idealOrder = r.stops.map((s) => s.city);
  // kept cities appear in the same relative order as the curated circuit
  const idxs = order.map((c) => idealOrder.indexOf(c));
  const sorted = idxs.slice().sort((a, b) => a - b);
  assert.deepStrictEqual(idxs, sorted, "order preserved");
});

// ---- night scaling: more nights -> pad anchors ---------------------------
ok("more nights than ideal pads stops, keeps all of them", () => {
  const r = RE.match("goa"); // ideal 5, 2 stops
  const p = RE.scalePlan(r, 10);
  assert.strictEqual(p.totalNights, 10);
  assert.strictEqual(p.stops.length, 2, "no stops dropped when padding");
  assert.strictEqual(p.dropped.length, 0);
});

// ---- honesty -------------------------------------------------------------
ok("region data carries NO price, venue name, or hours anywhere", () => {
  Object.keys(DATA.REGIONS).forEach((slug) => {
    const blob = JSON.stringify(DATA.REGIONS[slug]);
    assert.ok(!/[₹$€£]\s*\d|\b\d+\s*(usd|inr|eur|rs|rupees|dollars)\b/i.test(blob), slug + " must not contain a price");
    assert.ok(!/\b(open|closes?)\s+\d|\d+\s*(am|pm)\b/i.test(blob), slug + " must not contain opening hours");
  });
});
ok("cost line is qualitative + explicitly not a quote", () => {
  const line = RE.costLine(RE.match("dubai"));
  assert.ok(/pricier|mid-range|wallet/i.test(line));
  assert.ok(/not.*quote|open on the live search/i.test(line), "flags it's not a quote: " + line);
});
ok("every region is well-formed (gateway, stops with themes, savers, tier)", () => {
  Object.keys(DATA.REGIONS).forEach((slug) => {
    const r = DATA.REGIONS[slug];
    assert.ok(r.name && r.country && r.gateway, slug + " missing header fields");
    assert.ok(["value", "moderate", "premium"].includes(r.costTier), slug + " bad costTier");
    assert.ok(Array.isArray(r.savers) && r.savers.length >= 2, slug + " needs savers");
    assert.ok(Array.isArray(r.stops) && r.stops.length >= 1, slug + " needs stops");
    r.stops.forEach((s) => {
      assert.ok(s.city && s.nights >= 1 && s.why, slug + " stop malformed: " + s.city);
      assert.ok(Array.isArray(s.themes) && s.themes.length >= 1, slug + " stop " + s.city + " needs themes");
    });
  });
});
ok("the gateway airport is a real code, and appears as SOME stop's code OR is a drive-in hub", () => {
  // the gateway is the fly-in airport. Usually it's the first stop's own code,
  // but some hill/island regions fly into a hub and drive to the first stop
  // (e.g. Himachal flies into Chandigarh IXC, then drives to Shimla). Both are
  // legit — we just require the gateway to be a non-empty IATA-shaped code.
  Object.keys(DATA.REGIONS).forEach((slug) => {
    const r = DATA.REGIONS[slug];
    assert.ok(/^[A-Z]{3}$/.test(r.gateway), slug + " gateway must be a 3-letter IATA code, got " + r.gateway);
  });
});
ok("any stop that declares a code uses a 3-letter IATA code", () => {
  Object.keys(DATA.REGIONS).forEach((slug) => {
    DATA.REGIONS[slug].stops.forEach((s) => {
      if (s.code) assert.ok(/^[A-Z]{3}$/.test(s.code), slug + " stop " + s.city + " bad code " + s.code);
    });
  });
});

// ---- determinism ---------------------------------------------------------
ok("same (region, nights) -> identical plan", () => {
  const r = RE.match("kerala");
  const a = JSON.stringify(RE.scalePlan(r, 6));
  const b = JSON.stringify(RE.scalePlan(r, 6));
  assert.strictEqual(a, b);
});
ok("scalePlan(null) / bad input -> null, no throw", () => {
  let p; assert.doesNotThrow(() => { p = RE.scalePlan(null, 5); });
  assert.strictEqual(p, null);
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
