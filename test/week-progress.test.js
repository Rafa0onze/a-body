import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("barra semanal usa proporção concluídos sobre total do plano",()=>{
  assert.match(app,/weekCount \/ plan\.weekDays\.length/);
  assert.doesNotMatch(app,/weekCount\*25/);
});
