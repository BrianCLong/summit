import { GraphQLContext } from '../context.js';

const SELF = process.env.SELF_BASE_URL || 'http://localhost:4000';

async function j(method:string, path:string, body?:any){
  const res = await fetch(SELF + path, { method, headers: { 'content-type':'application/json' }, body: body?JSON.stringify(body):undefined });
  const data = await res.json();
  return data;
}

export const cetResolvers = {
  Query: {
    caseById: async (_:unknown, { id }:{ id:string }, _ctx: GraphQLContext)=> (await j('GET', `/cases/${id}`)).case,
    caseExport: async (_:unknown, { id }:{ id:string })=> (await j('GET', `/cases/${id}/export`)).bundle,
    evidenceAnnotations: async (_:unknown, { id }:{ id:string })=> (await j('GET', `/evidence/${id}/annotations`)).items,
    triageSuggestions: async ()=> (await j('GET', `/triage/suggestions`)).items,
  },
  Mutation: {
    createCase: async (_:unknown, { title }:{ title:string })=> (await j('POST','/cases',{ title })).case,
    approveCase: async (_:unknown, { id }:{ id:string })=> (await j('POST',`/cases/${id}/approve`)).case,
    annotateEvidence: async (_:unknown, { id, range, note }:{ id:string, range:string, note:string })=> (await j('POST',`/evidence/${id}/annotations`,{ range, note })).annotation,
    triageSuggest: async (_:unknown, { type, data }:{ type:string, data:any })=> (await j('POST','/triage/suggestions',{ type, data })).suggestion,
    triageApprove: async (_:unknown, { id }:{ id:string })=> (await j('POST',`/triage/suggestions/${id}/approve`)).suggestion,
    triageMaterialize: async (_:unknown, { id }:{ id:string })=> (await j('POST',`/triage/suggestions/${id}/materialize`)).suggestion,
  }
};

