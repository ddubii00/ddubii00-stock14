export type RankingPreferences = {minChange:number; minValue:number; market:string};
export const defaultPreferences:RankingPreferences = {minChange:4,minValue:100,market:'ALL'};
export const preferencesStorageKey = 'stock14-ranking-preferences';
type Snapshot = RankingPreferences & {status:string; needsSignIn:boolean; canRetry:boolean};
type Dependencies = {
 fetch:typeof fetch;
 storage:Pick<Storage,'getItem'|'setItem'>;
 onChange:(snapshot:Snapshot)=>void;
 base?:string;
};
function valid(p:unknown):p is RankingPreferences {
 if(!p || typeof p!=='object')return false;
 const v=p as RankingPreferences;
 return Number.isFinite(v.minChange)&&v.minChange>=-30&&v.minChange<=30&&
  Number.isFinite(v.minValue)&&v.minValue>=0&&v.minValue<=1e8&&['ALL','KOSPI','KOSDAQ'].includes(v.market);
}
class SignInRequired extends Error {}
export function createRankingPreferences(deps:Dependencies){
 let preferences={...defaultPreferences},dirty=false,revision=0,loaded=false;
 let loading=false,saving=false,active=true,localSaved=false;
 const requests=new Set<AbortController>();
 function emit(status:string,canRetry=false,needsSignIn=false){
  if(active)deps.onChange({...preferences,status,canRetry,needsSignIn});
 }
 function backup(){
  try{deps.storage.setItem(preferencesStorageKey,JSON.stringify({preferences,unsynced:dirty}));localSaved=true;}
  catch{localSaved=false;}
 }
 function failure(error:unknown){
  const login=error instanceof SignInRequired;
  emit(`${localSaved?'이 브라우저에 저장됨':'필터 적용됨'} · ${login?'계정 동기화하려면 로그인하세요.':'계정 동기화에 실패했습니다.'}`,true,login);
 }
 async function request(method:'GET'|'PUT',value?:RankingPreferences){
  const controller=new AbortController();requests.add(controller);
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const r=await deps.fetch((deps.base||'')+'/api/preferences',{
    method,cache:'no-store',signal:controller.signal,
    ...(method==='PUT'?{keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}:{})
   });
   if(r.status===401||r.status===403)throw new SignInRequired();
   if(!r.headers.get('content-type')?.includes('application/json')){
    const body=await r.text();
    if(/signin|log.?in|로그인/i.test(r.url+' '+body))throw new SignInRequired();
    throw Error('Unexpected preferences response');
   }
   const j=await r.json() as {preferences?:unknown;error?:string};
   if(!r.ok)throw Error(j.error||'Preferences request failed');
   if(j.preferences!=null&&!valid(j.preferences))throw Error('Invalid saved preferences');
   return j.preferences as RankingPreferences|null|undefined;
  }finally{clearTimeout(timeout);requests.delete(controller);}
 }
 async function save(){
  if(!active||saving||!loaded||!dirty)return;
  saving=true;
  try{
   while(active&&dirty){
    const version=revision,value={...preferences};
    emit('필터 적용됨 · 계정에 저장 중…');
    await request('PUT',value);
    if(!active)return;
    if(version===revision){dirty=false;backup();emit('계정에 저장됨 · 다른 컴퓨터에서도 유지');}
   }
  }catch(error){if(active){loaded=false;failure(error);}}
  finally{saving=false;}
 }
 async function load(){
  if(!active||loading||saving)return;
  loading=true;const version=revision;
  try{
   const saved=await request('GET');
   if(!active)return;
   loaded=true;
   // An edit made while GET was in flight takes priority over the old account value.
   if(!dirty&&version===revision){preferences={...(saved||defaultPreferences)};backup();}
   if(dirty){void save();}
   else emit('계정에 저장됨 · 다른 컴퓨터에서도 유지');
  }catch(error){if(active){loaded=false;failure(error);}}
  finally{loading=false;}
 }
 function update(patch:Partial<RankingPreferences>){
  const next={...preferences,...patch};
  if(!valid(next)){emit('상승률은 -30~30%, 거래대금은 0~100,000,000억원으로 입력해 주세요.');return;}
  preferences=next;revision++;dirty=true;backup();
  emit(`${localSaved?'이 브라우저에 저장됨':'필터 적용됨'} · 계정에 저장 중…`);
  if(loaded)void save();else void load();
 }
 function start(){
  try{
   const record=JSON.parse(deps.storage.getItem(preferencesStorageKey)||'null');
   if(valid(record?.preferences)){preferences={...record.preferences};dirty=record.unsynced===true;localSaved=true;}
  }catch{/* Storage can be unavailable; interactive filters still work. */}
  emit('필터 조정 가능 · 저장한 설정 불러오는 중…');void load();
 }
 return{start,update,retry:()=>loaded&&dirty?save():load(),dispose:()=>{
  active=false;for(const request of requests)request.abort();
 }};
}
