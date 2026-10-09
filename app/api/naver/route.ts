import {naverRanking,naverMembers} from '@/lib/naver-provider';
import type {NaverKind,NaverPeriod} from '@/lib/naver';
export async function GET(request:Request){
 const p=new URL(request.url).searchParams,kind=p.get('kind')||'industry',period=p.get('period')||'daily',id=p.get('id');
 if(!['industry','theme','groups'].includes(kind)||!['daily','weekly','monthly'].includes(period)||(id!==null&&!/^\d{1,6}$/.test(id)))return Response.json({error:'분류 또는 기간이 올바르지 않습니다.'},{status:400});
 try{return Response.json(id?await naverMembers(kind as NaverKind,id):await naverRanking(kind as NaverKind,period as NaverPeriod),{headers:{'Cache-Control':'no-store'}});}
 catch{return Response.json({error:'네이버 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:503});}
}
