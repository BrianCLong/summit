MATCH (n) DETACH DELETE n;

UNWIND [
  {id: 'CASE-001', labels: ['Case'], props: {title: 'Supply chain anomaly triage', status: 'open', priority: 'high'}},
  {id: 'CASE-002', labels: ['Case'], props: {title: 'Insider risk follow-up', status: 'in_review', priority: 'medium'}},
  {id: 'CASE-003', labels: ['Case'], props: {title: 'Financial exposure sweep', status: 'open', priority: 'low'}},
  {id: 'org-aurora', labels: ['Organization'], props: {name: 'Aurora Dynamics', risk_score: 0.71}},
  {id: 'vendor-magnus', labels: ['Organization'], props: {name: 'Magnus Materials', risk_score: 0.63}},
  {id: 'analyst.alex', labels: ['Person'], props: {name: 'Alex Rivera', role: 'analyst'}},
  {id: 'analyst.bianca', labels: ['Person'], props: {name: 'Bianca Lee', role: 'analyst'}},
  {id: 'analyst.cameron', labels: ['Person'], props: {name: 'Cameron Ibarra', role: 'analyst'}}
] AS node
MERGE (n {id: node.id})
SET n += node.props
WITH node, n
CALL apoc.create.setLabels(n, node.labels) YIELD node AS updated
RETURN count(updated);

UNWIND [
  {from: 'CASE-001', fromLabel: 'Case', to: 'org-aurora', toLabel: 'Organization', type: 'INVOLVES'},
  {from: 'CASE-001', fromLabel: 'Case', to: 'analyst.alex', toLabel: 'Person', type: 'ASSIGNED_TO'},
  {from: 'CASE-002', fromLabel: 'Case', to: 'vendor-magnus', toLabel: 'Organization', type: 'INVOLVES'},
  {from: 'CASE-002', fromLabel: 'Case', to: 'analyst.bianca', toLabel: 'Person', type: 'ASSIGNED_TO'},
  {from: 'CASE-003', fromLabel: 'Case', to: 'analyst.cameron', toLabel: 'Person', type: 'ASSIGNED_TO'}
] AS rel
MATCH (a {id: rel.from})
MATCH (b {id: rel.to})
CALL apoc.create.relationship(a, rel.type, {display: rel.type}, b) YIELD rel AS created
RETURN count(created);
