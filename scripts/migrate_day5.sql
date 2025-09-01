-- scripts/migrate_day5.sql
alter table interface_registry add column if not exists auth_type text check (auth_type in ('none','api_key','oauth2')) default 'none';
alter table interface_registry add column if not exists oauth_config jsonb; -- {auth_url, token_url, scopes:[], client_id_ref, secret_ref}
alter table interface_registry add column if not exists path_rules jsonb;  -- [{pattern:"/docs/**", extractor:"article_v2", headless:false}]
