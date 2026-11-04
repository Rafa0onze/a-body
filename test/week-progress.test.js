import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("progresso semanal mostra concluídos sobre o total do plano",()=>{
  assert.match(app,/\{weekCount\}\/\{plan\.weekDays\.length\} na semana/);
  assert.doesNotMatch(app,/weekCount\*25/);
});
