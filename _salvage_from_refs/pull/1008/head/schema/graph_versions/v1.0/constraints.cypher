CREATE CONSTRAINT person_id_unique IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE INDEX person_name_index IF NOT EXISTS FOR (p:Person) ON (p.name);
