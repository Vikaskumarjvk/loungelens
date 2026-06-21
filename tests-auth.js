/* Node tests for the login/logout auth layer. Run: node tests-auth.js */
const path = require("node:path");
globalThis.window = globalThis;
const A = require(path.join(__dirname, "auth.js"));

let pass = 0, fail = 0;
const ok = (n, c) => { if (c) { pass++; console.log("  PASS:", n); } else { fail++; console.log("  FAIL:", n); } };

console.log("\n[A1] create + login");
{
  let store = {};
  store = A.createAccount(store, "Vikas", "1234", { wallet: ["rupay-select"] });
  ok("account created", A.listUsers(store).includes("vikas"));
  const v = A.verifyLogin(store, "Vikas", "1234");
  ok("correct PIN logs in", v.ok && v.data.wallet[0] === "rupay-select");
  ok("username is case-insensitive", A.verifyLogin(store, "VIKAS", "1234").ok);
}

console.log("\n[A2] wrong PIN + unknown user rejected");
{
  let store = A.createAccount({}, "vikas", "1234", null);
  ok("wrong PIN rejected", !A.verifyLogin(store, "vikas", "9999").ok);
  ok("unknown user rejected", !A.verifyLogin(store, "ghost", "1234").ok);
  ok("wrong PIN gives reason", A.verifyLogin(store, "vikas", "0000").reason === "wrong PIN");
}

console.log("\n[A3] validation");
{
  let threwDup = false, threwShortPin = false, threwNoUser = false;
  let store = A.createAccount({}, "a", "1234", null);
  try { A.createAccount(store, "A", "5678", null); } catch (e) { threwDup = true; }
  ok("duplicate username rejected", threwDup);
  try { A.createAccount({}, "b", "12", null); } catch (e) { threwShortPin = true; }
  ok("short PIN rejected", threwShortPin);
  try { A.createAccount({}, "", "1234", null); } catch (e) { threwNoUser = true; }
  ok("empty username rejected", threwNoUser);
}

console.log("\n[A4] save data + multi-user isolation");
{
  let store = {};
  store = A.createAccount(store, "alice", "1111", { wallet: ["axis-myzone"] });
  store = A.createAccount(store, "bob", "2222", { wallet: ["hdfc-infinia"] });
  store = A.saveAccountData(store, "alice", { wallet: ["axis-myzone", "sbi-prime"] });
  ok("alice data updated", A.verifyLogin(store, "alice", "1111").data.wallet.length === 2);
  ok("bob unaffected (isolation)", A.verifyLogin(store, "bob", "2222").data.wallet[0] === "hdfc-infinia");
  ok("two users on one device", A.listUsers(store).length === 2);
}

console.log("\n[A5] delete account");
{
  let store = A.createAccount({}, "temp", "1234", null);
  const bad = A.deleteAccount(store, "temp", "0000");
  ok("delete with wrong PIN refused", !bad.ok);
  const good = A.deleteAccount(store, "temp", "1234");
  ok("delete with right PIN works", good.ok && A.listUsers(good.store).length === 0);
}

console.log("\n[A6] hash is deterministic + user-salted");
{
  ok("same input same hash", A.hashPin("v", "1234") === A.hashPin("v", "1234"));
  ok("different user different hash", A.hashPin("v", "1234") !== A.hashPin("w", "1234"));
  ok("different pin different hash", A.hashPin("v", "1234") !== A.hashPin("v", "1235"));
}

console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
process.exit(fail === 0 ? 0 : 1);