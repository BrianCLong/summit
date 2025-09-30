export function sentiment(text:string){
  // Lightweight placeholder: score -1..1, label
  const lc = (text||'').toLowerCase();
  const neg = ['blocked','concern','angry','delay','bad','issue'].some(w=>lc.includes(w));
  const pos = ['great','good','thanks','love','perfect','resolved'].some(w=>lc.includes(w));
  const score = pos ? 0.6 : neg ? -0.6 : 0.0;
  const label = score>0.2?'pos':score<-0.2?'neg':'neu';
  return { score, label, confidence: 0.6 };
}