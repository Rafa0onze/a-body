import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {mergeCumulativeHistory} from '../src/history-sync.js';

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("recuperação une registros diferentes e preserva séries mais ricas",()=>{
  const a={date:'2026-10-10',dayId:'a',completed:[{id:'e',weights:[20,22],reps:[10,10]}]},b={date:'2026-10-11',dayId:'b',completed:[]};
  const merged=mergeCumulativeHistory('abody:history',[a],[{...a,completed:[]},b]);
  assert.equal(merged.length,2);assert.deepEqual(merged[0].completed[0].weights,[20,22]);
  assert.ok(app.includes('mergeCumulativeHistory(key,local||[],cloud||[])'));
});

test("avaliação corporal e histórico carregam antes de retornos antecipados",()=>{
  assert.match(app,/loadStorage\("abody:history"\)/);
  assert.match(app,/loadStorage\("abody:bodyhistory"\)/);
  assert.match(app,/setHistory\(histRecuperado\)/);
  assert.match(app,/setBodyHistory\(corpoRecuperado\)/);
});

test("saveStorage não substitui histórico cumulativo por versão menos rica",()=>{
  const body=[{date:'2026-10-10',analysis:{overallAnalysis:'fixture'}}];
  assert.deepEqual(mergeCumulativeHistory('abody:bodyhistory',[],body),body);
  assert.ok(app.includes('saveCumulativeHistory({request:supaFetch,session,key,value,...options})'));
});
