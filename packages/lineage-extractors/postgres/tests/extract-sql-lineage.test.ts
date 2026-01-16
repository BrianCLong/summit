import test from "node:test";
import assert from "node:assert/strict";
import { extractSqlLineage } from "../src/extract-sql-lineage.js";

const cfg = {
  jobNamespace: "summit",
  jobName: "unit-test",
  actor: "ci",
  sourceSha: "0123456789abcdef0",
  policyHash: "a".repeat(64),
  datasetNamespace: "public" as const
};

test("CREATE VIEW lineage: output detected and inputs from FROM/JOIN", () => {
  const sql = `
    -- comment
    CREATE VIEW analytics.v_orders AS
    SELECT o.id, c.name
    FROM public.orders o
    JOIN public.customers c ON c.id = o.customer_id;
  `;
  const r = extractSqlLineage(sql, cfg);

  assert.equal(r.outputs.length, 1);
  assert.equal(r.outputs[0].namespace, "analytics");
  assert.equal(r.outputs[0].name, "v_orders");

  assert.deepEqual(
    r.inputs.map((d) => `${d.namespace}.${d.name}`),
    ["public.customers", "public.orders"]
  );

  assert.ok(/^[0-9a-f]{64}$/.test(r.sqlHash));
  assert.equal(r.edges.length, 2);
  assert.ok(r.edges.every((e) => e.operation === "CREATE_VIEW"));
});

test("INSERT INTO ... SELECT lineage", () => {
  const sql = `
    INSERT INTO mart.daily_sales
    SELECT * FROM staging.sales_raw;
  `;
  const r = extractSqlLineage(sql, cfg);

  assert.deepEqual(r.outputs.map((d) => `${d.namespace}.${d.name}`), ["mart.daily_sales"]);
  assert.deepEqual(r.inputs.map((d) => `${d.namespace}.${d.name}`), ["staging.sales_raw"]);
  assert.equal(r.edges.length, 1);
  assert.equal(r.edges[0].operation, "INSERT_SELECT");
});

test("UPDATE ... FROM lineage", () => {
  const sql = `
    UPDATE public.orders SET total = s.total
    FROM public.sales s
    WHERE s.order_id = orders.id;
  `;
  const r = extractSqlLineage(sql, cfg);

  assert.deepEqual(r.outputs.map((d) => `${d.namespace}.${d.name}`), ["public.orders"]);
  assert.deepEqual(r.inputs.map((d) => `${d.namespace}.${d.name}`), ["public.sales"]);
  assert.equal(r.edges.length, 1);
  assert.equal(r.edges[0].operation, "UPDATE_FROM");
});

test("CTE names are not treated as input datasets", () => {
  const sql = `
    WITH recent AS (
      SELECT * FROM public.orders
    )
    CREATE VIEW public.recent_orders AS
    SELECT * FROM recent;
  `;
  const r = extractSqlLineage(sql, cfg);

  assert.deepEqual(r.outputs.map((d) => `${d.namespace}.${d.name}`), ["public.recent_orders"]);
  assert.deepEqual(r.inputs.map((d) => `${d.namespace}.${d.name}`), ["public.orders"]);
});

test("Normalization is deterministic across whitespace/comment changes", () => {
  const sqlA = `CREATE VIEW public.x AS SELECT * FROM public.t;`;
  const sqlB = `/*a*/  CREATE  VIEW public.x AS   SELECT *  FROM public.t ; --end`;
  const rA = extractSqlLineage(sqlA, cfg);
  const rB = extractSqlLineage(sqlB, cfg);

  assert.equal(rA.sqlHash, rB.sqlHash);
  assert.equal(rA.normalizedSql, rB.normalizedSql);
});
