import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("histórico local mais rico vence cópia cloud empobrecida",()=>{
  assert.match(app,/function storageRichness/);
  assert.match(app,/key === "abody:history"/);
  assert.match(app,/localScore > cloudScore/);
  assert.match(app,/await cloudSave\(key, chosen\)/);
});

test("avaliação corporal e histórico carregam antes de retornos antecipados",()=>{
  assert.match(app,/loadStorage\("abody:history"\)/);
  assert.match(app,/loadStorage\("abody:bodyhistory"\)/);
  assert.match(app,/setHistory\(histRecuperado\)/);
  assert.match(app,/setBodyHistory\(corpoRecuperado\)/);
});

test("saveStorage não substitui histórico cumulativo por versão menos rica",()=>{
  assert.match(app,/storageRichness\(key, cloud\) > storageRichness\(key, v\)/);
});
