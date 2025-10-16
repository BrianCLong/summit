export type Lint = { id: string; level: 'warn' | 'error'; msg: string };
export function flowLint(flow: any): Lint[] {
  const out: Lint[] = [];
  if (!flow.nodes.some((n: any) => n.type === 'test'))
    out.push({
      id: 'no-tests',
      level: 'error',
      msg: 'Flow missing tests step',
    });
  const deployNeedsGate =
    flow.nodes.some((n: any) => n.type === 'deploy') &&
    !flow.nodes.some((n: any) => n.type === 'approve');
  if (deployNeedsGate)
    out.push({
      id: 'no-gate',
      level: 'warn',
      msg: 'Deploy without confidence/approval gate',
    });
  return out;
}
