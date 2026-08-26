import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("IA não restringe exercícios à biblioteca visual",()=>{
  assert.equal(source.includes("use APENAS estes"),false);
  assert.equal(source.includes("proibido inventar variações"),false);
  assert.match(source,/NÃO considere existência de ilustração, presença em biblioteca interna ou disponibilidade de mídia/);
  assert.match(source,/nem mesmo como critério de desempate/);
});

test("planos catalogam e exibem ilustrações pendentes",()=>{
  assert.equal((source.match(/catalogarIlustracoesPendentes\(plano/g)||[]).length,2);
  assert.match(source,/sugestoes_exercicios/);
  assert.match(source,/Ilustrações a providenciar/);
  assert.match(source,/mediaStatus:possuiIlustracao\?"available":"missing"/);
});

test("exercício sem mídia usa aviso padrão, não uma pose genérica",()=>{
  assert.match(source,/Ilustração de movimento/);
  assert.match(source,/Em desenvolvimento/);
  assert.doesNotMatch(source,/Figure pose=\{exercise\.pose\} phase="start"/);
});
