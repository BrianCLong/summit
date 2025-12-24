-- Create distinct schemas for each service
create schema if not exists prov_ledger_v1;
create schema if not exists zk_tx_v1;
-- add more as needed; teams own their migrations.
