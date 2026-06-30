/* Tests for season-engine.js — honest, conservative seasonal context. */
const S = require("./season-engine.js");

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; } else { fail++; console.log("FAIL:", name); } }
function eq(name, a, b) { ok(name + " (" + JSON.stringify(a) + " === " + JSON.stringify(b) + ")", a === b); }

// ---- monthRanges: contiguous + wrap handling ----
eq("monthRanges single", S.monthRanges([7]), "Jul");
eq("monthRanges contiguous", S.monthRanges([6, 7, 8, 9]), "Jun-Sep");
eq("monthRanges two runs", S.monthRanges([1, 2, 3, 7, 8, 9]), "Jan-Mar, Jul-Sep");
eq("monthRanges Dec-Jan wrap", S.monthRanges([10, 11, 12, 1, 2, 3, 4, 5]), "Oct-May");
eq("monthRanges empty", S.monthRanges([]), "");
eq("monthRanges full year wraps to one range", S.monthRanges([1,2,3,4,5,6,7,8,9,10,11,12]), "Jan-Dec");

// ---- assess: caution fires on a known bad month ----
const goaJul = S.assess("GOI", 7, "Goa");
ok("Goa July is known", goaJul.known === true);
ok("Goa July flags a caution", goaJul.caution !== null);
eq("Goa July caution type", goaJul.caution.type, "monsoon");
ok("Goa July message names monsoon + city", /monsoon/i.test(goaJul.caution.message) && /Goa/.test(goaJul.caution.message));
ok("Goa July message names the month", /Jul/.test(goaJul.caution.message));

// ---- assess: clear month = no caution, gives clear-label ----
const goaJan = S.assess("GOI", 1, "Goa");
ok("Goa Jan no caution", goaJan.caution === null);
ok("Goa Jan still known", goaJan.known === true);
ok("Goa clearLabel excludes monsoon months", !/Jun|Jul|Aug|Sep/.test(goaJan.clearLabel) && goaJan.clearLabel.length > 0);

// ---- Dubai summer heat ----
const dxbJul = S.assess("DXB", 7, "Dubai");
ok("Dubai July flags heat", dxbJul.caution && dxbJul.caution.type === "heat");
ok("Dubai Nov is clear", S.assess("DXB", 11, "Dubai").caution === null);

// ---- multi-window city (Chennai: heat AND monsoon) ----
ok("Chennai May = heat", S.assess("MAA", 5, "Chennai").caution.type === "heat");
ok("Chennai Nov = monsoon", S.assess("MAA", 11, "Chennai").caution.type === "monsoon");
ok("Chennai Feb = clear", S.assess("MAA", 2, "Chennai").caution === null);

// ---- positive-note city (Bangalore: pleasant year-round, no caution) ----
const blr = S.assess("BLR", 6, "Bangalore");
ok("Bangalore any month no caution", blr.caution === null);
ok("Bangalore has a positive note", typeof blr.positive === "string" && blr.positive.length > 0);
ok("Bangalore summary uses the positive note", S.summary("BLR", "Bangalore").line === blr.positive);

// ---- HONESTY: unknown destination asserts NOTHING but still links to verify ----
const unk = S.assess("ZZZ", 7, "Nowhere");
ok("unknown dest: known=false", unk.known === false);
ok("unknown dest: no caution invented", unk.caution === null);
ok("unknown dest: no clear label invented", unk.clearLabel === "");
ok("unknown dest: STILL gives a real verify link", /^https:\/\/www\.google\.com\/search\?q=/.test(unk.verifyLink));
const unkSum = S.summary("ZZZ", "Nowhere");
ok("unknown summary: line is null (asserts nothing)", unkSum.line === null);
ok("unknown summary: still has verify link", /google\.com\/search/.test(unkSum.verifyLink));

// ---- HONESTY: every assessment carries a real verify link ----
["GOI", "DXB", "BLR", "MAA", "SXR"].forEach((c) => {
  ok(c + " has a verify link", /^https:\/\/www\.google\.com\/search\?q=/.test(S.assess(c, 6, c).verifyLink));
});

// ---- HONESTY: messages are QUALITATIVE — no fabricated temperatures/numbers ----
["GOI", "DXB", "MAA", "SXR", "BKK", "JFK"].forEach((c) => {
  for (let m = 1; m <= 12; m++) {
    const a = S.assess(c, m, c);
    if (a.caution) ok(c + " m" + m + " message has no fabricated number", !/\d/.test(a.caution.message));
  }
});

// ---- determinism ----
ok("assess deterministic", JSON.stringify(S.assess("GOI", 7, "Goa")) === JSON.stringify(S.assess("GOI", 7, "Goa")));
ok("summary deterministic", JSON.stringify(S.summary("DXB", "Dubai")) === JSON.stringify(S.summary("DXB", "Dubai")));

// ---- Srinagar winter cold ----
ok("Srinagar Jan = cold", S.assess("SXR", 1, "Srinagar").caution && S.assess("SXR", 1, "Srinagar").caution.type === "cold");
ok("Srinagar Jun = clear", S.assess("SXR", 6, "Srinagar").caution === null);

console.log("==== " + pass + " passed, " + fail + " failed ====");
if (fail) process.exit(1);
