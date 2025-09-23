# Sprint 10 Test Plan

## Tenant Isolation
- Attempt cross-tenant writes and verify denial
- Happy path write within tenant succeeds

## Policy Gates
- All mutations require OPA allow decision

## Active Learning Canary
- Build bundle and shadow deploy
- Promote on SLO pass, rollback on failure

## Disaster Recovery
- Run neo4j backup script
- Restore into fresh instance and validate checksum
