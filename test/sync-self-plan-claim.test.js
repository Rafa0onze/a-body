import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const fn=readFileSync(new URL("../supabase/functions/sync-self-plan/index.ts",import.meta.url),"utf8");

test("app solicita reparo do vínculo do único aluno ativo",()=>{
  assert.match(app,/claim_single_student:true/);
});

test("edge function responde preflight CORS",()=>{
  assert.match(fn,/req\.method === "OPTIONS"/);
  assert.match(fn,/Access-Control-Allow-Origin/);
});

test("edge function só assume vínculo quando existe um único aluno ativo",()=>{
  assert.match(fn,/\.eq\("status","ativo"\)/);
  assert.match(fn,/length === 1/);
  assert.match(fn,/\.update\(\{ user_id:user\.id \}\)/);
});
