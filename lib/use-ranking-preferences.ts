'use client';
import {useEffect,useRef,useState} from 'react';
import {createRankingPreferences,defaultPreferences,type RankingPreferences} from './ranking-preferences';
const base=process.env.NEXT_PUBLIC_BASE_PATH||'';
export function useRankingPreferences(){
 const [state,setState]=useState({...defaultPreferences,status:'필터 조정 가능 · 저장한 설정 불러오는 중…',needsSignIn:false,canRetry:false});
 const controller=useRef<ReturnType<typeof createRankingPreferences>|null>(null);
 useEffect(()=>{
  // Access storage inside its methods so blocked browser storage cannot prevent setup.
  const storage={getItem:(key:string)=>window.localStorage.getItem(key),setItem:(key:string,value:string)=>window.localStorage.setItem(key,value)};
  const instance=createRankingPreferences({fetch:window.fetch.bind(window),storage,base,onChange:setState});
  controller.current=instance;instance.start();
  const retry=()=>void instance.retry();
  window.addEventListener('focus',retry);window.addEventListener('online',retry);
  return()=>{instance.dispose();controller.current=null;window.removeEventListener('focus',retry);window.removeEventListener('online',retry);};
 },[]);
 return{...state,update:(patch:Partial<RankingPreferences>)=>controller.current?.update(patch),retry:()=>controller.current?.retry()};
}
