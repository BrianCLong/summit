CREATE CONSTRAINT artifact_id_unique IF NOT EXISTS
FOR (a:Artifact) REQUIRE a.artifact_id IS UNIQUE;

CREATE CONSTRAINT actor_id_unique IF NOT EXISTS
FOR (a:Actor) REQUIRE a.actor_id IS UNIQUE;

CREATE CONSTRAINT narrative_id_unique IF NOT EXISTS
FOR (n:Narrative) REQUIRE n.narrative_id IS UNIQUE;

CREATE CONSTRAINT frame_id_unique IF NOT EXISTS
FOR (f:Frame) REQUIRE f.frame_id IS UNIQUE;

CREATE CONSTRAINT claim_id_unique IF NOT EXISTS
FOR (c:Claim) REQUIRE c.claim_id IS UNIQUE;

CREATE CONSTRAINT assumption_id_unique IF NOT EXISTS
FOR (s:Assumption) REQUIRE s.assumption_id IS UNIQUE;

CREATE INDEX actor_handle_idx IF NOT EXISTS
FOR (a:Actor) ON (a.handle);

CREATE INDEX narrative_state_idx IF NOT EXISTS
FOR (n:Narrative) ON (n.state);
