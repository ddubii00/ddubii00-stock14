import {env} from 'cloudflare:workers';
import {collect} from '@/lib/providers';
import {bootstrap} from '@/lib/bootstrap';
let cached:{time:number;data:unknown}|undefined;
export async function GET(request:Request){
 const date=new URL(request.url).searchParams.get('date');
 if(date){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return Response.json({error:'날짜 오류'},{status:400});try{const row=await env.DB?.prepare('SELECT payload FROM snapshots WHERE date = ?').bind(date).first<{payload:string}>();if(row)return Response.json(JSON.parse(row.payload));if(date===bootstrap.date)return Response.json(bootstrap);return Response.json({error:'이 날짜에 수집한 기록이 없습니다.'},{status:404});}catch{return Response.json({error:'날짜 기록을 불러올 수 없습니다.'},{status:503});}}
 const collectionStartedAt=Date.now();
 if(cached&&collectionStartedAt-cached.time<30000)return Response.json(cached.data);
 let data;try{data=await collect();}catch{data={...bootstrap,warnings:['원본 연결이 지연되어 마지막 수집 자료를 표시합니다.'],live:false};try{const row=await env.DB?.prepare('SELECT payload FROM snapshots ORDER BY date DESC LIMIT 1').first<{payload:string}>();if(row)data={...JSON.parse(row.payload),live:false,warnings:data.warnings};}catch{}}
 try{if(env.DB){await env.DB.prepare('INSERT INTO snapshots(date,payload,saved_at) VALUES(?,?,?) ON CONFLICT(date) DO UPDATE SET payload=excluded.payload,saved_at=excluded.saved_at').bind(data.date,JSON.stringify(data),data.fetchedAt).run();data.historySaved=true;}}catch{data.warnings.push('캘린더 저장이 지연되었습니다.');data.historySaved=false;}
 let history:string[]=[];try{if(env.DB){const rows=await env.DB.prepare('SELECT date FROM snapshots ORDER BY date DESC LIMIT 40').all<{date:string}>();history=rows.results.map(r=>r.date);}}catch{}
 const response={...data,history:Array.from(new Set([bootstrap.date,...history]))};cached={time:collectionStartedAt,data:response};return Response.json(response);
}
