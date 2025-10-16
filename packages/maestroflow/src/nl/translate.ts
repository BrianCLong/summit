// Deterministic keyword grammar → DSL (no LLM). Expandable via synonyms.
type Flow = { name: string; triggers: string[]; nodes: any[]; edges: any[] };
export function nlToFlow(text: string): Flow {
  const t = text.toLowerCase();
  const nodes: any[] = [];
  const edges: any[] = [];
  const add = (id: string, type: string) => {
    if (!nodes.find((n: any) => n.id === id)) nodes.push({ id, type });
  };
  if (/on (pr|pull request)/.test(t)) {
    /* trigger */
  }
  add('build', 'build');
  if (/test/.test(t))
    (add('test', 'test'), edges.push({ from: 'build', to: 'test' }));
  if (/tia|impact/.test(t))
    nodes.find((n: any) => n.id === 'test').mode = 'tia';
  if (/(deploy|rollout)/.test(t))
    (add('deploy', 'deploy'), edges.push({ from: 'test', to: 'deploy' }));
  if (/confidence\s*(>=|≥)\s*85/.test(t))
    (nodes.push({ id: 'gate', type: 'approve', cond: 'confidence>=85' }),
      edges.push({ from: 'test', to: 'gate' }, { from: 'gate', to: 'deploy' }));
  return { name: 'nl-flow', triggers: ['pull_request'], nodes, edges };
}
