CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE (p.id, p.tenant_id) IS NODE KEY;
CREATE CONSTRAINT org_id IF NOT EXISTS FOR (o:Organization) REQUIRE (o.id, o.tenant_id) IS NODE KEY;
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
