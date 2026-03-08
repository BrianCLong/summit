"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DenyByDefaultPolicyEngine = void 0;
// Default engine: DENY EVERYTHING unless explicitly allowed by config.
class DenyByDefaultPolicyEngine {
    authorize(_action, _ctx) {
        return { allow: false, reason: "deny-by-default" };
    }
}
exports.DenyByDefaultPolicyEngine = DenyByDefaultPolicyEngine;
