import {categoryBudget} from './recurring.js';

export function removeCategory(state,id,date){
 const s=structuredClone(state),c=s.categories.find(c=>c.id===id);
 if(!c||c.archivedFrom)throw Error('分類已停用。');
 c.archivedFrom=date;c.removedFrom=date;
 return s;
}

export function restoreCategory(state,id){
 const s=structuredClone(state),c=s.categories.find(c=>c.id===id);
 if(!c?.removedFrom)throw Error('呢個分類唔可以用呢個方式還原。');
 delete c.removedFrom;delete c.archivedFrom;
 return s;
}

export function editCategory(state,id,name,fixed){
 const s=structuredClone(state),c=s.categories.find(c=>c.id===id);
 name=String(name).trim();
 if(!c||!name||name.length>40||name==='信用卡')throw Error('請填有效分類名稱。');
 if(s.categories.some(x=>x.id!==id&&x.name===name))throw Error('已有同名分類，請用合併分類。');
 for(const h of s.budgetHistory||[])if(Object.hasOwn(h.actuals,c.name)&&name!==c.name){
  if(Object.hasOwn(h.actuals,name))throw Error('舊表已有同名資料，請先合併分類。');
  h.actuals[name]=h.actuals[c.name];delete h.actuals[c.name];
 }
 c.name=name;c.fixed=!!fixed;return s;
}

export function mergeCategory(state,sourceId,targetId){
 const s=structuredClone(state),from=s.categories.find(c=>c.id===sourceId),to=s.categories.find(c=>c.id===targetId);
 if(!from||!to||from.id===to.id||from.type!==to.type||from.archivedFrom||to.archivedFrom)throw Error('請選同類型嘅有效分類。');
 // Resolve each override before removing either category, preserving monthly totals.
 for(const [m,o] of Object.entries(s.budgetOverrides)){
  o[to.id]=categoryBudget(from,m,s.budgetOverrides)+categoryBudget(to,m,s.budgetOverrides);
  delete o[from.id];
 }
 to.budget+=from.budget;to.fixed=!!(to.fixed||from.fixed);
 for(const t of s.transactions)if(t.categoryId===from.id)t.categoryId=to.id;
 for(const r of s.recurring||[])if(r.categoryId===from.id)r.categoryId=to.id;
 for(const h of s.budgetHistory||[])if(Object.hasOwn(h.actuals,from.name)){
  const a=h.actuals[from.name],b=h.actuals[to.name];
  h.actuals[to.name]=a==null&&b==null?null:(a??0)+(b??0);delete h.actuals[from.name];
 }
 s.categories=s.categories.filter(c=>c.id!==from.id);return s;
}
