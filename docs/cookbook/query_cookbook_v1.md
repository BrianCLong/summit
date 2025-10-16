# IntelGraph Query Cookbook v1 (PR-13)

- Shortest path between two entities
- Expand ego network with constraints
- Find potential coordination edges by co-tags
- Filter entities by sensitivity with ABAC headers
- Time-sliced queries with validFrom/validTo

Each recipe includes: purpose, headers (ABAC), GraphQL query, and curl example.

## Headers

- `authorization: role analyst` (or `role admin`)
- `x-resource-sensitivity: restricted|public`
- Endpoint: `http://localhost:4000/graphql`

## 1) Centrality for selected entities

Purpose: Fetch eigenvector/betweenness (v1 placeholder) for entities.

Query:

```
query Centrality($ids:[ID!]){ centralityAnalysis(entityIds:$ids){ id centrality{ eigenvector betweenness } clustering{ community } } }
```

curl:

```
curl -s http://localhost:4000/graphql \
 -H 'content-type: application/json' \
 -H 'authorization: role analyst' \
 -H 'x-resource-sensitivity: restricted' \
 -d '{"query":"query($ids:[ID!]){ centralityAnalysis(entityIds:$ids){ id centrality{ eigenvector betweenness } clustering{ community } } }","variables":{"ids":["A1","A2"]}}' | jq .
```

Example response:

```
{
  "data": {
    "centralityAnalysis": [
      { "id": "A1", "centrality": { "eigenvector": 0.42, "betweenness": 0.18 }, "clustering": { "community": "C12" } }
    ]
  }
}
```

## 2) Communities overview

Purpose: See community groupings by property (placeholder for GDS).

Query:

```
query { communityDetection(entityIds:[], algorithm:"louvain") }
```

curl:

```
curl -s http://localhost:4000/graphql -H 'content-type: application/json' \
 -d '{"query":"{ communityDetection(entityIds:[], algorithm:\"louvain\") }"}' | jq .
```

## 3) ABAC Simulation

Purpose: Preview allowed fields under policy.

Query:

```
query Policy($a:String!,$s:String!){ policySim(action:$a,sensitivity:$s){ allow fields reason } }
```

curl:

```
curl -s http://localhost:4000/graphql -H 'content-type: application/json' \
 -d '{"query":"query($a:String!,$s:String!){ policySim(action:$a,sensitivity:$s){ allow fields reason }}","variables":{"a":"read","s":"restricted"}}' | jq .
```

Example response:

```
{ "data": { "policySim": { "allow": true, "fields": ["id","kind","props:name"], "reason": null } } }
```

## 4) Coordination edges

Purpose: Co-tag-based edges for a seed account.

Query:

```
query Edges($a:ID!,$m:Float){ coordinationEdges(a:$a, minScore:$m){ a b score } }
```

curl:

```
curl -s 'http://localhost:4000/graphql' -H 'content-type: application/json' \
 -d '{"query":"query($a:ID!,$m:Float){ coordinationEdges(a:$a,minScore:$m){ a b score }}","variables":{"a":"ACC123","m":2.0}}' | jq .
```

## 5) ABAC-filtered entity fetch

Purpose: Apply field-level filtering using headers.

Query:

```
query Entity($id:ID!){ entity(id:$id){ id type name properties } }
```

curl (restricted):

```
curl -s http://localhost:4000/graphql \
 -H 'content-type: application/json' \
 -H 'authorization: role analyst' \
 -H 'x-resource-sensitivity: restricted' \
 -d '{"query":"query($id:ID!){ entity(id:$id){ id type name properties }}","variables":{"id":"A1"}}' | jq .
```

## 6) Link Prediction (REST)

```
curl -s 'http://localhost:4000/analytics/link-prediction?seeds=A1,A2,A3' | jq .
```

## 7) LP→Edge Triage (REST)

Create a suggestion and materialize:

```
SID=$(curl -s -X POST http://localhost:4000/triage/suggestions -H 'content-type: application/json' -d '{"type":"link","data":{"a":"A1","b":"A2"}}' | jq -r .suggestion.id)
curl -s -X POST http://localhost:4000/triage/suggestions/$SID/approve | jq .
curl -s -X POST http://localhost:4000/triage/suggestions/$SID/materialize | jq .
```

## 8) Cases and Evidence (REST)

```
CID=$(curl -s -X POST http://localhost:4000/cases -H 'content-type: application/json' -d '{"title":"Test Case"}' | jq -r .case.id)
curl -s http://localhost:4000/cases/$CID | jq .
curl -s -X POST http://localhost:4000/cases/$CID/approve | jq .
curl -s http://localhost:4000/cases/$CID/export | jq .
curl -s -X POST http://localhost:4000/evidence/EV1/annotations -H 'content-type: application/json' -d '{"range":"p1-5","note":"Flag"}' | jq .
curl -s http://localhost:4000/evidence/EV1/annotations | jq .
```

Screenshot: ![Centrality](./screenshots/centrality.png)
Screenshot: ![Communities](./screenshots/communities.png)
Screenshot: ![PolicySim](./screenshots/policysim.png)
Screenshot: ![CoordEdges](./screenshots/coord_edges.png)
Screenshot: ![Triage](./screenshots/triage.png)
Screenshot: ![CasesEvidence](./screenshots/cases.png)
