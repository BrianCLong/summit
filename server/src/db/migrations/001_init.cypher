// Constraints
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (r:Relationship) REQUIRE r.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE;

// Indexes (for common lookup properties, beyond unique constraints)
CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.type);
CREATE INDEX IF NOT EXISTS FOR ()-[r:Relationship]-() ON (r.type);

// Example: Index for specific properties on common labels if needed
// CREATE INDEX IF NOT EXISTS FOR (p:Person) ON (p.name);
// CREATE INDEX IF NOT EXISTS FOR (o:Org) ON (o.name);