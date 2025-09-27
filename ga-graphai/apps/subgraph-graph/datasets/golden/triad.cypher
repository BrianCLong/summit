// Golden dataset for Graph subgraph smoke tests.
// Nodes represent analysts, incidents, and observables with rich relationship types.

CREATE (:Analyst { id: 'analyst-001', name: 'Aiko Rivera', region: 'AMER' });
CREATE (:Analyst { id: 'analyst-002', name: 'Theo Zhang', region: 'APAC' });
CREATE (:Analyst { id: 'analyst-003', name: 'Priya Kaur', region: 'EMEA' });

CREATE (:Incident { id: 'incident-100', severity: 'high', status: 'active' });
CREATE (:Incident { id: 'incident-101', severity: 'medium', status: 'triage' });
CREATE (:Incident { id: 'incident-102', severity: 'critical', status: 'containment' });

CREATE (:Observable { id: 'ioc-9001', type: 'ip', value: '203.0.113.10' });
CREATE (:Observable { id: 'ioc-9002', type: 'domain', value: 'spearphish.io' });
CREATE (:Observable { id: 'ioc-9003', type: 'hash', value: '8f5bc9b0' });
CREATE (:Observable { id: 'ioc-9004', type: 'user', value: 'ajones' });
CREATE (:Observable { id: 'ioc-9005', type: 'ip', value: '198.51.100.42' });

// Analyst assignments
MATCH (a:Analyst { id: 'analyst-001' }), (i:Incident { id: 'incident-100' })
MERGE (a)-[:ASSIGNED { since: date('2024-08-01') }]->(i);
MATCH (a:Analyst { id: 'analyst-002' }), (i:Incident { id: 'incident-101' })
MERGE (a)-[:ASSIGNED { since: date('2024-08-05') }]->(i);
MATCH (a:Analyst { id: 'analyst-003' }), (i:Incident { id: 'incident-102' })
MERGE (a)-[:ASSIGNED { since: date('2024-08-08') }]->(i);

// Incident ↔ Observable relationships
MATCH (i:Incident { id: 'incident-100' }), (o:Observable { id: 'ioc-9001' })
MERGE (i)-[:INDICATES { confidence: 0.7 }]->(o);
MATCH (i:Incident { id: 'incident-100' }), (o:Observable { id: 'ioc-9002' })
MERGE (i)-[:INDICATES { confidence: 0.9 }]->(o);
MATCH (i:Incident { id: 'incident-101' }), (o:Observable { id: 'ioc-9003' })
MERGE (i)-[:INDICATES { confidence: 0.6 }]->(o);
MATCH (i:Incident { id: 'incident-102' }), (o:Observable { id: 'ioc-9004' })
MERGE (i)-[:INDICATES { confidence: 0.8 }]->(o);
MATCH (i:Incident { id: 'incident-102' }), (o:Observable { id: 'ioc-9005' })
MERGE (i)-[:INDICATES { confidence: 0.95 }]->(o);

// Cross-incident linkage
MATCH (i1:Incident { id: 'incident-100' }), (i2:Incident { id: 'incident-101' })
MERGE (i1)-[:LINKED { vector: 'credential reuse' }]->(i2);
MATCH (i2:Incident { id: 'incident-101' }), (i3:Incident { id: 'incident-102' })
MERGE (i2)-[:LINKED { vector: 'shared infrastructure' }]->(i3);

// Observable co-occurrence network
MATCH (o1:Observable { id: 'ioc-9002' }), (o2:Observable { id: 'ioc-9003' })
MERGE (o1)-[:CO_OCCURS_WITH { count: 4 }]->(o2);
MATCH (o2:Observable { id: 'ioc-9003' }), (o3:Observable { id: 'ioc-9004' })
MERGE (o2)-[:CO_OCCURS_WITH { count: 6 }]->(o3);
MATCH (o3:Observable { id: 'ioc-9004' }), (o4:Observable { id: 'ioc-9005' })
MERGE (o3)-[:CO_OCCURS_WITH { count: 3 }]->(o4);

// Threat actor overlay
CREATE (:Actor { id: 'actor-omega', name: 'Omega Jackal', threatLevel: 'high' });
MATCH (a:Actor { id: 'actor-omega' }), (i:Incident { id: 'incident-102' })
MERGE (a)-[:TARGETS { campaign: 'Nightglass' }]->(i);
MATCH (a:Actor { id: 'actor-omega' }), (o:Observable { id: 'ioc-9005' })
MERGE (a)-[:OPERATES { technique: 'C2' }]->(o);
