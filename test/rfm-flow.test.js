// Exercises the component's handlers with a hook harness; browser layout is a separate manual check.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import * as rfm from '../src/rfm.js';
const require=createRequire(import.meta.url);
const {transformSync}=createRequire(require.resolve('vite/package.json'))('esbuild');
const source=fs.readFileSync(new URL('../src/Measurements.jsx',import.meta.url),'utf8');
const compiled=transformSync(source,{loader:'jsx',format:'cjs',jsxFactory:'h',jsxFragment:'Fragment'}).code;
async function screen({save=async()=>{},load=async()=>[]}={}) {
  const values=[], effects=[];let cursor=0,initialized=false,tree,back=0;
  const hooks={useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],v=>{values[i]=typeof v==='function'?v(values[i]):v;}];},useRef(initial){const i=cursor++;return values[i] ||= {current:initial};},useEffect(fn){cursor++;if(!initialized)effects.push(fn);}};
  const context=vm.createContext({exports:{},module:{exports:{}},Fragment:'fragment',require:name=>name==='react'?hooks:rfm,h:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)}),console});
  vm.runInContext(compiled,context);
  const Component=context.module.exports.default;
  const render=()=>{cursor=0;tree=Component({save,load,onBack:()=>back++});initialized=true;return tree;};
  const nodes=(node=tree)=>typeof node==='object'&&node!==null?[node,...node.children.filter(x=>x!==undefined).flatMap(x=>nodes(x))]:[];
  const text=node=>node?.props?.['aria-hidden']? '':typeof node==='string'?node:node?.children?.map(text).join('')||'';
  const button=label=>nodes().find(n=>n.type==='button'&&text(n).trim()===label);
  const open=()=>{button('Nova avaliação por medidas').props.onClick();render();};
  const fill=()=>{for(const [key,value] of Object.entries({age:'40',height:'180',weight:'80',waist1:'90',waist2:'90'})){nodes().find(n=>n.type==='label'&&n.props.key===key).children.find(n=>n?.type==='input').props.onChange({target:{value}});render();}for(const [i,value] of ['0','yes'].entries()){nodes().filter(n=>n.type==='select')[i].props.onChange({target:{value}});render();}nodes().find(n=>n.type==='input'&&n.props.type==='checkbox').props.onChange({target:{checked:true}});render();};
  const submit=()=>nodes().find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  render();for(const effect of effects)effect();await new Promise(resolve=>setImmediate(resolve));render();
  return {render,nodes,button,open,fill,submit,get back(){return back;}};
}
test('cancel and navigation do not save or calculate',async()=>{
  let writes=0;const s=await screen({save:async()=>writes++});s.open();s.fill();s.button('Cancelar').props.onClick();s.render();assert.equal(s.nodes().some(n=>n.type==='form'),false);assert.equal(writes,0);s.button('Voltar').props.onClick();assert.equal(s.back,1);
  s.open();assert.equal(s.nodes().find(n=>n.type==='label'&&n.props.key==='height').children.find(n=>n?.type==='input').props.value,'');
});
test('double submission saves once and new evaluation starts empty',async()=>{
  let writes=0,release;const gate=new Promise(resolve=>release=resolve);const s=await screen({save:async()=>{writes++;await gate;}});s.open();s.fill();const first=s.submit();const second=s.submit();await new Promise(resolve=>setImmediate(resolve));s.render();assert.equal(writes,1);assert.equal(s.button('Voltar').props.disabled,true);release();await Promise.all([first,second]);s.render();assert.equal(s.nodes().some(n=>n.type==='form'),false);s.open();assert.equal(s.nodes().find(n=>n.type==='label'&&n.props.key==='height').children.find(n=>n?.type==='input').props.value,'');
});
test('uncertain save retry preserves entry ID and does not duplicate committed data',async()=>{
  let stored=[],calls=0;const s=await screen({load:async()=>stored,save:async entry=>{stored=rfm.appendMeasurement(stored,entry);if(++calls===1)throw Error('response lost');}});s.open();s.fill();await s.submit();s.render();assert.equal(stored.length,1);const id=stored[0].id;await s.submit();s.render();assert.equal(stored.length,1);assert.equal(stored[0].id,id);
});
