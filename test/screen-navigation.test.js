import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("mudança de tela reposiciona a página no topo",()=>{
  assert.match(source,/window\.scrollTo\(\{top:0,left:0,behavior:"auto"\}\)/);
  assert.match(source,/document\.documentElement\.scrollTop = 0/);
  assert.match(source,/\},\[screen\]\)/);
});

test("telas não forçam foco em campos de formulário",()=>{
  assert.doesNotMatch(source,/autoFocus/);
  assert.match(source,/active\.blur\(\)/);
});
