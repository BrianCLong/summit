import { publish } from '../server/src/stream/kafka';

(async () => {
  const tenant = 't1';
  const now = new Date().toISOString();
  await publish('intelgraph.entities.v1', 'n1', { id:'n1', tenantId:tenant, type:'person', ts: now });
  await publish('intelgraph.entities.v1', 'n2', { id:'n2', tenantId:tenant, type:'domain', ts: now });
  await publish('intelgraph.edges.v1', 'n1->n2:CONTACT', { src:'n1', dst:'n2', rel:'CONTACT', tenantId:tenant, weight:1, ts: now });
  process.exit(0);
})();
