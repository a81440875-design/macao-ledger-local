import {KEY} from './model.js';
const META=KEY+':backup-meta';
export const readMeta=()=>{try{return JSON.parse(localStorage.getItem(META)||'{}')}catch{return {}}};
export const writeMeta=m=>localStorage.setItem(META,JSON.stringify(m));
export const summary=s=>({transactions:s.transactions.length,goals:s.goals.length,holdings:s.portfolio?.holdings?.length||0,closes:s.investmentCloses?.length||0});
export function unpackBackup(raw){const x=JSON.parse(raw);return {state:x.format==='ledger-backup-v2'?x.ledger:x,createdAt:x.exportedAt||x.settings?.lastBackup||null}}
async function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open(KEY+':recovery',1);r.onupgradeneeded=()=>r.result.createObjectStore('versions',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('未能建立本機還原副本，請先匯出備份。'))})}
export async function localCheckpoint(state,label){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('versions','readwrite'),store=tx.objectStore('versions'),entry={id:crypto.randomUUID(),createdAt:new Date().toISOString(),label,state:structuredClone(state),...summary(state)};store.put(entry);const r=store.getAll();r.onsuccess=()=>r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(10).forEach(x=>store.delete(x.id));tx.oncomplete=()=>resolve(entry);tx.onerror=()=>reject(Error('本機還原副本未能儲存，操作已停止。'))})}finally{db.close()}}
export async function localVersions(){const db=await database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('versions').objectStore('versions').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));r.onerror=()=>reject(Error('未能讀取本機副本。'))})}finally{db.close()}}
