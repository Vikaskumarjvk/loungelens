/* Tests for IT.shareText — the human-readable one-tap share plan. */
const I = require("./itinerary-engine.js");

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; } else { fail++; console.log("FAIL:", name); } }

function buildTrip() {
  const t = I.newTrip({ title: "Delhi → Goa", from: "Delhi", to: "Goa", depart: "2026-07-13", nights: 2, adults: 2, seed: 1 });
  I.addItem(t, 0, { time: "15:00", kind: "note", title: "Settle in at Goa" }, 1);
  I.addItem(t, 1, { time: "10:00", kind: "activity", title: "Beach time · Goa", note: "Tap to open the live map search", link: "https://www.google.com/maps/search/beaches%20in%20Goa" }, 2);
  I.addItem(t, 1, { time: "19:30", kind: "food", title: "Local food crawl · Goa", link: "https://www.google.com/maps/search/best%20local%20food%20in%20Goa" }, 3);
  return t;
}

const t = buildTrip();
const txt = I.shareText(t);

// ---- structure: readable plain text, not JSON ----
ok("returns a non-empty string", typeof txt === "string" && txt.length > 0);
ok("is NOT json", !txt.trim().startsWith("{") && !txt.includes('"kind"'));
ok("has the trip title", txt.includes("Delhi → Goa"));
ok("shows the date line", txt.includes("for 2 nights"));
ok("shows traveller count", txt.includes("2 travellers"));
ok("labels Day 1", txt.includes("Day 1"));
ok("labels Day 2", txt.includes("Day 2"));
ok("includes a day date label", txt.includes("Jul"));
ok("has 3 days for 2 nights (arrival..departure)", (txt.match(/Day \d/g) || []).length === 3);

// ---- item rendering ----
ok("renders an item title", txt.includes("Beach time · Goa"));
ok("renders the time", txt.includes("10:00"));
ok("renders a kind icon", txt.includes("🍽️") || txt.includes("🎟️"));
ok("empty day shows a placeholder", txt.includes("nothing planned yet"));

// ---- REAL links preserved, none fabricated ----
ok("keeps the real maps link", txt.includes("https://www.google.com/maps/search/beaches%20in%20Goa"));
ok("keeps the second real link", txt.includes("https://www.google.com/maps/search/best%20local%20food%20in%20Goa"));
const links = txt.split("\n").filter((l) => l.trim().startsWith("http"));
ok("every link is a real https link", links.length >= 2 && links.every((l) => l.trim().startsWith("https://")));
ok("no fabricated http link invented (only the 2 items had links)", links.length === 2);

// ---- honesty footer + no fabricated price/venue ----
ok("has the honest footer", txt.includes("nothing here is made up"));
const banned = ['"price"', '"total"', '"fare"', '"cost"', "₹", "$", "rated", "stars"];
ok("no fabricated price/currency/rating tokens", !banned.some((b) => txt.toLowerCase().includes(b.toLowerCase())));

// ---- determinism: same trip, same text ----
ok("deterministic", I.shareText(buildTrip()) === I.shareText(buildTrip()));

// ---- edge cases ----
ok("null trip -> empty string", I.shareText(null) === "");
ok("trip with no days -> empty string", I.shareText({}) === "");
const empty = I.newTrip({ title: "Blank", to: "Nowhere", depart: "", nights: 1, adults: 1, seed: 9 });
const etxt = I.shareText(empty);
ok("empty trip still names the title", etxt.includes("Blank"));
ok("empty trip still has the honest footer", etxt.includes("nothing here is made up"));
ok("ends with a single trailing newline", txt.endsWith("\n") && !txt.endsWith("\n\n"));

console.log("==== " + pass + " passed, " + fail + " failed ====");
if (fail) process.exit(1);
