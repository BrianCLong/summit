import request from "supertest";
import { describe, it, expect, beforeAll, vi } from "vitest";
import app from "../src/index";
import { IncidentService } from "../src/services/incident.service";
import axios from "axios";

// Mock the axios library
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

describe("Incident API", () => {
  const incidentService = new IncidentService();
  let createdIncidentId: string;

  beforeAll(() => {
    // Always return a successful authorization from the mock
    mockedAxios.post.mockResolvedValue({ data: { result: true } });

    // Seed an incident for GET and PATCH tests
    const incident = incidentService.createIncident({
      tenant_id: "tenant-123",
      title: "Initial Incident",
      severity: "high",
      owner_id: "user-456",
      tags: ["initial-tag"],
    });
    createdIncidentId = incident.id;
  });

  describe("POST /incidents", () => {
    it("should create a new incident and return it", async () => {
      const incidentData = {
        tenant_id: "tenant-123",
        title: "Critical System Outage",
        description: "The primary database is unresponsive.",
        severity: "critical",
        owner_id: "user-456",
        tags: ["database", "critical-impact"],
      };

      const response = await request(app)
        .post("/incidents")
        .send(incidentData)
        .set("Accept", "application/json");

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Incident created successfully");
      expect(response.body.data).toBeInstanceOf(Object);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe("open");
      expect(response.body.data.title).toBe(incidentData.title);
    });

    it("should return a 400 Bad Request if required fields are missing", async () => {
      const incidentData = {
        tenant_id: "tenant-123",
      };

      const response = await request(app)
        .post("/incidents")
        .send(incidentData)
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
    });
  });

  describe("GET /incidents", () => {
    it("should return a list of incidents", async () => {
      const response = await request(app).get("/incidents").set("x-tenant-id", "tenant-123");

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("should filter incidents by tag", async () => {
      const response = await request(app)
        .get("/incidents?tag=initial-tag")
        .set("x-tenant-id", "tenant-123");

      expect(response.status).toBe(200);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0].tags).toContain("initial-tag");
    });
  });

  describe("GET /incidents/:id", () => {
    it("should return a single incident", async () => {
      const response = await request(app)
        .get(`/incidents/${createdIncidentId}`)
        .set("x-tenant-id", "tenant-123");

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(createdIncidentId);
    });

    it("should return 404 for a non-existent incident", async () => {
      const response = await request(app)
        .get("/incidents/non-existent-id")
        .set("x-tenant-id", "tenant-123");

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /incidents/:id", () => {
    it("should update an incident", async () => {
      const updates = {
        status: "investigating" as const,
        severity: "medium" as const,
      };
      const response = await request(app)
        .patch(`/incidents/${createdIncidentId}`)
        .send(updates)
        .set("x-tenant-id", "tenant-123");

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(updates.status);
      expect(response.body.data.severity).toBe(updates.severity);
    });

    it("should return 404 for a non-existent incident", async () => {
      const response = await request(app)
        .patch("/incidents/non-existent-id")
        .send({ status: "closed" })
        .set("x-tenant-id", "tenant-123");

      expect(response.status).toBe(404);
    });
  });
});
