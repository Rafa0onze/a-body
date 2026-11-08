// Cria as tabelas do D1 na primeira requisição (idempotente).
const prontos = new WeakSet();

export async function ensureSchema(db) {
  if (prontos.has(db)) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, key))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS exercicios (numero INTEGER PRIMARY KEY, data TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ia_quota (
      id TEXT PRIMARY KEY, day TEXT NOT NULL, state TEXT NOT NULL, created TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS aparelhos (hash TEXT PRIMARY KEY, criado TEXT NOT NULL)`),
  ]);
  prontos.add(db);
}
