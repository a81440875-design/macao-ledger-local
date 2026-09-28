import {normalisePortfolio} from './investments.js';
import {monthInvestment,tradeProfit} from './finance.js';
// Numbers stay numeric; user-written spreadsheet formulas are escaped.
export function toCsv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{
  let s=value==null?'':String(value);
  if(typeof value==='string'&&/^[\s\uFEFF]*[=+\-@]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}).join(',')).join('\r\n');}
const cash=n=>n==null?'':Number((n/100).toFixed(2));
export function csvFiles(s){
 const p=normalisePortfolio(s.portfolio),cat=id=>s.categories.find(c=>c.id===id)?.name||'';
 return [
  {label:'流水',rows:[['日期','類型','金額 MOP','分類','付款方式','備註','月份','待核對','預填'],...s.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(t=>[t.date,t.type,cash(t.amount),cat(t.categoryId),t.payment,t.note,t.date.slice(0,7),t.review?'是':'否',t.estimated?'是':'否'])]},
  {label:'投資持倉',rows:[['標的','名稱','類別','數量','平均成本 USD','價格 USD','價格日期','市值 USD','未實現損益 USD','目標比例 %','USD兌MOP匯率','備註'],...p.holdings.map(h=>[h.symbol,h.name,h.group,h.quantity,h.averageCost,h.price,h.priceAsOf,h.quantity*h.price,h.averageCost===null?'':h.quantity*(h.price-h.averageCost),h.target===null?'':h.target*100,p.rate,h.note])]},
  {label:'投資月結',rows:[['月份','月初總資產 MOP','月底總資產 MOP','入金 MOP','提款 MOP','淨投入 MOP','扣除資金進出後損益 MOP','股息 MOP','費用 MOP','稅項 MOP','已實現損益 MOP','備註'],...(s.investmentCloses||[]).slice().sort((a,b)=>a.month.localeCompare(b.month)).map(r=>{const m=monthInvestment(r);return [r.month,cash(r.opening),cash(r.closing),cash(r.deposits),cash(r.withdrawals),cash(m.netFunding),cash(m.pnl),cash(r.dividends),cash(r.fees),cash(r.taxes),cash(r.realised),r.note]})]},
  {label:'投資買賣',rows:[['日期','買賣','標的','幣別','數量','單價','費用','稅項','賣出部分總成本','已實現損益','備註'],...(s.investmentTrades||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,t.side==='buy'?'買入':'賣出',t.symbol,t.currency,t.quantity,t.price,cash(t.fees),cash(t.taxes),cash(t.costBasis),cash(tradeProfit(t)),t.note])]},
  {label:'投資月度快照',rows:[['月份','資產值 MOP','來源'],...p.snapshots.slice().sort((a,b)=>a.month.localeCompare(b.month)).map(x=>[x.month,cash(x.valueMOP),x.source])]}
 ].map(({label,rows})=>({label,content:toCsv(rows)}));
}
