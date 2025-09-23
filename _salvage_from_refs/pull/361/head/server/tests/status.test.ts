import request from "supertest";
import express from "express";
import statusRouter from "../src/routes/status.js";

describe("Status endpoint", () => {
  const app = express();
  app.use("/api/status", statusRouter);

  it("returns service information", async () => {
    const res = await request(app).get("/api/status").expect(200);
    expect(res.body).toHaveProperty("service");
    expect(res.body).toHaveProperty("version");
    expect(res.body).toHaveProperty("environment");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("timestamp");
  });
});
