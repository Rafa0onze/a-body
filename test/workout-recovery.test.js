import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../src/app.css",import.meta.url),"utf8");

test("sessão em andamento salva todos os registros essenciais",()=>{
  assert.match(source,/WORKOUT_DRAFT_KEY/);
  for (const field of ["currentDay","queue","completed","setIdx","currentWeights","currentReps","currentRirs","weightInput","repsInput","rirInput","seriesElapsed","restSec"]) {
    assert.match(source,new RegExp(`localStorage\\.setItem\\(WORKOUT_DRAFT_KEY[\\s\\S]*${field}`));
  }
});

test("sessão é restaurada após recarregar e cronômetros voltam pausados",()=>{
  assert.match(source,/restoreWorkoutDraft/);
  assert.match(source,/setSeriesRunning\(false\)/);
  assert.match(source,/setIsoRunning\(false\)/);
  assert.match(source,/treino_em_andamento_restaurado/);
});

test("aplicativo bloqueia pull-to-refresh acidental",()=>{
  assert.match(css,/html,body,#root \{ overscroll-behavior-y:none; \}/);
});

test("rascunho é removido ao concluir ou sair do treino",()=>{
  assert.ok((source.match(/clearWorkoutDraft\(\)/g)||[]).length>=4);
});
