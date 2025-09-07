CREATE TABLE IF NOT EXISTS quotas (
  tenant text PRIMARY KEY,
  cpu_sec_limit integer,
  gb_sec_limit integer,
  egress_gb_limit numeric,
  runs_limit integer,
  hard boolean default false
);

CREATE TABLE IF NOT EXISTS usage_counters (
  tenant text,
  month date,
  cpu_sec bigint default 0,
  gb_sec bigint default 0,
  egress_gb numeric default 0,
  runs bigint default 0,
  PRIMARY KEY (tenant, month)
);
