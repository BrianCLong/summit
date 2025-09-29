import request from "supertest";
import app from "../server/src/app";

describe("/v1/health", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/v1/health").expect(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("summit-api");
  });
});