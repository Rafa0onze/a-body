import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("treino começa pela visão geral antes do aquecimento",()=>{
  assert.match(source,/setScreen\("workoutOverview"\)/);
  assert.ok(source.indexOf('screen==="workoutOverview"') < source.indexOf('screen==="warmup"'));
  assert.match(source,/onBack=\{\(\)=>setScreen\("workoutOverview"\)\}/);
});

test("visão geral informa exercícios, séries e repetições",()=>{
  assert.match(source,/Saiba o que vem pela frente/);
  assert.match(source,/séries totais/);
  assert.match(source,/Séries × repetições/);
  assert.match(source,/ex\.sets.*ex\.reps/);
});

test("visão geral exibe miniatura ou aviso de ilustração pendente",()=>{
  assert.match(source,/function OverviewExerciseMedia/);
  assert.match(source,/Ilustração de \$\{exercise\.name\}/);
  assert.match(source,/em desenvolvimento/);
  assert.match(source,/fetchBiblioteca\(\)/);
});
