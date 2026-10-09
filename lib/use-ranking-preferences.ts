'use client';
import {useEffect,useRef,useState} from 'react';
type Preferences={minChange:number;minValue:number;market:string};
const defaults:Preferences={minChange:4,minValue:100,market:'ALL'};
const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
export function useRankingPreferences(){
 const [preferences,setPreferences]=useState(defaults),[ready,setReady]=useState(false),[status,setStatus]=useState('저장한 필터 불러오는 중…');
 const current=useRef(defaults),pending=useRef<Preferences|null>(null),saving=useRef(false),loaded=useRef(false),loadSequence=useRef(0);
 async function save(){
  if(saving.current)return;saving.current=true;
  try{while(pending.current){const value=pending.current;pending.current=null;
   try{const r=await fetch(base+'/api/preferences',{method:'PUT',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});const j=await r.json() as {preferences?:Preferences|null;error?:string};if(!r.ok)throw Error(j.error);}
   catch(e){pending.current=pending.current||value;throw e;}
   if(!pending.current)setStatus('계정에 저장됨 · 다른 컴퓨터에서도 유지');
  }}catch{setStatus('필터 저장에 실패했습니다. 다시 시도해 주세요.');}finally{saving.current=false;}
 }
 async function load(){
  if(saving.current||pending.current)return;const token=++loadSequence.current;
  try{const r=await fetch(base+'/api/preferences',{cache:'no-store'});const j=await r.json() as {preferences?:Preferences|null;error?:string};if(!r.ok)throw Error(j.error);if(token!==loadSequence.current||saving.current||pending.current)return;
   const p=j.preferences||defaults;current.current=p;setPreferences(p);loaded.current=true;setReady(true);setStatus('계정에 저장됨 · 다른 컴퓨터에서도 유지');
   if(!j.preferences){pending.current=p;setStatus('필터 저장 중…');void save();}
  }catch{if(token===loadSequence.current)setStatus('저장한 필터를 불러오지 못했습니다. 다시 시도해 주세요.');}
 }
 function update(patch:Partial<Preferences>){
  if(!loaded.current)return;loadSequence.current++;const p={...current.current,...patch};current.current=p;setPreferences(p);
  if(!Number.isFinite(p.minChange)||p.minChange< -30||p.minChange>30||!Number.isFinite(p.minValue)||p.minValue<0||p.minValue>1e8){setStatus('상승률은 -30~30%, 거래대금은 0 이상으로 입력해 주세요.');return;}
  pending.current=p;setStatus('필터 저장 중…');void save();
 }
 useEffect(()=>{void load();const focus=()=>void load();window.addEventListener('focus',focus);return()=>{loadSequence.current++;window.removeEventListener('focus',focus);};},[]);
 return{...preferences,ready,status,update,retry:()=>pending.current?save():load()};
}
