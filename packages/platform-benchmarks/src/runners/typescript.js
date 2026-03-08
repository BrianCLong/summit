"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeScriptRunner = void 0;
const suite_js_1 = require("../suite.js");
/**
 * TypeScript benchmark runner
 *
 * Runs benchmarks directly in the Node.js process
 */
class TypeScriptRunner {
    suite;
    constructor(config) {
        this.suite = (0, suite_js_1.createBenchmarkSuite)({
            ...config,
            name: config.name || 'TypeScript Benchmarks',
        });
    }
    /**
     * Add a benchmark
     */
    add(definition) {
        this.suite.add({
            ...definition,
            config: {
                ...definition.config,
                language: 'typescript',
            },
        });
        return this;
    }
    /**
     * Run all benchmarks
     */
    async run() {
        return this.suite.run();
    }
    /**
     * Get underlying suite
     */
    getSuite() {
        return this.suite;
    }
}
exports.TypeScriptRunner = TypeScriptRunner;
