# IntelGraph Quickstart

Run a local slice with Neo4j, Postgres, OPA, GraphQL API, and ingest worker.

## Prereqs

- Docker + Compose, Node 20+

## Up

```bash
docker compose up -d --build
# apply constraints
cat db/neo4j/constraints.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
# run seed
cat db/neo4j/seed.cypher | docker exec -i $(docker ps -qf name=neo4j) cypher-shell -u neo4j -p neo4jpassword
# load sample data via ingest
npm --prefix ingest run demo
```

## Query

Open [http://localhost:4000/graphql](http://localhost:4000/graphql) and run:

```graphql
query {
  personById(id: "p-1") {
    id
    name
    orgs {
      org {
        name
      }
      since
    }
  }
}
```

## Tests

```bash
npm --prefix api test
npm --prefix ingest test
```
