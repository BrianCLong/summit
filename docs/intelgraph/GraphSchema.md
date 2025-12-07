# Graph Schema

The IntelGraph schema is defined by a set of core Node and Edge types, backed by Neo4j constraints.

## Core Node Types

*   `Actor`: Person, Service, Agent.
*   `Organization`: Company, Team.
*   `Asset`: Repo, Service, Endpoint, Dataset, Model.
*   `Document`: Spec, PR, Ticket, Wiki.
*   `Run`: Maestro Run.
*   `Task`: Maestro Task.
*   `Incident`: Security or reliability event.
*   `Event`: Generic timeline event.

## Core Edge Types

*   `USES`: Actor -> Asset
*   `OWNS`: Org -> Asset
*   `MEMBER_OF`: Actor -> Org
*   `RUN_OF`: Run -> Tenant
*   `DEPENDS_ON`: Task -> Task
*   `RELATES_TO`: Generic

## Properties

All nodes have:
*   `globalId`: Unique UUID.
*   `tenantId`: Isolation key.
*   `entityType`: Discriminator.
*   `epistemic`: Metadata about trust/confidence.
*   `sourceRefs`: List of upstream origins.

## Constraints

*   Unique Constraint on `(n:GraphNode { globalId })`.
*   Indexes on `tenantId`, `entityType`, `validFrom`, `sourceRefs.externalId`.
