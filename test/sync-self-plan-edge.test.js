import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const fn=readFileSync(new URL("../supabase/functions/sync-self-plan/index.ts",import.meta.url),"utf8");

test("app carrega treino próprio por Edge Function autenticada antes do painel PRO",()=>{
  assert.match(app,/functions\/v1\/sync-self-plan/);
  assert.match(app,/upgrade_plan: PRESETS\["upper-focus-5x"\]/);
  assert.match(app,/const \[selfSync, perfilPro\] = await Promise\.all/);
  assert.match(app,/setPlan\(\{ \.\.\.selfSync\.treino\.plano, locked:true \}\)/);
  assert.match(app,/setScreen\("home"\)/);
});

test("sync-self-plan identifica aluno pelo usuário autenticado e pode atualizar legado",()=>{
  assert.match(fn,/auth\.getUser\(token\)/);
  assert.match(fn,/\.eq\("user_id", user\.id\)/);
  assert.match(fn,/legacyNames/);
  assert.match(fn,/presetVersion/);
  assert.match(fn,/\.from\("treinos_alunos"\)\.insert/);
});
