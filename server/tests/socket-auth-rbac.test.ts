import http from "http";
import ioClient from "socket.io-client";
import { initSocket } from "../src/realtime/socket";

jest.mock("../src/lib/auth.js", () => ({
  verifyToken: jest.fn(async (token: string) => {
    if (token === "admin-token") {
      return { id: "1", email: "a@example.com", role: "ADMIN" };
    }
    if (token === "viewer-token") {
      return { id: "2", email: "v@example.com", role: "VIEWER" };
    }
    throw new Error("Invalid token");
  }),
}));

describe("WebSocket JWT auth with RBAC", () => {
  let server: http.Server;
  let url: string;
  let io: any;

  beforeAll((done) => {
    server = http.createServer();
    io = initSocket(server);
    server.listen(() => {
      const address = server.address() as any;
      url = `http://localhost:${address.port}/realtime`;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it("rejects unauthorized sockets", (done) => {
    const client = ioClient(url, {
      auth: { token: "bad-token" },
      transports: ["websocket"],
    });
    client.on("connect_error", (err) => {
      expect(err.message).toBe("Unauthorized");
      client.close();
      done();
    });
  });

  it("enforces RBAC for edit events", (done) => {
    const client = ioClient(url, {
      auth: { token: "viewer-token" },
      transports: ["websocket"],
    });
    client.on("connect", () => {
      client.emit("entity_update", {
        graphId: "g1",
        entityId: "e1",
        changes: {},
      });
    });
    client.on("error", (msg) => {
      expect(msg).toBe("Forbidden");
      client.close();
      done();
    });
  });
});
