import express from "express";
import request from "supertest";
import narrativeSimulationRouter from "../../routes/narrative-sim.js";

describe("Narrative simulation routes", () => {
  const app = express().use(express.json()).use("/api", narrativeSimulationRouter);

  const basePayload = {
    name: "City crisis drill",
    themes: ["stability", "public sentiment"],
    tickIntervalMinutes: 30,
    initialEntities: [
      {
        name: "City leadership",
        type: "actor",
        alignment: "ally",
        influence: 0.7,
        sentiment: 0.1,
        volatility: 0.3,
        resilience: 0.6,
        themes: { stability: 0.8, "public sentiment": 0.5 },
        relationships: [],
      },
      {
        name: "Civic coalition",
        type: "group",
        alignment: "neutral",
        influence: 0.5,
        sentiment: -0.2,
        volatility: 0.4,
        resilience: 0.5,
        themes: { stability: 0.6, "public sentiment": 0.7 },
        relationships: [],
      },
    ],
    initialParameters: [{ name: "public_trust", value: 0.45 }],
  };

  it("creates simulations, accepts events, and advances time", async () => {
    const createResponse = await request(app).post("/api/simulations").send(basePayload).expect(201);
    const simulationId = createResponse.body.id;
    expect(simulationId).toBeDefined();

    const entityKeys = Object.keys(createResponse.body.entities ?? {});
    const actorId = entityKeys[0];
    const targetId = entityKeys[1];

    await request(app)
      .post(`/api/simulations/${simulationId}/events`)
      .send({
        type: "social",
        actorId,
        targetIds: targetId ? [targetId] : [],
        theme: "stability",
        intensity: 1,
        sentimentShift: 0.2,
        influenceShift: 0.05,
        description: "Community briefing received strong support",
        scheduledTick: 1,
      })
      .expect(202);

    const tickResponse = await request(app)
      .post(`/api/simulations/${simulationId}/tick`)
      .send({ steps: 1 })
      .expect(200);

    expect(tickResponse.body.tick).toBe(1);
    expect(Array.isArray(tickResponse.body.recentEvents)).toBe(true);

    const stateResponse = await request(app).get(`/api/simulations/${simulationId}`).expect(200);
    expect(stateResponse.body.tick).toBe(1);
    expect(stateResponse.body.arcs.length).toBeGreaterThan(0);
  });

  it("supports LLM-driven configuration via API", async () => {
    const response = await request(app)
      .post("/api/simulations")
      .send({
        ...basePayload,
        name: "Election pulse",
        generatorMode: "llm",
        llm: { adapter: "echo", promptTemplate: "Tick {tick}: {events}" },
      })
      .expect(201);

    const simulationId = response.body.id;

    const tickResponse = await request(app)
      .post(`/api/simulations/${simulationId}/tick`)
      .send({ steps: 1 })
      .expect(200);

    expect(tickResponse.body.narrative.mode).toBe("llm");
    expect(typeof tickResponse.body.narrative.summary).toBe("string");

    const listResponse = await request(app).get("/api/simulations").expect(200);
    expect(listResponse.body.length).toBeGreaterThan(0);
  });
});
