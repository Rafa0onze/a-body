import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordRecovery, parseRecoveryLink, RECOVERY_CONFIRMATION } from "../src/password-recovery.js";

const valid = { accessToken: "recovery-token", expiresAt: 2000 };
const controller = (request, recoveryLink = valid) => createPasswordRecovery({ request, recoveryLink, now: () => 1000 });
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

test("only recovery-link credentials are accepted; unrelated sign-in tokens are ignored", () => {
  assert.equal(parseRecoveryLink("https://app.test/#access_token=unrelated&type=signup"), null);
  assert.deepEqual(parseRecoveryLink("https://app.test/?recovery=1#access_token=unrelated"), { error: "missing_link" });
  assert.deepEqual(parseRecoveryLink("https://app.test/#type=recovery&access_token=reset&expires_in=60", 1000), { accessToken: "reset", expiresAt: 61000 });
});

test("expired and rejected links use fixed errors without provider descriptions", () => {
  assert.equal(parseRecoveryLink("https://app.test/#type=recovery&access_token=reset&expires_at=1", 2000).error, "expired_link");
  assert.deepEqual(parseRecoveryLink("https://app.test/?recovery=1#error=access_denied&error_code=otp_expired&error_description=SECRET"), { error: "expired_link" });
  assert.deepEqual(parseRecoveryLink("https://app.test/?recovery=1#error=access_denied&error_description=SECRET"), { error: "invalid_link" });
});

test("recover request trims email, encodes callback, and gives neutral confirmation", async () => {
  const calls = [];
  const flow = createPasswordRecovery({ request: async (...args) => { calls.push(args); return {}; }, redirectTo: "https://app.test/?recovery=1" });
  const result = await flow.requestLink("  example@example.test  ");
  assert.equal(result.message, RECOVERY_CONFIRMATION);
  assert.equal(calls[0][0], "/auth/v1/recover?redirect_to=https%3A%2F%2Fapp.test%2F%3Frecovery%3D1");
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(JSON.parse(calls[0][1].body), { email: "example@example.test" });
  assert.equal(calls[0][1].headers, undefined);
  await flow.requestLink("example@example.test");
  assert.equal(calls.length, 1);
});

test("invalid email makes no request", async () => {
  const flow = controller(() => assert.fail("unexpected request"));
  assert.equal((await flow.requestLink("invalid")).code, "invalid_email");
});

test("request failure hides provider details and permits a manual retry", async () => {
  let attempts = 0;
  const flow = controller(async () => { if (++attempts === 1) throw new Error("SECRET account email"); return {}; });
  const failure = await flow.requestLink("example@example.test");
  assert.equal(failure.code, "request_failed");
  assert.ok(!failure.message.includes("SECRET"));
  assert.equal((await flow.requestLink("example@example.test")).code, "sent");
});

test("concurrent submissions send exactly one recovery request", async () => {
  const waiting = deferred();
  let requests = 0;
  const flow = controller(async () => { requests++; await waiting.promise; return {}; });
  const first = flow.requestLink("example@example.test");
  assert.equal((await flow.requestLink("example@example.test")).code, "busy");
  waiting.resolve();
  assert.equal((await first).code, "sent");
  assert.equal(requests, 1);
});

test("update validates the exact link bearer before PUT and never repeats success", async () => {
  const calls = [];
  const flow = controller(async (...args) => { calls.push(args); return { id: "verified-user" }; });
  assert.equal((await flow.updatePassword("new-password", "new-password")).code, "updated");
  assert.deepEqual(calls.map(([path, opts]) => [path, opts.method, opts.headers.Authorization]), [
    ["/auth/v1/user", "GET", "Bearer recovery-token"], ["/auth/v1/user", "PUT", "Bearer recovery-token"],
  ]);
  assert.deepEqual(JSON.parse(calls[1][1].body), { password: "new-password" });
  await flow.updatePassword("new-password", "new-password");
  assert.equal(calls.length, 2);
});

test("missing, locally expired, or provider-rejected credentials cannot update", async () => {
  for (const link of [null, { error: "missing_link" }, { accessToken: "old", expiresAt: 999 }]) {
    const flow = controller(() => assert.fail("must not send a request"), link);
    assert.equal((await flow.updatePassword("password", "password")).ok, false);
  }
  let calls = 0;
  const rejected = controller(async () => { calls++; throw Object.assign(new Error("SECRET"), { status: 401 }); });
  const result = await rejected.updatePassword("password", "password");
  assert.equal(result.code, "invalid_link");
  assert.ok(!result.message.includes("SECRET"));
  assert.equal(calls, 1);
});

test("successful HTTP without a user identity is insufficient to authorize PUT", async () => {
  let calls = 0;
  const flow = controller(async () => { calls++; return {}; });
  assert.equal((await flow.updatePassword("password", "password")).code, "invalid_link");
  assert.equal(calls, 1);
});

test("validation failure retries safely and update failure revalidates on retry", async () => {
  let attempts = 0;
  const methods = [];
  const flow = controller(async (_path, options) => {
    methods.push(options.method);
    if (++attempts === 1 || attempts === 3) throw new Error("SECRET");
    return { id: "verified-user" };
  });
  assert.equal((await flow.updatePassword("password", "password")).code, "validation_failed");
  assert.equal((await flow.updatePassword("password", "password")).code, "update_failed");
  assert.equal((await flow.updatePassword("password", "password")).code, "updated");
  assert.deepEqual(methods, ["GET", "GET", "PUT", "GET", "PUT"]);
});

test("password mismatch/length validation precedes all network calls", async () => {
  const flow = controller(() => assert.fail("unexpected request"));
  assert.equal((await flow.updatePassword("short", "short")).code, "short_password");
  assert.equal((await flow.updatePassword("password", "different")).code, "password_mismatch");
});

test("cancel during verification prevents PUT even if transport ignores abort", async () => {
  const waiting = deferred();
  let calls = 0;
  const flow = controller(async () => { calls++; await waiting.promise; return { id: "verified-user" }; });
  const operation = flow.updatePassword("password", "password");
  flow.cancel();
  waiting.resolve();
  assert.equal((await operation).code, "cancelled");
  assert.equal(calls, 1);
  assert.equal((await flow.requestLink("example@example.test")).code, "cancelled");
});

test("link expiry during verification prevents PUT", async () => {
  let clock = 1000;
  let calls = 0;
  const flow = createPasswordRecovery({ recoveryLink: valid, now: () => clock, request: async () => { calls++; clock = 2000; return { id: "verified-user" }; } });
  assert.equal((await flow.updatePassword("password", "password")).code, "expired_link");
  assert.equal(calls, 1);
});

test("concurrent password submissions do not duplicate GET or PUT", async () => {
  const waiting = deferred();
  const methods = [];
  const flow = controller(async (_path, opts) => { methods.push(opts.method); await waiting.promise; return { id: "verified-user" }; });
  const operation = flow.updatePassword("password", "password");
  assert.equal((await flow.updatePassword("password", "password")).code, "busy");
  waiting.resolve();
  await operation;
  assert.deepEqual(methods, ["GET", "PUT"]);
});
