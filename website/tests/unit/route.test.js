"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const route_1 = require("@/lib/route");
(0, vitest_1.describe)("route utils", () => {
    (0, vitest_1.it)("detects internal paths", () => {
        (0, vitest_1.expect)((0, route_1.isInternalPath)("/summit")).toBe(true);
        (0, vitest_1.expect)((0, route_1.isInternalPath)("https://example.com")).toBe(false);
    });
});
