/*
 * FlightLens LIVE — real-time fares from the Amadeus Self-Service API, fetched
 * DIRECTLY from the browser (no backend). This works on a free static site
 * because Amadeus returns Access-Control-Allow-Origin:* on both its OAuth token
 * endpoint and its flight-offers endpoint (verified 2026-06-22 via preflight).
 *
 * Why Amadeus and not "scrape MakeMyTrip": OTAs/airlines run DataDome/Akamai
 * anti-bot and hard-drop browser requests (MMT returns HTTP 000). No request
 * bypasses that from a static page. Amadeus is the real free real-time path.
 *
 * The user pastes their OWN free Amadeus key (test or production). It is stored
 * only in their browser (localStorage), never sent anywhere except Amadeus.
 *
 * Split for testability: parseOffers()/cheapestByAirline() are PURE (Node-tested
 * against a real-shape fixture); the fetch functions are thin browser wrappers.
 */
(function (root) {
  "use strict";

  var HOSTS = {
    test: "https://test.api.amadeus.com",
    production: "https://api.amadeus.com",
  };

  // ---- PURE parsers (Node-testable) --------------------------------------

  // minutes from an ISO-8601 duration like "PT2H10M"
  function durationToMin(iso) {
    if (!iso) return null;
    var m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(iso);
    if (!m) return null;
    return (Number(m[1] || 0) * 60) + Number(m[2] || 0);
  }
  function minLabel(min) {
    if (min == null) return "";
    var h = Math.floor(min / 60), mm = min % 60;
    return (h ? h + "h " : "") + (mm ? mm + "m" : (h ? "" : "0m"));
  }
  function timeLabel(iso) {
    // "2026-07-12T06:15:00" -> "06:15"
    if (!iso) return "";
    var m = /T(\d{2}:\d{2})/.exec(iso);
    return m ? m[1] : "";
  }

  // turn the raw Amadeus flight-offers JSON into clean rows the UI can render.
  // resp = { data:[offer...], dictionaries:{ carriers:{...} } }
  function parseOffers(resp) {
    if (!resp || !Array.isArray(resp.data)) return [];
    var carriers = (resp.dictionaries && resp.dictionaries.carriers) || {};
    return resp.data.map(function (o) {
      var it = (o.itineraries && o.itineraries[0]) || {};
      var segs = it.segments || [];
      var first = segs[0] || {};
      var last = segs[segs.length - 1] || {};
      var carrierCode = (o.validatingAirlineCodes && o.validatingAirlineCodes[0]) || first.carrierCode || "";
      var stops = Math.max(0, segs.length - 1);
      var price = o.price || {};
      return {
        id: o.id,
        airlineCode: carrierCode,
        airline: carriers[carrierCode] || carrierCode || "Airline",
        priceTotal: Number(price.grandTotal || price.total || 0),
        currency: price.currency || "INR",
        depTime: timeLabel(first.departure && first.departure.at),
        arrTime: timeLabel(last.arrival && last.arrival.at),
        from: (first.departure && first.departure.iataCode) || "",
        to: (last.arrival && last.arrival.iataCode) || "",
        durationMin: durationToMin(it.duration),
        durationLabel: minLabel(durationToMin(it.duration)),
        stops: stops,
        stopsLabel: stops === 0 ? "non-stop" : stops + " stop" + (stops > 1 ? "s" : ""),
        seatsLeft: o.numberOfBookableSeats || null,
      };
    }).sort(function (a, b) { return a.priceTotal - b.priceTotal; });
  }

  // cheapest fare per airline (the comparison table the user actually wants)
  function cheapestByAirline(rows) {
    var byAir = {};
    rows.forEach(function (r) {
      if (!byAir[r.airlineCode] || r.priceTotal < byAir[r.airlineCode].priceTotal) byAir[r.airlineCode] = r;
    });
    return Object.keys(byAir).map(function (k) { return byAir[k]; })
      .sort(function (a, b) { return a.priceTotal - b.priceTotal; });
  }

  // ---- BROWSER fetch wrappers (not Node-tested) --------------------------

  var TOKEN_KEY = "loungelens.amadeus.token"; // {access_token, exp}
  function loadToken() { try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch (e) { return null; } }
  function saveToken(t) { try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) {} }

  // get (cached) OAuth token. creds = {clientId, clientSecret, env}
  function getToken(creds) {
    var cached = loadToken();
    var nowSec = Math.floor(Date.now() / 1000);
    if (cached && cached.access_token && cached.exp > nowSec + 30) return Promise.resolve(cached.access_token);
    var host = HOSTS[creds.env] || HOSTS.test;
    return fetch(host + "/v1/security/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials&client_id=" + encodeURIComponent(creds.clientId) +
            "&client_secret=" + encodeURIComponent(creds.clientSecret),
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.access_token) {
          var msg = (res.j && (res.j.error_description || res.j.title)) || "auth failed";
          throw new Error("Amadeus auth: " + msg);
        }
        saveToken({ access_token: res.j.access_token, exp: nowSec + (res.j.expires_in || 1700) });
        return res.j.access_token;
      });
  }

  // search live fares. q = {from, to, date, adults, env}
  function searchLive(creds, q) {
    var host = HOSTS[creds.env] || HOSTS.test;
    return getToken(creds).then(function (token) {
      var url = host + "/v2/shopping/flight-offers" +
        "?originLocationCode=" + encodeURIComponent(q.from) +
        "&destinationLocationCode=" + encodeURIComponent(q.to) +
        "&departureDate=" + encodeURIComponent(q.date) +
        "&adults=" + (q.adults || 1) +
        "&currencyCode=INR&max=" + (q.max || 20) + "&nonStop=false";
      return fetch(url, { headers: { Authorization: "Bearer " + token } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
        .then(function (res) {
          if (!res.ok) {
            var e = (res.j && res.j.errors && res.j.errors[0]) || {};
            throw new Error("Amadeus: " + (e.detail || e.title || ("HTTP " + res.status)));
          }
          return { rows: parseOffers(res.j), raw: res.j };
        });
    });
  }

  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }

  // ---- flexible-date scan + price-anomaly detection (PURE helpers) -------

  // list of YYYY-MM-DD strings from startDate for `days` days (inclusive).
  function dateRange(startDate, days) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate || "");
    if (!m) return [];
    var out = [];
    // build from UTC to avoid TZ drift; no Date.now/new Date() with no args
    var base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    for (var i = 0; i < Math.max(1, days); i++) {
      var d = new Date(base + i * 86400000);
      var mm = ("0" + (d.getUTCMonth() + 1)).slice(-2), dd = ("0" + d.getUTCDate()).slice(-2);
      out.push(d.getUTCFullYear() + "-" + mm + "-" + dd);
    }
    return out;
  }

  // given [{date, minPrice}] across days, flag the cheapest + statistical dips.
  // An anomaly = a day priced well below the median (a real "fare dip"/error
  // signal). We never invent prices; we only compare prices we actually fetched.
  function priceAnomaly(daily) {
    var valid = (daily || []).filter(function (d) { return d.minPrice != null && d.minPrice > 0; });
    if (!valid.length) return { cheapest: null, median: null, days: daily || [] };
    var prices = valid.map(function (d) { return d.minPrice; }).slice().sort(function (a, b) { return a - b; });
    var median = prices[Math.floor(prices.length / 2)];
    var cheapest = valid.reduce(function (a, b) { return b.minPrice < a.minPrice ? b : a; });
    var annotated = (daily || []).map(function (d) {
      var isCheapest = d.minPrice === cheapest.minPrice && d.minPrice != null;
      // "dip": at least 25% below the median across the window
      var isDip = d.minPrice != null && median > 0 && d.minPrice <= median * 0.75;
      return Object.assign({}, d, {
        isCheapest: isCheapest,
        isDip: isDip,
        vsMedianPct: d.minPrice != null && median ? Math.round(((d.minPrice - median) / median) * 100) : null,
      });
    });
    return { cheapest: cheapest, median: median, days: annotated };
  }

  // scan a date range; returns per-day cheapest fare. onDay(dateStr, minPrice)
  // is called as each day resolves so the UI can fill progressively.
  // Bounded + sequential to respect the free-tier rate limit.
  function searchFlexible(creds, q, onDay) {
    var dates = dateRange(q.startDate, q.days || 7);
    var results = [];
    var chain = Promise.resolve();
    dates.forEach(function (date) {
      chain = chain.then(function () {
        return searchLive(creds, { from: q.from, to: q.to, date: date, adults: q.adults || 1, max: 5 })
          .then(function (res) {
            var min = (res.rows && res.rows.length) ? res.rows[0].priceTotal : null;
            var row = { date: date, minPrice: min, airline: (res.rows && res.rows[0]) ? res.rows[0].airline : null };
            results.push(row);
            if (onDay) onDay(row);
            return row;
          })
          .catch(function () {
            var row = { date: date, minPrice: null, error: true };
            results.push(row);
            if (onDay) onDay(row);
            return row;
          });
      });
    });
    return chain.then(function () { return priceAnomaly(results); });
  }

  var LiveAPI = {
    HOSTS: HOSTS,
    durationToMin: durationToMin, minLabel: minLabel, timeLabel: timeLabel,
    parseOffers: parseOffers, cheapestByAirline: cheapestByAirline,
    getToken: getToken, searchLive: searchLive, clearToken: clearToken,
    dateRange: dateRange, priceAnomaly: priceAnomaly, searchFlexible: searchFlexible,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = LiveAPI;
  root.LL_FLIGHT_LIVE = LiveAPI;
})(typeof window !== "undefined" ? window : globalThis);
