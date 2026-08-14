import test from "node:test";
import assert from "node:assert/strict";
import { conteudoOpenAI, eGeracaoDeTreino, formatoEstruturado, validarPlano } from "../api/claude.js";

test("detecta somente geração de treino", () => {
  assert.equal(eGeracaoDeTreino("Crie plano de treino"), true);
  assert.equal(eGeracaoDeTreino("A-BODY:ANALISE_CORPORAL"), false);
});

test("converte somente anexos locais em data URLs", () => {
  const itens = conteudoOpenAI([
    { type:"text", text:"ok" },
    { type:"image", source:{ media_type:"image/jpeg", data:"YWJj" } },
    { type:"document", source:{ media_type:"application/pdf", data:"YWJj", filename:"x.pdf" } },
  ]);
  assert.deepEqual(itens.map(x => x.type), ["input_text", "input_image", "input_file"]);
  assert.match(itens[1].image_url, /^data:image\/jpeg;base64,/);
  assert.match(itens[2].file_data, /^data:application\/pdf;base64,/);
});

test("usa Structured Outputs estrito nos planos", () => {
  const formato = formatoEstruturado(true);
  assert.equal(formato.type, "json_schema");
  assert.equal(formato.strict, true);
  assert.equal(formato.schema.additionalProperties, false);
});

test("usa Structured Outputs estrito na análise corporal", () => {
  const formato = formatoEstruturado(false, "A-BODY:ANALISE_CORPORAL");
  assert.equal(formato.name, "abody_body_analysis");
  assert.equal(formato.schema.properties.notasPorGrupo.additionalProperties, false);
});

test("validador rejeita pernas consecutivas e falta de core", () => {
  const plano = { weekDays:[
    {label:"Pernas",exercises:[{name:"Agachamento",sets:3,rest:60}],postCardio:{minMinutes:10,maxMinutes:15}},
    {label:"Glúteos",exercises:[{name:"Hip thrust",sets:3,rest:60}],postCardio:{minMinutes:10,maxMinutes:15}}
  ]};
  const erros = validarPlano(JSON.stringify(plano), "Duração: 45 min");
  assert.ok(erros.some(e => e.includes("inferiores consecutivos")));
  assert.ok(erros.some(e => e.includes("core")));
});
