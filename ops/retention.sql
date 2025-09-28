WITH old AS (
  SELECT run_id FROM eval_runs
  WHERE created_at < EXTRACT(EPOCH FROM NOW()-INTERVAL '90 days')*1000
    AND steps IS NOT NULL
)
UPDATE eval_runs e
SET steps = NULL
FROM old o
WHERE e.run_id = o.run_id;
