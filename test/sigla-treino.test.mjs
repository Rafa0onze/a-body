import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const bloco = src.match(/export const siglaTreino = [\s\S]*?\n\};/)[0].replace("export const", "const");
const siglaTreino = new Function(`${bloco}; return siglaTreino;`)();

test("glifo do treino é sempre curto e distingue nomes longos", () => {
  assert.equal(siglaTreino("A"), "A");
  assert.equal(siglaTreino("b"), "B");
  assert.equal(siglaTreino("Inferiores A"), "IA");
  assert.equal(siglaTreino("Superiores A"), "SA");
  assert.equal(siglaTreino("Superiores B"), "SB");
  assert.equal(siglaTreino("Full Body"), "FB");
  assert.equal(siglaTreino("Push"), "P");
  assert.equal(siglaTreino(""), "");
});
