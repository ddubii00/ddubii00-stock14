import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync(new URL('../lib/ranking-preferences.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const {createRankingPreferences,preferencesStorageKey}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const json=(preferences,status=200)=>new Response(JSON.stringify({preferences}),{status,headers:{'content-type':'application/json'}});
function fixture(fetch,initial){
 const values=new Map(initial?[[preferencesStorageKey,JSON.stringify(initial)]]:[]),states=[];
 const storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 const controller=createRankingPreferences({fetch,storage,onChange:state=>states.push(state)});
 controller.start();return{controller,values,states,last:()=>states.at(-1)};
}
test('401 and login HTML do not lock filters; edits survive reload and reconnect',async()=>{
 for(const response of [()=>json(null,401),()=>new Response('<h1>로그인 필요</h1>',{headers:{'content-type':'text/html'}})]){
  const f=fixture(async()=>response());await tick();assert.equal(f.last().needsSignIn,true);
  f.controller.update({minChange:8,minValue:777,market:'KOSDAQ'});await tick();
  assert.equal(f.last().minChange,8);assert.equal(f.last().market,'KOSDAQ');
  const record=JSON.parse(f.values.get(preferencesStorageKey));assert.equal(record.unsynced,true);f.controller.dispose();
  const writes=[];
  const restored=fixture(async(_url,options)=>{
   if(options.method==='PUT'){writes.push(JSON.parse(options.body));return json(writes.at(-1));}
   return json({minChange:4,minValue:100,market:'ALL'});
  },record);await tick();
  assert.deepEqual(writes,[record.preferences]);assert.equal(restored.last().minValue,777);
  assert.equal(JSON.parse(restored.values.get(preferencesStorageKey)).unsynced,false);restored.controller.dispose();
 }
});
test('edits before account load completes are not overwritten by its old value',async()=>{
 let resolve;const writes=[];
 const f=fixture((_url,options)=>options.method==='GET'?new Promise(r=>resolve=r):Promise.resolve(json((writes.push(JSON.parse(options.body)),writes.at(-1)))));
 f.controller.update({minChange:6,minValue:250,market:'KOSPI'});
 resolve(json({minChange:4,minValue:100,market:'ALL'}));await tick();
 assert.equal(f.last().minChange,6);assert.equal(f.last().market,'KOSPI');assert.equal(writes[0].minValue,250);f.controller.dispose();
});
test('network failures allow adjustment; retry syncs the latest values',async()=>{
 let fail=true;const writes=[];
 const f=fixture(async(_url,options)=>{
  if(fail)throw Error('offline');
  if(options.method==='PUT'){writes.push(JSON.parse(options.body));return json(writes.at(-1));}
  return json(null);
 });await tick();
 f.controller.update({minChange:0,minValue:0,market:'ALL'});await tick();assert.equal(f.last().minChange,0);
 fail=false;await f.controller.retry();await tick();assert.equal(writes[0].minValue,0);assert.match(f.last().status,/계정에 저장됨/);f.controller.dispose();
});
test('rapid changes serialize writes and keep the final selection',async()=>{
 const writes=[];let finish;
 const f=fixture(async(_url,options)=>{
  if(options.method==='GET')return json({minChange:4,minValue:100,market:'ALL'});
  const value=JSON.parse(options.body);writes.push(value);
  if(writes.length===1)return new Promise(r=>finish=()=>r(json(value)));
  return json(value);
 });await tick();f.controller.update({minChange:5});f.controller.update({minValue:300});f.controller.update({market:'KOSDAQ'});
 finish();await tick();assert.equal(writes.length,2);assert.deepEqual(writes.at(-1),{minChange:5,minValue:300,market:'KOSDAQ'});f.controller.dispose();
});
test('saved account values restore on a new browser without writing defaults',async()=>{
 const methods=[];const p={minChange:9,minValue:500,market:'KOSPI'};
 const f=fixture(async(_url,options)=>{methods.push(options.method);return json(p);});await tick();
 assert.equal(f.last().minChange,9);assert.deepEqual(methods,['GET']);f.controller.dispose();
});
test('blocked storage cannot prevent editing and invalid filters are not sent',async()=>{
 const states=[];let calls=0;
 const f=createRankingPreferences({fetch:async()=>{calls++;throw Error('offline');},storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},onChange:s=>states.push(s)});
 f.start();await tick();f.update({minChange:7,minValue:200,market:'KOSDAQ'});await tick();assert.equal(states.at(-1).minChange,7);
 const before=calls;f.update({minChange:31});f.update({market:'INVALID'});await tick();assert.equal(calls,before);assert.equal(states.at(-1).minChange,7);f.dispose();
});
test('failed account writes retain the newest local edit for retry',async()=>{
 let rejectWrite=true;const saved=[];
 const f=fixture(async(_url,options)=>{
  if(options.method==='GET')return json({minChange:4,minValue:100,market:'ALL'});
  if(rejectWrite)return json(null,401);
  const p=JSON.parse(options.body);saved.push(p);return json(p);
 });await tick();f.controller.update({minChange:8});await tick();assert.equal(f.last().needsSignIn,true);
 f.controller.update({minValue:900,market:'KOSPI'});await tick();
 rejectWrite=false;await f.controller.retry();await tick();
 assert.deepEqual(saved.at(-1),{minChange:8,minValue:900,market:'KOSPI'});f.controller.dispose();
});
test('clean browser backup yields to the saved account settings',async()=>{
 const f=fixture(async()=>json({minChange:6,minValue:600,market:'KOSDAQ'}),{preferences:{minChange:4,minValue:100,market:'ALL'},unsynced:false});
 await tick();assert.equal(f.last().minChange,6);assert.equal(f.last().market,'KOSDAQ');f.controller.dispose();
});
