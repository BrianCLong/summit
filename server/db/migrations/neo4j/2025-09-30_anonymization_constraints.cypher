// Indexes and constraints to support data anonymization tracking
CREATE CONSTRAINT anonymization_run_id_unique IF NOT EXISTS
FOR (run:AnonymizationRun)
REQUIRE run.id IS UNIQUE;

CREATE INDEX person_anonymization_run_idx IF NOT EXISTS
FOR (p:Person)
ON (p.anonymizationRunId);

CREATE INDEX person_anonymized_flag_idx IF NOT EXISTS
FOR (p:Person)
ON (p.anonymized);
