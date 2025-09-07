INSERT INTO quotas (tenant, cpu_sec_limit, gb_sec_limit, egress_gb_limit, runs_limit, hard)
VALUES
  ('acme',   1800000,  500000,  200,  5000, false),
  ('globex', 3600000, 1000000,  500, 10000, true),
  ('initech', 900000,  200000,  100,  2000, false)
ON CONFLICT (tenant) DO UPDATE SET
  cpu_sec_limit=EXCLUDED.cpu_sec_limit,
  gb_sec_limit=EXCLUDED.gb_sec_limit,
  egress_gb_limit=EXCLUDED.egress_gb_limit,
  runs_limit=EXCLUDED.runs_limit,
  hard=EXCLUDED.hard;

