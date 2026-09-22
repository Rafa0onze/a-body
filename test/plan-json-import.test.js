import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("editor profissional permite importar e validar plano JSON antes de publicar",()=>{
  assert.match(source,/Importar plano JSON/);
  assert.match(source,/JSON\.parse\(jsonPlano\)/);
  assert.match(source,/validateProfessionalPlan\(candidato\)/);
  assert.match(source,/setPlano\(candidato\)/);
  assert.match(source,/só é publicado quando você tocar em/);
});
