import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const cancel = app.match(/const cancelWorkout=\(\)=>\{[^\n]*\};/)?.[0] || "";
const comp = app.slice(app.indexOf("export function CancelWorkout("), app.indexOf("function ModalShell("));

test("cancelar treino descarta rascunho, cronômetros e push sem gravar histórico", () => {
  assert.ok(cancel, "cancelWorkout existe");
  for (const t of ["clearWorkoutDraft()", "cancelarPushDescanso()", "clearInterval(restRef.current)", 'setScreen("home")'])
    assert.ok(cancel.includes(t), t);
  assert.doesNotMatch(cancel, /saveStorage|abody:history/);
});

test("cancelar está disponível em toda tela ativa do treino e na home com treino pausado", () => {
  assert.match(app, /ACTIVE_WORKOUT_SCREENS\.has\(screen\) && currentDay && <CancelWorkout/);
  assert.match(app, /onDiscardWorkout=\{readWorkoutDraft\(\)\?/);
});

test("cancelamento exige duas confirmações e a final só arma após uma pausa", () => {
  assert.match(comp, /setStep\(1\)/);
  assert.match(comp, /setStep\(2\)/);
  assert.match(comp, /setTimeout\(\(\) => setArmed\(true\), 1200\)/);
  assert.match(comp, /disabled=\{!armed\}/);
  assert.match(comp, /onConfirm\(\)/);
  assert.equal((comp.match(/onConfirm\(\)/g) || []).length, 1, "só o botão final confirma");
});
