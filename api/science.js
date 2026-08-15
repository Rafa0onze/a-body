export const SCIENCE_VERSIONS = Object.freeze({
  resistance: "ABODY-ACSM-2026.1",
  weight: "ABODY-WEIGHT-2026.1",
  health: "ABODY-HEALTH-2026.1",
  cardio: "ABODY-CARDIO-2026.1",
});

export const SCIENCE_VERSION = SCIENCE_VERSIONS.resistance;

export const EVIDENCE_REGISTRY = Object.freeze([
  { id:"ACSM-2026", reference:"DOI 10.1249/MSS.0000000000003897", year:2026, topics:["forca","hipertrofia"], confidence:"alta" },
  { id:"CURRIER-2023", reference:"PMID 37414459", year:2023, topics:["forca","hipertrofia"], confidence:"alta" },
  { id:"ROBINSON-2024", reference:"DOI 10.1007/s40279-024-02069-2", year:2024, topics:["forca","hipertrofia"], confidence:"moderada" },
  { id:"REMMERT-2025", reference:"PMID 41343037", year:2025, topics:["forca","hipertrofia"], confidence:"moderada" },
  { id:"WHO-2020", reference:"ISBN 978-92-4-001512-8", year:2020, topics:["saude","condicionamento","composicao"], confidence:"alta" },
  { id:"ACSM-2011", reference:"PMID 21694556", year:2011, topics:["saude","condicionamento"], confidence:"alta" },
  { id:"JAMA-2024", reference:"PMID 39724371", year:2024, topics:["composicao"], confidence:"alta" },
  { id:"SRO-2025", reference:"PMID 40405489", year:2025, topics:["composicao"], confidence:"alta" },
]);

const NONE = /(?:nenhuma?|n\/a|não informado|n\/i)/i;
const MEDICAL_RED_FLAGS = /(?:dor no peito|desmaio|síncope|arritmia|cardiopatia|infarto|pressão descontrolada|hipertensão não controlada|gestação|cirurgia recente|fratura recente|trombose)/i;

function objectiveFrom(text) {
  if (/gordura|emagrec|perder peso|composição corporal/i.test(text)) return "composicao";
  if (/condicion|resistência cardiovascular|cardiorrespirat/i.test(text)) return "condicionamento";
  if (/qualidade de vida|bem-estar|saúde/i.test(text)) return "saude";
  if (/força/i.test(text)) return "forca";
  if (/massa|hipertrof/i.test(text)) return "hipertrofia";
  return "saude";
}

function protocolFor(objective) {
  if (objective === "composicao") return { version:SCIENCE_VERSIONS.weight, aerobic:[150,300], strengthDays:2, flexibilityDays:2, intensity:"RPE 4–6/10 ou teste da fala; intervalos somente após adaptação" };
  if (objective === "condicionamento") return { version:SCIENCE_VERSIONS.cardio, aerobic:[150,300], strengthDays:2, flexibilityDays:2, intensity:"RPE 4–6/10 na base; sessões vigorosas em RPE 7–8/10 quando apropriado" };
  if (objective === "saude") return { version:SCIENCE_VERSIONS.health, aerobic:[150,300], strengthDays:2, flexibilityDays:2, intensity:"Moderada pelo teste da fala ou RPE 4–6/10" };
  return { version:SCIENCE_VERSIONS.resistance, aerobic:[75,150], strengthDays:2, flexibilityDays:2, intensity:"Leve a moderada, RPE 3–6/10" };
}

export function scientificProfile(text="") {
  const objective = objectiveFrom(text);
  const level = /avançad/i.test(text) ? "avancado" : /intermedi/i.test(text) ? "intermediario" : "iniciante";
  const age = Number(text.match(/Idade:\s*(\d+)/i)?.[1] || 0);
  const medicalText = text.match(/Condições médicas:\s*([^\n]+)/i)?.[1] || "";
  const injuryText = text.match(/Lesões(?:\/Limitações| e limitações)?:\s*([^\n]+)/i)?.[1] || "";
  const requiresMedicalClearance = MEDICAL_RED_FLAGS.test(`${medicalText} ${injuryText}`);
  const hasLimitations = (!NONE.test(medicalText) && medicalText.trim().length > 2) || (!NONE.test(injuryText) && injuryText.trim().length > 2);
  const volume = level === "iniciante" ? [6,10] : level === "intermediario" ? [8,14] : [10,18];
  const rir = objective === "hipertrofia" ? [1,3] : [2,4];
  return { objective, level, age, volume, rir, hasLimitations, requiresMedicalClearance, ...protocolFor(objective) };
}

export function evidenceForObjective(objective) {
  const topics = objective === "composicao" ? ["composicao"] : objective === "condicionamento" ? ["condicionamento"] : objective === "saude" ? ["saude"] : ["forca","hipertrofia"];
  return EVIDENCE_REGISTRY.filter(item => item.topics.some(topic => topics.includes(topic)));
}

export function scientificContext(text="") {
  const p = scientificProfile(text);
  const evidence = evidenceForObjective(p.objective);
  const rules = p.objective === "composicao"
    ? "Combine treino resistido e aeróbico; preserve massa magra; não prometa perda de peso nem prescreva dieta. Explique que o resultado também depende do balanço energético e adesão."
    : p.objective === "condicionamento"
      ? "Construa base aeróbica antes de intervalos vigorosos e progrida primeiro duração/frequência, depois intensidade."
      : p.objective === "saude"
        ? "Inclua capacidade cardiorrespiratória, força, mobilidade/flexibilidade e, quando pertinente, equilíbrio/coordenação; reduza tempo sedentário."
        : "Priorize o treinamento resistido; o aeróbico complementa saúde e condicionamento sem comprometer a recuperação.";
  return `\n\nPROTOCOLO CIENTÍFICO VERSIONADO ${p.version}:
- Objetivo principal detectado: ${p.objective}. Evidências: ${evidence.map(e=>`${e.id} ${e.reference}`).join("; ")}.
- ${rules}
- Meta semanal: ${p.aerobic[0]}–${p.aerobic[1]} min aeróbicos, ao menos ${p.strengthDays} dias de força e ${p.flexibilityDays} dias de mobilidade/flexibilidade. O treino gerado pode representar apenas parte da meta; registre atividades adicionais em weeklyPrescription.notes.
- Intensidade aeróbica: ${p.intensity}. Prescreva por RPE/teste da fala; frequência cardíaca é complementar e depende de dados confiáveis.
- Preencha weeklyPrescription com aerobicMinutesTarget=${p.aerobic[0]}, aerobicMinutesUpper=${p.aerobic[1]}, strengthDaysTarget=${p.strengthDays}, flexibilityDaysTarget=${p.flexibilityDays}, intensityMethod e sedentaryGuidance.
- Prescreva inicialmente ${p.volume[0]}–${p.volume[1]} séries diretas semanais por grupo prioritário; conte sobreposições e evite saltos bruscos.
- Distribua cada grupo prioritário em pelo menos 2 sessões/semana quando a agenda permitir.
- Defina rir entre ${p.rir[0]} e ${p.rir[1]} em todo exercício. RIR 0 não é obrigatório e deve ser excepcional.
- Use amplitude completa tolerada, técnica estável e exercícios prioritários no início.
- Cada exercício deve incluir progressionRule curta: aumentar carga somente após completar todas as séries no topo da faixa mantendo o RIR-alvo; reduzir quando houver falha repetida ou piora relevante.
- A raiz deve informar evidenceVersion="${p.version}", progressionStrategy, safetyNotes e weeklyPrescription.
- requiresMedicalClearance deve ser ${p.requiresMedicalClearance}. ${p.hasLimitations ? "Adapte movimentos e registre a limitação em safetyNotes." : "Não invente restrições clínicas."}
- O plano é prescrição de exercício, não diagnóstico médico.`;
}

export function validateScientificMetadata(plan, requestText="") {
  const errors = [];
  const profile = scientificProfile(requestText);
  if (plan?.evidenceVersion !== profile.version) errors.push(`evidenceVersion deve ser ${profile.version}`);
  if (!plan?.progressionStrategy || String(plan.progressionStrategy).length < 12) errors.push("progressionStrategy ausente ou genérica");
  if (!Array.isArray(plan?.safetyNotes)) errors.push("safetyNotes deve ser uma lista");
  if (!!plan?.requiresMedicalClearance !== profile.requiresMedicalClearance) errors.push("requiresMedicalClearance incompatível com a triagem");
  const weekly = plan?.weeklyPrescription;
  if (!weekly) errors.push("weeklyPrescription ausente");
  else {
    if (weekly.aerobicMinutesTarget !== profile.aerobic[0] || weekly.aerobicMinutesUpper !== profile.aerobic[1]) errors.push("meta aeróbica incompatível com o protocolo");
    if (weekly.strengthDaysTarget < profile.strengthDays) errors.push("frequência de força abaixo do protocolo");
    if (!weekly.intensityMethod || String(weekly.intensityMethod).length < 8) errors.push("método de intensidade aeróbica ausente");
  }
  for (const [dayIndex, day] of (plan?.weekDays || []).entries()) {
    for (const [exerciseIndex, exercise] of (day?.exercises || []).entries()) {
      if (!Number.isInteger(exercise.rir) || exercise.rir < 0 || exercise.rir > 5) errors.push(`dia ${dayIndex+1}, exercício ${exerciseIndex+1}: RIR inválido`);
      if (!exercise.progressionRule || String(exercise.progressionRule).length < 10) errors.push(`dia ${dayIndex+1}, exercício ${exerciseIndex+1}: progressão ausente`);
    }
  }
  return errors;
}
