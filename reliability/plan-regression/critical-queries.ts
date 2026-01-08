import { CriticalQuery } from "./types";

export const criticalQueries: CriticalQuery[] = [
  {
    id: "open-investigations",
    description:
      "Top open investigations ordered by priority and recency; should stay on the status/priority covering index.",
    sql: `
      SELECT id, owner_id, status, priority, created_at
      FROM plan_regression.investigations
      WHERE status = 'open'
      ORDER BY priority DESC, created_at DESC
      LIMIT 20;
    `,
    tags: ["index-coverage", "investigation-dashboard"],
  },
  {
    id: "investigation-activity-fanout",
    description:
      "Aggregates activity by investigation to validate join strategy and row estimate stability.",
    sql: `
      SELECT i.id, i.priority, COUNT(al.*) AS activity_events
      FROM plan_regression.investigations i
      LEFT JOIN plan_regression.activity_log al ON al.investigation_id = i.id
      WHERE i.status = 'open'
      GROUP BY i.id, i.priority
      ORDER BY activity_events DESC
      LIMIT 15;
    `,
    tags: ["join-shape", "fanout-guardrail"],
  },
  {
    id: "investigation-entity-resolution",
    description:
      "Join-heavy lookup that simulates entity resolution across actors touching an investigation.",
    sql: `
      SELECT i.id, e.entity_type, COUNT(*) AS related_entities
      FROM plan_regression.investigations i
      JOIN plan_regression.activity_log al ON al.investigation_id = i.id
      JOIN plan_regression.entities e ON e.id = al.actor_id
      WHERE i.priority = 'high'
      GROUP BY i.id, e.entity_type
      ORDER BY related_entities DESC, i.id
      LIMIT 25;
    `,
    tags: ["join-ordering", "high-priority-path"],
  },
];
