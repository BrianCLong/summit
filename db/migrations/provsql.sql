-- Enable ProvSQL extension for database-native lineage tracking
-- Note: Requires the provsql shared library to be installed on the Postgres server

CREATE EXTENSION IF NOT EXISTS provsql;

-- Example configuration for a table to be tracked
-- SELECT create_provenance_mapping('tracked_table');

-- View for provenance of a specific query
-- SELECT * FROM provenance() WHERE ...;
