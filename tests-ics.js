/* Tests for the .ics calendar export (itinerary-engine toICS). node tests-ics.js
 *
 * Why this is its own file: iCalendar (RFC 5545) has fiddly correctness rules —
 * CRLF line endings, text escaping (comma/semicolon/newline), 75-octet line
 * folding, timed-vs-all-day events, and a stable DTSTAMP. A travel app whose
 * "add to calendar" produces a file Google/Apple silently rejects is worse than
 * not having the button. These pin the format so it actually imports.
 */
"use strict";
const assert = require("assert");
global.window = global;
const IT = require("./itinerary-engine.js");

let pass = 0, fail = 0;
function ok(n, fn) { try { fn(); pass++; } catch (e) { fail++; console.log("  ✗", n, "\n     " + e.message); } }

const STAMP = "20260629T101500Z";

function tripWith(days) {
  return { id: "trip-1", title: "Delhi → Goa", from: "Delhi", to: "Goa", depart: "2026-07-10", nights: 2, days };
}

// ---- basic structure -----------------------------------------------------
ok("wraps in VCALENDAR with VERSION + PRODID", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "flight", time: "06:30", title: "6E 123" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(/^BEGIN:VCALENDAR\r\n/.test(ics), "starts with BEGIN:VCALENDAR + CRLF");
  assert.ok(ics.includes("VERSION:2.0"));
  assert.ok(/PRODID:.*TripLens/.test(ics));
  assert.ok(ics.trim().endsWith("END:VCALENDAR"));
});
ok("uses CRLF line endings throughout (RFC 5545)", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "note", title: "x" }] }]);
  const ics = IT.toICS(t, STAMP);
  // every line break must be \r\n, never a bare \n
  assert.ok(!/[^\r]\n/.test(ics), "found a bare LF without CR");
});

// ---- timed events --------------------------------------------------------
ok("timed item -> DTSTART/DTEND with a 1h default block", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "flight", time: "06:30", title: "6E 123" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(ics.includes("DTSTART:20260710T063000"), "start at 06:30");
  assert.ok(ics.includes("DTEND:20260710T073000"), "end one hour later");
  assert.ok(ics.includes("DTSTAMP:" + STAMP));
});
ok("a late-night timed item rolls DTEND into the next day", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "activity", time: "23:30", title: "late" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(ics.includes("DTSTART:20260710T233000"));
  assert.ok(ics.includes("DTEND:20260711T003000"), "end rolls to next day 00:30");
});

// ---- all-day events ------------------------------------------------------
ok("item with no time -> all-day VALUE=DATE event (end = next day)", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "hotel", title: "Taj check-in" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20260710"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20260711"));
});

// ---- summaries + kind prefixes -------------------------------------------
ok("summary carries a kind prefix + the title", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "lounge", title: "Encalm T3" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(/SUMMARY:Lounge: Encalm T3/.test(ics));
});
ok("link becomes URL + appears in DESCRIPTION", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "flight", title: "6E", link: "https://goindigo.in/" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(ics.includes("URL:https://goindigo.in/"));
  assert.ok(/DESCRIPTION:.*goindigo/.test(ics));
});

// ---- escaping (RFC 5545 text rules) --------------------------------------
ok("commas, semicolons, backslashes in titles are escaped", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "note", title: "dinner, drinks; then walk \\ home" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(ics.includes("dinner\\, drinks\\; then walk \\\\ home"), "comma/semicolon/backslash escaped");
});
ok("newlines in a note become \\n, not raw breaks", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "note", title: "x", note: "line1\nline2" }] }]);
  const ics = IT.toICS(t, STAMP);
  assert.ok(/DESCRIPTION:.*line1\\nline2/.test(ics), "note newline escaped to \\n");
});

// ---- line folding (75-octet limit) ---------------------------------------
ok("long lines are folded to <=75 octets with continuation spaces", () => {
  const longTitle = "A".repeat(200);
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "note", title: longTitle }] }]);
  const ics = IT.toICS(t, STAMP);
  ics.split("\r\n").forEach((line) => {
    // each physical line must be <=75 chars; continuation lines start with a space
    assert.ok(line.length <= 75, "line over 75 octets: " + line.length);
  });
  // and a continuation line (starts with space) must exist for the long summary
  assert.ok(/\r\n [A]/.test(ics), "expected a folded continuation line");
});

// ---- honesty / edge cases ------------------------------------------------
ok("a trip with no dated items returns null (nothing to export, never a fake)", () => {
  assert.strictEqual(IT.toICS(tripWith([{ date: null, items: [{ id: "i1", kind: "note", title: "x" }] }]), STAMP), null);
  assert.strictEqual(IT.toICS(tripWith([{ date: "2026-07-10", items: [] }]), STAMP), null);
  assert.strictEqual(IT.toICS({ days: [] }, STAMP), null);
  assert.strictEqual(IT.toICS(null, STAMP), null);
});
ok("each event has a unique UID", () => {
  const t = tripWith([{ date: "2026-07-10", items: [
    { id: "i1", kind: "flight", title: "a" }, { id: "i2", kind: "hotel", title: "b" },
  ] }]);
  const ics = IT.toICS(t, STAMP);
  const uids = (ics.match(/UID:[^\r]+/g) || []);
  assert.strictEqual(uids.length, 2);
  assert.notStrictEqual(uids[0], uids[1]);
});
ok("event count matches dated items across multiple days", () => {
  const t = tripWith([
    { date: "2026-07-10", items: [{ id: "a", kind: "flight", title: "out" }] },
    { date: "2026-07-12", items: [{ id: "b", kind: "flight", title: "back" }, { id: "c", kind: "note", title: "pack" }] },
  ]);
  const ics = IT.toICS(t, STAMP);
  assert.strictEqual((ics.match(/BEGIN:VEVENT/g) || []).length, 3);
});
ok("default stamp when none passed (still valid, deterministic)", () => {
  const t = tripWith([{ date: "2026-07-10", items: [{ id: "i1", kind: "note", title: "x" }] }]);
  const ics = IT.toICS(t);
  assert.ok(/DTSTAMP:\d{8}T\d{6}Z/.test(ics), "has a valid DTSTAMP format");
});

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
