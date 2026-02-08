import { PDPService } from './decide.js';

async function verify() {
  const pdp = new PDPService();
  console.log('Testing valid request...');
  const res1 = await pdp.decide({
    tenantId: 't1',
    actorId: 'u1',
    kind: 'FlowStart',
    resource: 'valid-flow',
  });
  console.log('Result 1:', res1.decision);
  if (res1.decision !== 'allow') throw new Error('Failed valid request');

  console.log('Testing forbidden resource...');
  const res2 = await pdp.decide({
    tenantId: 't1',
    actorId: 'u1',
    kind: 'ToolInvoke',
    resource: 'forbidden-tool',
  });
  console.log('Result 2:', res2.decision);
  if (res2.decision !== 'deny') throw new Error('Failed forbidden resource');

  console.log('All PDP verification checks passed!');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
