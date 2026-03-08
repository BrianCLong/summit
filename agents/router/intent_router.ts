export type Intent = 'qa' | 'summarize' | 'draft' | 'execute';

export function routeIntent(query: string): Intent {
  if (query.toLowerCase().includes('summarize')) return 'summarize';
  if (query.toLowerCase().includes('draft')) return 'draft';
  if (query.toLowerCase().includes('execute') || query.toLowerCase().includes('run')) return 'execute';
  return 'qa';
}

export function validateAction(intent: Intent, allowedTools: string[]): boolean {
  // deny-by-default logic based on intent
  if (intent === 'execute' && !allowedTools.includes('execute_command')) return false;
  return true;
}
