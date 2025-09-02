DELETE FROM runs WHERE finished_at < now() - interval '180 days';
DELETE FROM node_logs WHERE created_at < now() - interval '30 days';
DELETE FROM ci_annotations WHERE created_at < now() - interval '1 year';
DELETE FROM audit_logs WHERE created_at < now() - interval '10 years';
DELETE FROM router_pins_history WHERE created_at < now() - interval '90 days';
VACUUM (ANALYZE);