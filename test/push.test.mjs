import test from "node:test";
import assert from "node:assert/strict";
import { validar } from "../functions/api/push.js";

const FCM = "https://fcm.googleapis.com/fcm/send/abc";

test("push: aceita só agendamentos válidos para serviços de push conhecidos", () => {
  assert.deepEqual(validar({ action: "schedule", seconds: 90, subscription: { endpoint: FCM, keys: { x: 1 } } }),
    { action: "schedule", seconds: 90, subscription: { endpoint: FCM } });
  assert.deepEqual(validar({ action: "cancel" }), { action: "cancel" });
  for (const ruim of [null, { action: "schedule", seconds: 0, subscription: { endpoint: FCM } },
    { action: "schedule", seconds: 1801, subscription: { endpoint: FCM } },
    { action: "schedule", seconds: 1.5, subscription: { endpoint: FCM } },
    { action: "schedule", seconds: 60, subscription: { endpoint: "https://evil.example/x" } },
    { action: "schedule", seconds: 60, subscription: { endpoint: "http://fcm.googleapis.com/x" } }]) {
    assert.equal(validar(ruim), null);
  }
});

test("push: JWT VAPID assina com ES256 e verifica com a chave pública", async () => {
  // O Worker importa "cloudflare:workers"; testamos só a função de assinatura isolada.
  const fonte = (await import("node:fs")).readFileSync(new URL("../workers/push/src/index.js", import.meta.url), "utf8");
  const { vapidAuth } = await import("data:text/javascript," + encodeURIComponent(
    fonte.replace(/^import .*cloudflare:workers.*$/m, "class DurableObject {}")));
  const { subtle } = globalThis.crypto;
  const par = await subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const pub = Buffer.from(await subtle.exportKey("raw", par.publicKey)).toString("base64url");
  const env = { VAPID_PRIVATE_JWK: JSON.stringify(await subtle.exportKey("jwk", par.privateKey)), VAPID_PUBLIC_KEY: pub, VAPID_SUBJECT: "https://a-body.test" };
  const auth = await vapidAuth(FCM, env, 1_000_000_000_000);
  const [, jwt, k] = auth.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, pub);
  const [h, p, s] = jwt.split(".");
  const payload = JSON.parse(Buffer.from(p, "base64url"));
  assert.equal(payload.aud, "https://fcm.googleapis.com");
  assert.equal(payload.exp, 1_000_000_000 + 12 * 3600);
  assert.ok(await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, par.publicKey, Buffer.from(s, "base64url"), new TextEncoder().encode(`${h}.${p}`)));
});
