"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const harness_js_1 = require("./harness.js");
async function main() {
    const currentDir = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
    const fixtureAdapter = node_path_1.default.resolve(currentDir, 'fixtures/sample-adapter.js');
    const result = await (0, harness_js_1.runContractTests)(fixtureAdapter);
    if (!result.passed) {
        result.issues.forEach((issue) => {
            // eslint-disable-next-line no-console
            console.error(`✖ ${issue}`);
        });
        process.exit(1);
    }
    // eslint-disable-next-line no-console
    console.log('✔ Contract harness passed using fixture adapter');
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result.response, null, 2));
}
main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
