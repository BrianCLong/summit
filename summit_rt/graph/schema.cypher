// Minimal constraints; apply via migration runner
CREATE CONSTRAINT entity_uid IF NOT EXISTS
FOR (e:Entity) REQUIRE e.uid IS UNIQUE;
