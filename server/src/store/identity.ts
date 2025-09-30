// Persist per-user provider tokens with refresh + rotation metadata.
export async function saveIdentityTokens({provider,userId,tokens}:{provider:'google'|'microsoft',userId:string,tokens:any}){/* upsert */}
export async function getIdentityTokens(provider:'google'|'microsoft', userId:string){/* read */}
// helper to rotate and return fresh tokens before each job
export async function ensureFresh(provider:'google'|'microsoft', userId:string){/* refresh if near expiry */}