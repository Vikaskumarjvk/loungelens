/*
 * TripLens — live data module. REAL data, fetched in-browser, free, no key.
 *
 *  - FX rates:  Frankfurter (ECB reference rates) — https://api.frankfurter.dev
 *  - Weather:   Open-Meteo forecast — https://api.open-meteo.com
 *
 * Both are CORS-open (access-control-allow-origin: *), so a free static site can
 * call them directly with no backend and no API key. Verified 2026-06-24.
 *
 * HONESTY: these return REAL numbers (ECB published rates; a real forecast model).
 * They are cached in localStorage with a timestamp; the UI shows the rate date /
 * forecast freshness so the user knows it's real and how current. On network
 * failure we fall back to the last cached value (and say so) — never a fake number.
 *
 * The pure parsing/helper functions are exported for Node tests; the fetchers
 * use global fetch (browser) and are skipped in Node tests.
 */
(function (root) {
  "use strict";

  const FX_BASE = "https://api.frankfurter.dev/v1";
  const WX_BASE = "https://api.open-meteo.com/v1/forecast";
  const FX_CACHE = "triplens.fx.cache";   // { base, date, rates, fetchedTs }
  const WX_CACHE = "triplens.wx.cache";   // { [key]: {daily, fetchedTs} }
  const DAY = 86400000;

  function lsGet(k) { try { return JSON.parse(root.localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function nowTs() { try { return Date.now(); } catch (e) { return 0; } }

  // ---- pure FX math (Node-testable) --------------------------------------
  // Frankfurter returns rates relative to a base. Convert amount from->to using
  // a rates table that is relative to `base`. Cross-rate when neither is base.
  function convert(amount, from, to, base, rates) {
    amount = Number(amount) || 0;
    from = (from || "").toUpperCase(); to = (to || "").toUpperCase(); base = (base || "").toUpperCase();
    if (from === to) return amount;
    if (!rates) return null;
    // value of 1 unit of X in `base` terms:
    const inBase = (cur) => {
      if (cur === base) return 1;
      const r = rates[cur];
      return r ? 1 / r : null; // rates[cur] = how many `cur` per 1 base, so 1 cur = 1/r base
    };
    const f = inBase(from), t = inBase(to);
    if (f == null || t == null) return null;
    return round2(amount * (f / t));
  }
  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  // ---- FX fetch (browser) ------------------------------------------------
  // Returns a promise of { base, date, rates, fromCache } or rejects.
  function getRates(base, symbols) {
    base = (base || "EUR").toUpperCase();
    const cache = lsGet(FX_CACHE);
    const fresh = cache && cache.base === base && (nowTs() - (cache.fetchedTs || 0) < DAY);
    if (fresh) return Promise.resolve(Object.assign({ fromCache: false, cachedDate: cache.date }, cache));
    if (typeof root.fetch !== "function") {
      if (cache) return Promise.resolve(Object.assign({ fromCache: true }, cache));
      return Promise.reject(new Error("no fetch + no cache"));
    }
    const url = FX_BASE + "/latest?base=" + encodeURIComponent(base) + (symbols ? "&symbols=" + encodeURIComponent(symbols) : "");
    return root.fetch(url).then((r) => { if (!r.ok) throw new Error("FX HTTP " + r.status); return r.json(); })
      .then((j) => {
        const rec = { base: j.base, date: j.date, rates: j.rates, fetchedTs: nowTs() };
        lsSet(FX_CACHE, rec);
        return Object.assign({ fromCache: false }, rec);
      })
      .catch((e) => { if (cache) return Object.assign({ fromCache: true, error: e.message }, cache); throw e; });
  }

  // ---- weather parse (pure, Node-testable) -------------------------------
  // Maps an Open-Meteo daily payload to simple day rows + derived packing flags.
  function parseWeather(daily) {
    if (!daily || !daily.time) return null;
    const days = daily.time.map((d, i) => ({
      date: d,
      max: daily.temperature_2m_max ? daily.temperature_2m_max[i] : null,
      min: daily.temperature_2m_min ? daily.temperature_2m_min[i] : null,
      rainChance: daily.precipitation_probability_max ? daily.precipitation_probability_max[i] : null,
    }));
    const maxes = days.map((d) => d.max).filter((x) => x != null);
    const mins = days.map((d) => d.min).filter((x) => x != null);
    const rains = days.map((d) => d.rainChance).filter((x) => x != null);
    const avgMax = maxes.length ? Math.round(maxes.reduce((a, b) => a + b, 0) / maxes.length) : null;
    const lowMin = mins.length ? Math.min(...mins) : null;
    const peakRain = rains.length ? Math.max(...rains) : null;
    // derived suggestions (honest heuristics off real numbers):
    const suggest = {
      cold: lowMin != null && lowMin <= 12,
      monsoon: peakRain != null && peakRain >= 60,
      hot: avgMax != null && avgMax >= 33,
    };
    return { days, avgMax, lowMin, peakRain, suggest };
  }

  // ---- weather fetch (browser) -------------------------------------------
  // coords = [lat, lon]. Returns promise of { parsed, fromCache, ... }.
  function getWeather(lat, lon, days) {
    days = Math.min(16, Math.max(1, days || 7));
    const key = lat.toFixed(2) + "," + lon.toFixed(2) + ":" + days;
    const all = lsGet(WX_CACHE) || {};
    const hit = all[key];
    const fresh = hit && (nowTs() - (hit.fetchedTs || 0) < 6 * 3600000); // 6h
    if (fresh) return Promise.resolve({ parsed: parseWeather(hit.daily), daily: hit.daily, fromCache: false, cached: true });
    if (typeof root.fetch !== "function") {
      if (hit) return Promise.resolve({ parsed: parseWeather(hit.daily), daily: hit.daily, fromCache: true });
      return Promise.reject(new Error("no fetch + no cache"));
    }
    const url = WX_BASE + "?latitude=" + lat + "&longitude=" + lon +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=" + days + "&timezone=auto";
    return root.fetch(url).then((r) => { if (!r.ok) throw new Error("WX HTTP " + r.status); return r.json(); })
      .then((j) => {
        all[key] = { daily: j.daily, fetchedTs: nowTs() };
        lsSet(WX_CACHE, all);
        return { parsed: parseWeather(j.daily), daily: j.daily, fromCache: false };
      })
      .catch((e) => { if (hit) return { parsed: parseWeather(hit.daily), daily: hit.daily, fromCache: true, error: e.message }; throw e; });
  }

  const M = { convert, round2, parseWeather, getRates, getWeather, FX_BASE, WX_BASE };
  if (typeof module !== "undefined" && module.exports) module.exports = M;
  root.LL_LIVE = M;
})(typeof window !== "undefined" ? window : globalThis);
