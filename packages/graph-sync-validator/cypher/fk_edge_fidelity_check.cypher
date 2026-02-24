// Detect duplicate or orphan edges for Gate B checks.
MATCH (o:Order)-[r:PLACED_BY]->(c:Customer)
WITH o.order_id AS order_id, c.customer_id AS customer_id, count(r) AS rel_count
RETURN order_id, customer_id, rel_count
ORDER BY order_id, customer_id;
