import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx", import.meta.url),"utf8");
const fn=readFileSync(new URL("../supabase/functions/publish-personal-plan/index.ts", import.meta.url),"utf8");

test("editor usa publicador autenticado antes dos fallbacks",()=>{
  assert.match(app,/functions\/v1\/publish-personal-plan/);
  assert.match(app,/Authorization:`Bearer \$\{s\.access_token\}`/);
  assert.match(app,/via:"edge_function"/);
});

test("edge function exige JWT e limita publicação aos alunos do personal autenticado",()=>{
  assert.match(fn,/missing_authorization/);
  assert.match(fn,/auth\.getUser\(token\)/);
  assert.match(fn,/\.eq\("personal_id", user\.id\)/);
  assert.match(fn,/\.from\("treinos_alunos"\)/);
});
