/* Node tests for the LIVE flight parser. Run: node tests-flight-live.js
 * Uses a fixture shaped exactly like a real Amadeus flight-offers response. */
const path = require("path");
global.window = global;
const LV = require(path.join(__dirname, "flight-live.js"));

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log("  PASS:", name); } else { fail++; console.log("  FAIL:", name); } }

// real-shape Amadeus v2 flight-offers fixture (trimmed to the fields we read)
const FIXTURE = {
  data: [
    {
      id: "1", validatingAirlineCodes: ["6E"], numberOfBookableSeats: 7,
      price: { currency: "INR", total: "4812.00", grandTotal: "4812.00" },
      itineraries: [{
        duration: "PT2H10M",
        segments: [{ departure: { iataCode: "DEL", at: "2026-07-12T06:15:00" }, arrival: { iataCode: "BOM", at: "2026-07-12T08:25:00" }, carrierCode: "6E" }],
      }],
    },
    {
      id: "2", validatingAirlineCodes: ["AI"], numberOfBookableSeats: 3,
      price: { currency: "INR", total: "5140.00", grandTotal: "5140.00" },
      itineraries: [{
        duration: "PT5H05M",
        segments: [
          { departure: { iataCode: "DEL", at: "2026-07-12T09:00:00" }, arrival: { iataCode: "HYD", at: "2026-07-12T11:10:00" }, carrierCode: "AI" },
          { departure: { iataCode: "HYD", at: "2026-07-12T12:30:00" }, arrival: { iataCode: "BOM", at: "2026-07-12T14:05:00" }, carrierCode: "AI" },
        ],
      }],
    },
    {
      id: "3", validatingAirlineCodes: ["6E"], numberOfBookableSeats: 9,
      price: { currency: "INR", total: "4490.00", grandTotal: "4490.00" },
      itineraries: [{
        duration: "PT2H05M",
        segments: [{ departure: { iataCode: "DEL", at: "2026-07-12T21:40:00" }, arrival: { iataCode: "BOM", at: "2026-07-12T23:45:00" }, carrierCode: "6E" }],
      }],
    },
  ],
  dictionaries: { carriers: { "6E": "INDIGO", AI: "AIR INDIA" } },
};

console.log("\n[1] durationToMin + labels");
{
  ok("PT2H10M = 130", LV.durationToMin("PT2H10M") === 130);
  ok("PT45M = 45", LV.durationToMin("PT45M") === 45);
  ok("PT3H = 180", LV.durationToMin("PT3H") === 180);
  ok("bad => null", LV.durationToMin("") === null);
  ok("minLabel 130 => 2h 10m", LV.minLabel(130) === "2h 10m");
  ok("minLabel 45 => 45m", LV.minLabel(45) === "45m");
  ok("timeLabel extracts HH:MM", LV.timeLabel("2026-07-12T06:15:00") === "06:15");
}

console.log("\n[2] parseOffers turns raw JSON into clean sorted rows");
{
  const rows = LV.parseOffers(FIXTURE);
  ok("3 offers parsed", rows.length === 3);
  ok("sorted cheapest first (4490)", rows[0].priceTotal === 4490);
  ok("most expensive last (5140)", rows[rows.length - 1].priceTotal === 5140);
  const indigo = rows.find((r) => r.id === "3");
  ok("airline code mapped to name", indigo.airline === "INDIGO");
  ok("non-stop detected", indigo.stops === 0 && indigo.stopsLabel === "non-stop");
  ok("dep/arr times parsed", indigo.depTime === "21:40" && indigo.arrTime === "23:45");
  ok("duration label", indigo.durationLabel === "2h 5m");
  ok("from/to from segments", indigo.from === "DEL" && indigo.to === "BOM");
  const ai = rows.find((r) => r.id === "2");
  ok("1-stop counted from 2 segments", ai.stops === 1 && ai.stopsLabel === "1 stop");
  ok("seats left captured", indigo.seatsLeft === 9);
  ok("currency carried", indigo.currency === "INR");
}

console.log("\n[3] cheapestByAirline collapses to one row per airline");
{
  const rows = LV.parseOffers(FIXTURE);
  const cheap = LV.cheapestByAirline(rows);
  ok("2 airlines (6E, AI)", cheap.length === 2);
  ok("indigo row is its cheapest (4490 not 4812)", cheap.find((r) => r.airlineCode === "6E").priceTotal === 4490);
  ok("sorted cheapest airline first", cheap[0].priceTotal <= cheap[1].priceTotal);
}

console.log("\n[4] empty / malformed input is safe");
{
  ok("null => []", LV.parseOffers(null).length === 0);
  ok("no data => []", LV.parseOffers({}).length === 0);
  ok("empty data => []", LV.parseOffers({ data: [] }).length === 0);
  ok("missing dictionaries => code as name", LV.parseOffers({ data: FIXTURE.data }).length === 3);
}

console.log("\n[5] honesty: parser only reports what's in the response (no invented price)");
{
  const rows = LV.parseOffers({ data: [{ id: "x", price: {}, itineraries: [{ segments: [{ departure: {}, arrival: {} }] }] }] });
  ok("missing price => 0 (not a guess)", rows[0].priceTotal === 0);
  ok("missing carrier => fallback label, not invented airline", rows[0].airline === "Airline");
}

console.log("\n[6] dateRange builds inclusive YYYY-MM-DD lists, TZ-safe");
{
  const r = LV.dateRange("2026-07-12", 5);
  ok("5 days", r.length === 5);
  ok("starts at start", r[0] === "2026-07-12");
  ok("last day correct", r[4] === "2026-07-16");
  ok("crosses month boundary", LV.dateRange("2026-07-30", 3).join(",") === "2026-07-30,2026-07-31,2026-08-01");
  ok("bad date => []", LV.dateRange("nope", 5).length === 0);
  ok("days<1 clamps to 1", LV.dateRange("2026-07-12", 0).length === 1);
}

console.log("[7] priceAnomaly flags cheapest + statistical dips");
{
  const daily = [
    { date: "2026-07-12", minPrice: 5000 },
    { date: "2026-07-13", minPrice: 5200 },
    { date: "2026-07-14", minPrice: 3000 }, // a real dip
    { date: "2026-07-15", minPrice: 5100 },
    { date: "2026-07-16", minPrice: null, error: true }, // failed day
  ];
  const a = LV.priceAnomaly(daily);
  ok("cheapest is the 3000 day", a.cheapest.date === "2026-07-14" && a.cheapest.minPrice === 3000);
  ok("median computed from valid days", a.median > 0);
  const dip = a.days.find((d) => d.date === "2026-07-14");
  ok("3000 flagged as dip (<=75% of median)", dip.isDip === true);
  ok("3000 flagged cheapest", dip.isCheapest === true);
  ok("dip shows negative vsMedianPct", dip.vsMedianPct < 0);
  const normal = a.days.find((d) => d.date === "2026-07-13");
  ok("5200 not a dip", normal.isDip === false);
  const failed = a.days.find((d) => d.date === "2026-07-16");
  ok("failed day kept, not flagged", failed.isDip === false && failed.isCheapest === false);
}

console.log("[8] priceAnomaly safe on empty / all-failed input");
{
  ok("empty => null cheapest", LV.priceAnomaly([]).cheapest === null);
  const allFail = LV.priceAnomaly([{ date: "x", minPrice: null }, { date: "y", minPrice: null }]);
  ok("all-failed => null cheapest, no crash", allFail.cheapest === null && allFail.median === null);
}

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);
