import request from "supertest";
import jwt from "jsonwebtoken";
import type { Application } from "express";
import { beforeAll, beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { GeoPoint } from "../data/geoPoints";

let app: Application;

const createToken = (role = "user") =>
  jwt.sign(
    { userId: "tester", email: "tester@example.com", role },
    process.env.JWT_SECRET || "graph-analytics-secret"
  );

describe("GET /geo/points", () => {
  beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    jest.resetModules();
    const module = await import("../server");
    app = module.app;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns spatial points ordered deterministically", async () => {
    const token = createToken();
    const bbox = "-180,-90,180,90";

    const firstResponse = await request(app)
      .get("/geo/points")
      .query({ bbox })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const secondResponse = await request(app)
      .get("/geo/points")
      .query({ bbox })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const expectedOrder = [
      "p-delhi-001",
      "p-nyc-002",
      "p-nyc-001",
      "p-la-001",
      "p-lon-001",
      "p-sydney-001",
    ];

    const firstIds = (firstResponse.body as { points: GeoPoint[] }).points.map((point) => point.id);
    const secondIds = (secondResponse.body as { points: GeoPoint[] }).points.map(
      (point) => point.id
    );

    expect(firstIds).toEqual(expectedOrder);
    expect(secondIds).toEqual(expectedOrder);
  });

  it("applies bbox filtering with stable ordering and limits", async () => {
    const token = createToken("admin");
    const bbox = "-75,40,-73,41";

    const firstResponse = await request(app)
      .get("/geo/points")
      .query({ bbox, limit: 1 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const secondResponse = await request(app)
      .get("/geo/points")
      .query({ bbox, limit: 1 })
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const expected = ["p-nyc-002"];

    expect((firstResponse.body as { points: GeoPoint[] }).points.map((p) => p.id)).toEqual(
      expected
    );
    expect((secondResponse.body as { points: GeoPoint[] }).points.map((p) => p.id)).toEqual(
      expected
    );
  });

  it("rejects requests without a valid bbox", async () => {
    const token = createToken();

    await request(app)
      .get("/geo/points")
      .query({ bbox: "bad,bbox" })
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
  });
});
