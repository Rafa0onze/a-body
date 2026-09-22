import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("personal pode abrir o próprio treino",()=>{
  assert.match(app,/function ProHomeScreen\(\{ pro, onPerfil, onAgenda, onAlunos, onMeuTreino, onLogout \}\)/);
  assert.match(app,/Meu treino/);
  assert.match(app,/abrirMeuTreinoPro/);
  assert.match(app,/find\(a => a\.user_id === uid\)/);
  assert.match(app,/setPlan\(\{ \.\.\.treino\.plano, locked:true \}\)/);
});

test("preset aplicado abre diretamente a home de treino",()=>{
  assert.match(app,/setPlan\(\{ \.\.\.aplicado\.plano, locked:true \}\);\s*setScreen\("home"\)/);
  assert.match(app,/Painel PRO/);
});
