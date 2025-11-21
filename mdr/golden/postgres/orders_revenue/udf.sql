CREATE OR REPLACE FUNCTION "orders_revenue_v1"()
RETURNS TABLE (
  "order_id" TEXT,
  "customer_id" TEXT,
  "total_revenue" NUMERIC,
  "order_count" BIGINT
)
AS $$
SELECT
  "order_id",
  "customer_id",
  SUM(amount) AS "total_revenue",
  COUNT(DISTINCT order_id) AS "order_count"
FROM analytics.orders
WHERE
  "order_status" = 'completed'
GROUP BY
  "order_id",
  "customer_id"
$$ LANGUAGE SQL;
