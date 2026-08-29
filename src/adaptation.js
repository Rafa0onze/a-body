const numeric = values => values.filter(Number.isFinite);

export function adaptiveInsight(history=[]) {
  const sessions = history.filter(session => !session.manual && Array.isArray(session.completed));
  const latest = sessions[sessions.length-1];
  if (!latest) return null;
  if (latest.feedback?.pain) return { tone:"warning", action:"review", title:"Revisão necessária", message:"Dor foi registrada. Não aumente carga e revise o exercício antes da próxima sessão." };
  const exercises = latest.completed;
  const skipped = exercises.filter(exercise => exercise.skipped).length;
  if (exercises.length && skipped / exercises.length >= .25) return { tone:"attention", action:"reduce_volume", title:"Ajustar volume", message:"Parte relevante do treino foi reagendada. Considere reduzir exercícios ou séries na próxima revisão." };
  const rirs = numeric(exercises.flatMap(exercise => exercise.rirs || []));
  const averageRir = rirs.length ? rirs.reduce((sum,value)=>sum+value,0)/rirs.length : null;
  if (averageRir !== null && averageRir < 1) return { tone:"attention", action:"reduce_load", title:"Esforço acima do alvo", message:"O RIR médio ficou abaixo de 1. Consolide a técnica ou reduza levemente a carga." };
  if (averageRir !== null && averageRir > 4) return { tone:"positive", action:"progress", title:"Pronto para progredir", message:"A sessão terminou com ampla reserva. Aumente repetições ou carga de forma gradual." };
  if (latest.feedback?.recovery === "poor") return { tone:"attention", action:"hold", title:"Priorize recuperação", message:"Mantenha as cargas e reavalie sono, estresse e intervalo entre sessões." };
  return averageRir === null ? null : { tone:"neutral", action:"maintain", title:"Estímulo adequado", message:"O esforço ficou dentro da faixa planejada. Mantenha a progressão atual." };
}
