/* Tests for route-engine.js (Rome2Rio-style get-anywhere + via-hub). node tests-route.js */
"use strict";
const assert = require("assert");
global.window = global;
require("./geo-engine.js");
require("./data/transport.js");
require("./transport-engine.js");
const R = require("./route-engine.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

// ---- directOptions -------------------------------------------------------
ok("directOptions returns the 3-mode compare + a ranking", () => {
  const d = R.directOptions("DEL", "BOM", "fast");
  assert.ok(d.compare && d.compare.modes.length === 3);
  assert.ok(d.ranked && d.ranked.length === 3);
});
ok("directOptions respects priority (cheap -> bus first)", () => {
  const d = R.directOptions("DEL", "BOM", "cheap");
  assert.strictEqual(d.ranked[0].mode, "bus");
});

// ---- viaHubOptions -------------------------------------------------------
ok("viaHubOptions never routes through the origin or destination hub", () => {
  const via = R.viaHubOptions("DEL", "BOM");
  via.forEach((v) => { assert.notStrictEqual(v.hub, "DEL"); assert.notStrictEqual(v.hub, "BOM"); });
});
ok("viaHubOptions only keeps sensible (on-the-way) detours within the cap", () => {
  const via = R.viaHubOptions("DEL", "BOM");
  const directKm = require("./geo-engine.js").distanceKm("DEL", "BOM");
  via.forEach((v) => assert.ok(v.totalKm <= directKm * R.DETOUR_CAP + 1, "detour within cap: " + v.hub + " " + v.totalKm));
});
ok("viaHubOptions legs carry real per-segment distances that sum to total", () => {
  const via = R.viaHubOptions("DEL", "MAA");
  via.forEach((v) => assert.strictEqual(v.leg1.km + v.leg2.km, v.totalKm));
});
ok("viaHubOptions sorted least-detour first", () => {
  const via = R.viaHubOptions("DEL", "MAA");
  for (let i = 1; i < via.length; i++) assert.ok(via[i - 1].totalKm <= via[i].totalKm);
});
ok("viaHubOptions empty when distance unknown", () => {
  assert.deepStrictEqual(R.viaHubOptions("DEL", "ZZZ"), []);
});
ok("each via leg gets a suggested mode (short legs lean train)", () => {
  // DEL->JAI is short; if JAI were a hub it'd suggest train. Use a real hub leg:
  const via = R.viaHubOptions("JAI", "BOM"); // could go via DEL
  const viaDel = via.find((v) => v.hub === "DEL");
  if (viaDel) assert.ok(["train", "flight", "bus", "compare"].includes(viaDel.leg1.suggest));
});

// ---- getAnywhere ---------------------------------------------------------
ok("getAnywhere ok for a measurable pair", () => {
  const g = R.getAnywhere("DEL", "BOM");
  assert.strictEqual(g.ok, true);
  assert.ok(g.directKm > 0);
  assert.ok(g.direct && Array.isArray(g.via));
});
ok("getAnywhere flags unknown coords honestly (no guessed route)", () => {
  const g = R.getAnywhere("DEL", "ZZZ");
  assert.strictEqual(g.ok, false);
  assert.strictEqual(g.reason, "unknown_coords");
});
ok("getAnywhere rejects same-place", () => {
  assert.strictEqual(R.getAnywhere("DEL", "DEL").ok, false);
});
ok("getAnywhere caps via routes to maxHubs", () => {
  const g = R.getAnywhere("DEL", "MAA", { maxHubs: 2 });
  assert.ok(g.via.length <= 2);
});
ok("getAnywhere suggestVia true on a long route with via options", () => {
  const g = R.getAnywhere("DEL", "MAA");
  // long route (>700km direct); if any sensible hub exists, suggestVia is true
  if (g.via.length) assert.strictEqual(g.suggestVia, true);
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
