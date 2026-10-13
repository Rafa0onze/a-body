export const PLAN_DRAFT_KEY = 'abody:plan-draft';
export function isCompletePlan(plan) {
  return !!plan && typeof plan.planName==='string' && plan.planName.trim().length>0 && Array.isArray(plan.weekDays) && plan.weekDays.length>0 && plan.weekDays.length<=7 && plan.weekDays.every(day=>day.id && Array.isArray(day.exercises) && day.exercises.length>0 && day.exercises.every(ex=>ex.id && typeof ex.name==='string' && ex.name.trim() && Number.isInteger(Number(ex.sets)) && Number(ex.sets)>0 && String(ex.reps||'').trim()));
}
export function readPlanDraft(storage) {
  try {const draft=JSON.parse(storage.getItem(PLAN_DRAFT_KEY));return draft?.version===1 && draft.form && typeof draft.form==='object' ? draft : null;}catch{return null;}
}
export function writePlanDraft(storage,draft) {
  // Photos and authentication tokens never belong in a creation draft.
  storage.setItem(PLAN_DRAFT_KEY,JSON.stringify({version:1,form:{...draft.form,photoConsent:false,photoStoreConsent:false},step:draft.step,selectedSplit:draft.selectedSplit,dayExercises:draft.dayExercises,manualUserName:draft.manualUserName,candidatePlan:draft.candidatePlan}));
}
export function validProfile(form) {
  const n=v=>{const text=String(v).trim().replace(',','.');return /^\d+(\.\d+)?$/.test(text)?Number(text):NaN;};
  return !!form.name?.trim() && Number.isInteger(n(form.age)) && n(form.age)>=18 && n(form.age)<=120 && n(form.height)>=100 && n(form.height)<=250 && n(form.weight)>=20 && n(form.weight)<=400;
}
