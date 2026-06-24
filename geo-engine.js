/*
 * TripLens — geo engine. Real geography, pure math, no network.
 *
 * Great-circle distance between airports (haversine on real lat/long), plus an
 * honest flight-time + train-vs-fly heuristic. Node-testable.
 *
 * HONESTY: distance is real math on real coordinates. Flight TIME is clearly an
 * ESTIMATE (cruise-speed model + fixed taxi/climb overhead) and is labelled as
 * such in the UI — it is NOT a schedule lookup. We never claim a real timetable.
 *
 * Airport coordinates live in AIRPORT_COORDS (decimal degrees, verified against
 * public airport data). Add a code here to make a route measurable.
 */
(function (root) {
  "use strict";

  // decimal degrees (lat, lon). India domestic + the intl hubs in the picker.
  const AIRPORT_COORDS = {
    DEL: [28.5562, 77.1000], BOM: [19.0896, 72.8656], BLR: [13.1986, 77.7066],
    HYD: [17.2403, 78.4294], MAA: [12.9941, 80.1709], CCU: [22.6547, 88.4467],
    GOI: [15.3808, 73.8314], GOX: [15.7430, 73.8650], COK: [10.1520, 76.4019],
    PNQ: [18.5793, 73.9089], AMD: [23.0772, 72.6347], JAI: [26.8242, 75.8122],
    LKO: [26.7606, 80.8893], PAT: [25.5913, 85.0880], GAU: [26.1061, 91.5859],
    BBI: [20.2444, 85.8178], IXC: [30.6735, 76.7885], SXR: [33.9871, 74.7742],
    TRV: [8.4821, 76.9200], CCJ: [11.1368, 75.9553], VNS: [25.4524, 82.8593],
    NAG: [21.0922, 79.0472], IXB: [26.6812, 88.3286], VTZ: [17.7211, 83.2245],
    RPR: [21.1804, 81.7388], IDR: [22.7218, 75.8011], BHO: [23.2875, 77.3374],
    ATQ: [31.7096, 74.7973], IXR: [23.3143, 85.3217], IXM: [9.8345, 78.0934],
    TIR: [13.6325, 79.5433], RJA: [16.5304, 81.8181], DED: [30.1897, 78.1803],
    JLR: [23.1778, 80.0520], STV: [21.1141, 72.7418], BDQ: [22.3362, 73.2263],
    IXZ: [11.6412, 92.7297], DXB: [25.2532, 55.3657], SIN: [1.3592, 103.9894],
    BKK: [13.6900, 100.7501], LHR: [51.4700, -0.4543], JFK: [40.6413, -73.7781],
  };

  function toRad(d) { return (d * Math.PI) / 180; }

  // haversine great-circle distance in km. null if either coord unknown.
  function distanceKm(a, b) {
    const A = AIRPORT_COORDS[(a || "").toUpperCase()], B = AIRPORT_COORDS[(b || "").toUpperCase()];
    if (!A || !B) return null;
    const R = 6371; // mean earth radius km
    const dLat = toRad(B[0] - A[0]), dLon = toRad(B[1] - A[1]);
    const lat1 = toRad(A[0]), lat2 = toRad(B[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }

  // ESTIMATE of gate-to-gate flight time (minutes). Model: fixed 30 min overhead
  // (taxi + climb + descent) + cruise at ~820 km/h. Clearly an estimate, not a
  // schedule. Returns null if distance unknown.
  function flightTimeMin(a, b) {
    const km = distanceKm(a, b);
    if (km == null) return null;
    const cruiseKmh = 820, overheadMin = 30;
    return Math.round(overheadMin + (km / cruiseKmh) * 60);
  }

  function fmtDuration(mins) {
    if (mins == null) return "";
    const h = Math.floor(mins / 60), m = mins % 60;
    return (h ? h + "h " : "") + m + "m";
  }

  // honest train-vs-fly hint based on distance band. Pure heuristic, framed as
  // "worth checking", never a hard claim.
  function trainVsFly(a, b) {
    const km = distanceKm(a, b);
    if (km == null) return null;
    if (km <= 350) return { km, lean: "train", note: "Short hop — a train/bus is often cheaper than flying once you count airport time + transfers." };
    if (km <= 700) return { km, lean: "either", note: "Medium distance — an overnight train can beat a flight on total cost + time. Worth comparing both." };
    return { km, lean: "fly", note: "Long route — flying is usually the practical call here." };
  }

  // bearing/label helpers could go here later; keep the surface tight for now.
  function hasCoords(code) { return !!AIRPORT_COORDS[(code || "").toUpperCase()]; }

  const Engine = { AIRPORT_COORDS, distanceKm, flightTimeMin, fmtDuration, trainVsFly, hasCoords };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  root.LL_GEO = Engine;
})(typeof window !== "undefined" ? window : globalThis);
