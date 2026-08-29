export function isUnilateralExercise(exercise) {
  if (!exercise) return false;
  if (typeof exercise.unilateral === "boolean") return exercise.unilateral;
  const name=String(exercise.name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  return /unilateral|prancha lateral|afundo|passada|bulgar|step.?up|coice|kickback|uma perna|uma mao|um braco/.test(name);
}

export function shouldAutoStartSeries(setIndex) {
  return Number.isInteger(setIndex) && setIndex > 0;
}
