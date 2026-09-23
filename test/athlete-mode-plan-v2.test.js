import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const presets=readFileSync(new URL("../src/presets.js",import.meta.url),"utf8");

test("modo atleta explícito contorna o painel PRO",()=>{
  assert.match(app,/wantsAthleteView/);
  assert.match(app,/new URLSearchParams\(window\.location\.search\)\.get\("view"\) === "workout"/);
  assert.match(app,/const atleta = await fetchVinculoAluno\(\)/);
  assert.match(app,/setPlan\(\{ \.\.\.atleta\.treino\.plano, locked:true \}\)/);
});

test("Meu treino usa vínculo do próprio usuário",()=>{
  assert.match(app,/const v = await fetchVinculoAluno\(\)/);
  assert.match(app,/searchParams\.set\("view","workout"\)/);
});

test("preset revisado cobre core três vezes e trapézio direto",()=>{
  assert.match(presets,/Hipertrofia 5x — Tronco \+ Core/);
  assert.match(presets,/Crunch na polia/);
  assert.match(presets,/Pallof Press/);
  assert.match(presets,/Prancha/);
  assert.match(presets,/Elevação de joelhos em suspensão/);
  assert.match(presets,/Abdominal reverso/);
  assert.match(presets,/Encolhimento com Halteres/);
});
