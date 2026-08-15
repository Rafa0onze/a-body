export const SCIENCE_VERSION = "ABODY-ACSM-2026.1";

export const EVIDENCE_REGISTRY = Object.freeze([
  { id:"ACSM-2026", reference:"DOI 10.1249/MSS.0000000000003897", year:2026, topic:"prescrição geral", confidence:"alta" },
  { id:"CURRIER-2023", reference:"PMID 37414459", year:2023, topic:"carga, séries e frequência", confidence:"alta" },
  { id:"ROBINSON-2024", reference:"DOI 10.1007/s40279-024-02069-2", year:2024, topic:"repetições em reserva", confidence:"moderada" },
  { id:"REMMERT-2025", reference:"PMID 41343037", year:2025, topic:"volume e frequência", confidence:"moderada" },
]);

const NONE = /(?:nenhuma?|n\/a|não informado|n\/i)/i;
const MEDICAL_RED_FLAGS = /(?:dor no peito|desmaio|síncope|arritmia|cardiopatia|infarto|pressão descontrolada|hipertensão não controlada|gestação|cirurgia recente|fratura recente|trombose)/i;

export function scientificProfile(text="") {
  const objective = /força/i.test(text) ? "forca" : /massa|hipertrof/i.test(text) ? "hipertrofia" : /condicion/i.test(text) ? "condicionamento" : /gordura|emagrec/i.test(text) ? "composicao" : "saude";
  const level = /avançad/i.test(text) ? "avancado" : /intermedi/i.test(text) ? "intermediario" : "iniciante";
  const age = Number(text.match(/Idade:\s*(\d+)/i)?.[1] || 0);
  const medicalText = text.match(/Condições médicas:\s*([^\n]+)/i)?.[1] || "";
  const injuryText = text.match(/Lesões(?:\/Limitações| e limitações)?:\s*([^\n]+)/i)?.[1] || "";
  const requiresMedicalClearance = MEDICAL_RED_FLAGS.test(`${medicalText} ${injuryText}`);
  const hasLimitations = (!NONE.test(medicalText) && medicalText.trim().length > 2) || (!NONE.test(injuryText) && injuryText.trim().length > 2);
  const volume = level === "iniciante" ? [6,10] : level === "intermediario" ? [8,14] : [10,18];
  const rir = objective === "hipertrofia" ? [1,3] : objective === "forca" ? [2,4] : [2,4];
  return { objective, level, age, volume, rir, hasLimitations, requiresMedicalClearance };
}

export function scientificContext(text="") {
  const p = scientificProfile(text);
  return `\n\nPROTOCOLO CIENTÍFICO VERSIONADO ${SCIENCE_VERSION}:
- Evidências: ${EVIDENCE_REGISTRY.map(e=>`${e.id} ${e.reference}`).join("; ")}.
- Prescreva inicialmente ${p.volume[0]}–${p.volume[1]} séries diretas semanais por grupo prioritário; conte sobreposições e evite saltos bruscos.
- Distribua cada grupo prioritário em pelo menos 2 sessões/semana quando a agenda permitir.
- Defina rir entre ${p.rir[0]} e ${p.rir[1]} em todo exercício. RIR 0 não é obrigatório e deve ser excepcional.
- Use amplitude completa tolerada, técnica estável e exercícios prioritários no início.
- Cada exercício deve incluir progressionRule curta: aumentar carga somente após completar todas as séries no topo da faixa mantendo o RIR-alvo; reduzir quando houver falha repetida ou piora relevante.
- A raiz deve informar evidenceVersion="${SCIENCE_VERSION}", progressionStrategy e safetyNotes.
- requiresMedicalClearance deve ser ${p.requiresMedicalClearance}. ${p.hasLimitations ? "Adapte movimentos e registre a limitação em safetyNotes." : "Não invente restrições clínicas."}
- O plano é prescrição de exercício, não diagnóstico médico.`;
}

export function validateScientificMetadata(plan, requestText="") {
  const errors = [];
  const profile = scientificProfile(requestText);
  if (plan?.evidenceVersion !== SCIENCE_VERSION) errors.push(`evidenceVersion deve ser ${SCIENCE_VERSION}`);
  if (!plan?.progressionStrategy || String(plan.progressionStrategy).length < 12) errors.push("progressionStrategy ausente ou genérica");
  if (!Array.isArray(plan?.safetyNotes)) errors.push("safetyNotes deve ser uma lista");
  if (!!plan?.requiresMedicalClearance !== profile.requiresMedicalClearance) errors.push("requiresMedicalClearance incompatível com a triagem");
  for (const [dayIndex, day] of (plan?.weekDays || []).entries()) {
    for (const [exerciseIndex, exercise] of (day?.exercises || []).entries()) {
      if (!Number.isInteger(exercise.rir) || exercise.rir < 0 || exercise.rir > 5) errors.push(`dia ${dayIndex+1}, exercício ${exerciseIndex+1}: RIR inválido`);
      if (!exercise.progressionRule || String(exercise.progressionRule).length < 10) errors.push(`dia ${dayIndex+1}, exercício ${exerciseIndex+1}: progressão ausente`);
    }
  }
  return errors;
}
