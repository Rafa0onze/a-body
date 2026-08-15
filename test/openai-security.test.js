import test from "node:test";
import assert from "node:assert/strict";
import { conteudoOpenAI, eGeracaoDeTreino, formatoEstruturado, validarPlano } from "../api/claude.js";
import { SCIENCE_VERSION, scientificContext, scientificProfile, validateScientificMetadata } from "../api/science.js";
import { adaptiveInsight } from "../src/adaptation.js";

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
  const plano = { evidenceVersion:SCIENCE_VERSION, progressionStrategy:"Dupla progressão por desempenho", safetyNotes:[], requiresMedicalClearance:false, weekDays:[
    {label:"Pernas",exercises:[{name:"Agachamento",sets:3,rest:60,rir:3,progressionRule:"Aumentar após atingir topo da faixa"}],postCardio:{minMinutes:10,maxMinutes:15}},
    {label:"Glúteos",exercises:[{name:"Hip thrust",sets:3,rest:60,rir:3,progressionRule:"Aumentar após atingir topo da faixa"}],postCardio:{minMinutes:10,maxMinutes:15}}
  ]};
  const erros = validarPlano(JSON.stringify(plano), "Duração: 45 min");
  assert.ok(erros.some(e => e.includes("inferiores consecutivos")));
  assert.ok(erros.some(e => e.includes("core")));
});

test("protocolo científico diferencia objetivo, nível e triagem", () => {
  const perfil = scientificProfile("Idade: 42a\nObjetivos: Ganho de massa\nNível: Intermediário\nCondições médicas: Nenhuma\nLesões/Limitações: Nenhuma");
  assert.equal(perfil.objective, "hipertrofia");
  assert.equal(perfil.level, "intermediario");
  assert.deepEqual(perfil.rir, [1,3]);
  assert.equal(perfil.requiresMedicalClearance, false);
  assert.match(scientificContext("Objetivos: Ganho de massa"), new RegExp(SCIENCE_VERSION));
});

test("triagem bloqueia plano com sinal médico relevante", () => {
  const pedido = "Condições médicas: arritmia\nLesões/Limitações: Nenhuma";
  const plano = { evidenceVersion:SCIENCE_VERSION, progressionStrategy:"Dupla progressão por desempenho", safetyNotes:["Buscar avaliação"], requiresMedicalClearance:false, weekDays:[] };
  const erros = validateScientificMetadata(plano, pedido);
  assert.ok(erros.some(e => e.includes("requiresMedicalClearance")));
});

test("adaptação interrompe progressão quando há dor", () => {
  const insight = adaptiveInsight([{date:"2026-08-14",feedback:{pain:true,recovery:"okay"},completed:[{name:"Supino",rirs:[2,2,1]}]}]);
  assert.equal(insight.action,"review");
});

test("adaptação usa RIR para sugerir progressão ou redução", () => {
  const leve = adaptiveInsight([{date:"2026-08-14",completed:[{name:"Remada",rirs:[5,5,5]}]}]);
  const pesado = adaptiveInsight([{date:"2026-08-14",completed:[{name:"Remada",rirs:[0,0,1]}]}]);
  assert.equal(leve.action,"progress");
  assert.equal(pesado.action,"reduce_load");
});
