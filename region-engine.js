/*
 * TripLens — region circuit engine. Pure, no DOM, no clock, no network.
 *
 * Turns "I want to do a Kerala trip" into a concrete, proven multi-stop plan:
 * which stops, in what order, how many nights each, scaled to however many
 * nights the traveller actually has. All the curated intelligence lives in
 * data/regions.js (common-knowledge geography); this engine just matches text
 * to a region and does the honest night-allocation maths.
 *
 * HONESTY MODEL:
 *  - We never invent a place, a price, or a route. We only SELECT and SCALE the
 *    curated circuit. If we can't confidently match a region, match() returns
 *    null and the caller falls back to the normal single-city flow.
 *  - Night scaling is transparent proportional maths on the curated nights, with
 *    a hard floor of 1 night per kept stop. When nights are tight we DROP whole
 *    stops (lowest-weight first) rather than give a stop an unrealistic 0 nights,
 *    and we tell the user which stops we trimmed — never a silent lie.
 *  - Cost stays a qualitative tier + the region's honest savers; no numbers.
 *
 * Deterministic: same (text, nights) -> same plan.
 */
(function (root) {
  "use strict";

  var DATA = (typeof require !== "undefined") ? require("./data/regions.js")
    : (root.LL_REGIONS || null);

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  // match free text to a region slug. Returns the region object (with .slug) or
  // null. Longest alias wins so "north east india" beats a bare "india".
  function match(text) {
    if (!DATA) return null;
    var t = norm(text);
    if (!t) return null;
    var idx = DATA.buildIndex();
    for (var i = 0; i < idx.length; i++) {
      var tok = idx[i].token;
      // word-boundary contains: the alias appears as whole words in the text
      var re = new RegExp("(^|\\s)" + tok.replace(/\s+/g, "\\s+") + "($|\\s)");
      if (re.test(t)) {
        var r = DATA.get(idx[i].slug);
        if (r) return Object.assign({ slug: idx[i].slug }, r);
      }
    }
    return null;
  }

  // allocate `targetNights` across a region's stops, keeping the circuit sensible.
  //   - each KEPT stop gets at least 1 night
  //   - when target < number of stops, drop the lowest-weight stops (by curated
  //     nights, then reverse order so earlier/anchor stops survive) and say so
  //   - when target differs from ideal, scale each kept stop proportionally,
  //     then distribute rounding remainder to the biggest stops first
  // returns { stops:[{...stop, nights}], dropped:[cityNames], totalNights, note }
  function scalePlan(region, targetNights) {
    if (!region || !Array.isArray(region.stops) || !region.stops.length) return null;
    var stops = region.stops.map(function (s, i) { return Object.assign({ _i: i }, s); });
    var target = Math.max(1, Math.floor(+targetNights || region.idealNights || stops.length));

    // 1. decide how many stops we can keep (>=1 night each needs target >= count)
    var dropped = [];
    var kept = stops.slice();
    if (target < kept.length) {
      // drop lowest curated-nights first; tie-break: later stops go before earlier
      var byDrop = kept.slice().sort(function (a, b) {
        if ((a.nights || 1) !== (b.nights || 1)) return (a.nights || 1) - (b.nights || 1);
        return b._i - a._i; // later stop dropped first
      });
      while (kept.length > target && byDrop.length) {
        var victim = byDrop.shift();
        kept = kept.filter(function (s) { return s._i !== victim._i; });
        dropped.push(victim.city);
      }
      // restore route order
      kept.sort(function (a, b) { return a._i - b._i; });
    }

    // 2. proportional allocation of target across kept stops by curated weight
    var weights = kept.map(function (s) { return Math.max(1, +s.nights || 1); });
    var wsum = weights.reduce(function (a, b) { return a + b; }, 0);
    var alloc = kept.map(function (s, i) {
      return Math.max(1, Math.floor(target * weights[i] / wsum));
    });
    // fix rounding: add/remove nights to hit target exactly, biggest-weight first
    var sum = alloc.reduce(function (a, b) { return a + b; }, 0);
    var orderByWeight = kept.map(function (s, i) { return i; }).sort(function (a, b) { return weights[b] - weights[a]; });
    var guard = 0;
    while (sum < target && guard++ < 1000) { alloc[orderByWeight[sum % orderByWeight.length]]++; sum++; }
    // if we overshot (all floors summed > target is impossible since floor<=exact,
    // but rounding can), trim from smallest-weight kept stops that have >1 night
    var orderBySmall = orderByWeight.slice().reverse();
    guard = 0;
    while (sum > target && guard++ < 1000) {
      var trimmed = false;
      for (var k = 0; k < orderBySmall.length; k++) {
        var j = orderBySmall[k];
        if (alloc[j] > 1) { alloc[j]--; sum--; trimmed = true; break; }
      }
      if (!trimmed) break; // everyone at floor 1 — can't trim below realistic
    }

    var outStops = kept.map(function (s, i) {
      return Object.assign({}, s, { nights: alloc[i] });
    });
    outStops.forEach(function (s) { delete s._i; });
    var totalNights = alloc.reduce(function (a, b) { return a + b; }, 0);

    var note = null;
    if (dropped.length) {
      note = "For " + target + " night" + (target === 1 ? "" : "s") + " I trimmed " +
        dropped.join(" and ") + " so the rest isn't rushed. Add nights to fit " +
        (dropped.length === 1 ? "it" : "them") + " back in.";
    } else if (totalNights !== (region.idealNights || totalNights)) {
      note = "Scaled to your " + totalNights + " night" + (totalNights === 1 ? "" : "s") + ".";
    }

    return { stops: outStops, dropped: dropped, totalNights: totalNights, note: note };
  }

  // --- transport modes per hop --------------------------------------------
  // What's the sensible way to cover a leg? Honest rule-of-thumb from the hop's
  // rough drive-hours (exact distances aren't in the data), with two extra
  // signals: `isAirLeg` (curated null driveHours = a fly-between leg) and an
  // optional per-hop `override` array of mode ids where a mode is famously THE
  // way (Sri Lanka's Kandy->Ella train, Goa scooters). Returns ordered modes,
  // each { id, label, icon, search } where `search` is a search-KIND the app
  // turns into a real live query — never a fabricated fare or operator.
  var MODE = {
    fly:     { id: "fly",     label: "Fly",              icon: "✈️", search: "flights" },
    train:   { id: "train",   label: "Train",            icon: "🚆", search: "trains" },
    bus:     { id: "bus",     label: "Bus",              icon: "🚌", search: "buses" },
    cab:     { id: "cab",     label: "Cab / car",        icon: "🚕", search: "cab" },
    scooter: { id: "scooter", label: "Scooter rental",   icon: "🛵", search: "scooter" },
    auto:    { id: "auto",    label: "Auto / local ride", icon: "🛺", search: "auto" },
    local:   { id: "local",   label: "Local transit",    icon: "🚇", search: "transit" },
    ferry:   { id: "ferry",   label: "Ferry",            icon: "⛴️", search: "ferry" },
    walk:    { id: "walk",    label: "Walk",             icon: "🚶", search: "walk" },
  };
  function modeList(ids) {
    var seen = {}, out = [];
    (ids || []).forEach(function (id) {
      if (MODE[id] && !seen[id]) { seen[id] = true; out.push(MODE[id]); }
    });
    return out;
  }
  // hop = { driveHoursFromPrev, travel? } ; opts = { isArrival, isAirLeg }
  //   isArrival: the flight INTO the region (first stop from home) -> always fly-first
  //   isAirLeg : curated leg with no road drive (island/long domestic) -> fly-first
  function modesForHop(hop, opts) {
    opts = opts || {};
    hop = hop || {};
    // 1. curated override wins (famous, specific modes for this exact hop)
    if (Array.isArray(hop.travel) && hop.travel.length) {
      var over = modeList(hop.travel);
      if (over.length) return over;
    }
    // 2. arrival into the region, or a curated air leg -> fly, with train as the
    //    scenic/overland alternative
    if (opts.isArrival || opts.isAirLeg || hop.driveHoursFromPrev == null) {
      return modeList(["fly", "train"]);
    }
    // 3. band logic on rough drive-hours
    var h = +hop.driveHoursFromPrev;
    if (h >= 8) return modeList(["fly", "train", "bus"]);     // very long: flying often saves a day
    if (h >= 5) return modeList(["train", "bus", "cab"]);     // long haul: rail/coach territory
    if (h >= 2) return modeList(["bus", "cab", "train"]);     // medium: bus or a hired car
    if (h >= 1) return modeList(["cab", "bus", "scooter"]);   // short hop: cab/auto, scooter if you ride
    return modeList(["auto", "scooter", "local", "walk"]);    // very near / in-town: local transport
  }

  // a short honest summary line for the advisor card.
  function summary(region) {
    if (!region) return "";
    return region.name + " — " + region.vibe;
  }

  // the qualitative cost line (tier word + one framing sentence). No numbers.
  var TIER_WORD = { value: "easy on the wallet", moderate: "mid-range", premium: "on the pricier side" };
  function costLine(region) {
    if (!region) return "";
    var w = TIER_WORD[region.costTier] || "mid-range";
    return "Roughly " + w + " overall. Real prices open on the live search — nothing here is a quote.";
  }

  var Engine = {
    match: match, scalePlan: scalePlan, summary: summary, costLine: costLine, norm: norm,
    modesForHop: modesForHop, MODE: MODE,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  root.LL_REGION_ENGINE = Engine;
})(typeof window !== "undefined" ? window : globalThis);
