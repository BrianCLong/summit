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
exports.JsonReporter = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
/**
 * JSON reporter for CI output
 */
class JsonReporter {
    outputPath;
    results = [];
    suiteConfig;
    constructor(outputPath) {
        this.outputPath = outputPath;
    }
    async onSuiteStart(suite) {
        this.suiteConfig = suite;
        this.results = [];
    }
    async onBenchmarkStart(_config) {
        // No-op
    }
    async onBenchmarkComplete(result) {
        this.results.push(result);
    }
    async onSuiteComplete(results) {
        const output = {
            suite: this.suiteConfig,
            timestamp: new Date().toISOString(),
            results,
            summary: {
                total: results.length,
                passed: results.filter((r) => r.passed).length,
                failed: results.filter((r) => !r.passed).length,
            },
        };
        const json = JSON.stringify(output, null, 2);
        if (this.outputPath) {
            await fs.mkdir(path.dirname(this.outputPath), { recursive: true });
            await fs.writeFile(this.outputPath, json, 'utf8');
        }
        else {
            console.log(json);
        }
    }
    async onError(error, config) {
        console.error(JSON.stringify({
            error: error.message,
            benchmark: config?.name,
        }));
    }
}
exports.JsonReporter = JsonReporter;
