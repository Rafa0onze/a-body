export function validateProfessionalPlan(plan) {
  const errors=[];
  if (!String(plan?.planName||"").trim()) errors.push("Informe o nome do plano.");
  const days=plan?.weekDays||[];
  if (!days.length) errors.push("Adicione ao menos um dia de treino.");
  days.forEach((day,di)=>{
    if (!(day.exercises||[]).length) errors.push(`O dia ${day.label||di+1} precisa de ao menos um exercício.`);
    (day.exercises||[]).forEach((ex,ei)=>{
      const ref=`${day.label||di+1}, exercício ${ei+1}`;
      if (!String(ex.name||"").trim()) errors.push(`Informe o exercício em ${ref}.`);
      if (!Number.isInteger(Number(ex.sets))||Number(ex.sets)<1||Number(ex.sets)>10) errors.push(`Séries inválidas em ${ref}.`);
      if (!String(ex.reps||"").trim()) errors.push(`Repetições inválidas em ${ref}.`);
      if (!Number.isFinite(Number(ex.rest))||Number(ex.rest)<15||Number(ex.rest)>300) errors.push(`Descanso inválido em ${ref}.`);
      if (!Number.isInteger(Number(ex.rir))||Number(ex.rir)<0||Number(ex.rir)>5) errors.push(`RIR inválido em ${ref}.`);
    });
  });
  return errors;
}

export function schedulesOverlap(candidate, rows=[]) {
  const start=String(candidate.hora||"").slice(0,5); if(!start)return false;
  const toMin=v=>{const [h,m]=String(v).slice(0,5).split(":").map(Number);return h*60+m;};
  const a0=toMin(start),a1=a0+Number(candidate.duracao_min||60);
  return rows.some(row=>row.id!==candidate.id && ((candidate.data&&row.data===candidate.data)||(!candidate.data&&!row.data&&row.dia_semana===candidate.dia_semana)) && a0<toMin(row.hora)+Number(row.duracao_min||60) && a1>toMin(row.hora));
}
