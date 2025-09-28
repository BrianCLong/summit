import { Graph } from './types';

export function buildStar(n: number): Graph {
  const nodes = Array.from({length:n}, (_,i)=>({ id: String(i), trust: Math.random()*0.3+0.35, susceptibility: Math.random()*0.5+0.25, deg: i===0? n-1 : 1 }));
  const edges = Array.from({length:n-1}, (_,i)=>({u:'0', v:String(i+1)}));
  return { nodes, edges };
}

export function neighbors(g: Graph, id: string) {
  const out = [];
  for (const e of g.edges) {
    if (e.u===id) out.push(e.v);
    else if (e.v===id) out.push(e.u);
  }
  return out;
}