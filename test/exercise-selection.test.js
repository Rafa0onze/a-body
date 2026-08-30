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

test("nomes equivalentes reutilizam ilustrações existentes",()=>{
  assert.match(source,/\["abducao quadril maquina", "cadeira abdutora"\]/);
  assert.match(source,/\["roda abdominal", "abdominal rolinho"\]/);
  assert.match(source,/\["supino reto barra", "supino banco reto"\]/);
  assert.match(source,/\["panturrilha pe maquina", "panturrilhas pe"\]/);
  assert.match(source,/\["remada apoiada halter", "remada banco inclinado"\]/);
  assert.match(source,/\["puxada neutra polia", "puxada polia triangulo"\]/);
  assert.match(source,/const catalogado = matchExercicio\(ex\.name, biblioteca\)/);
});
