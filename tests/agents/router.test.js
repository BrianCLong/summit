"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("../../src/agents/router/router");
const vitest_1 = require("vitest");
(0, vitest_1.test)("routeAgent", () => {
    (0, vitest_1.expect)((0, router_1.routeAgent)("refactor this")).toBe("cursor");
    (0, vitest_1.expect)((0, router_1.routeAgent)("check security")).toBe("observer");
    (0, vitest_1.expect)((0, router_1.routeAgent)("do something")).toBe("default");
});
