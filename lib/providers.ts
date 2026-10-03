import {normalizeStock,normalizeSectors,type MarketData,type Sector} from './market';
async function read(url:string){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0','Referer':'https://stock.naver.com/'},signal:AbortSignal.timeout(14000)});if(!r.ok)throw Error('source '+r.status);return r;}
export async function sectorStocks(id:string,kind:string){
 const stocks=[];
 for(let startIdx=0;startIdx<20;startIdx++){
  const r=await read(`https://stock.naver.com/api/domestic/market/${kind==='industry'?'upjong':'theme'}/${encodeURIComponent(id)}/stocklist?marketType=ALL&orderType=priceTop&startIdx=${startIdx}&pageSize=100`);
  const batch=await r.json();if(!Array.isArray(batch))throw Error('형식 오류');
  stocks.push(...batch.map(normalizeStock));
  if(batch.length<100)return stocks;
 }
 throw Error('구성종목 응답 범위를 확인할 수 없습니다.');
}
export async function collect():Promise<MarketData>{
 const result=await Promise.allSettled([read('https://m.stock.naver.com/api/stocks/priceTop/KOSPI?page=1&pageSize=100').then(r=>r.json()),read('https://m.stock.naver.com/api/stocks/priceTop/KOSDAQ?page=1&pageSize=100').then(r=>r.json()),read('https://stock.naver.com/api/domestic/market/theme/list?startIdx=0&pageSize=100&sortType=changeRate').then(r=>r.json()),read('https://stock.naver.com/api/domestic/market/upjong/list?startIdx=0&pageSize=100&sortType=changeRate').then(r=>r.json()),read('https://www.judal.co.kr/?view=themeList').then(r=>r.text()),...['KOSPI','KOSDAQ'].map(c=>read(`https://m.stock.naver.com/api/index/${c}/basic`).then(r=>r.json()))]);
 const value=(i:number)=>{const r=result[i];if(r.status==='rejected')throw r.reason;return r.value as {stocks:Record<string,unknown>[];stockName:string;closePrice:string;fluctuationsRatio:string};};
 const kp=value(0),kq=value(1),tr=value(2),ir=value(3);if(!kp.stocks?.length||!kq.stocks?.length||!Array.isArray(tr)||!tr.length||!Array.isArray(ir))throw Error('시세 응답이 비어 있습니다.');
 const themes=normalizeSectors(tr,'theme'),industries=normalizeSectors(ir,'industry');const warnings:string[]=[];
 await Promise.all([...themes.filter(s=>s.change>0).slice(0,6),...industries.filter(s=>s.change>0).slice(0,6)].map(async(s:Sector)=>{try{s.stocks=(await sectorStocks(s.id,s.kind)).map(x=>({...x,sector:s.name}));}catch{warnings.push(s.name+' 구성종목 수집 실패');}}));
 const stocks=[...kp.stocks,...kq.stocks].map(normalizeStock).sort((a,b)=>b.value-a.value);
 for(const s of stocks)s.sector=themes.find(t=>t.stocks.some(x=>x.code===s.code))?.name;
 const judal:{id:string;name:string;change:number}[]=[];
 if(result[4].status==='fulfilled'){const html=String(result[4].value);for(const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){const m=row[1].match(/stockList&themeIdx=(\d+)[^>]*>\s*<b>([\s\S]*?)<\/b>/),td=row[1].match(/<td\b[^>]*>([\s\S]*?)<\/td>/),p=td?.[1].match(/([+-]?[\d.]+)%/);if(m&&p)judal.push({id:m[1],name:m[2].replace(/<[^>]+>/g,''),change:Number(p[1])});}if(!judal.length)warnings.push('주달 테마 응답 확인 필요');}else warnings.push('주달 연결 실패');
 const indices=[5,6].flatMap(i=>result[i].status==='fulfilled'?[{name:value(i).stockName,price:value(i).closePrice,change:Number(value(i).fluctuationsRatio)}]:[]);
 return {date:String(kp.stocks[0].localTradedAt).slice(0,10),fetchedAt:new Date().toISOString(),stocks,themes,industries,judal:judal.sort((a,b)=>b.change-a.change).slice(0,20),indices,warnings,live:true};
}
