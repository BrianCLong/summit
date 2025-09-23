import fs from 'fs';
import fetch from 'node-fetch';

const URL = process.env.GQL_URL!;
const TOKEN = process.env.TOKEN!;

const queries = [
  { op:"GetEntity", q:"query($id:ID!){ entity(id:$id){ id name }}", vars:{id:"G100"}},
  { op:"Neighbors1", q:"query($id:ID!){ neighbors(id:$id,depth:1){ id }}", vars:{id:"G100"}},
];

(async ()=>{
  for (const {op,q,vars} of queries){
    const res = await fetch(URL, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${TOKEN}` }, body: JSON.stringify({ operationName: op, query:q, variables: vars })});
    if (!res.ok) throw new Error('PQ register failed');
  }
  console.log('PQ warmup complete');
})();
