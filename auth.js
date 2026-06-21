/*
 * LoungeLens — Login / Logout (free, two modes).
 *
 * HONEST ARCHITECTURE:
 *  - DEVICE mode (default, works NOW, zero setup): "login" creates a local profile
 *    keyed by a username + PIN, stored in this browser. Logout hides the data;
 *    login re-reveals it. Multiple people on one device get separate profiles.
 *    This is real login/logout UX with NO server. Fully testable.
 *  - CLOUD mode (free, opt-in): if a Firebase config is provided (window.LL_FIREBASE),
 *    the same login uses Firebase Auth + Firestore so the profile syncs across
 *    devices for free (Firebase Spark tier). This part needs the owner to paste a
 *    free Firebase config once — until then the app runs in DEVICE mode and says so.
 *
 * This module is the AUTH STATE layer. It does NOT itself talk to Firebase (that's
 * loaded lazily in app.js only if config exists), so it stays pure + Node-testable.
 *
 * Account record (DEVICE mode), stored under localStorage key "loungelens.accounts":
 *   { [username]: { pinHash, data: <full app state blob> } }
 *
 * PIN hash: a lightweight non-crypto hash. This is NOT bank-grade security — it just
 * stops casual peeking on a shared device. We tell the user that plainly. (Real
 * security would need the cloud path with proper auth.)
 */
(function (root) {
  "use strict";

  function hashPin(username, pin) {
    // djb2-style hash, salted with username. Deterministic, non-reversible-enough
    // for "don't let my flatmate open my profile". Not for protecting secrets.
    const s = "LL" + (username || "").toLowerCase() + "" + (pin || "");
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return "h" + h.toString(36);
  }

  function normUser(u) { return (u || "").trim().toLowerCase(); }

  // ---- account store operations (pure: take store, return new store) ----
  function createAccount(store, username, pin, initialData) {
    const u = normUser(username);
    if (!u) throw new Error("username required");
    if (!pin || String(pin).length < 4) throw new Error("PIN must be at least 4 digits");
    store = store || {};
    if (store[u]) throw new Error("that username already exists on this device");
    store[u] = { pinHash: hashPin(u, pin), data: initialData || null };
    return store;
  }

  function verifyLogin(store, username, pin) {
    const u = normUser(username);
    if (!store || !store[u]) return { ok: false, reason: "no such user on this device" };
    if (store[u].pinHash !== hashPin(u, pin)) return { ok: false, reason: "wrong PIN" };
    return { ok: true, data: store[u].data || null };
  }

  function saveAccountData(store, username, data) {
    const u = normUser(username);
    if (!store || !store[u]) throw new Error("not logged in / no account");
    store[u].data = data;
    return store;
  }

  function listUsers(store) { return Object.keys(store || {}); }

  function deleteAccount(store, username, pin) {
    const u = normUser(username);
    const v = verifyLogin(store, username, pin);
    if (!v.ok) return { ok: false, reason: v.reason, store };
    delete store[u];
    return { ok: true, store };
  }

  const Auth = { hashPin, normUser, createAccount, verifyLogin, saveAccountData, listUsers, deleteAccount };
  if (typeof module !== "undefined" && module.exports) module.exports = Auth;
  root.LL_AUTH = Auth;
})(typeof window !== "undefined" ? window : globalThis);
