import k8s from '@kubernetes/client-node';

const kc = new k8s.KubeConfig();
try {
  kc.loadFromDefault();
} catch {}
const core = kc.makeApiClient(k8s.CoreV1Api);
const net = kc.makeApiClient(k8s.NetworkingV1Api);

export async function createSandbox(runId: string, allow: string[]) {
  const ns = `rb-${runId.slice(0, 8)}`;
  await core.createNamespace({
    metadata: { name: ns, labels: { 'maestro.run': runId } },
  } as any);
  await net.createNamespacedNetworkPolicy(ns, {
    metadata: { name: 'egress-allow' },
    spec: {
      podSelector: {},
      policyTypes: ['Egress'],
      egress: allow.map(toNetRule),
    },
  } as any);
  return ns;
}

export async function teardownSandbox(ns: string) {
  await core.deleteNamespace(ns);
}

function toNetRule(_s: string): any {
  return { to: [{ ipBlock: { cidr: '0.0.0.0/0' } }] };
}
