-- Enable REPLICA IDENTITY FULL for critical tables to support safe deletes
-- IntelGraph core tables
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.tenants REPLICA IDENTITY FULL;
ALTER TABLE public.investigations REPLICA IDENTITY FULL;
ALTER TABLE public.sources REPLICA IDENTITY FULL;
ALTER TABLE public.entity_metadata REPLICA IDENTITY FULL;
ALTER TABLE public.relationship_metadata REPLICA IDENTITY FULL;
-- Requested tables (uncommented as per user request scope, even if not in current schema dump)
ALTER TABLE public.accounts REPLICA IDENTITY FULL;
ALTER TABLE public.contacts REPLICA IDENTITY FULL;
-- Edges are typically many tables, handling specific known ones or providing a template
-- ALTER TABLE public.edges_follows REPLICA IDENTITY FULL;
-- ALTER TABLE public.edges_works_at REPLICA IDENTITY FULL;
