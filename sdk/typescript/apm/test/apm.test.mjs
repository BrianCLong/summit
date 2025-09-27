import test from 'node:test';
import assert from 'node:assert/strict';

import { planQuery, simulateTradeoffs } from '../dist/index.js';

function buildPlanRequest(accuracy_target) {
  return {
    baseline_sql:
      'SELECT o.order_id, o.customer_id, o.total, c.name, c.email, r.region_name\n' +
      'FROM orders o\n' +
      'JOIN customers c ON o.customer_id = c.id\n' +
      'LEFT JOIN regions r ON c.region_id = r.id',
    goal: {
      required_columns: ['o.order_id', 'o.total', 'c.name'],
      accuracy_target,
    },
    tables: [
      {
        name: 'orders',
        alias: 'o',
        row_count: 10000,
        columns: ['order_id', 'customer_id', 'total'],
      },
      {
        name: 'customers',
        alias: 'c',
        row_count: 5000,
        columns: ['id', 'name', 'email', 'region_id'],
      },
      {
        name: 'regions',
        alias: 'r',
        row_count: 5,
        columns: ['id', 'region_name'],
      },
    ],
    joins: [
      {
        alias: 'r',
        accuracy_if_removed: 0.98,
        relative_cost: 3,
      },
    ],
  };
}

test('planQuery reduces exposure and join breadth', () => {
  const request = buildPlanRequest(0.95);
  const response = planQuery(request);

  assert.equal(response.removed_joins.length, 1);
  assert.equal(response.removed_joins[0], 'r');
  assert.equal(response.reduced_sql, 'SELECT o.order_id, o.total, c.name FROM orders AS o JOIN customers AS c ON o.customer_id = c.id');
  assert.ok(response.exposure_delta.reduced.columns < response.exposure_delta.baseline.columns);
  assert.ok(response.exposure_delta.reduced.rows < response.exposure_delta.baseline.rows);
  assert.ok(response.achieved_accuracy >= request.goal.accuracy_target);
});

test('planQuery respects high accuracy targets', () => {
  const request = buildPlanRequest(0.999);
  const response = planQuery(request);

  assert.equal(response.removed_joins.length, 0);
  assert.ok(response.exposure_delta.reduced.columns < response.exposure_delta.baseline.columns);
  assert.equal(response.exposure_delta.reduced.rows, response.exposure_delta.baseline.rows);
});

test('planQuery is deterministic across invocations', () => {
  const request = buildPlanRequest(0.95);
  const first = planQuery(request);
  const second = planQuery(request);

  assert.deepEqual(second, first);
});

test('simulateTradeoffs reports cost/accuracy curve', () => {
  const request = buildPlanRequest(0.95);
  const points = simulateTradeoffs({
    baseline_sql: request.baseline_sql,
    tables: request.tables,
    joins: request.joins,
  });

  assert.equal(points.length, 2);
  assert.ok(points[1].estimated_cost <= points[0].estimated_cost);
  assert.ok(points[1].achieved_accuracy <= points[0].achieved_accuracy);
});
