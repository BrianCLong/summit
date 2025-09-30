export function enqueue(action:any){
  const k='offline:queue'; const q = JSON.parse(localStorage.getItem(k)||'[]'); q.push({ts:Date.now(), action}); localStorage.setItem(k, JSON.stringify(q));
}
export async function replay(){
  const k='offline:queue'; const q = JSON.parse(localStorage.getItem(k)||'[]');
  const ok=[]; for (const item of q){
    try { await fetch(item.action.url, item.action.opts); } catch { continue; }
    ok.push(item);
  }
  if (ok.length) localStorage.setItem(k, JSON.stringify(q.slice(ok.length)));
}
window.addEventListener('online', ()=>replay());