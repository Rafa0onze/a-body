// Corrige colisões de IDs genéricos (e1, e2...) entre exercícios de dias diferentes.
// Executado antes do React para migrar plano/histórico local e normalizar a sincronização em nuvem.
(() => {
  const PLAN_KEY = "abody:plan";
  const HISTORY_KEY = "abody:history";
  const VERSION_KEY = "abody:exercise_identity_version";
  const VERSION = "2";

  const slug = (value) => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  const stableExerciseId = (exercise) => {
    const byName = slug(exercise?.name);
    return byName ? `exercise:${byName}` : String(exercise?.id || "exercise:unknown");
  };

  const normalizePlan = (plan) => {
    if (!plan || !Array.isArray(plan.weekDays)) return plan;
    return {
      ...plan,
      weekDays: plan.weekDays.map((day) => ({
        ...day,
        exercises: Array.isArray(day.exercises)
          ? day.exercises.map((exercise) => ({ ...exercise, id: stableExerciseId(exercise) }))
          : day.exercises,
      })),
    };
  };

  const normalizeHistory = (history) => {
    if (!Array.isArray(history)) return history;
    return history.map((session) => ({
      ...session,
      completed: Array.isArray(session.completed)
        ? session.completed.map((exercise) => ({ ...exercise, id: stableExerciseId(exercise) }))
        : session.completed,
    }));
  };

  const normalizeValue = (key, value) => {
    if (key === PLAN_KEY) return normalizePlan(value);
    if (key === HISTORY_KEY) return normalizeHistory(value);
    return value;
  };

  const parseStored = (raw) => {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  };

  const migrateLocal = () => {
    try {
      for (const key of [PLAN_KEY, HISTORY_KEY]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const value = parseStored(raw);
        if (value !== null) localStorage.setItem(key, JSON.stringify(normalizeValue(key, value)));
      }
      localStorage.setItem(VERSION_KEY, VERSION);
    } catch {}
  };

  migrateLocal();

  // Normaliza qualquer leitura/gravação local futura, inclusive planos novos gerados pela IA.
  try {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.getItem = function(key) {
      const raw = originalGetItem.call(this, key);
      if ((key !== PLAN_KEY && key !== HISTORY_KEY) || !raw) return raw;
      const value = parseStored(raw);
      return value === null ? raw : JSON.stringify(normalizeValue(key, value));
    };

    Storage.prototype.setItem = function(key, raw) {
      if ((key === PLAN_KEY || key === HISTORY_KEY) && typeof raw === "string") {
        const value = parseStored(raw);
        if (value !== null) raw = JSON.stringify(normalizeValue(key, value));
      }
      return originalSetItem.call(this, key, raw);
    };
  } catch {}

  // Normaliza user_data do Supabase na leitura e na gravação para corrigir também o histórico em nuvem.
  try {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init = {}) => {
      let nextInit = init;
      const url = typeof input === "string" ? input : input?.url || "";

      if (url.includes("/rest/v1/user_data") && typeof init?.body === "string") {
        try {
          const body = JSON.parse(init.body);
          if (body && (body.key === PLAN_KEY || body.key === HISTORY_KEY)) {
            nextInit = {
              ...init,
              body: JSON.stringify({ ...body, value: normalizeValue(body.key, body.value) }),
            };
          }
        } catch {}
      }

      const response = await originalFetch(input, nextInit);
      if (!url.includes("/rest/v1/user_data?") || !response.ok) return response;

      const key = url.includes("key=eq.abody%3Aplan") || url.includes("key=eq.abody:plan")
        ? PLAN_KEY
        : url.includes("key=eq.abody%3Ahistory") || url.includes("key=eq.abody:history")
          ? HISTORY_KEY
          : null;
      if (!key) return response;

      try {
        const data = await response.clone().json();
        if (!Array.isArray(data)) return response;
        const normalized = data.map((row) => row && Object.prototype.hasOwnProperty.call(row, "value")
          ? { ...row, value: normalizeValue(key, row.value) }
          : row);
        return new Response(JSON.stringify(normalized), {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      } catch {
        return response;
      }
    };
  } catch {}
})();
