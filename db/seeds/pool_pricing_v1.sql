-- Seed pools and pricing for cost-aware scheduling
INSERT INTO pool_registry (id, region, labels, capacity) VALUES
  ('eu-west-1-pool-a', 'eu-west-1', '{general}', 10),
  ('us-east-1-pool-a', 'us-east-1', '{general}', 10)
ON CONFLICT (id) DO UPDATE SET region=EXCLUDED.region, labels=EXCLUDED.labels, capacity=EXCLUDED.capacity;

INSERT INTO pool_pricing (pool_id, cpu_sec_usd, gb_sec_usd, egress_gb_usd) VALUES
  ('eu-west-1-pool-a', 0.000015, 0.000010, 0.12),
  ('us-east-1-pool-a', 0.000012, 0.000009, 0.09)
ON CONFLICT (pool_id) DO UPDATE SET cpu_sec_usd=EXCLUDED.cpu_sec_usd, gb_sec_usd=EXCLUDED.gb_sec_usd, egress_gb_usd=EXCLUDED.egress_gb_usd;
