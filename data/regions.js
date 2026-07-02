/*
 * TripLens — curated multi-stop CIRCUITS (the "expert trip planner" data).
 * Browser global + Node export. Keyed by a slug; matched from free text.
 *
 * WHAT THIS IS: for a region a traveller names ("Kerala", "Rajasthan",
 * "Vietnam"), the proven, well-trodden circuit — which places, the ORDER that
 * avoids backtracking, roughly how many nights each leg deserves, the gateway
 * airport, and the honest "why this shape". This is the itinerary intelligence
 * a good human travel friend carries in their head.
 *
 * HONESTY MODEL (read before adding a region):
 *  - Everything here is COMMON-KNOWLEDGE GEOGRAPHY + long-established travel
 *    convention: that Munnar is hills and tea, that the classic Kerala loop runs
 *    Kochi -> hills -> backwaters -> coast, that a leg is ~Nh by road. That's a
 *    description of a place and a well-known route, NOT a fabricated fact.
 *  - We do NOT put a price, a named hotel/restaurant, opening hours, or a
 *    "book this exact boat" here. Cost is a QUALITATIVE tier only (budget / mid
 *    / splurge) plus honest money-savers ("a day cruise is cheaper than an
 *    overnight houseboat") — the real numbers open on a live search downstream.
 *  - `driveHours` / `nights` are rough planning guidance, not a promise. The UI
 *    frames them as "roughly", and a real maps/route search is always one tap
 *    away to check the actual time.
 *  - Every stop carries an IATA `code` when one exists so the day-planner can
 *    build real Google Maps searches for that city; stops without an airport
 *    (hill towns, backwater towns) still plan fine via their city name.
 *
 * Fields per region:
 *   name       display name
 *   aka        alias/misspelling tokens for matching (lowercase)
 *   country    plain country label
 *   gateway    IATA of the usual fly-in airport (start of the circuit)
 *   idealNights the nights the full circuit is designed around
 *   minNights  below this, we suggest trimming stops (still works, just tighter)
 *   vibe       one honest common-knowledge line
 *   costTier   'value' | 'moderate' | 'premium' — rough overall $ shape
 *   savers     array of honest, general money-saving truths (no numbers)
 *   stops      ordered [{ city, code?, nights, why, driveHoursFromPrev?, themes:[] }]
 *              themes are ids the day-planner + destinations.js understand.
 */
(function (root) {
  "use strict";

  var REGIONS = {
    // ============================ INDIA ============================
    kerala: {
      name: "Kerala", country: "India", gateway: "COK", idealNights: 7, minNights: 4,
      aka: ["kerala", "keral", "kerela", "kerla", "gods own country", "backwaters trip", "cochin trip"],
      vibe: "backwaters, tea hills, spice country and a calm coast — India's easiest first-timer loop",
      costTier: "moderate",
      savers: [
        "A shared or day houseboat cruise costs far less than a private overnight one — same backwaters.",
        "Homestays in Munnar and Fort Kochi are cheaper and warmer than resorts.",
        "Trains and KSRTC buses between towns are dirt cheap; a car+driver is comfort you pay for.",
      ],
      stops: [
        { city: "Kochi", code: "COK", nights: 1, why: "ease in at Fort Kochi — Chinese nets, cafes, no rush after the flight", themes: ["oldtown", "waterfront", "food"] },
        { city: "Munnar", nights: 2, driveHoursFromPrev: 4, why: "tea hills and cool air while you're fresh; the drive up is half the joy", themes: ["hills", "nature", "cafe"] },
        { city: "Thekkady", nights: 1, driveHoursFromPrev: 3.5, why: "spice plantations and Periyar wildlife on the way back down", themes: ["nature", "daytrip", "market"] },
        { city: "Alleppey", nights: 2, driveHoursFromPrev: 4, why: "the backwaters — the reason most people come; do the houseboat here", themes: ["waterfront", "nature", "food"] },
        { city: "Kovalam", nights: 1, driveHoursFromPrev: 3.5, why: "wind down on the coast before flying home from Trivandrum", themes: ["beach", "food", "waterfront"] },
      ],
    },
    rajasthan: {
      name: "Rajasthan", country: "India", gateway: "JAI", idealNights: 9, minNights: 5,
      aka: ["rajasthan", "rajastan", "rajsthan", "golden triangle plus", "pink city trip", "desert trip india", "udaipur jaipur jodhpur"],
      vibe: "forts, palaces, blue and gold cities and the desert — India at its most cinematic",
      costTier: "moderate",
      savers: [
        "Heritage havelis often cost less than chain hotels and are the whole experience.",
        "Overnight trains between cities save a hotel night and cover the distance while you sleep.",
        "One camel/desert night near Jaisalmer is plenty; more gets repetitive and pricey.",
      ],
      stops: [
        { city: "Jaipur", code: "JAI", nights: 2, why: "the pink city — forts, bazaars, palaces; the classic start", themes: ["oldtown", "landmark", "market"] },
        { city: "Jodhpur", nights: 2, driveHoursFromPrev: 5, why: "the blue city under Mehrangarh fort — the most dramatic skyline", themes: ["oldtown", "landmark", "food"] },
        { city: "Jaisalmer", nights: 2, driveHoursFromPrev: 5, why: "the golden fort city and the desert night — the far-west highlight", themes: ["oldtown", "landmark", "nature"] },
        { city: "Udaipur", nights: 3, driveHoursFromPrev: 6, why: "the lake city — the softest, most romantic place to end", themes: ["waterfront", "landmark", "market"] },
      ],
    },
    goa: {
      name: "Goa", country: "India", gateway: "GOI", idealNights: 5, minNights: 3,
      aka: ["goa", "goaa", "goa trip", "beach trip goa", "north goa", "south goa"],
      vibe: "beaches, Portuguese-era churches, shacks and nightlife — the easy escape",
      costTier: "moderate",
      savers: [
        "South Goa is calmer and cheaper for stays; North Goa is the party + market side.",
        "Rent a scooter instead of taxis — Goa taxis are famously the pricey part.",
        "Beach shacks beat resort restaurants on both price and vibe.",
      ],
      stops: [
        { city: "North Goa", code: "GOI", nights: 3, why: "Baga/Anjuna/Vagator — beaches, flea markets, nightlife", themes: ["beach", "nightlife", "market"] },
        { city: "South Goa", nights: 2, driveHoursFromPrev: 1.5, travel: ["scooter", "cab", "auto"], why: "Palolem/Colva — quieter sand and slower days to finish", themes: ["beach", "waterfront", "food"] },
      ],
    },
    himachal: {
      name: "Himachal", country: "India", gateway: "IXC", idealNights: 8, minNights: 5,
      aka: ["himachal", "himachal pradesh", "manali trip", "spiti", "shimla manali", "himalaya trip", "himalayas india"],
      vibe: "Himalayan hill towns, pine valleys and mountain passes — cool air and big views",
      costTier: "value",
      savers: [
        "Volvo overnight buses from Delhi/Chandigarh are cheap and save a night's stay.",
        "Old Manali and small guesthouses cost a fraction of the resort strip.",
        "Go in shoulder season — same mountains, far fewer crowds and lower rates.",
      ],
      stops: [
        { city: "Shimla", nights: 2, why: "the colonial hill capital — an easy first stop from the plains", themes: ["hills", "oldtown", "cafe"] },
        { city: "Manali", nights: 3, driveHoursFromPrev: 7, why: "the valley base — Solang, Old Manali cafes, gateway to the passes", themes: ["hills", "nature", "cafe"] },
        { city: "Kasol", nights: 2, driveHoursFromPrev: 3.5, why: "Parvati valley — riverside, treks, the chilled-out finish", themes: ["nature", "hills", "cafe"] },
      ],
    },
    ladakh: {
      name: "Ladakh", country: "India", gateway: "IXL", idealNights: 7, minNights: 5,
      aka: ["ladakh", "leh", "leh ladakh", "ladak", "pangong", "nubra"],
      vibe: "high-altitude desert, turquoise lakes and monasteries — India's most epic landscape",
      costTier: "moderate",
      savers: [
        "Shared taxis to Pangong/Nubra cost far less than private hire if you join a group.",
        "Acclimatise in Leh for 2 days first — rushing high causes altitude sickness (and lost trip days).",
        "Guesthouses in Leh are cheap and homely; permits are simple and low-cost.",
      ],
      stops: [
        { city: "Leh", code: "IXL", nights: 3, why: "acclimatise + monasteries + old town; you MUST rest high before going higher", themes: ["oldtown", "temple", "nature"] },
        { city: "Nubra Valley", nights: 2, driveHoursFromPrev: 5, why: "sand dunes and Diskit monastery over Khardung La", themes: ["nature", "temple", "daytrip"] },
        { city: "Pangong Lake", nights: 2, driveHoursFromPrev: 6, why: "the colour-changing lake — the postcard finish", themes: ["waterfront", "nature", "daytrip"] },
      ],
    },
    "andaman": {
      name: "Andaman", country: "India", gateway: "IXZ", idealNights: 6, minNights: 4,
      aka: ["andaman", "andamans", "andaman islands", "havelock", "port blair trip", "neil island"],
      vibe: "white-sand islands, clear water and diving — India's tropical beach break",
      costTier: "moderate",
      savers: [
        "Government ferries between islands are much cheaper than the private catamarans.",
        "Havelock (Swaraj Dweep) has budget beach huts alongside the resorts.",
        "Book inter-island ferries ahead in peak season — last-minute is where you overpay.",
      ],
      stops: [
        { city: "Port Blair", code: "IXZ", nights: 1, why: "arrival + Cellular Jail; a light first day, then ferry out", themes: ["oldtown", "waterfront", "food"] },
        { city: "Havelock Island", nights: 3, driveHoursFromPrev: 2.5, travel: ["ferry"], why: "Radhanagar beach + diving — the main event (ferry from Port Blair)", themes: ["beach", "nature", "waterfront"] },
        { city: "Neil Island", nights: 2, driveHoursFromPrev: 1, travel: ["ferry"], why: "smaller, slower, snorkelling and quiet sand to finish (short ferry hop)", themes: ["beach", "nature", "waterfront"] },
      ],
    },
    "north-east-india": {
      name: "Northeast India", country: "India", gateway: "GAU", idealNights: 8, minNights: 5,
      aka: ["northeast", "north east", "north-east", "meghalaya", "shillong", "cherrapunji", "assam trip", "seven sisters", "northeast india"],
      vibe: "living root bridges, waterfalls, the cleanest village in Asia and big green hills",
      costTier: "value",
      savers: [
        "Shared sumos between towns are the local way and cost a fraction of private cars.",
        "Homestays in Mawlynnong and Cherrapunji are cheap and the real experience.",
        "Guwahati is the cheap fly-in; do the hills as a loop from there.",
      ],
      stops: [
        { city: "Guwahati", code: "GAU", nights: 1, why: "fly in, Kamakhya temple + Brahmaputra, then head to the hills", themes: ["temple", "waterfront", "food"] },
        { city: "Shillong", nights: 3, driveHoursFromPrev: 3, why: "the Scotland of the East — lakes, music, waterfalls base", themes: ["hills", "nature", "cafe"] },
        { city: "Cherrapunji", nights: 2, driveHoursFromPrev: 2.5, why: "living root bridges and the wettest, greenest gorges", themes: ["nature", "hills", "daytrip"] },
        { city: "Kaziranga", nights: 2, driveHoursFromPrev: 6, why: "one-horned rhinos on the way back to Guwahati", themes: ["nature", "daytrip"] },
      ],
    },
    "golden-triangle": {
      name: "Golden Triangle", country: "India", gateway: "DEL", idealNights: 6, minNights: 4,
      aka: ["golden triangle", "delhi agra jaipur", "taj mahal trip", "delhi jaipur agra", "first india trip", "classic india"],
      vibe: "Delhi, the Taj Mahal and Jaipur — the classic first-time-in-India loop",
      costTier: "moderate",
      savers: [
        "The Gatimaan/Shatabdi trains Delhi–Agra–Jaipur are fast, cheap and beat a car.",
        "See the Taj at sunrise — cheaper crowds and the light everyone photographs.",
        "Old Delhi street food is the best value meal of the whole trip.",
      ],
      stops: [
        { city: "Delhi", code: "DEL", nights: 2, why: "Mughal monuments + street food; the big-city start", themes: ["landmark", "oldtown", "food"] },
        { city: "Agra", nights: 1, driveHoursFromPrev: 3.5, why: "the Taj Mahal + Agra Fort — one full day is enough", themes: ["landmark", "oldtown"] },
        { city: "Jaipur", code: "JAI", nights: 3, driveHoursFromPrev: 4, why: "the pink city — forts, palaces, bazaars to finish", themes: ["oldtown", "landmark", "market"] },
      ],
    },

    // ============================ WORLD ============================
    "thailand": {
      name: "Thailand", country: "Thailand", gateway: "BKK", idealNights: 9, minNights: 6,
      aka: ["thailand", "thai trip", "bangkok phuket", "bangkok chiang mai", "thai islands"],
      vibe: "temples and street food in Bangkok, hills in the north, islands in the south",
      costTier: "value",
      savers: [
        "Overnight trains/buses Bangkok–Chiang Mai save a night's hotel.",
        "Street food and night markets are the best and cheapest eating everywhere.",
        "Cheap domestic flights (AirAsia/Nok) beat long land transfers to the south.",
      ],
      stops: [
        { city: "Bangkok", code: "BKK", nights: 3, why: "temples, markets, river and nightlife — the classic entry", themes: ["temple", "food", "market"] },
        { city: "Chiang Mai", nights: 3, driveHoursFromPrev: null, travel: ["fly", "train"], why: "old-city temples, night bazaar, hills and elephants (cheap flight or overnight train up)", themes: ["temple", "oldtown", "nature"] },
        { city: "Phuket", nights: 3, driveHoursFromPrev: null, travel: ["fly"], why: "islands and beaches to finish (quick flight down)", themes: ["beach", "waterfront", "nightlife"] },
      ],
    },
    "sri-lanka": {
      name: "Sri Lanka", country: "Sri Lanka", gateway: "CMB", idealNights: 8, minNights: 5,
      aka: ["sri lanka", "srilanka", "ceylon", "colombo kandy ella", "sri lankan trip"],
      vibe: "tea country by train, ancient temples, wildlife and a warm south coast",
      costTier: "value",
      savers: [
        "The Kandy–Ella hill train is one of the world's great rides and costs almost nothing.",
        "Guesthouses and homestays are excellent value across the island.",
        "Tuk-tuks by meter (PickMe app) stop the tourist-price haggling.",
      ],
      stops: [
        { city: "Colombo", code: "CMB", nights: 1, why: "gentle arrival by the sea before heading inland", themes: ["waterfront", "food", "market"] },
        { city: "Kandy", nights: 2, driveHoursFromPrev: 3.5, why: "the Temple of the Tooth and the hill-country gateway", themes: ["temple", "oldtown", "nature"] },
        { city: "Ella", nights: 2, driveHoursFromPrev: 6, travel: ["train"], why: "tea hills and viewpoints — the Kandy-to-Ella train is one of the world's great rides", themes: ["hills", "nature", "cafe"] },
        { city: "Galle", nights: 2, driveHoursFromPrev: 5, why: "the Dutch fort and south-coast beaches to finish", themes: ["oldtown", "beach", "waterfront"] },
      ],
    },
    "vietnam": {
      name: "Vietnam", country: "Vietnam", gateway: "HAN", idealNights: 10, minNights: 7,
      aka: ["vietnam", "vietnaam", "hanoi ho chi minh", "halong bay", "vietnam trip"],
      vibe: "north-to-south sweep — old Hanoi, Halong Bay, imperial Hue, tailors of Hoi An, buzzing Saigon",
      costTier: "value",
      savers: [
        "Domestic flights are cheap and save days versus the long land route north-to-south.",
        "Street pho and banh mi are the best meals and cost next to nothing.",
        "A one-night Halong cruise is plenty; two nights is mostly repeat.",
      ],
      stops: [
        { city: "Hanoi", code: "HAN", nights: 2, why: "old-quarter chaos, lakes and the northern start", themes: ["oldtown", "food", "market"] },
        { city: "Halong Bay", nights: 1, driveHoursFromPrev: 2.5, travel: ["bus", "cab"], why: "the limestone-karst cruise — most cruises include the transfer from Hanoi", themes: ["waterfront", "nature"] },
        { city: "Hoi An", nights: 3, driveHoursFromPrev: null, travel: ["fly"], why: "lantern-lit old town, tailors and beaches (fly to Da Nang, then a short cab)", themes: ["oldtown", "beach", "food"] },
        { city: "Ho Chi Minh City", nights: 3, driveHoursFromPrev: null, travel: ["fly"], why: "Saigon energy + Mekong day trip to finish (quick flight south)", themes: ["landmark", "food", "market"] },
      ],
    },
    "dubai-uae": {
      name: "Dubai & UAE", country: "UAE", gateway: "DXB", idealNights: 5, minNights: 3,
      aka: ["dubai", "uae", "dubai trip", "abu dhabi", "dubai abu dhabi"],
      vibe: "skyline icons, desert, souks and beaches — a short, easy, high-shine break",
      costTier: "premium",
      savers: [
        "The Metro reaches most icons — far cheaper than taxis across the city.",
        "Book desert safaris and Burj Khalifa online ahead for lower rates than at the door.",
        "Old Dubai (souks, abra boats) is the cheap, atmospheric half people skip.",
      ],
      stops: [
        { city: "Dubai", code: "DXB", nights: 4, why: "icons, souks, desert and beach — the whole show is here", themes: ["landmark", "souk", "beach", "adventure"] },
        { city: "Abu Dhabi", nights: 1, driveHoursFromPrev: 1.5, why: "the Grand Mosque + Louvre as a day-plus overnight", themes: ["landmark", "museum", "waterfront"] },
      ],
    },
    "singapore": {
      name: "Singapore", country: "Singapore", gateway: "SIN", idealNights: 4, minNights: 2,
      aka: ["singapore", "singapore trip", "sinagpore", "spore"],
      vibe: "gardens, hawker food, waterfront and family attractions — spotless and easy",
      costTier: "premium",
      savers: [
        "Hawker centres are Michelin-level cheap — skip the mall restaurants.",
        "An EZ-Link/MRT pass beats taxis everywhere on this compact island.",
        "Many gardens and the light shows at Marina Bay are free.",
      ],
      stops: [
        { city: "Singapore", code: "SIN", nights: 4, why: "one base covers it all — Gardens, Sentosa, Chinatown, the bay", themes: ["landmark", "food", "nature", "waterfront"] },
      ],
    },
  };

  // fast alias index for matching (built once)
  var ALIAS_INDEX = null;
  function buildIndex() {
    if (ALIAS_INDEX) return ALIAS_INDEX;
    ALIAS_INDEX = [];
    Object.keys(REGIONS).forEach(function (slug) {
      var r = REGIONS[slug];
      var names = [r.name.toLowerCase()].concat(r.aka || []);
      names.forEach(function (n) { ALIAS_INDEX.push({ token: n, slug: slug }); });
    });
    // longest tokens first so "north east india" beats "india"
    ALIAS_INDEX.sort(function (a, b) { return b.token.length - a.token.length; });
    return ALIAS_INDEX;
  }

  function get(slug) { return REGIONS[slug] || null; }

  var Data = { REGIONS: REGIONS, get: get, buildIndex: buildIndex };
  if (typeof module !== "undefined" && module.exports) module.exports = Data;
  root.LL_REGIONS = Data;
})(typeof window !== "undefined" ? window : globalThis);
