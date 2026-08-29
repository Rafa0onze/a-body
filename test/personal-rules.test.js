import test from "node:test";
import assert from "node:assert/strict";
import { schedulesOverlap, validateProfessionalPlan } from "../src/personal-rules.js";

test("valida plano profissional completo",()=>{
  const valid={planName:"A",weekDays:[{label:"A",exercises:[{name:"Stiff",sets:3,reps:"8-12",rest:60,rir:2}]}]};
  assert.deepEqual(validateProfessionalPlan(valid),[]);
  assert.ok(validateProfessionalPlan({...valid,planName:""}).length);
  assert.ok(validateProfessionalPlan({...valid,weekDays:[{label:"A",exercises:[]}]}).length);
});

test("detecta conflito de agenda",()=>{
  const rows=[{id:"1",dia_semana:1,data:null,hora:"09:00",duracao_min:60}];
  assert.equal(schedulesOverlap({dia_semana:1,data:null,hora:"09:30",duracao_min:30},rows),true);
  assert.equal(schedulesOverlap({dia_semana:2,data:null,hora:"09:30",duracao_min:30},rows),false);
});
