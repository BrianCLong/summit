"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const policy_1 = require("../src/policy");
const __dirname = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
describe("Touchpoint Policy", () => {
    test("deny fixture fails", () => {
        const p = (0, node_path_1.join)(__dirname, "fixtures/deny/invalid_touchpoint_signature.json");
        const e = JSON.parse((0, node_fs_1.readFileSync)(p, "utf8"));
        expect((0, policy_1.validateTouchpointEvent)(e).ok).toBe(false);
    });
    test("allow fixture passes", () => {
        const p = (0, node_path_1.join)(__dirname, "fixtures/allow/valid_touchpoint_signature.json");
        const e = JSON.parse((0, node_fs_1.readFileSync)(p, "utf8"));
        expect((0, policy_1.validateTouchpointEvent)(e).ok).toBe(true);
    });
    test("invalid type fails", () => {
        const p = (0, node_path_1.join)(__dirname, "fixtures/deny/invalid_touchpoint_type.json");
        const e = JSON.parse((0, node_fs_1.readFileSync)(p, "utf8"));
        const res = (0, policy_1.validateTouchpointEvent)(e);
        expect(res.ok).toBe(false);
        expect(res.reason).toBe("invalid_event_type");
    });
});
