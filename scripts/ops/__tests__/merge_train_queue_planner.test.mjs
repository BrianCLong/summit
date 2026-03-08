import test from "node:test";
import assert from "node:assert/strict";

import {
  QUEUE_LABELS,
  buildPlan,
  classifyPr,
  sortForMerge,
} from "../merge_train_queue_planner.mjs";

const now = new Date("2026-03-01T00:00:00Z");

test("classifyPr assigns queue labels using deterministic policy", () => {
  const options = { now, staleDays: 30 };

  assert.equal(
    classifyPr(
      {
        number: 1,
        mergeable: "MERGEABLE",
        labels: ["prio:P0"],
        statusCheckRollup: { state: "SUCCESS" },
        updatedAt: "2026-02-28T10:00:00Z",
      },
      options
    ),
    QUEUE_LABELS.mergeNow
  );

  assert.equal(
    classifyPr(
      {
        number: 2,
        mergeable: "CONFLICTING",
        labels: [],
        statusCheckRollup: { state: "SUCCESS" },
        updatedAt: "2026-02-28T10:00:00Z",
      },
      options
    ),
    QUEUE_LABELS.conflict
  );

  assert.equal(
    classifyPr(
      {
        number: 3,
        mergeable: "MERGEABLE",
        commitsBehindBase: 7,
        labels: [],
        statusCheckRollup: { state: "FAILURE" },
        updatedAt: "2026-02-28T10:00:00Z",
      },
      options
    ),
    QUEUE_LABELS.needsRebase
  );

  assert.equal(
    classifyPr(
      {
        number: 4,
        labels: ["duplicate"],
        mergeable: "MERGEABLE",
        statusCheckRollup: { state: "SUCCESS" },
        updatedAt: "2026-02-28T10:00:00Z",
      },
      options
    ),
    QUEUE_LABELS.obsolete
  );
});

test("sortForMerge orders by priority then stale updatedAt", () => {
  const ordered = sortForMerge([
    {
      number: 20,
      mergeable: "MERGEABLE",
      labels: ["prio:P2"],
      statusCheckRollup: { state: "SUCCESS" },
      updatedAt: "2026-02-28T10:00:00Z",
    },
    {
      number: 10,
      mergeable: "MERGEABLE",
      labels: ["prio:P0"],
      statusCheckRollup: { state: "SUCCESS" },
      updatedAt: "2026-02-28T11:00:00Z",
    },
    {
      number: 11,
      mergeable: "MERGEABLE",
      labels: ["prio:P0"],
      statusCheckRollup: { state: "SUCCESS" },
      updatedAt: "2026-02-20T11:00:00Z",
    },
  ]);

  assert.deepEqual(
    ordered.map((pr) => pr.number),
    [11, 10, 20]
  );
});

test("buildPlan creates queue counts and batch picks", () => {
  const options = { now, staleDays: 30, batchSize: 2 };
  const plan = buildPlan(
    [
      {
        number: 1,
        title: "P0 green",
        mergeable: "MERGEABLE",
        labels: ["prio:P0"],
        statusCheckRollup: { state: "SUCCESS" },
        updatedAt: "2026-02-20T00:00:00Z",
      },
      {
        number: 2,
        title: "P1 green",
        mergeable: "MERGEABLE",
        labels: ["prio:P1"],
        statusCheckRollup: { state: "SUCCESS" },
        updatedAt: "2026-02-21T00:00:00Z",
      },
      {
        number: 3,
        title: "conflict",
        mergeable: "CONFLICTING",
        labels: ["prio:P0"],
        statusCheckRollup: { state: "SUCCESS" },
        updatedAt: "2026-02-21T00:00:00Z",
      },
    ],
    options
  );

  assert.equal(plan.queueCounts[QUEUE_LABELS.mergeNow], 2);
  assert.equal(plan.queueCounts[QUEUE_LABELS.conflict], 1);
  assert.deepEqual(plan.nextBatch, [1, 2]);
});
