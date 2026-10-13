import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { RFM_KEY, RFM_PREFIX, mergeMeasurements } from '../src/rfm.js';
const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const code=app.slice(app.indexOf('async function loadMeasurements()'),app.indexOf('async function callOpenAI(body)'));
const a={id:'00000000-0000-4000-8000-000000000001',date:'2026-10-13',raw:'first'};
const b={id:'00000000-0000-4000-8000-000000000002',date:'2026-10-14',raw:'second'};
function setup({session={access_token:'test-token',user:{id:'test-user'}}, fetch=async()=>[],enabled=true}={}) {
  const local={'abody:history':'keep','abody:bodyhistory':'keep'};
  Object.defineProperties(local,{getItem:{value:k=>local[k]??null},setItem:{value:(k,v)=>{local[k]=v;}}});
  const context=vm.createContext({AUTH_ENABLED:enabled,RFM_KEY,RFM_PREFIX,mergeMeasurements,refreshIfNeeded:async()=>session,supaFetch:fetch,localStorage:local});
  vm.runInContext(code,context);return {context,local};
}
test('cloud write targets one immutable measurement of authenticated account',async()=>{
  let request;const {context,local}=setup({fetch:async(path,opts)=>{request={path,opts};return [];}});
  await context.saveMeasurements(a);const body=JSON.parse(request.opts.body);
  assert.equal(body.user_id,'test-user');assert.equal(body.key,RFM_PREFIX+a.id);
  assert.deepEqual(body.value,a);assert.equal(request.path,'/rest/v1/user_data');
  assert.equal(request.opts.headers.Prefer,'resolution=ignore-duplicates');
  assert.equal(local['abody:history'],'keep');assert.equal(local['abody:bodyhistory'],'keep');
});
test('missing session and network failures fail closed',async()=>{
  const {context}=setup({session:null});await assert.rejects(context.loadMeasurements());await assert.rejects(context.saveMeasurements(a));
  const failure=setup({fetch:async()=>{throw Error('offline');}});await assert.rejects(failure.context.loadMeasurements());await assert.rejects(failure.context.saveMeasurements(a));assert.equal(failure.local[RFM_PREFIX+a.id],undefined);
});
test('isolated immutable local records preserve legacy and repeated reloads',async()=>{
  const {context,local}=setup({enabled:false});local[RFM_KEY]=JSON.stringify([{id:'old',date:'2020-01-01',umbilicalWaist:88}]);
  await context.saveMeasurements(a);await context.saveMeasurements(b);await context.saveMeasurements({...a,raw:'must not overwrite'});
  const h=await context.loadMeasurements();assert.equal(h.length,3);assert.equal(h[0].umbilicalWaist,88);assert.equal(h[1].raw,'first');
  assert.equal((await context.loadMeasurements()).length,3);assert.equal(local['abody:history'],'keep');assert.equal(local['abody:bodyhistory'],'keep');
});
test('concurrent cloud writes and retry cannot overwrite older or other new evaluations',async()=>{
  const rows=new Map([[RFM_KEY,[{id:'old',date:'2020-01-01',analysis:'unchanged'}]]]);
  const fetch=async(path,opts)=>{
    if(opts?.method==='POST'){const body=JSON.parse(opts.body);await new Promise(resolve=>setImmediate(resolve));if(!rows.has(body.key))rows.set(body.key,body.value);return null;}
    if(path.includes('key=eq.'))return [{value:rows.get(RFM_KEY)}];
    return [...rows].filter(([k])=>k.startsWith(RFM_PREFIX)).map(([,value])=>({value}));
  };
  const first=setup({fetch}).context,second=setup({fetch}).context;
  await Promise.all([first.saveMeasurements(a),second.saveMeasurements(b)]);
  await first.saveMeasurements({...a,raw:'retry must not replace'});
  const h=await second.loadMeasurements();assert.equal(h.length,3);assert.equal(h[0].analysis,'unchanged');assert.equal(h[1].raw,'first');assert.equal(h[2].raw,'second');
});
