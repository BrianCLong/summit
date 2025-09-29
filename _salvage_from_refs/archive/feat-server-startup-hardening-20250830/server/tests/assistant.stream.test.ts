import express from "express";
import bodyParser from "body-parser";
import request from "supertest";
import { mountAssistant } from "../src/routes/assistant";
import { requestId } from "../src/middleware/requestId";

// Minimal auth stub for tests
jest.mock("../src/middleware/auth", () => ({ auth: () => (_req: any, _res: any, next: any) => next() }));
jest.mock("../src/middleware/rateLimit", () => ({ rateLimit: () => (_req: any, _res: any, next: any) => next() }));
jest.mock("../src/db/audit", () => ({ logAssistantEvent: jest.fn().mockResolvedValue(undefined) }));

function makeApp() {
  const app = express();
  app.use(requestId());
  app.use(bodyParser.json());
  mountAssistant(app);
  return app;
}

describe("POST /assistant/stream", () => {
  it("streams tokens and completes", async () => {
    const app = makeApp();
    const res = await request(app)
      .post("/assistant/stream")
      .send({ input: "hello world" })
      .buffer(true)     // collect body
      .parse((res, cb) => {
        // Accumulate chunks as text
        res.setEncoding("utf8");
        let data = "";
        res.on("data", (c: string) => (data += c));
        res.on("end", () => cb(null, data));
      });

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);
    expect(res.text.replace(/\s+/g, " ")).toMatch(/I understand your query: hello world/);
  });
});
