// Moved from server/tests/entities.audit.test.ts
import express from "express";
import request from "supertest";
jest.mock("../src/config/database", () => {
    const query = jest.fn().mockResolvedValue({});
    return {
        getNeo4jDriver: () => ({
            session: () => ({
                run: jest.fn().mockResolvedValue({
                    records: [
                        {
                            get: () => ({
                                properties: { uuid: "123", label: "Test Entity" },
                            }),
                        },
                    ],
                }),
                close: jest.fn().mockResolvedValue(undefined),
            }),
        }),
        getPostgresPool: () => ({ query }),
    };
});
jest.mock("../src/middleware/auth", () => ({
    ensureAuthenticated: (req, _res, next) => {
        req.user = { id: "user1" };
        next();
    },
    requireRole: () => (_req, _res, next) => next(),
    requirePermission: () => (_req, _res, next) => next(),
}));
const entitiesRouter = require("../src/routes/entities");
const { getPostgresPool } = require("../src/config/database");
describe("Entities route audit logging", () => {
    it("logs view audit with null details", async () => {
        const app = express();
        app.use(express.json());
        app.use("/entities", entitiesRouter);
        const pool = getPostgresPool();
        await request(app).get("/entities/123").expect(200);
        expect(pool.query).toHaveBeenCalledTimes(1);
        const params = pool.query.mock.calls[0][1];
        expect(params[4]).toBeNull();
    });
});
//# sourceMappingURL=entities.audit.int.test.js.map