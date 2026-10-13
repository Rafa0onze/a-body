import test from "node:test";
import assert from "node:assert/strict";
import { mergeCumulativeHistory, saveCumulativeHistory } from "../src/history-sync.js";

const key = "abody:history";
const bodyKey = "abody:bodyhistory";
const session = { access_token: "test-token", user: { id: "test-owner" } };
const workout = (date, extra = {}) => ({ date, dayId: "test-day", completed: [], ...extra });
const clone = value => JSON.parse(JSON.stringify(value));

function mockStore(value, { failRead = false, failWrite = false, alwaysCollide = false } = {}) {
  let row = value === undefined ? undefined : { value: clone(value), updated_at: "2026-01-01T00:00:00.000Z" };
  const calls = [];
  const request = async (path, options = {}) => {
    calls.push({ path, ...options });
    const query = new URL(path, "https://test.invalid").searchParams;
    if (!options.method) {
      if (failRead) throw new Error("test read failure");
      return row ? [clone(row)] : [];
    }
    if (failWrite) throw new Error("test write failure");
    const payload = JSON.parse(options.body);
    if (options.method === "POST") {
      if (row || alwaysCollide) return [];
      row = { value: payload.value, updated_at: payload.updated_at };
    } else {
      if (!row || alwaysCollide || query.get("updated_at") !== `eq.${row.updated_at}`) return [];
      row = { value: payload.value, updated_at: payload.updated_at };
    }
    return [clone(row)];
  };
  return { request, calls, value: () => clone(row?.value ?? null) };
}

test("equal-length histories retain different records from both replicas", () => {
  const a = workout("2026-01-01");
  const b = workout("2026-01-02");
  assert.deepEqual(mergeCumulativeHistory(key, [b], [a]), [a, b]);
  assert.deepEqual(mergeCumulativeHistory(bodyKey, [{ date: b.date }], [{ date: a.date }]), [
    { date: a.date }, { date: b.date },
  ]);
});

test("stable IDs distinguish separate sessions while matching legacy records during migration", () => {
  const a = workout("2026-01-01", { id: "first" });
  const b = workout("2026-01-01", { id: "second" });
  assert.equal(mergeCumulativeHistory(key, [a], [b]).length, 2);
  const legacy = workout("2026-01-01");
  assert.equal(mergeCumulativeHistory(key, [a], [legacy]).length, 1);
});

test("richer legacy exercises and completed sets survive a partial incoming copy", () => {
  const stored = workout("2026-01-01", { completed: [
    { id: "exercise-a", weights: [12, 14], reps: [8, 9], rirs: [2, 0], sets: 2 },
    { id: "exercise-b", weights: [5], reps: [10] },
  ] });
  const incoming = workout(stored.date, { completed: [
    { id: "exercise-a", weights: [0], reps: [], rirs: [1], sets: 1 },
  ] });
  const result = mergeCumulativeHistory(key, [incoming], [stored]);
  assert.deepEqual(result[0].completed[0], {
    id: "exercise-a", weights: [12, 14], reps: [8, 9], rirs: [1, 0], sets: 2,
  });
  assert.deepEqual(result[0].completed[1], stored.completed[1]);
  assert.deepEqual(stored.completed[0].rirs, [2, 0]);
});

test("explicit feedback and manual record edits apply without dropping existing sessions", () => {
  const stored = workout("2026-01-01", { manual: true, grupos: ["before"], feedback: { recovery: 1 } });
  const incoming = { ...stored, grupos: ["after"], feedback: { recovery: 3 } };
  assert.deepEqual(mergeCumulativeHistory(key, [incoming], [stored])[0], incoming);
  assert.deepEqual(mergeCumulativeHistory(key, [], [stored]), [stored]);
});

test("omitted photo references survive incomplete replicas; explicit null deletion never resurrects", () => {
  const stored = { date: "2026-01-01", photoPaths: { front: "test-object" } };
  const incomplete = { date: stored.date };
  const deleted = { date: stored.date, photoPaths: null };
  assert.deepEqual(mergeCumulativeHistory(bodyKey, [incomplete], [stored]), [stored]);
  assert.deepEqual(mergeCumulativeHistory(bodyKey, [deleted], [stored]), [deleted]);
  assert.deepEqual(mergeCumulativeHistory(bodyKey, [stored], [deleted]), [deleted]);
});

test("partial body records retain stored analysis fields and other photo angles", () => {
  const stored = { date: "2026-01-01", analysis: { overallAnalysis: "test-summary", strongPoints: ["test-a"] }, photoPaths: { front: "test-front", back: "test-back" } };
  const incoming = { date: stored.date, analysis: { strongPoints: ["test-b"] }, photoPaths: { front: "test-new-front" } };
  assert.deepEqual(mergeCumulativeHistory(bodyKey, [incoming], [stored]), [{
    date: stored.date,
    analysis: { overallAnalysis: "test-summary", strongPoints: ["test-b"] },
    photoPaths: { front: "test-new-front", back: "test-back" },
  }]);
});

for (const initial of [undefined, [workout("2026-01-01")]]) {
  test(`two racing ${initial ? "updates" : "inserts"} preserve both independent appends`, async () => {
    const store = mockStore(initial);
    const a = workout("2026-01-02");
    const b = workout("2026-01-03");
    await Promise.all([
      saveCumulativeHistory({ request: store.request, session, key, value: [...(initial || []), a] }),
      saveCumulativeHistory({ request: store.request, session, key, value: [...(initial || []), b] }),
    ]);
    assert.deepEqual(store.value(), [...(initial || []), a, b]);
    assert.ok(store.calls.some(call => call.headers.Prefer?.includes("return=representation")));
    const patches = store.calls.filter(call => call.method === "PATCH");
    assert.ok(patches.every(call => call.path.includes("user_id=eq.test-owner") && call.path.includes("updated_at=eq.")));
  });
}

test("repeated saves are idempotent and require no downgrade write", async () => {
  const stored = [workout("2026-01-01"), workout("2026-01-02")];
  const store = mockStore(stored);
  await saveCumulativeHistory({ request: store.request, session, key, value: [stored[1]] });
  await saveCumulativeHistory({ request: store.request, session, key, value: stored });
  assert.deepEqual(store.value(), stored);
  assert.equal(store.calls.filter(call => call.method).length, 0);
});

test("network read failure performs no write; write failure does not retry or downgrade", async () => {
  for (const options of [{ failRead: true }, { failWrite: true }]) {
    const stored = [workout("2026-01-01")];
    const store = mockStore(stored, options);
    await assert.rejects(saveCumulativeHistory({ request: store.request, session, key, value: [workout("2026-01-02")] }));
    assert.deepEqual(store.value(), stored);
    assert.equal(store.calls.filter(call => call.method).length, options.failRead ? 0 : 1);
  }
});

test("malformed local or remote data fails closed before writing", async () => {
  for (const value of [{}, [null], [{ date: "not-a-date" }], [workout("2026-01-01", { completed: {} })], [workout("2026-01-01", { completed: [{ weights: "bad" }] })]]) {
    assert.throws(() => mergeCumulativeHistory(key, value, []));
    const store = mockStore([]);
    await assert.rejects(saveCumulativeHistory({ request: store.request, session, key, value }));
    assert.equal(store.calls.length, 0);
  }
  for (const response of [{}, [{ value: {}, updated_at: "2026-01-01" }], [{ value: [], updated_at: null }]]) {
    let reads = 0;
    await assert.rejects(saveCumulativeHistory({ request: async () => { reads++; return response; }, session, key, value: [] }));
    assert.equal(reads, 1);
  }
});

test("CAS collisions retry only a bounded number of times", async () => {
  const store = mockStore([], { alwaysCollide: true });
  await assert.rejects(saveCumulativeHistory({ request: store.request, session, key, value: [workout("2026-01-01")] }));
  assert.equal(store.calls.filter(call => call.method).length, 4);
});

test("OAuth sessions without user metadata retain existing default-owner insert behavior", async () => {
  const store = mockStore();
  await saveCumulativeHistory({ request: store.request, session: { access_token: "test-token" }, key, value: [] });
  const insert = store.calls.find(call => call.method === "POST");
  assert.equal(Object.hasOwn(JSON.parse(insert.body), "user_id"), false);
  assert.match(insert.headers.Prefer, /resolution=ignore-duplicates/);
});

test("explicit baseline permits exact manual removal and changed identity without resurrecting records", async () => {
  const previous = workout("2026-01-01", { manual: true });
  const automatic = workout("2026-01-02");
  for (const replacement of [[], [workout(previous.date, { dayId: "changed-day", manual: true })]]) {
    const baseline = [previous, automatic];
    const store = mockStore(baseline);
    const value = [...replacement, automatic];
    assert.deepEqual(await saveCumulativeHistory({ request: store.request, session, key, value, baseline }), value);
    assert.deepEqual(store.value(), value);
    assert.equal(store.calls.filter(call => call.method).length, 1);
  }
});

test("baseline comparison ignores JSON object property order", async () => {
  const stored = { date: "2026-01-01", dayId: "test-day", completed: [], manual: true };
  const baseline = [{ manual: true, completed: [], dayId: "test-day", date: "2026-01-01" }];
  const store = mockStore([stored]);
  await saveCumulativeHistory({ request: store.request, session, key, value: [], baseline });
  assert.deepEqual(store.value(), []);
});

test("remote change since baseline rejects exact edit before writing", async () => {
  const previous = workout("2026-01-01", { manual: true });
  const concurrent = workout("2026-01-02");
  const store = mockStore([previous, concurrent]);
  await assert.rejects(saveCumulativeHistory({ request: store.request, session, key, value: [], baseline: [previous] }), {
    code: "HISTORY_CONFLICT",
    message: "O histórico mudou em outro dispositivo. Atualize antes de tentar novamente.",
  });
  assert.equal(store.calls.filter(call => call.method).length, 0);
  assert.deepEqual(store.value(), [previous, concurrent]);
});

test("exact edit CAS collision rejects without retrying or merging omitted records", async () => {
  const baseline = [workout("2026-01-01", { manual: true })];
  const store = mockStore(baseline, { alwaysCollide: true });
  await assert.rejects(saveCumulativeHistory({ request: store.request, session, key, value: [], baseline }), { code: "HISTORY_CONFLICT" });
  assert.equal(store.calls.filter(call => call.method).length, 1);
  assert.equal(store.calls.filter(call => !call.method).length, 1);
  assert.deepEqual(store.value(), baseline);
});

test("malformed baseline rejects before reading or writing", async () => {
  const store = mockStore([]);
  await assert.rejects(saveCumulativeHistory({ request: store.request, session, key, value: [], baseline: null }));
  assert.equal(store.calls.length, 0);
});
