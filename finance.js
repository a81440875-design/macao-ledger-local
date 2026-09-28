const monthPattern=/^\d{4}-(0[1-9]|1[0-2])$/;
const cents=n=>Number.isSafeInteger(n)&&n>=0&&n<=1e11;
export function nextPremium(s,date){
 const p=s.settings.insurance;if(!p?.enabled)return null;
 const start=p.startMonth,year=+start.slice(0,4),lastYear=+date.slice(0,4)+2;
 for(let y=year;y<=lastYear;y++)for(const m of [...new Set(p.policies.map(x=>x.month))].sort((a,b)=>a-b)){
  const cycle=y+'-'+String(m).padStart(2,'0');if(cycle<start||s.transactions.some(t=>t.insuranceCycle===cycle))continue;
  const policies=p.policies.filter(x=>x.month===m);return {cycle,amount:policies.reduce((n,x)=>n+x.amount,0),label:policies.map(x=>x.name).join('＋'),overdue:cycle<date.slice(0,7)};
 }return null;
}
export function insuranceBudget(s,c,m){const p=s.settings.insurance;if(!p?.enabled||c.id!==p.categoryId||m<p.startMonth)return null;return p.policies.filter(x=>x.month===+m.slice(5)).reduce((n,x)=>n+x.amount,0)}
export function safety(s,date){
 const ready=s.accounts.every(a=>a.balance!==null),assets=s.accounts.filter(a=>a.type==='asset').reduce((n,a)=>n+(a.balance||0),0),debt=s.accounts.filter(a=>a.type==='debt').reduce((n,a)=>n+(a.balance||0),0),saved=s.goals.reduce((n,g)=>n+g.saved,0),premium=nextPremium(s,date),cash=s.settings.cashPlan;
 const current=!!cash&&cash.nextIncome>=date&&cash.checkedAt>=date.slice(0,7)+'-01'&&!!s.settings.balanceAsOf&&s.settings.balanceAsOf>=date.slice(0,7)+'-01';
 const living=cash?.required??0,insurance=premium?.amount??0,value=assets-debt-saved-insurance-living;
 return {ready,assets,debt,saved,insurance,living,value,premium,planReady:current,shortfall:ready?Math.max(0,-value):null};
}
export function validateFinance(s){
 const p=s.settings.insurance;
 if(p!==undefined){if(!p||typeof p.enabled!=='boolean'||!monthPattern.test(p.startMonth)||!s.categories.some(c=>c.id===p.categoryId&&c.type.includes('支出'))||!Array.isArray(p.policies)||!p.policies.length||p.policies.length>20)throw Error('保費設定唔完整。');for(const r of p.policies)if(typeof r.name!=='string'||!r.name.trim()||r.name.length>60||!Number.isInteger(r.month)||r.month<1||r.month>12||!cents(r.amount)||!r.amount)throw Error('保費項目唔正確。');}
 const cp=s.settings.cashPlan;if(cp!==undefined&&(!cp||!cents(cp.required)||!/^\d{4}-\d{2}-\d{2}$/.test(cp.nextIncome)||!/^\d{4}-\d{2}-\d{2}$/.test(cp.checkedAt)))throw Error('生活安全線格式唔正確。');
 const seen=new Set();for(const t of s.transactions)if(t.insuranceCycle!==undefined){if(!monthPattern.test(t.insuranceCycle)||t.kind!=='expense'||seen.has(t.insuranceCycle))throw Error('保費付款有重複或格式唔正確。');seen.add(t.insuranceCycle)}
 const closes=s.investmentCloses||[];if(!Array.isArray(closes)||closes.length>1200)throw Error('投資月結格式唔正確。');const months=new Set();for(const r of closes){if(!monthPattern.test(r.month)||months.has(r.month)||typeof r.note!=='string'||r.note.length>2000)throw Error('投資月結格式唔正確。');months.add(r.month);for(const k of ['opening','closing','deposits','withdrawals','dividends','fees','taxes'])if(!cents(r[k]))throw Error('投資月結金額唔正確。');if(!(r.realised===null||Number.isSafeInteger(r.realised)&&Math.abs(r.realised)<=1e11))throw Error('已實現損益格式唔正確。');}
 const trades=s.investmentTrades||[];if(!Array.isArray(trades)||trades.length>10000)throw Error('買賣記錄格式唔正確。');const ids=new Set();for(const t of trades){if(typeof t.id!=='string'||ids.has(t.id)||!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!['buy','sell'].includes(t.side)||typeof t.symbol!=='string'||!t.symbol.trim()||t.symbol.length>30||!['USD','HKD','MOP'].includes(t.currency)||typeof t.note!=='string'||t.note.length>1000||!Number.isFinite(t.quantity)||t.quantity<=0||t.quantity>1e12||!Number.isFinite(t.price)||t.price<0||t.price>1e12||!cents(t.fees)||!cents(t.taxes)||!(t.costBasis===null||cents(t.costBasis)))throw Error('買賣記錄格式唔正確。');ids.add(t.id)}
}
export function monthInvestment(r){return {netFunding:r.deposits-r.withdrawals,pnl:r.closing-r.opening-r.deposits+r.withdrawals,netDividend:r.dividends-r.taxes}}
export function tradeProfit(t){return t.side==='sell'&&t.costBasis!==null?Math.round(t.quantity*t.price*100)-t.fees-t.taxes-t.costBasis:null}
