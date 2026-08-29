import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("dashboard organiza histórico por grupo muscular",()=>{
  assert.match(source,/AB_GRUPOS_PROGRESSO/);
  assert.match(source,/grupoMuscularPrincipal/);
  assert.match(source,/Grupo muscular/);
});

test("exercícios são ordenados alfabeticamente antes do gráfico",()=>{
  assert.match(source,/localeCompare\(b,"pt-BR"\)/);
  assert.match(source,/Em ordem alfabética/);
  assert.ok(source.indexOf("ab-exercise-index") < source.indexOf("ab-chart-card"));
});
