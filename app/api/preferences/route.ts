import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
async function userId(request:Request){
 const user=await getChatGPTUser();if(user)return user.userId;
 // Local previews have no Sites authentication gateway. Hosted writes require identity.
 const host=new URL(request.url).hostname;
 return process.env.NODE_ENV==='development'&&['localhost','127.0.0.1','::1'].includes(host)?'local-preview':null;
}
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const id=await userId(request);if(!id)return response({error:'설정을 불러오려면 로그인해 주세요.'},401);
 try{if(!env.DB)throw Error('DB unavailable');const row=await env.DB.prepare('SELECT payload FROM ranking_preferences WHERE user_id = ?').bind(id).first<{payload:string}>();return response({preferences:row?JSON.parse(row.payload):null});}
 catch{return response({error:'저장한 필터를 불러오지 못했습니다. 다시 시도해 주세요.'},503);}
}
export async function PUT(request:Request){
 const id=await userId(request);if(!id)return response({error:'설정을 저장하려면 로그인해 주세요.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'요청 출처 오류'},403);
 let p:Record<string,unknown>;try{const body=await request.json();if(!body||typeof body!=='object'||Array.isArray(body))return response({error:'설정 형식 오류'},400);p=body as Record<string,unknown>;}catch{return response({error:'설정 형식 오류'},400);}
 if(typeof p.minChange!=='number'||!Number.isFinite(p.minChange)||p.minChange< -30||p.minChange>30||typeof p.minValue!=='number'||!Number.isFinite(p.minValue)||p.minValue<0||p.minValue>1e8||typeof p.market!=='string'||!['ALL','KOSPI','KOSDAQ'].includes(p.market))return response({error:'상승률·거래대금 설정 범위를 확인해 주세요.'},400);
 const preferences={minChange:p.minChange,minValue:p.minValue,market:p.market};
 try{if(!env.DB)throw Error('DB unavailable');await env.DB.prepare('INSERT INTO ranking_preferences(user_id,payload,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(id,JSON.stringify(preferences),new Date().toISOString()).run();return response({preferences});}
 catch{return response({error:'필터 저장에 실패했습니다. 다시 시도해 주세요.'},503);}
}
