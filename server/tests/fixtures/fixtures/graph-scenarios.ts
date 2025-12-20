export const SCENARIO_SIMPLE_GRAPH = {
  entities: [
    {
      id: 'entity-1',
      type: 'Person',
      properties: { name: 'Alice', role: 'Analyst' },
    },
    {
      id: 'entity-2',
      type: 'Organization',
      properties: { name: 'Acme Corp' },
    },
    {
      id: 'entity-3',
      type: 'Person',
      properties: { name: 'Bob', role: 'Engineer' },
    },
  ],
  relationships: [
    {
      id: 'rel-1',
      type: 'WORKS_FOR',
      from: 'entity-1',
      to: 'entity-2',
      properties: { start_date: '2023-01-01' },
    },
    {
      id: 'rel-2',
      type: 'WORKS_FOR',
      from: 'entity-3',
      to: 'entity-2',
      properties: { start_date: '2023-02-01' },
    },
    {
      id: 'rel-3',
      type: 'KNOWS',
      from: 'entity-1',
      to: 'entity-3',
      properties: { since: '2023-03-01' },
    },
  ],
};

export const SCENARIO_FRAUD_RING = {
  entities: [
    {
      id: 'p1',
      type: 'Person',
      properties: { name: 'Fraudster A', risk: 'high' },
    },
    {
      id: 'p2',
      type: 'Person',
      properties: { name: 'Fraudster B', risk: 'high' },
    },
    { id: 'addr1', type: 'Address', properties: { street: '123 Fake St' } },
    { id: 'comp1', type: 'Company', properties: { name: 'Shell Corp' } },
  ],
  relationships: [
    { type: 'LIVES_AT', from: 'p1', to: 'addr1' },
    { type: 'LIVES_AT', from: 'p2', to: 'addr1' },
    { type: 'OWNS', from: 'p1', to: 'comp1' },
    { type: 'OWNS', from: 'p2', to: 'comp1' },
  ],
};
