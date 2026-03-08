"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const defaultCatalog_1 = require("../defaultCatalog");
const CostAwareRouter_1 = require("../CostAwareRouter");
(0, globals_1.describe)("CostAwareRouter", () => {
    (0, globals_1.it)("routes easy queries to cheaper models", () => {
        const r = new CostAwareRouter_1.CostAwareRouter((0, defaultCatalog_1.defaultCatalog)(), { easyMax: 0.3, mediumMax: 0.7 });
        const d = r.selectModel({ difficulty: 0.2, domain: "general" });
        (0, globals_1.expect)(d.model.costWeight).toBeLessThanOrEqual(2);
    });
    (0, globals_1.it)("routes hard queries to stronger models", () => {
        const r = new CostAwareRouter_1.CostAwareRouter((0, defaultCatalog_1.defaultCatalog)(), { easyMax: 0.3, mediumMax: 0.7 });
        const d = r.selectModel({ difficulty: 0.9, domain: "math" });
        (0, globals_1.expect)(d.model.capability).toBeGreaterThan(0.8);
    });
    (0, globals_1.it)("honors domain overrides", () => {
        const r = new CostAwareRouter_1.CostAwareRouter((0, defaultCatalog_1.defaultCatalog)(), {
            easyMax: 0.3,
            mediumMax: 0.7,
            domainOverrides: { legal: { preferModelIds: ["strong"] } }
        });
        const d = r.selectModel({ difficulty: 0.1, domain: "legal" });
        (0, globals_1.expect)(d.model.id).toBe("strong");
    });
});
