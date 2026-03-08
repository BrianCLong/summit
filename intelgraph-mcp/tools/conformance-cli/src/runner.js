"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAll = runAll;
const latency = __importStar(require("./checks/latency"));
const auth = __importStar(require("./checks/auth"));
const sandbox = __importStar(require("./checks/sandbox"));
const schema = __importStar(require("./checks/schema"));
const provenance = __importStar(require("./checks/provenance"));
const transport = __importStar(require("./checks/transport"));
const jsonrpc = __importStar(require("./checks/jsonrpc"));
const jsonrpcPositive = __importStar(require("./checks/jsonrpcPositive"));
const discovery = __importStar(require("./checks/discovery"));
async function runAll(endpoint, token) {
    const ctx = { endpoint, token };
    const checks = (await Promise.all([
        latency.run(ctx),
        auth.run(ctx),
        sandbox.run(ctx),
        schema.run(ctx),
        provenance.run(ctx),
        transport.run(ctx),
        jsonrpc.run(ctx),
        jsonrpcPositive.run(ctx),
        discovery.run(ctx),
    ]));
    const passed = checks.filter((c) => c.pass).length;
    return {
        summary: {
            passed,
            failed: checks.length - passed,
        },
        checks,
    };
}
