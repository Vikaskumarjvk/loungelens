/*
 * TripLens — "get me anywhere" route engine (Rome2Rio-style). Pure, no DOM, no clock.
 *
 * For two places it returns:
 *   1) DIRECT options — fly / train / bus, ranked by honest door-to-door time
 *      (reuses transport-engine.compareModes + rankModes).
 *   2) VIA-HUB options — sensible 1-stop combos through a major hub (e.g. take a
 *      short train to a hub, then fly onward), with REAL per-segment distances.
 *
 * HONESTY RULES (this is the part that keeps it useful, not made-up):
 *   - All distances are real haversine (geo-engine). We never invent a schedule.
 *   - A via-hub route is only surfaced if it actually MAKES SENSE: the hub must be
 *     roughly "on the way" (total detour under a cap), not a random pinball route.
 *   - We never claim a specific connecting flight/train exists. We say "consider
 *     going via X" and hand you the live search for each leg to confirm reality.
 *   - If we can't place a city on the map, we say so — we don't guess a route.
 */
(function (root) {
  "use strict";

  function geo() { return root.LL_GEO || req("./geo-engine.js"); }
  function transport() { return root.LL_TRANSPORT_ENGINE || req("./transport-engine.js"); }
  function req(p) { try { return require(p); } catch (e) { return null; } }

  // major Indian connecting hubs (big airports lots of routes pass through)
  var HUBS = ["DEL", "BOM", "BLR", "HYD", "MAA", "CCU"];

  // how much extra distance a hub detour may add before it stops "making sense".
  // 1.35 = the two-leg path may be up to 35% longer than the direct great-circle.
  var DETOUR_CAP = 1.35;

  // direct options, ranked by the traveller's priority (default fastest d2d)
  function directOptions(fromCode, toCode, priority) {
    var T = transport();
    if (!T) return null;
    var cmp = T.compareModes(fromCode, toCode);
    if (!cmp) return null;
    var rank = T.rankModes(fromCode, toCode, priority || "fast");
    return { compare: cmp, ranked: rank ? rank.ranked : null };
  }

  // candidate via-hub routes that genuinely make sense for this pair.
  // For each hub != from/to: leg1 = from->hub, leg2 = hub->to. We keep it only if
  // both legs are measurable AND the detour is within the cap. Each leg gets an
  // honest suggested mode from the transport bands (short legs lean rail).
  function viaHubOptions(fromCode, toCode, opts) {
    opts = opts || {};
    var G = geo(), T = transport();
    if (!G || !T) return [];
    var direct = G.distanceKm(fromCode, toCode);
    if (direct == null || direct <= 0) return [];
    var out = [];
    HUBS.forEach(function (hub) {
      if (hub === fromCode || hub === toCode) return;
      var d1 = G.distanceKm(fromCode, hub), d2 = G.distanceKm(hub, toCode);
      if (d1 == null || d2 == null) return;
      var total = d1 + d2;
      if (total > direct * DETOUR_CAP) return;           // not on the way -> skip
      var leg1 = T.compareModes(fromCode, hub), leg2 = T.compareModes(hub, toCode);
      out.push({
        hub: hub,
        leg1: { from: fromCode, to: hub, km: d1, compare: leg1, suggest: leg1 ? bestOf(leg1) : null },
        leg2: { from: hub, to: toCode, km: d2, compare: leg2, suggest: leg2 ? bestOf(leg2) : null },
        totalKm: total,
        extraPct: Math.round(((total - direct) / direct) * 100),
      });
    });
    // closest-to-direct first (least detour = most sensible)
    out.sort(function (a, b) { return a.totalKm - b.totalKm; });
    return out;
  }

  // collapse a compareModes band into one suggested mode name for a leg
  function bestOf(cmp) {
    if (!cmp) return null;
    if (cmp.recommend === "fly") return "flight";
    if (cmp.recommend === "train_bus") return "train";
    if (cmp.recommend === "fly_or_overnight_train") return "flight";
    return "compare";
  }

  // top-level: everything for a pair. maxHubs caps how many via routes we surface.
  function getAnywhere(fromCode, toCode, opts) {
    opts = opts || {};
    var G = geo();
    if (!G || !G.hasCoords(fromCode) || !G.hasCoords(toCode)) {
      return { ok: false, reason: "unknown_coords", fromCode: fromCode, toCode: toCode };
    }
    if (fromCode === toCode) return { ok: false, reason: "same_place" };
    var direct = directOptions(fromCode, toCode, opts.priority);
    var via = viaHubOptions(fromCode, toCode, opts).slice(0, opts.maxHubs || 3);
    // only suggest via-routes when they could matter: surface them always, but the
    // UI leads with direct. (A direct flight is usually best; via shines when the
    // direct distance is long or you want a cheaper rail+fly mix.)
    return {
      ok: true,
      directKm: G.distanceKm(fromCode, toCode),
      direct: direct,
      via: via,
      suggestVia: !!(via.length && direct && direct.compare && direct.compare.km > 700),
    };
  }

  var Engine = { HUBS: HUBS, DETOUR_CAP: DETOUR_CAP, directOptions: directOptions, viaHubOptions: viaHubOptions, bestOf: bestOf, getAnywhere: getAnywhere };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  root.LL_ROUTE = Engine;
})(typeof window !== "undefined" ? window : globalThis);
