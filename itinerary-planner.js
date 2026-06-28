/*
 * TripLens — itinerary planner. Builds a paced, themed day-by-day plan for a
 * destination. Pure, no DOM, no clock, Node-testable.
 *
 * Given a destination + number of days, it produces day slots like:
 *   day 1 (arrival):  settle in, evening: local food
 *   day 2 (full):     morning beach, afternoon old-town walk, evening nightlife
 *   ...
 *   last (departure): morning checkout, leave time free for the airport
 * Each "explore" slot is a CATEGORY (beach / old-town / food) linked to a REAL
 * live Google Maps search for that category in that city.
 *
 * HONESTY MODEL: this never invents a specific venue, a price, an opening time,
 * or a "must-do". It structures your days around what the place is genuinely
 * known for (common knowledge) and points each slot at a real live search. The
 * caller turns these slots into itinerary items; the dates + booking links still
 * come from the user's real trip + the real booking sites.
 *
 * Pure + deterministic: the theme rotation is index-driven, no randomness, so the
 * same (destination, days) always yields the same plan.
 */
(function (root) {
  "use strict";

  function mapsSearch(query, city) {
    var q = String(query || "").replace(/\{CITY\}/g, city || "");
    return "https://www.google.com/maps/search/" + encodeURIComponent(q);
  }

  // pick the destination's theme list (curated) or the honest generic fallback.
  function themesFor(destData, code) {
    if (destData && destData.get) {
      var d = destData.get(code);
      if (d && d.themes && d.themes.length) return { themes: d.themes, city: d.city, knownFor: d.knownFor, vibe: d.vibe, curated: true };
    }
    return { themes: (destData && destData.GENERIC_THEMES) || ["landmark", "food", "market"], city: null, knownFor: null, vibe: null, curated: false };
  }

  // build the plan. args:
  //   dest = { code, city }  (city falls back to curated city or code)
  //   days = total day count (>=1). arrival = day 0, departure = last day.
  //   destData = LL_DESTINATIONS (injected so the engine stays decoupled/testable)
  // returns { city, knownFor, vibe, curated, days: [ { dayIndex, role, slots:[ {time,kind,icon,title,query,link,theme} ] } ] }
  function buildPlan(dest, days, destData) {
    dest = dest || {};
    days = Math.max(1, days | 0);
    var info = themesFor(destData, dest.code);
    var city = dest.city || info.city || dest.code || "your destination";
    var THEME_TIMES = ["10:00", "14:30", "19:30"]; // morning / afternoon / evening
    var themeList = info.themes.slice();
    var ti = 0; // rotating index so themes don't repeat until exhausted
    function nextTheme() {
      if (!themeList.length) return null;
      var id = themeList[ti % themeList.length]; ti++;
      var t = destData && destData.theme ? destData.theme(id) : null;
      return t ? { id: id, t: t } : null;
    }
    function slot(time, theme) {
      if (!theme) return null;
      var q = String(theme.t.q || "").replace(/\{CITY\}/g, city);
      return {
        time: time, kind: theme.t.kind || "activity", icon: theme.t.icon || "•",
        title: theme.t.label + " · " + city, query: q, link: mapsSearch(theme.t.q, city), theme: theme.id,
      };
    }

    var out = [];
    for (var i = 0; i < days; i++) {
      var role = i === 0 ? "arrival" : (i === days - 1 && days > 1 ? "departure" : "full");
      var slots = [];
      if (role === "arrival") {
        // light first day: settle, then one easy evening idea. Prefer a food theme
        // if the destination has one near the front, but ALWAYS advance the shared
        // rotation pointer so that theme isn't served again on day 2.
        slots.push({ time: "15:00", kind: "note", icon: "🧳", title: "Settle in at " + city, query: null, link: null, theme: null });
        var ev = nextTheme();
        var s = slot("19:30", ev); if (s) slots.push(s);
      } else if (role === "departure") {
        slots.push({ time: "10:00", kind: "note", icon: "🧳", title: "Pack up + check out", query: null, link: null, theme: null });
        // a light final-morning option before the airport
        var m = nextTheme(); var sm = slot("11:30", m); if (sm) { sm.time = "11:30"; sm.title = "Optional: " + sm.title; slots.push(sm); }
      } else {
        // a full day: up to 3 paced slots
        for (var k = 0; k < THEME_TIMES.length; k++) {
          var s2 = slot(THEME_TIMES[k], nextTheme());
          if (s2) slots.push(s2);
        }
      }
      out.push({ dayIndex: i, role: role, slots: slots });
    }

    return { city: city, knownFor: info.knownFor, vibe: info.vibe, curated: info.curated, days: out };
  }

  // a one-line summary the UI can show before the user commits.
  function summarize(plan) {
    if (!plan) return "";
    var slotCount = plan.days.reduce(function (n, d) { return n + d.slots.filter(function (s) { return s.theme; }).length; }, 0);
    var base = plan.days.length + (plan.days.length === 1 ? " day" : " days") + " in " + plan.city;
    if (plan.knownFor) return base + ", shaped around " + plan.knownFor + " (" + slotCount + " ideas)";
    return base + " (" + slotCount + " ideas to fill in)";
  }

  var Engine = { mapsSearch: mapsSearch, themesFor: themesFor, buildPlan: buildPlan, summarize: summarize };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  root.LL_PLANNER = Engine;
})(typeof window !== "undefined" ? window : globalThis);
