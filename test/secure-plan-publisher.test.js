import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from 'node:vm';
import {transformWithEsbuild} from 'vite';

const app=readFileSync(new URL("../src/App.jsx", import.meta.url),"utf8");
const fn=readFileSync(new URL("../supabase/functions/publish-personal-plan/index.ts", import.meta.url),"utf8");

test("editor usa publicador autenticado antes dos fallbacks",()=>{
  assert.match(app,/functions\/v1\/publish-personal-plan/);
  assert.match(app,/Authorization:`Bearer \$\{s\.access_token\}`/);
  assert.match(app,/via:"edge_function"/);
});

const compiled=(await transformWithEsbuild(fn,'publish-personal-plan.ts',{loader:'ts'})).code.replace(/^import .*createClient.*;\s*/m,'');
function publisher({user={id:'verified-user'},rpcError=null}={}){
  let handler;const calls=[];
  const client={auth:{getUser:async token=>{calls.push({token});return {data:{user},error:!user};}},rpc:async(name,args)=>{calls.push({name,args});return {data:rpcError?null:{id:'new-plan',atualizado_em:'now'},error:rpcError};}};
  vm.runInNewContext(compiled,{createClient:(url,key,options)=>{calls.push({authorization:options.global.headers.Authorization});return client;},Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response});
  return {calls,request:authorization=>handler(new Request('https://fixture.invalid/',{method:'POST',headers:authorization?{authorization,'content-type':'application/json'}:{},body:JSON.stringify({aluno_id:'selected-student',plano:{planName:'Test',weekDays:[{exercises:[{}]}]}})}))};
}
test('publisher rejects missing or invalid identity before mutation',async()=>{const missing=publisher();assert.equal((await missing.request()).status,401);assert.equal(missing.calls.length,0);const invalid=publisher({user:null});assert.equal((await invalid.request('Bearer rejected')).status,401);assert(!invalid.calls.some(c=>c.name));});
test('publisher delegates transaction to RPC under verified caller JWT',async()=>{const f=publisher(),response=await f.request('Bearer fixture-token');assert.equal(response.status,200);assert.equal((await response.json()).treino_id,'new-plan');assert.equal(f.calls[0].authorization,'Bearer fixture-token');assert.equal(f.calls[1].token,'fixture-token');assert.equal(f.calls[2].name,'publicar_treino_aluno');assert.equal(f.calls[2].args.p_aluno_id,'selected-student');assert(!('user_id' in f.calls[2].args));});
test('permission and concurrent unlink failures are returned without partial admin writes',async()=>{for(const [code,status] of [['42501',403],['40001',409],['unknown',500]]){const f=publisher({rpcError:{code}});assert.equal((await f.request('Bearer fixture-token')).status,status);assert.equal(f.calls.filter(c=>c.name).length,1);}});
