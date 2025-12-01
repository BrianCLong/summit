CREATE OR REPLACE VIEW "orders_revenue_v1" AS
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
;
