"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.policyGuard = void 0;
const authz_1 = require("./authz");
exports.policyGuard = authz_1.authzMiddleware;
