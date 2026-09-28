export const subscriptionNames=['訂閱','訂閱','訂閱'];
export function followingMonth(m){const [y,n]=m.split('-').map(Number);return new Date(Date.UTC(y,n,1)).toISOString().slice(0,7)}
export const categoryActive=(c,date)=>!c.archivedFrom||date<c.archivedFrom;
export function categoryBudget(c,m,overrides){return c.removedFrom&&m>=c.removedFrom.slice(0,7)?0:c.archivedFrom&&m>=followingMonth(c.archivedFrom.slice(0,7))?0:overrides[m]?.[c.id]??c.budget}
const accounts={'MPay 綁定銀行':'bank','MPay 餘額':'mpay','MPay 綁定信用卡':'card','信用卡':'card','銀行轉帳':'bank','現金':'cash'};
export function prepareExpenseState(state,date){const s=structuredClone(state),m=date.slice(0,7);s.recurring??=[];s.recurringRuns??={};
 if(s.settings.expenseSetupVersion!==1){s.settings.expenseSetupVersion=1;s.settings.expenseSetupDate=date;s.settings.cardReminderDone??=[];}
 for(const r of s.recurring){if(!r.enabled||!Number.isSafeInteger(r.amount)||r.amount<=0||!['monthly','yearly'].includes(r.frequency)||m<r.startMonth)continue;const c=s.categories.find(c=>c.id===r.categoryId);if(!c||!categoryActive(c,date))continue;const months=(+m.slice(0,4)-+r.startMonth.slice(0,4))*12+(+m.slice(5)-+r.startMonth.slice(5));if(r.frequency==='yearly'&&months%12!==0)continue;
  const days=new Date(Date.UTC(+m.slice(0,4),+m.slice(5),0)).getUTCDate(),due=m+'-'+String(Math.min(r.day,days)).padStart(2,'0'),key=r.id+'|'+m;if(due>date||Object.hasOwn(s.recurringRuns,key))continue;
  const exact=s.transactions.find(t=>t.recurringKey===key);const manual=s.transactions.find(t=>t.kind==='expense'&&t.date.startsWith(m)&&t.categoryId===r.categoryId&&(t.note.includes(r.name)||['fixed-rent','fixed-phone'].includes(r.id)));
  if(exact||manual){s.recurringRuns[key]={status:exact?'created':'existing',transactionId:(exact||manual).id};continue}
  const id=crypto.randomUUID();s.transactions.push({id,date:due,kind:'expense',type:c.type,categoryId:c.id,amount:r.amount,payment:r.payment,accountId:accounts[r.payment],toAccountId:null,note:r.name,imported:false,review:true,estimated:true,recurringId:r.id,recurringKey:key,effects:[]});s.recurringRuns[key]={status:'created',transactionId:id};
 }
 return s;
}
export function validateRecurring(s){const reminder=s.settings.cardReminder;if(reminder!==undefined&&(!reminder||typeof reminder.enabled!=='boolean'||!Number.isInteger(reminder.day)||reminder.day<1||reminder.day>31))throw Error('找卡數提醒格式唔正確。');const month=x=>typeof x==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(x),txt=(x,max=1000)=>typeof x==='string'&&x.length<=max;const ids=new Set();if(s.recurring!==undefined){if(!Array.isArray(s.recurring)||s.recurring.length>200)throw Error('固定開支範本格式唔正確。');for(const r of s.recurring){if(!txt(r.id,80)||!/^[a-zA-Z0-9_-]+$/.test(r.id)||ids.has(r.id)||!txt(r.name,100)||!r.name.trim()||!s.categories.some(c=>c.id===r.categoryId&&c.type.includes('支出'))||!(r.amount===null||Number.isSafeInteger(r.amount)&&r.amount>0&&r.amount<=1e11)||!Object.hasOwn(accounts,r.payment)||!['unknown','monthly','yearly'].includes(r.frequency)||!month(r.startMonth)||!Number.isInteger(r.day)||r.day<1||r.day>31||typeof r.enabled!=='boolean'||!txt(r.original)||!txt(r.note)||r.enabled&&(r.amount===null||r.frequency==='unknown'))throw Error('固定開支範本未填齊。');ids.add(r.id)}}
 if(s.recurringRuns!==undefined){if(!s.recurringRuns||typeof s.recurringRuns!=='object'||Array.isArray(s.recurringRuns)||Object.keys(s.recurringRuns).length>100000)throw Error('自動預填歷史格式唔正確。');for(const [k,v] of Object.entries(s.recurringRuns))if(!/^[a-zA-Z0-9_-]+\|\d{4}-(0[1-9]|1[0-2])$/.test(k)||!v||!['created','existing'].includes(v.status)||!txt(v.transactionId,80))throw Error('自動預填歷史格式唔正確。')}
 if(s.settings.cardReminderDone!==undefined&&(!Array.isArray(s.settings.cardReminderDone)||s.settings.cardReminderDone.length>1200||s.settings.cardReminderDone.some(m=>!month(m))))throw Error('還款提醒記錄格式唔正確。');
 for(const c of s.categories)if(c.removedFrom!==undefined&&(c.removedFrom!==c.archivedFrom||typeof c.removedFrom!=='string'))throw Error('分類移除日期唔正確。');
 for(const c of s.categories)if(c.archivedFrom!==undefined&&(typeof c.archivedFrom!=='string'||!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(c.archivedFrom)))throw Error('分類停用日期唔正確。');
}
