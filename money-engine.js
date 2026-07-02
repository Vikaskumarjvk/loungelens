/*
 * TripLens — "Money here" engine. Pure, no DOM, no clock, no network.
 *
 * THE MOMENT: you're at a market stall abroad, no signal, and you think "how
 * much is this in MY money?". A live rate needs internet and can't be trusted
 * to the paisa anyway. So this works the honest, offline way TripLens already
 * works with budgets: you pin a rate ONCE (the one your bank/card actually gave
 * you, or today's Google rate), clearly labelled as yours, and then every
 * conversion is instant and offline for the whole trip.
 *
 * HONESTY MODEL — the strict part:
 *  - We NEVER invent an exchange rate. The rate is either (a) one the user
 *    pinned themselves, or (b) a live ECB rate the app fetched and handed in.
 *    Which one is always shown, with its date/source, so the number is never a
 *    mystery figure the user has to trust blindly.
 *  - Conversion is plain arithmetic on that one rate. No spread, no fee, no
 *    "you'll actually pay" guess — we can't know the user's card markup, so we
 *    don't pretend to. We say plainly it's a rough guide at the pinned rate.
 *  - `rate` means: how many HOME units per 1 FOREIGN unit (e.g. 1 THB = 2.4
 *    INR -> rate 2.4). We keep that direction explicit everywhere.
 *
 * All functions are deterministic: same inputs -> same output.
 */
(function (root) {
  "use strict";

  // display symbols (display only — never used to decide anything). Mirrors the
  // budget engine's set plus a few common travel currencies.
  var SYMBOLS = {
    INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ",
    SGD: "S$", THB: "฿", MYR: "RM", JPY: "¥", LKR: "Rs", IDR: "Rp",
    VND: "₫", CNY: "¥", KRW: "₩", AUD: "A$", CAD: "C$", CHF: "Fr",
    NPR: "Rs", BDT: "৳", QAR: "QR", SAR: "SR", TRY: "₺", ZAR: "R",
  };
  function symbol(cur) { return SYMBOLS[(cur || "").toUpperCase()] || ""; }
  function known(cur) { return Object.prototype.hasOwnProperty.call(SYMBOLS, (cur || "").toUpperCase()); }

  // which currency a destination airport's country uses. This is common-knowledge
  // FACT (Thailand uses the baht), NOT a fabricated rate — it just pre-fills the
  // "foreign currency" field so the user doesn't have to. Only airports TripLens
  // actually flies to; anything unknown returns null and the user picks manually.
  var CUR_BY_CODE = {
    // India (home for most users) — all INR
    DEL: "INR", BOM: "INR", BLR: "INR", HYD: "INR", MAA: "INR", CCU: "INR",
    GOI: "INR", GOX: "INR", COK: "INR", PNQ: "INR", AMD: "INR", JAI: "INR",
    LKO: "INR", PAT: "INR", GAU: "INR", BBI: "INR", IXC: "INR", SXR: "INR",
    TRV: "INR", CCJ: "INR", VNS: "INR", NAG: "INR", IXB: "INR", VTZ: "INR",
    RPR: "INR", IDR: "INR", BHO: "INR", ATQ: "INR", IXR: "INR", IXM: "INR",
    TIR: "INR", RJA: "INR", DED: "INR", JLR: "INR", STV: "INR", BDQ: "INR", IXZ: "INR",
    // international destinations TripLens lists
    DXB: "AED", SIN: "SGD", BKK: "THB", LHR: "GBP", JFK: "USD",
  };
  // returns the destination currency code for an IATA code, or null if unknown.
  function currencyForCode(code) {
    var c = CUR_BY_CODE[(code || "").toUpperCase()];
    return c || null;
  }

  function isNum(n) { return typeof n === "number" && isFinite(n); }
  function clampPos(n) { n = Number(n); return isNum(n) && n > 0 ? n : null; }

  // round to a sensible number of places for money: 2 for most, 0 for
  // zero-decimal currencies (JPY/KRW/IDR/VND) where paisa are meaningless.
  var ZERO_DP = { JPY: true, KRW: true, IDR: true, VND: true };
  function roundMoney(n, cur) {
    if (!isNum(n)) return null;
    if (ZERO_DP[(cur || "").toUpperCase()]) return Math.round(n);
    return Math.round(n * 100) / 100;
  }

  // group with thousands separators (Indian grouping for INR, western else).
  function group(n, cur) {
    if (!isNum(n)) return "";
    var neg = n < 0; n = Math.abs(n);
    var s = String(n);
    var parts = s.split("."), intPart = parts[0], dec = parts[1] ? "." + parts[1] : "";
    var out;
    if ((cur || "").toUpperCase() === "INR") {
      // 12,34,567 grouping
      var last3 = intPart.slice(-3), rest = intPart.slice(0, -3);
      out = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
    } else {
      out = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return (neg ? "-" : "") + out + dec;
  }
  // "₹ 1,234.50" style label (symbol when known, else the code)
  function fmt(amount, cur) {
    var r = roundMoney(amount, cur);
    if (r == null) return "";
    var sym = symbol(cur);
    var num = group(r, cur);
    return sym ? (sym + " " + num) : (num + " " + (cur || "").toUpperCase());
  }

  // derive the home-per-foreign rate from a live ECB conversion helper WITHOUT
  // this engine touching the network. Caller passes convertOneForeign = the
  // value of 1 FOREIGN unit in HOME currency (a number), or null when offline.
  // We just validate + carry it; the honesty label is decided by the caller.
  function rateFromLive(convertOneForeign) {
    var r = clampPos(convertOneForeign);
    return r;
  }

  // THE CORE: convert a foreign amount into home money at a given rate.
  //   amount = number typed on the price tag (foreign currency)
  //   rate   = home units per 1 foreign unit ( >0 )
  // returns { ok, home, homeRounded } or { ok:false, reason }.
  function convert(amount, rate, homeCur) {
    var a = Number(amount);
    if (!isNum(a)) return { ok: false, reason: "enter-amount" };
    var r = clampPos(rate);
    if (r == null) return { ok: false, reason: "no-rate" };
    var home = a * r;
    return { ok: true, home: home, homeRounded: roundMoney(home, homeCur) };
  }

  // the reverse: "what does 100 of MY money get me over here?" Handy at a
  // counter to sanity-check. returns foreign units per `homeAmount`.
  function convertHomeToForeign(homeAmount, rate, foreignCur) {
    var a = Number(homeAmount);
    if (!isNum(a)) return { ok: false, reason: "enter-amount" };
    var r = clampPos(rate);
    if (r == null) return { ok: false, reason: "no-rate" };
    var foreign = a / r;
    return { ok: true, foreign: foreign, foreignRounded: roundMoney(foreign, foreignCur) };
  }

  // a tiny "cheat sheet" of round foreign prices -> home money, so a traveller
  // can eyeball a stall price fast. Deterministic ladder, converted at `rate`.
  function cheatSheet(rate, homeCur, ladder) {
    var r = clampPos(rate);
    if (r == null) return [];
    var steps = Array.isArray(ladder) && ladder.length ? ladder : [10, 50, 100, 500, 1000, 5000];
    return steps.map(function (f) {
      return { foreign: f, home: roundMoney(f * r, homeCur) };
    });
  }

  // build the per-trip money settings object (persisted by the app).
  //   home    = the user's home currency (defaults INR)
  //   foreign = destination currency (caller may pre-fill from the trip)
  //   rate    = pinned home-per-foreign rate (null until set)
  //   pinnedNote = short human label of where the rate came from ("my card", etc)
  function blankMoney(home, foreign) {
    return { home: (home || "INR").toUpperCase(), foreign: (foreign || "").toUpperCase(), rate: null, pinnedNote: "" };
  }

  var Engine = {
    SYMBOLS: SYMBOLS, symbol: symbol, known: known,
    CUR_BY_CODE: CUR_BY_CODE, currencyForCode: currencyForCode,
    roundMoney: roundMoney, group: group, fmt: fmt,
    rateFromLive: rateFromLive, convert: convert, convertHomeToForeign: convertHomeToForeign,
    cheatSheet: cheatSheet, blankMoney: blankMoney,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Engine;
  root.LL_MONEY = Engine;
})(typeof window !== "undefined" ? window : globalThis);
