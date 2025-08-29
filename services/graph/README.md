# Graph Service

Utilities for working with claim data in Neo4j.

## ClaimRepo

`ClaimRepo` persists claim nodes and relationships using a Neo4j driver.

### upsertClaim

Create or update a claim and link supporting evidence:

```ts
const claim = await repo.upsertClaim('C-1', 'an assertion', 0.9, ['e1']);
```

### getClaimById / getClaimsForCase

Retrieve stored claims:

```ts
const c = await repo.getClaimById(claim.id);
const claims = await repo.getClaimsForCase('C-1');
```

### linkContradictionById / unlinkContradictionById

Manage `CONTRADICTS` edges between claims:

```ts
await repo.linkContradictionById('claim-a', 'claim-b');
await repo.unlinkContradictionById('claim-a', 'claim-b');
```

### findContradictions

List claims contradicting a given claim:

```ts
const contradicting = await repo.findContradictions('claim-a');
```
