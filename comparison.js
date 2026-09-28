// Recorded spending only; missing months are never interpreted as zero.
export function monthSpending(state, month) {
 const expenses=state.transactions.filter(t=>t.date.startsWith(month)&&t.kind==='expense');
 if(expenses.length) return {total:expenses.reduce((n,t)=>n+t.amount,0),byCategory:Object.fromEntries(state.categories.map(c=>[c.id,expenses.filter(t=>t.categoryId===c.id).reduce((n,t)=>n+t.amount,0)])),source:'流水帳',partial:false};
 const h=(state.budgetHistory||[]).find(h=>h.month===month);
 const categories=state.categories.filter(c=>c.type.includes('支出'));
 const entries=categories.map(c=>[c.id,h?.actuals[c.name]??null]);
 const values=entries.map(e=>e[1]).filter(v=>v!==null);
 return {total:values.length?values.reduce((a,b)=>a+b,0):null,byCategory:Object.fromEntries(entries),source:values.length?'舊表參考':'未有支出資料',partial:values.length>0&&values.length<entries.length};
}
export function spendingChange(current,previous){
 if(current===null||previous===null)return null;
 return {amount:current-previous,percent:previous===0?null:(current-previous)/previous*100};
}
