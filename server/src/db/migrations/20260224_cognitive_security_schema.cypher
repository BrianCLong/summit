// Audience & Cognitive Constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (s:AudienceSegment) REQUIRE s.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (c:CognitiveState) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (a:CognitiveAttack) REQUIRE a.id IS UNIQUE;

// Influence Pathways Constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (c:NarrativeCascade) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (h:CascadeHop) REQUIRE h.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (t:TippingPointIndicator) REQUIRE t.id IS UNIQUE;

// IO Actor & Attribution Constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (a:IOActor) REQUIRE a.id IS UNIQUE;

// Indexes for common lookups
CREATE INDEX IF NOT EXISTS FOR (s:AudienceSegment) ON (s.name);
CREATE INDEX IF NOT EXISTS FOR (c:CognitiveState) ON (c.segmentId, c.timestamp);
CREATE INDEX IF NOT EXISTS FOR (c:NarrativeCascade) ON (c.narrativeId);
CREATE INDEX IF NOT EXISTS FOR (h:CascadeHop) ON (h.cascadeId);
CREATE INDEX IF NOT EXISTS FOR (t:TippingPointIndicator) ON (t.narrativeId);
CREATE INDEX IF NOT EXISTS FOR (a:IOActor) ON (a.name);
