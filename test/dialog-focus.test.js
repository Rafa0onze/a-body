import test from 'node:test';
import assert from 'node:assert/strict';
import {attachDialogFocus} from '../src/dialog-focus.js';

function fixture(){
  const listeners=new Map();let doc;
  class Element{
    constructor(tag,kind=''){this.tagName=tag;this.kind=kind;this.children=[];this.parentElement=null;this.inert=false;this.style={overflow:''};this.disabled=false;this.hidden=false;this.isConnected=true;}
    add(child){child.parentElement=this;this.children.push(child);return child;}
    closest(selector){for(let el=this;el;el=el.parentElement){if(selector==='[inert]'&&el.inert)return el;if(selector==='.ab-modal-overlay'&&el.kind==='overlay')return el;}return null;}
    contains(target){return target===this||this.children.some(child=>child.contains(target));}
    getClientRects(){return this.hidden?[]:[{}];}
    querySelectorAll(){return this.children.flatMap(child=>[...(child.tagName==='BUTTON'&&!child.disabled?[child]:[]),...child.querySelectorAll()]);}
    focus(){doc.activeElement=this;for(const fn of listeners.get('focusin')||[])fn({target:this});}
  }
  const body=new Element('BODY'),root=body.add(new Element('DIV')),background=root.add(new Element('MAIN')),trigger=background.add(new Element('BUTTON'));
  doc={body,activeElement:trigger,addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(fn);},removeEventListener:(name,fn)=>listeners.get(name)?.delete(fn)};
  const oldDoc=globalThis.document,oldStyle=globalThis.getComputedStyle;globalThis.document=doc;globalThis.getComputedStyle=e=>({visibility:e.hidden?'hidden':'visible'});
  const modal=()=>{const overlay=root.add(new Element('DIV','overlay')),panel=overlay.add(new Element('SECTION')),first=panel.add(new Element('BUTTON')),last=panel.add(new Element('BUTTON'));return {overlay,panel,first,last};};
  const key=(value,shiftKey=false)=>{const event={key:value,shiftKey,prevented:false,preventDefault(){this.prevented=true;},stopPropagation(){}};for(const fn of listeners.get('keydown')||[])fn(event);return event;};
  return {doc,body,root,background,trigger,modal,key,restore(){globalThis.document=oldDoc;globalThis.getComputedStyle=oldStyle;}};
}
test('dialog contains Tab/Shift+Tab, redirects outside focus, closes on Escape and restores trigger',()=>{
  const f=fixture(),m=f.modal();let closed=0;const release=attachDialogFocus(m.panel,()=>closed++);
  try{assert.equal(f.background.inert,true);assert.equal(f.doc.activeElement,m.panel);assert(f.key('Tab').prevented);assert.equal(f.doc.activeElement,m.first);m.last.focus();assert(f.key('Tab').prevented);assert.equal(f.doc.activeElement,m.first);assert(f.key('Tab',true).prevented);assert.equal(f.doc.activeElement,m.last);f.trigger.focus();assert.equal(f.doc.activeElement,m.first);f.key('Escape');assert.equal(closed,1);release();assert.equal(f.doc.activeElement,f.trigger);assert.equal(f.background.inert,false);assert.equal(f.body.style.overflow,'');release();assert.equal(f.background.inert,false);}finally{release();f.restore();}
});
test('nested dialog restores parent and retains original inert/scroll states until final close',()=>{
  const f=fixture();f.body.style.overflow='auto';const unrelated=f.root.add(new (f.trigger.constructor)('DIV'));unrelated.inert=true;const parent=f.modal();const closeParent=attachDialogFocus(parent.panel,()=>{});parent.first.focus();const child=f.modal();const closeChild=attachDialogFocus(child.panel,()=>{});
  try{assert.equal(parent.overlay.inert,true);closeChild();assert.equal(parent.overlay.inert,false);assert.equal(f.doc.activeElement,parent.first);assert.equal(f.background.inert,true);assert.equal(f.body.style.overflow,'hidden');closeParent();assert.equal(unrelated.inert,true);assert.equal(f.body.style.overflow,'auto');}finally{closeChild();closeParent();f.restore();}
});
test('hidden/disabled targets are excluded and an empty dialog retains focus',()=>{
  const f=fixture(),m=f.modal();m.first.hidden=true;m.last.disabled=true;const release=attachDialogFocus(m.panel,()=>{});
  try{assert(f.key('Tab').prevented);assert.equal(f.doc.activeElement,m.panel);assert(f.key('Tab',true).prevented);assert.equal(f.doc.activeElement,m.panel);}finally{release();f.restore();}
});
