// owner: data-platform
// risk: medium
// backfill_required: true
// estimated_runtime: 3m
// reversible: true
// flags: dual_write=true, shadow_read=true, cutover_enabled=false

CREATE CONSTRAINT cases_shadow_unique IF NOT EXISTS
FOR (c:CaseShadow) REQUIRE c.id IS UNIQUE;

CALL db.createNodeKey('CaseShadow', ['CaseShadow'], ['id'], {ifNotExists:true});
