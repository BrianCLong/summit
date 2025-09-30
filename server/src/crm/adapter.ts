import fetch from 'node-fetch';
const CRM_API = process.env.CRM_API!;

export async function pushSummaryToCRM({ contactId, scope, refId, summary }:){
  await fetch(`${CRM_API}/v1/crm/notes`, {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({
      contactId,
      text: `[${scope.toUpperCase()} ${refId}] ${summary.text}\n- ${summary.bullets.join('\n- ')}\nActions:\n- ${summary.actions.join('\n- ')}`
    })
  });
}