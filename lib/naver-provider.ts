import {normalizeStock} from './market';
import type {NaverKind,NaverPeriod,NaverRanking,NaverMembers,NaverStock,TopCompany} from './naver';
const cache=new Map<string,{at:number;data:unknown}>();
const pending=new Map<string,Promise<unknown>>();
async function cached<T>(key:string,read:()=>Promise<T>):Promise<T>{
 // Expire ahead of the client minute tick so scheduling jitter cannot skip a refresh.
 const hit=cache.get(key);if(hit&&Date.now()-hit.at<55000)return hit.data as T;
 if(pending.has(key))return pending.get(key) as Promise<T>;
 const at=Date.now();const task=read().then(data=>{if(cache.size>=50)cache.delete(cache.keys().next().value!);cache.set(key,{at,data});return data;}).finally(()=>pending.delete(key));
 pending.set(key,task);return task;
}
async function read<T>(path:string):Promise<T>{
 const r=await fetch('https://stock.naver.com'+path,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://stock.naver.com/'},signal:AbortSignal.timeout(14000)});
 if(!r.ok)throw Error('네이버 응답 '+r.status);return r.json() as Promise<T>;
}
const num=(x:unknown)=>Number(String(x??0).replace(/,/g,''))||0;
const tops=(items:Record<string,unknown>[]|undefined):TopCompany[]=>(items||[]).map(x=>({code:String(x.code),name:String(x.name),value:num(x.value)}));
export function naverRanking(kind:NaverKind,period:NaverPeriod):Promise<NaverRanking>{return cached('rank:'+kind+':'+period,async()=>{
 const category={industry:'industries',theme:'themes',groups:'groups'}[kind];
 const items:NaverRanking['items']=[];const seen=new Set<string>();let cursor:string|undefined;
 for(let page=0;page<20;page++){
  const q=new URLSearchParams({sortType:'changeRate',size:'100',period});if(cursor)q.set('cursor',cursor);
  const j=await read<{items:(Record<string,unknown>&{topByChangeRate?:Record<string,unknown>[];topByMarketCap?:Record<string,unknown>[]})[];hasNext:boolean;cursor?:string}>('/api/stockSecurity/rankings/v2/domestic/'+category+'?'+q);
  if(!Array.isArray(j.items))throw Error('네이버 순위 응답 형식 오류');
  for(const s of j.items){if(seen.has(String(s.code)))continue;seen.add(String(s.code));items.push({id:String(s.code),rank:num(s.ranking),name:String(s.name),change:num(s.changeRate),rise:num(s.risingCount),flat:num(s.unchangedCount),fall:num(s.fallingCount),updatedAt:String(s.updatedAt),volume:s.totalTradingVolume==null?null:num(s.totalTradingVolume),value:s.totalTradingValue==null?null:num(s.totalTradingValue),marketCap:num(s.totalMarketCap),topChange:tops(s.topByChangeRate),topCap:tops(s.topByMarketCap)});}
  if(!j.hasNext){if(!items.length)throw Error('네이버 순위가 비어 있습니다.');return{kind,period,items,fetchedAt:new Date().toISOString()};}
  if(!j.cursor||j.cursor===cursor)throw Error('네이버 다음 페이지 오류');cursor=j.cursor;
 }
 throw Error('네이버 순위 페이지 범위 초과');
});}
export function naverMembers(kind:NaverKind,id:string):Promise<NaverMembers>{return cached('members:'+kind+':'+id,async()=>{
 const category={industry:'upjong',theme:'theme',groups:'group'}[kind];const stocks:NaverStock[]=[];
 for(let page=0;page<30;page++){
  const batch=await read<Record<string,unknown>[]>(`/api/domestic/market/${category}/${id}/stocklist?marketType=ALL&orderType=priceTop&startIdx=${page}&pageSize=100`);
  if(!Array.isArray(batch))throw Error('네이버 기업 응답 형식 오류');
  stocks.push(...batch.map(s=>({...normalizeStock(s),volume:num(s.tradeVolume),marketCap:num(s.marketSum)})));
  if(batch.length<100)return{stocks,fetchedAt:new Date().toISOString()};
 }
 throw Error('네이버 기업 페이지 범위 초과');
});}
