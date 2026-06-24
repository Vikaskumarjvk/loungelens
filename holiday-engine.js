/*
 * TripLens — long-weekend / holiday getaway planner. Pure, no DOM, no clock.
 *
 * The classic India travel move: "this holiday is a Tuesday, take Monday off and
 * you get a 4-day break." This works out, for any holiday date, the free block you
 * get with ZERO leave, and the best 'bridge' (1-2 leave days) that stretches it.
 *
 * HONESTY: the only holidays we SHIP are fixed-date ones that never move
 * (Republic Day, Independence Day, Gandhi Jayanti, Christmas, New Year) — their
 * weekday is pure math for any year. Movable festivals (Diwali, Holi, Eid) change
 * every year and vary by state, so we DON'T guess them; you add your own date from
 * your official holiday list and the same math runs on it. We never invent a date.
 *
 * Dates are YYYY-MM-DD. Day-of-week uses Date.UTC (deterministic), never argless
 * new Date(), so this stays testable + resume-safe.
 */
(function (root) {
  "use strict";

  function parse(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
  function iso(ts) { var d = new Date(ts); return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2); }
  function addDays(isoStr, n) { var t = parse(isoStr); return t == null ? null : iso(t + n * 86400000); }
  function dow(isoStr) { var t = parse(isoStr); return t == null ? null : new Date(t).getUTCDay(); } // 0=Sun..6=Sat
  function isWeekend(isoStr) { var d = dow(isoStr); return d === 0 || d === 6; }
  var DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function daysBetween(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }

  // the off-block you already have with NO leave: the holiday plus any weekend
  // days directly touching it on either side.
  function zeroLeaveBlock(holidayISO) {
    if (parse(holidayISO) == null) return null;
    var start = holidayISO, end = holidayISO;
    while (isWeekend(addDays(start, -1))) start = addDays(start, -1);
    while (isWeekend(addDays(end, 1))) end = addDays(end, 1);
    return { start: start, end: end, days: daysBetween(start, end) + 1 };
  }

  // bridge options: take 1-2 workdays on one side to CONNECT the holiday block to
  // the nearest weekend, making one long contiguous break. Returns the sensible
  // ones (cap 2 leave days — more than that isn't a "long weekend" anymore),
  // best value first (most total days per leave day).
  function bridgeOptions(holidayISO) {
    var zero = zeroLeaveBlock(holidayISO);
    if (!zero) return [];
    var out = [];
    // bridge LEFT: workdays immediately before the block, until we reach a weekend
    (function () {
      var leave = [], cursor = addDays(zero.start, -1), n = 0;
      while (n < 2 && cursor && !isWeekend(cursor)) { leave.push(cursor); cursor = addDays(cursor, -1); n++; }
      if (leave.length && cursor && isWeekend(cursor)) {
        var s = cursor; while (isWeekend(addDays(s, -1))) s = addDays(s, -1);
        out.push({ side: "before", leaveDays: leave.slice().reverse(), start: s, end: zero.end, days: daysBetween(s, zero.end) + 1, leaveCount: leave.length });
      }
    })();
    // bridge RIGHT: workdays immediately after the block, until we reach a weekend
    (function () {
      var leave = [], cursor = addDays(zero.end, 1), n = 0;
      while (n < 2 && cursor && !isWeekend(cursor)) { leave.push(cursor); cursor = addDays(cursor, 1); n++; }
      if (leave.length && cursor && isWeekend(cursor)) {
        var e = cursor; while (isWeekend(addDays(e, 1))) e = addDays(e, 1);
        out.push({ side: "after", leaveDays: leave, start: zero.start, end: e, days: daysBetween(zero.start, e) + 1, leaveCount: leave.length });
      }
    })();
    // best value first: more days per leave day, then fewer leave days
    out.sort(function (a, b) { return (b.days / b.leaveCount) - (a.days / a.leaveCount) || a.leaveCount - b.leaveCount; });
    return out;
  }

  // full assessment of one holiday.
  function assess(holidayISO, name) {
    var d = dow(holidayISO);
    if (d == null) return null;
    var zero = zeroLeaveBlock(holidayISO);
    var bridges = bridgeOptions(holidayISO);
    var fallsOnWeekend = isWeekend(holidayISO);
    // verdict for the UI
    var verdict;
    if (fallsOnWeekend) verdict = "on_weekend";              // sad: no extra day gained
    else if (zero.days >= 3) verdict = "free_long_weekend";  // adjacent to weekend, 0 leave
    else if (bridges.length && bridges[0].leaveCount === 1 && bridges[0].days >= 4) verdict = "one_bridge";
    else if (bridges.length) verdict = "bridge";
    else verdict = "midweek";                                 // stranded mid-week
    return {
      date: holidayISO, name: name || "", dow: d, dowName: DOW[d],
      fallsOnWeekend: fallsOnWeekend, zeroLeave: zero, bridges: bridges, best: bridges[0] || null, verdict: verdict,
    };
  }

  // expand a list of fixed month-day holidays into a given year, + any custom
  // dated holidays, then assess + sort by date. Only holidays within the year.
  function planYear(fixedList, customList, year) {
    var items = [];
    (fixedList || []).forEach(function (h) {
      items.push({ date: year + "-" + h.md, name: h.name, source: "fixed", confidence: "high" });
    });
    (customList || []).forEach(function (h) {
      if (parse(h.date) != null) items.push({ date: h.date, name: h.name || "Custom holiday", source: "custom", confidence: "high" });
    });
    return items
      .filter(function (h) { return h.date.slice(0, 4) === String(year); })
      .map(function (h) { return Object.assign({}, h, { assess: assess(h.date, h.name) }); })
      .sort(function (a, b) { return parse(a.date) - parse(b.date); });
  }

  var Engine = {
    parse: parse, iso: iso, addDays: addDays, dow: dow, isWeekend: isWeekend, daysBetween: daysBetween,
    DOW: DOW, DOW_SHORT: DOW_SHORT,
    zeroLeaveBlock: zeroLeaveBlock, bridgeOptions: bridgeOptions, assess: assess, planYear: planYear,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  root.LL_HOLIDAY = Engine;
})(typeof window !== "undefined" ? window : globalThis);
