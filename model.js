import {validateFinance,insuranceBudget} from './finance.js';
import {categoryBudget,validateRecurring} from './recurring.js';
import {validateInvestmentPlan} from './planner.js';
import {normalisePortfolio,validatePortfolio,validateHistory} from './investments.js';
export const KEY='macao-ledger-local-v1:'+(globalThis.location?.pathname.replace(/[^/]*$/,'')||'/');
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Macau',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const money=n=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
export const uid=()=>crypto.randomUUID();
export function amount(v){if(!/^\d+(\.\d{1,2})?$/.test(String(v).trim()))throw Error('請輸入正確金額，最多兩個小數位。');const n=Math.round(Number(v)*100);if(!Number.isSafeInteger(n)||n>100000000000)throw Error('金額太大，請檢查。');return n}
export function blank(categories){return {schemaVersion:1,currency:'MOP',categories,transactions:[],goals:[],accounts:[{id:'bank',name:'銀行戶口',type:'asset',balance:null},{id:'mpay',name:'MPay 餘額',type:'asset',balance:null},{id:'cash',name:'現金',type:'asset',balance:null},{id:'card',name:'信用卡',type:'debt',balance:null}],budgetOverrides:{},settings:{defaultPayment:'MPay 綁定銀行',balanceAsOf:null,lastBackup:null},portfolio:null,importInfo:null}}
export const budget=(s,c,m)=>insuranceBudget(s,c,m)??categoryBudget(c,m,s.budgetOverrides);
export function stats(s,m){const ts=s.transactions.filter(t=>t.date.slice(0,7)===m);const sum=fn=>ts.filter(fn).reduce((v,t)=>v+t.amount,0);const income=sum(t=>t.kind==='income'),expense=sum(t=>t.kind==='expense'),invest=sum(t=>t.kind==='invest');const wants=sum(t=>t.kind==='expense'&&t.type==='想要支出');const needs=expense-wants;const wantBudget=s.categories.filter(c=>c.type==='想要支出').reduce((v,c)=>v+budget(s,c,m),0);return {ts,income,expense,invest,wants,needs,wantBudget,wantLeft:wantBudget-wants,flow:income-expense-invest,byCategory:Object.fromEntries(s.categories.map(c=>[c.id,sum(t=>t.categoryId===c.id&&['expense','invest','income'].includes(t.kind))]))}}
export function available(s){const ready=s.accounts.every(a=>a.balance!==null);const assets=s.accounts.filter(a=>a.type==='asset').reduce((v,a)=>v+(a.balance??0),0);const debt=s.accounts.filter(a=>a.type==='debt').reduce((v,a)=>v+(a.balance??0),0);const saved=s.goals.reduce((v,g)=>v+g.saved,0);return {ready,assets,debt,saved,value:assets-debt-saved}}
export function effectsFor(s,t,apply){if(!apply)return [];const a=s.accounts.find(a=>a.id===t.accountId);if(!a||a.balance===null)throw Error('請先喺設定填好帳戶餘額，或者取消「更新帳戶餘額」。');if(t.kind==='expense')return [[a.id,a.type==='debt'?t.amount:-t.amount]];if(a.type==='debt')throw Error('呢項操作請選銀行、MPay 餘額或現金。');if(t.kind==='income')return [[a.id,t.amount]];if(t.kind==='invest')return [[a.id,-t.amount]];const b=s.accounts.find(a=>a.id===t.toAccountId);if(!b||b.balance===null||a.id===b.id)throw Error('請選另一個已設定餘額嘅帳戶。');if(t.kind==='repay'){if(b.type!=='debt'||t.amount>b.balance)throw Error('還款金額唔可以多過未還卡數。');return [[a.id,-t.amount],[b.id,-t.amount]]}if(b.type!=='asset')throw Error('轉帳只可以轉入現金類帳戶。');return [[a.id,-t.amount],[b.id,t.amount]]}
export function applyEffects(s,effects,factor=1){for(const [id,n] of effects){const a=s.accounts.find(a=>a.id===id);if(!a||a.balance===null)throw Error('帳戶資料唔完整。');a.balance+=n*factor}}
export function saveTransaction(s,t,apply){const next=structuredClone(s);const old=next.transactions.find(x=>x.id===t.id);if(old)applyEffects(next,old.effects,-1);t={...t,effects:effectsFor(next,t,apply)};applyEffects(next,t.effects);next.transactions=next.transactions.filter(x=>x.id!==t.id);next.transactions.push(t);return next}
export function deleteTransaction(s,id){const next=structuredClone(s),t=next.transactions.find(x=>x.id===id);if(!t)throw Error('搵唔到呢筆記錄。');applyEffects(next,t.effects,-1);next.transactions=next.transactions.filter(x=>x.id!==id);return next}
export function validate(s){
 const fail=()=>{throw Error('檔案唔係有效嘅記賬備份，原有帳本未有更改。')};
 const str=(x,max=200)=>typeof x==='string'&&x.length<=max;
 const int=x=>Number.isSafeInteger(x)&&Math.abs(x)<=100000000000;
 const nonneg=x=>int(x)&&x>=0;
 const date=x=>str(x)&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
 const unique=xs=>new Set(xs.map(x=>x.id)).size===xs.length;
 const safeId=x=>str(x,80)&&/^[a-zA-Z0-9_-]+$/.test(x);
 if(!s||s.schemaVersion!==1||s.currency!=='MOP'||!Array.isArray(s.categories)||!Array.isArray(s.transactions)||!Array.isArray(s.accounts)||!Array.isArray(s.goals)||s.transactions.length>100000||s.categories.length>500||s.goals.length>200||s.accounts.length!==4)fail();
 if(![s.categories,s.transactions,s.accounts,s.goals].every(unique))fail();
 for(const a of s.accounts)if(!['bank','mpay','cash','card'].includes(a.id)||!str(a.name)||a.type!==(a.id==='card'?'debt':'asset')||!(a.balance===null||int(a.balance)))fail();
 for(const c of s.categories)if(!safeId(c.id)||!str(c.name)||!['收入','必要支出','想要支出','投資/儲蓄'].includes(c.type)||!nonneg(c.budget))fail();
 const cats=new Set(s.categories.map(c=>c.id));
 for(const t of s.transactions){if(!safeId(t.id)||!date(t.date)||!str(t.note,3000)||!str(t.payment)||!['income','expense','invest','transfer','repay'].includes(t.kind)||!nonneg(t.amount)||!Array.isArray(t.effects)||t.effects.length>2||!str(t.type))fail();if(['expense','income','invest'].includes(t.kind)&&!cats.has(t.categoryId))fail();for(const e of t.effects)if(!Array.isArray(e)||e.length!==2||!s.accounts.some(a=>a.id===e[0]&&a.balance!==null)||!int(e[1]))fail()}
 for(const g of s.goals)if(!safeId(g.id)||!str(g.name)||!nonneg(g.target)||g.target===0||!nonneg(g.saved)||g.saved>g.target||!(g.deadline===''||date(g.deadline)))fail();
 if(!s.settings||!str(s.settings.defaultPayment)||!(s.settings.balanceAsOf===null||str(s.settings.balanceAsOf)))fail();
 if(!s.budgetOverrides||typeof s.budgetOverrides!=='object'||Array.isArray(s.budgetOverrides))fail();
 for(const [m,o] of Object.entries(s.budgetOverrides)){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)||!o||typeof o!=='object')fail();for(const [id,n] of Object.entries(o))if(!cats.has(id)||!nonneg(n))fail()}
 if(s.portfolio){const p=s.portfolio;if(!str(p.asOf)||!nonneg(p.valueMOP)||!Array.isArray(p.holdings)||p.holdings.length>500)fail();for(const h of p.holdings)if(!str(h.symbol)||!str(h.name)||!str(h.group)||!Number.isFinite(h.valueUSD)||!Number.isFinite(h.quantity)||!Number.isFinite(h.price))fail()}
 if(s.portfolio?.version===2)validatePortfolio(normalisePortfolio(s.portfolio));
 validateFinance(s);validateInvestmentPlan(s.settings.investmentPlan);validateRecurring(s);
 if(s.budgetHistory!==undefined)validateHistory(s.budgetHistory);
 return s;
}
