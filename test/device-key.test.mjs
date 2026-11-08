import test from "node:test";
import assert from "node:assert/strict";
import { getOwner, hashChave } from "../functions/_lib/auth.js";
import { onRequest as parear } from "../functions/parear.js";

// D1 mínimo em memória, só o que auth/schema/parear usam.
function d1() {
  const aparelhos = new Map();
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { if (/INSERT INTO aparelhos/.test(sql)) aparelhos.set(args[0], args[1]); return {}; },
    first: async () => (/FROM aparelhos/.test(sql) && aparelhos.has(args[0]) ? { 1: 1 } : null),
  });
  return { prepare: (sql) => stmt(sql), batch: async () => [], aparelhos };
}
const env = (db) => ({ OWNER_ID: "dono", OWNER_EMAIL: "eu@x.com", ACCESS_TEAM_DOMAIN: "t.cloudflareaccess.com", ACCESS_AUD: "aud", DB: db });
const req = (cookie, method = "GET") => new Request("https://a.pages.dev/sb/x", { method, headers: cookie ? { cookie } : {} });

test("sem chave nem login do Access: ninguém entra", async () => {
  const db = d1();
  assert.equal(await getOwner(req(), env(db)), null);
  assert.equal(await getOwner(req("abody_dev=" + "x".repeat(43)), env(db)), null, "chave desconhecida");
  assert.equal((await parear({ request: req(null, "POST"), env: env(db) })).status, 401, "parear exige o Access");
  assert.equal(db.aparelhos.size, 0);
});

test("chave registrada dá acesso de dono; o banco guarda só o hash", async () => {
  const db = d1(), chave = "A".repeat(43);
  db.aparelhos.set(await hashChave(chave), "agora");
  assert.deepEqual(await getOwner(req("outro=1; abody_dev=" + chave), env(db)), { id: "dono", email: "eu@x.com" });
  assert.ok(![...db.aparelhos.keys()].includes(chave));
});
