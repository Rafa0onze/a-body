import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const presets=readFileSync(new URL("../src/presets.js",import.meta.url),"utf8");

test("link autenticado aplica preset e remove parâmetro da URL",()=>{
  assert.match(app,/applyPreset/);
  assert.match(app,/aplicarPresetDaURL/);
  assert.match(app,/find\(a => a\.user_id === userId\)/);
  assert.match(app,/salvarTreinoAluno\(alvo\.id, plano/);
  assert.match(app,/searchParams\.delete\("applyPreset"\)/);
});

test("preset 5x contém cinco dias",()=>{
  assert.match(presets,/"upper-focus-5x"/);
  assert.match(presets,/planName:"Hipertrofia 5x — foco tronco"/);
  const dias=(presets.match(/day\("d[1-5]"/g)||[]).length;
  assert.equal(dias,5);
});
