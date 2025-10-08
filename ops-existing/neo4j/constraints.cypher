CREATE CONSTRAINT case_id_unique IF NOT EXISTS FOR (c:Case) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT ioc_value_type_unique IF NOT EXISTS FOR (i:IOC) REQUIRE (i.value, i.type) IS NODE KEY;
CREATE INDEX rel_typed_idx IF NOT EXISTS FOR ()-[r:LINKED_TO]-() ON (r.strength);

