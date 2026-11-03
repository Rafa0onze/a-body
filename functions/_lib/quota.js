// Cota diária de uso da IA no D1 (substitui as RPCs reserve/confirm/cancel do Supabase).
export function makeQuota(db) {
  const dia = () => new Date().toISOString().slice(0, 10);
  return {
    async reserve_ia_quota({ limite }) {
      const id = crypto.randomUUID(), agora = new Date().toISOString();
      const validade = new Date(Date.now() - 15 * 60_000).toISOString();
      const r = await db.prepare(
        `INSERT INTO ia_quota (id, day, state, created)
         SELECT ?1, ?2, 'reserved', ?3
         WHERE (SELECT COUNT(*) FROM ia_quota WHERE day = ?2 AND (state = 'confirmed' OR created > ?4)) < ?5`
      ).bind(id, dia(), agora, validade, Number(limite)).run();
      return r.meta.changes > 0 ? id : null;
    },
    async confirm_ia_quota({ reserva_id }) {
      const r = await db.prepare(`UPDATE ia_quota SET state = 'confirmed' WHERE id = ? AND state = 'reserved'`).bind(reserva_id).run();
      return r.meta.changes > 0;
    },
    async cancel_ia_quota({ reserva_id }) {
      await db.prepare(`DELETE FROM ia_quota WHERE id = ? AND state = 'reserved'`).bind(reserva_id).run();
      return true;
    },
  };
}
