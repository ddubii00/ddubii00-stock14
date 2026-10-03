import raw from './data/raw.json';
import {normalizeStock,normalizeSectors,type MarketData} from './market';
const themes=normalizeSectors(raw.themes,'theme');
const industries=normalizeSectors(raw.industries,'industry');
for(const t of [...themes,...industries]){const r=(t.kind==='theme'?raw.themes:raw.industries).find(x=>x.no===t.id) as unknown as {members?:Record<string,unknown>[]};t.stocks=(r.members??[]).map(normalizeStock).map(s=>({...s,sector:t.name}));}
const stocks=raw.stocks.map(s=>normalizeStock(s));
for(const s of stocks){const t=themes.find(t=>t.stocks.some(x=>x.code===s.code));s.sector=t?.name;}
export const bootstrap:MarketData={date:raw.stocks[0].localTradedAt.slice(0,10),fetchedAt:raw.fetchedAt,stocks:stocks.sort((a,b)=>b.value-a.value),themes,industries,judal:raw.judal,indices:raw.indices.map(x=>({name:x.stockName,price:x.closePrice,change:Number(x.fluctuationsRatio)})),warnings:[],live:false};
