import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { ReviewQueueService } from "../../review/ReviewQueueService.js";
import { ReviewAuditLog } from "../../review/ReviewAuditLog.js";
import { ReviewItem } from "../../review/models.js";

const baseItems: ReviewItem[] = [
  {
    id: "rev-1",
    type: "entity",
    status: "pending",
    createdAt: "2024-01-01T00:00:00.000Z",
    payload: { name: "Alpha" },
  },
  {
    id: "rev-2",
    type: "relationship",
    status: "pending",
    createdAt: "2024-01-02T00:00:00.000Z",
    payload: { from: "Alpha", to: "Beta" },
  },
  {
    id: "rev-3",
    type: "entity",
    status: "decided",
    createdAt: "2024-01-03T00:00:00.000Z",
  },
];

function buildFixtures() {
  const audit = new ReviewAuditLog(() => new Date("2024-01-10T00:00:00.000Z"));
  const queue = new ReviewQueueService({}, audit);
  queue.seed([...baseItems]);
  const { app } = buildApp({ reviewQueue: queue });
  return { app, queue };
}

describe("review queue", () => {
  it("filters by type and status and paginates deterministically", async () => {
    const { app } = buildFixtures();

    const firstPage = await request(app)
      .get("/review/queue")
      .query({ type: "entity", status: "pending", sort: "createdAt:asc", limit: 1 });
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.items[0].id).toBe("rev-1");
    expect(firstPage.body.nextCursor).toBe("1");

    const secondPage = await request(app)
      .get("/review/queue")
      .query({ type: "entity", status: "pending", cursor: firstPage.body.nextCursor });
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.items).toHaveLength(0);
  });

  it("serves item detail with stable data", async () => {
    const { app } = buildFixtures();
    const response = await request(app).get("/review/item/rev-2");
    expect(response.status).toBe(200);
    expect(response.body.type).toBe("relationship");
    expect(response.body.status).toBe("pending");
  });
});

describe("review decisions", () => {
  it("records an approval decision and audits with correlation id", async () => {
    const { app, queue } = buildFixtures();
    const response = await request(app)
      .post("/review/item/rev-1/decision")
      .set("x-correlation-id", "corr-123")
      .send({ action: "approve", reasonCode: "rule_match" });

    expect(response.status).toBe(201);
    expect(response.body.decision.action).toBe("approve");
    expect(response.body.decision.correlationId).toBe("corr-123");

    const audit = queue.getAuditLog();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      itemId: "rev-1",
      correlationId: "corr-123",
      action: "approve",
    });
  });

  it("enforces idempotent decisions based on correlation id", async () => {
    const { app, queue } = buildFixtures();
    await request(app)
      .post("/review/item/rev-1/decision")
      .set("x-correlation-id", "corr-repeat")
      .send({ action: "reject", reasonCode: "invalid" });

    const repeat = await request(app)
      .post("/review/item/rev-1/decision")
      .set("x-correlation-id", "corr-repeat")
      .send({ action: "reject", reasonCode: "invalid" });

    expect(repeat.status).toBe(200);
    expect(repeat.body.idempotent).toBe(true);
    expect(queue.getAuditLog()).toHaveLength(1);
  });
});
