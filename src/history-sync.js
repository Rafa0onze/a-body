const HISTORY_KEYS = new Set(["abody:history", "abody:bodyhistory"]);
const MAX_ATTEMPTS = 4;
const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);

function validateHistory(key, value) {
  if (!HISTORY_KEYS.has(key) || !Array.isArray(value)) throw new Error("Histórico inválido.");
  for (const record of value) {
    if (!isObject(record) || typeof record.date !== "string" || !Number.isFinite(Date.parse(record.date))) {
      throw new Error("Registro de histórico inválido.");
    }
    if (record.id != null && (typeof record.id !== "string" || !record.id)) throw new Error("ID inválido.");
    if (key === "abody:history") {
      if (!record.id && !record.dayId && !record.dayLabel) throw new Error("Identidade de treino inválida.");
      if (record.completed != null && (!Array.isArray(record.completed) || record.completed.some(ex => !isObject(ex)))) {
        throw new Error("Exercícios inválidos.");
      }
      for (const exercise of record.completed || []) {
        for (const field of ["weights", "reps", "rirs", "sideDurations"]) {
          if (exercise[field] != null && !Array.isArray(exercise[field])) throw new Error("Séries inválidas.");
        }
      }
    }
  }
  // Catch non-JSON values before serialization can silently turn them into null.
  JSON.stringify(value, (_key, item) => {
    if (typeof item === "number" && !Number.isFinite(item)) throw new Error("Valor inválido.");
    if (["bigint", "function", "symbol"].includes(typeof item)) throw new Error("Valor inválido.");
    return item;
  });
}

const copy = value => JSON.parse(JSON.stringify(value));
const legacyIdentity = (key, record) => key === "abody:bodyhistory"
  ? record.date
  : JSON.stringify([record.date, record.dayId || record.dayLabel]);

function sameRecord(key, a, b) {
  if (a.id && b.id) return a.id === b.id;
  return legacyIdentity(key, a) === legacyIdentity(key, b);
}

function mergeExercise(local, remote) {
  const result = { ...remote, ...local };
  for (const field of ["weights", "reps", "rirs", "sideDurations"]) {
    if (!Array.isArray(local[field]) && !Array.isArray(remote[field])) continue;
    const incoming = local[field] || [];
    const stored = remote[field] || [];
    result[field] = Array.from({ length: Math.max(incoming.length, stored.length) }, (_, index) => {
      // Empty/zero training entries cannot erase a recorded weight or repetition.
      if ((field === "weights" || field === "reps") && Number(stored[index]) > 0 && !(Number(incoming[index]) > 0)) {
        return stored[index];
      }
      return incoming[index] ?? stored[index] ?? null;
    });
  }
  if (Number.isFinite(local.sets) && Number.isFinite(remote.sets)) result.sets = Math.max(local.sets, remote.sets);
  return result;
}

function mergeRecord(key, local, remote) {
  const result = { ...remote, ...local };
  if (key === "abody:history") {
    if (Array.isArray(local.completed) || Array.isArray(remote.completed)) {
      const completed = [...(remote.completed || [])];
      for (const [index, exercise] of (local.completed || []).entries()) {
        const match = completed.findIndex((stored, storedIndex) => {
          if (exercise.id && stored.id) return exercise.id === stored.id;
          if (exercise.name && stored.name) return exercise.name === stored.name;
          return !exercise.id && !stored.id && !exercise.name && !stored.name && index === storedIndex;
        });
        if (match < 0) completed.push(exercise);
        else completed[match] = mergeExercise(exercise, completed[match]);
      }
      result.completed = completed;
    }
  } else {
    if (isObject(local.analysis) && isObject(remote.analysis)) {
      result.analysis = { ...remote.analysis, ...local.analysis };
    }
    if (local.photoPaths === null || remote.photoPaths === null) {
      // Explicit photo deletion is sticky; omission is only an incomplete replica.
      result.photoPaths = null;
    } else if (isObject(local.photoPaths) && isObject(remote.photoPaths)) {
      result.photoPaths = { ...remote.photoPaths, ...local.photoPaths };
    } else if (!owns(local, "photoPaths") && owns(remote, "photoPaths")) {
      result.photoPaths = remote.photoPaths;
    }
  }
  return result;
}

// Records omitted by a replica remain present. Use explicit mutation paths for removal.
// shortcut: same-field concurrent edits prefer the caller, use revisions if conflict UI is needed.
export function mergeCumulativeHistory(key, local, remote) {
  validateHistory(key, local ?? []);
  validateHistory(key, remote ?? []);
  const result = copy(remote ?? []);
  for (const record of copy(local ?? [])) {
    const index = result.findIndex(stored => sameRecord(key, record, stored));
    if (index < 0) result.push(record);
    else result[index] = mergeRecord(key, record, result[index]);
  }
  return result.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

function readRows(key, rows) {
  if (!Array.isArray(rows) || rows.length > 1) throw new Error("Resposta de histórico inválida.");
  if (rows.length) {
    validateHistory(key, rows[0]?.value);
    if (typeof rows[0].updated_at !== "string" || !Number.isFinite(Date.parse(rows[0].updated_at))) {
      throw new Error("Versão de histórico inválida.");
    }
  }
  return rows[0];
}

const stableJSON = value => JSON.stringify(value, (_key, item) => isObject(item)
  ? Object.fromEntries(Object.keys(item).sort().map(field => [field, item[field]]))
  : item);

function historyConflict() {
  const error = new Error("O histórico mudou em outro dispositivo. Atualize antes de tentar novamente.");
  error.code = "HISTORY_CONFLICT";
  return error;
}

// baseline opts into exact replacement for deliberate removals; never merge or retry them.
export async function saveCumulativeHistory({ request, session, key, value, baseline }) {
  validateHistory(key, value);
  if (baseline !== undefined) validateHistory(key, baseline);
  if (typeof request !== "function" || !session?.access_token) throw new Error("Sessão inválida.");
  const incoming = copy(value);
  const expected = baseline === undefined ? undefined : stableJSON(baseline);
  const userId = session.user?.id;
  if (userId != null && (typeof userId !== "string" || !userId)) throw new Error("Usuário inválido.");
  const filter = `key=eq.${encodeURIComponent(key)}${userId ? `&user_id=eq.${encodeURIComponent(userId)}` : ""}`;
  const path = `/rest/v1/user_data?${filter}`;
  const authorization = { Authorization: `Bearer ${session.access_token}` };
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const current = readRows(key, await request(`${path}&select=value,updated_at`, { headers: authorization }));
    if (expected !== undefined && stableJSON(current?.value ?? []) !== expected) throw historyConflict();
    const merged = expected === undefined ? mergeCumulativeHistory(key, incoming, current?.value) : incoming;
    if (current && JSON.stringify(merged) === JSON.stringify(current.value)) return merged;
    // Always advance the CAS version, including two writes in the same millisecond.
    const updated_at = new Date(Math.max(Date.now(), current ? Date.parse(current.updated_at) + 1 : 0)).toISOString();
    const headers = { ...authorization, Prefer: "return=representation" };
    const writePath = current
      ? `${path}&updated_at=eq.${encodeURIComponent(current.updated_at)}&select=value,updated_at`
      : "/rest/v1/user_data?on_conflict=user_id,key&select=value,updated_at";
    if (!current) headers.Prefer += ",resolution=ignore-duplicates";
    const body = current
      ? { value: merged, updated_at }
      : { ...(userId ? { user_id: userId } : {}), key, value: merged, updated_at };
    const saved = readRows(key, await request(writePath, {
      method: current ? "PATCH" : "POST", headers, body: JSON.stringify(body),
    }));
    if (saved) return copy(saved.value);
    if (expected !== undefined) throw historyConflict();
    // A CAS miss or insert collision is the only retry; request errors propagate.
  }
  throw new Error("O histórico mudou durante a sincronização. Tente novamente.");
}
