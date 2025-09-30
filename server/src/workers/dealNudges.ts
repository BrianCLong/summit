import fetch from 'node-fetch';
import nlp from 'compromise';

const CRM_API = process.env.CRM_API!;

export async function evaluateDealNudges({ contactId, summary }:{ contactId:string, summary:{ text:string; bullets:string[]; actions:string[] }
}){
  const doc = nlp([summary.text, ...(summary.bullets||[])].join('\n'));
  const mentionsBudget = /budget|pricing|quote|cost|renewal/i.test(doc.text());
  const mentionsTimeline = /timeline|q\d|quarter|month|deadline|eom/i.test(doc.text());
  const actions: string[] = [];

  if (mentionsBudget) {
    actions.push('Move pipeline stage to: Pricing/Proposal');
    await fetch(`${CRM_API}/v1/opps/stage`,{
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ contactId, stage:'Pricing/Proposal', reason:'Detected budget discussion in summary' })
    });
  }
  if (mentionsTimeline) {
    actions.push('Create task: Confirm timeline with stakeholder');
    await fetch(`${CRM_API}/v1/tasks`,{
      method:'POST', headers:{'content-type':'application/json'},
      body: JSON.stringify({ contactId, title:'Confirm timeline', dueInDays:3 })
    });
  }
  return actions;
}