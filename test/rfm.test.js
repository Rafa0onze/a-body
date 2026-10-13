import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRfm, createMeasurement, appendMeasurement, comparable, PROTOCOL } from '../src/rfm.js';
const valid = () => ({age:'40',height:'180',weight:'80',sex:'0',waist1:'90',waist2:'90',applicable:'yes',protocolConfirmed:true});
test('formula, categories and consistent units',()=>{
  assert.equal(calculateRfm(180,90,0),24);
  assert.equal(calculateRfm(180,90,1),36);
  assert.equal(calculateRfm(1.8,.9,0,'m'),24);
  assert.equal(createMeasurement({...valid(),height:'180,0'}).estimatedBodyFatPercent,24);
});
test('invalid inputs and applicability are rejected',()=>{
  for(const patch of [{age:'19'},{age:'70'},{age:'40.5'},{height:''},{weight:'NaN'},{height:'Infinity'},{height:'1.8'},{height:'18000'},{weight:'0x50'},{waist1:'0'},{waist1:'9000'},{sex:''},{sex:'2'},{applicable:'no'},{protocolConfirmed:false}]) assert.throws(()=>createMeasurement({...valid(),...patch}));
  for(const args of [[180,0,0],[180,90,2],[180,90,0,'in'],[NaN,90,0],[180,10,0]]) assert.throws(()=>calculateRfm(...args));
  assert.doesNotThrow(()=>createMeasurement({...valid(),age:'20'}));
  assert.doesNotThrow(()=>createMeasurement({...valid(),age:'69'}));
});
test('two readings, third reading and repeat quality rule',()=>{
  assert.equal(createMeasurement({...valid(),waist2:'91'}).waist,90.5);
  assert.throws(()=>createMeasurement({...valid(),waist2:'92'}));
  const entry=createMeasurement({...valid(),waist2:'92',waist3:'90.4'});
  assert.deepEqual(entry.waistReadings,[90,92,90.4]);
  assert.deepEqual(entry.selectedReadings,[0,2]);
  assert.equal(entry.waist,90.2);
  assert.throws(()=>createMeasurement({...valid(),waist2:'94',waist3:'98'}));
  assert.equal(createMeasurement({...valid(),waist3:'123'}).waistReadings.length,2);
});
test('append preserves old records, immutable history, duplicates and protocol',()=>{
  const old={id:'old',date:'2020-01-01',analysis:{arbitrary:'preserved'},waistUmbilical:88};
  const history=[old], entry=createMeasurement(valid(),'2026-10-13T00:00:00Z');
  const next=appendMeasurement(history,entry);
  assert.deepEqual(history,[old]);assert.equal(next[0],old);assert.equal(next.length,2);
  assert.equal(appendMeasurement(next,entry),next);
  assert.equal(entry.protocol,PROTOCOL);assert.equal(entry.units.weight,'kg');assert.equal(entry.date,'2026-10-13T00:00:00Z');
  assert.equal(comparable(entry,old),false);
  assert.equal(comparable(entry,{...entry,sex:1}),false);
  assert.equal(comparable(entry,{...entry,protocol:'umbilical'}),false);
  assert.equal(comparable(entry,{...entry}),true);
  assert.throws(()=>appendMeasurement(null,entry));
});
