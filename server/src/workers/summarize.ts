export async function buildSummary(kind:string, source:any){
  // plug your LLM or rules here (OpenAI, local, etc.)
  const text = `Summary of ${kind} ${source?.title || source?.subject || ''}`;
  const bullets = ['Key point 1','Key point 2'];
  const actions = ['Follow up on X','Schedule Y'];
  return { text, bullets, actions };
}