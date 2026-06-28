/*
 * TripLens — destination knowledge. What each place is genuinely known for, as a
 * structure for building a day-by-day plan. Browser global + Node export.
 *
 * HONESTY MODEL (read this before adding data):
 *  - "knownFor" + "vibe" are COMMON-KNOWLEDGE character notes (Goa = beaches +
 *    Portuguese heritage + nightlife). That's a description of a place, not a
 *    fabricated fact about a price or a booking.
 *  - "themes" are CATEGORIES of things to do (beach day, old-town walk, food
 *    crawl). The planner turns each into a day slot that links to a REAL live
 *    search (Google Maps / things-to-do) for that category in that city. We never
 *    name a specific venue with a made-up price or a fake "best restaurant".
 *  - We do NOT invent opening hours, ticket prices, or "must-book" claims.
 *  - A destination we don't have curated knowledge for still gets a generic but
 *    honest plan (arrival / explore / food / day-trip / departure) — never a
 *    fabricated specific.
 *
 * Keyed by IATA code (matches data/flights.js airports + geo-engine coords).
 * `tags` drive the generic fallback when a code isn't listed here.
 */
(function (root) {
  "use strict";

  // theme ids -> a human label + the kind of map/search query to build a real link.
  // `query` uses {CITY} which the planner fills; the planner builds a Google Maps
  // search URL so the link always lands on something real.
  var THEMES = {
    beach:      { label: "Beach time",        icon: "🏖️", kind: "activity", q: "beaches in {CITY}" },
    oldtown:    { label: "Old town / heritage walk", icon: "🏛️", kind: "activity", q: "historic sites in {CITY}" },
    food:       { label: "Local food crawl",  icon: "🍽️", kind: "food",     q: "best local food in {CITY}" },
    market:     { label: "Markets & shopping", icon: "🛍️", kind: "activity", q: "famous markets in {CITY}" },
    nightlife:  { label: "Nightlife",          icon: "🍸", kind: "activity", q: "nightlife in {CITY}" },
    nature:     { label: "Nature / outdoors",  icon: "🌿", kind: "activity", q: "nature spots near {CITY}" },
    temple:     { label: "Temples & spiritual sites", icon: "🛕", kind: "activity", q: "famous temples in {CITY}" },
    museum:     { label: "Museums & galleries", icon: "🖼️", kind: "activity", q: "museums in {CITY}" },
    daytrip:    { label: "Day trip out of town", icon: "🚗", kind: "activity", q: "day trips from {CITY}" },
    waterfront: { label: "Waterfront / lake / river", icon: "⛵", kind: "activity", q: "waterfront things to do in {CITY}" },
    hills:      { label: "Hills & viewpoints", icon: "⛰️", kind: "activity", q: "viewpoints near {CITY}" },
    cafe:       { label: "Cafés & slow morning", icon: "☕", kind: "food",   q: "best cafes in {CITY}" },
    landmark:   { label: "Icon landmarks",     icon: "📸", kind: "activity", q: "top landmarks in {CITY}" },
    souk:       { label: "Souks & malls",      icon: "🛍️", kind: "activity", q: "souks and malls in {CITY}" },
    adventure:  { label: "Adventure / theme park", icon: "🎢", kind: "activity", q: "theme parks and adventure in {CITY}" },
  };

  // per-destination character + an ordered list of theme ids that suit it.
  // The planner picks across these to fill the "explore" days, paced sensibly.
  var DEST = {
    GOI: { city: "Goa", knownFor: "beaches, Portuguese-era churches, shacks + nightlife", vibe: "relaxed beach break", themes: ["beach", "oldtown", "food", "nightlife", "market", "waterfront"] },
    GOX: { city: "Goa", knownFor: "beaches, Portuguese-era churches, shacks + nightlife", vibe: "relaxed beach break", themes: ["beach", "oldtown", "food", "nightlife", "market", "waterfront"] },
    JAI: { city: "Jaipur", knownFor: "forts, palaces, pink old city, bazaars", vibe: "heritage + shopping", themes: ["oldtown", "landmark", "market", "food", "museum", "daytrip"] },
    DEL: { city: "Delhi", knownFor: "Mughal monuments, street food, sprawling bazaars", vibe: "history + food", themes: ["landmark", "oldtown", "food", "market", "temple", "museum"] },
    BOM: { city: "Mumbai", knownFor: "seafront promenades, colonial architecture, food + film city", vibe: "big-city buzz", themes: ["waterfront", "landmark", "food", "market", "nightlife", "museum"] },
    BLR: { city: "Bengaluru", knownFor: "parks, breweries, cafés, pleasant weather", vibe: "easy city + cafés", themes: ["cafe", "nature", "nightlife", "food", "market", "daytrip"] },
    HYD: { city: "Hyderabad", knownFor: "Charminar, biryani, Golconda fort, lakes", vibe: "food + history", themes: ["landmark", "food", "oldtown", "waterfront", "market", "daytrip"] },
    MAA: { city: "Chennai", knownFor: "Marina beach, temples, Tamil food, Mahabalipuram nearby", vibe: "temples + coast", themes: ["beach", "temple", "food", "daytrip", "museum", "market"] },
    CCU: { city: "Kolkata", knownFor: "colonial landmarks, sweets + street food, art + culture", vibe: "culture + food", themes: ["landmark", "food", "museum", "market", "oldtown", "waterfront"] },
    COK: { city: "Kochi", knownFor: "Fort Kochi, backwaters, Chinese fishing nets, spice trade history", vibe: "backwaters + heritage", themes: ["oldtown", "waterfront", "food", "nature", "market", "daytrip"] },
    TRV: { city: "Thiruvananthapuram", knownFor: "beaches, temples, nearby Kovalam + backwaters", vibe: "coast + calm", themes: ["beach", "temple", "nature", "food", "daytrip", "waterfront"] },
    SXR: { city: "Srinagar", knownFor: "Dal Lake, shikaras, Mughal gardens, mountains", vibe: "lakes + mountains", themes: ["waterfront", "nature", "hills", "food", "market", "daytrip"] },
    PNQ: { city: "Pune", knownFor: "forts, cafés, nearby hill stations, student-city energy", vibe: "forts + cafés", themes: ["oldtown", "cafe", "hills", "food", "daytrip", "nightlife"] },
    AMD: { city: "Ahmedabad", knownFor: "old-city heritage walk, textiles, street food, Sabarmati", vibe: "heritage + food", themes: ["oldtown", "food", "market", "museum", "waterfront", "daytrip"] },
    VNS: { city: "Varanasi", knownFor: "Ganga ghats, temples, evening aarti, old lanes", vibe: "spiritual + old city", themes: ["temple", "waterfront", "oldtown", "food", "market", "museum"] },
    ATQ: { city: "Amritsar", knownFor: "Golden Temple, Wagah border, Punjabi food", vibe: "spiritual + food", themes: ["temple", "food", "daytrip", "market", "oldtown", "museum"] },
    DED: { city: "Dehradun", knownFor: "gateway to hills, Mussoorie nearby, forests + valleys", vibe: "hills + nature", themes: ["hills", "nature", "daytrip", "cafe", "food", "market"] },
    IXB: { city: "Bagdogra", knownFor: "gateway to Darjeeling + the hills, tea gardens", vibe: "hills + tea", themes: ["hills", "nature", "daytrip", "cafe", "food", "market"] },
    IXZ: { city: "Port Blair", knownFor: "islands, beaches, diving, colonial history", vibe: "islands + sea", themes: ["beach", "nature", "oldtown", "waterfront", "food", "daytrip"] },
    DXB: { city: "Dubai", knownFor: "skyline icons, souks + malls, desert, beaches", vibe: "icons + shopping", themes: ["landmark", "souk", "beach", "adventure", "food", "nightlife"] },
    SIN: { city: "Singapore", knownFor: "gardens, hawker food, waterfront, family attractions", vibe: "clean city + food", themes: ["landmark", "food", "nature", "waterfront", "adventure", "market"] },
    BKK: { city: "Bangkok", knownFor: "temples, street food, markets, river + nightlife", vibe: "temples + street food", themes: ["temple", "food", "market", "waterfront", "nightlife", "daytrip"] },
    LHR: { city: "London", knownFor: "icon landmarks, museums, markets, parks", vibe: "landmarks + museums", themes: ["landmark", "museum", "market", "food", "nature", "oldtown"] },
    JFK: { city: "New York", knownFor: "skyline, museums, neighbourhoods, food", vibe: "big-city icons", themes: ["landmark", "museum", "food", "market", "nightlife", "waterfront"] },
  };

  // generic theme order for any city we don't have curated knowledge for.
  // honest + always-applicable categories — no place-specific claims.
  var GENERIC_THEMES = ["landmark", "food", "market", "oldtown", "daytrip", "cafe"];

  function get(code) {
    return DEST[(code || "").toUpperCase()] || null;
  }
  function theme(id) { return THEMES[id] || null; }

  var Data = { THEMES: THEMES, DEST: DEST, GENERIC_THEMES: GENERIC_THEMES, get: get, theme: theme };
  if (typeof module !== "undefined" && module.exports) module.exports = Data;
  root.LL_DESTINATIONS = Data;
})(typeof window !== "undefined" ? window : globalThis);
