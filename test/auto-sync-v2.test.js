import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const presets=readFileSync(new URL("../src/presets.js",import.meta.url),"utf8");

test("preset revisado possui versão estável",()=>{
  assert.match(presets,/presetVersion:"2026-09-23-v2"/);
});

test("conta PRO sincroniza automaticamente apenas planos legados",()=>{
  assert.match(app,/sincronizarTreinoProprioLegado/);
  assert.match(app,/Hipertrofia & Definição 5x/);
  assert.match(app,/Hipertrofia 5x — foco tronco/);
  assert.match(app,/atual\.presetVersion === proximo\.presetVersion/);
  assert.match(app,/salvarTreinoAluno\(v\.aluno\.id, proximo/);
  assert.match(app,/preset_auto_sincronizado/);
});
