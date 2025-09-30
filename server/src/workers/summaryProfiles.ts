type Profile = 'exec'|'support'|'account';
export function adaptSummary(profile:Profile, base:{ text:string; bullets:string[]; actions:string[] }){
  if (profile==='exec') {
    return {
      text: truncate(base.text, 300),
      bullets: base.bullets.slice(0,3),
      actions: base.actions.slice(0,3)
    };
  }
  if (profile==='support') return base; // full detail
  if (profile==='account') {
    return {
      text: base.text,
      bullets: base.bullets.filter(b=>!b.toLowerCase().includes('internal')),
      actions: base.actions
    };
  }
  return base;
}
function truncate(s:string,n:number){ return s.length>n? s.slice(0,n-1)+'…': s; }