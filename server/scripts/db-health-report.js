"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const url_1 = require("url");
const dotenv_1 = __importDefault(require("dotenv"));
const dbHealth_js_1 = require("../src/db/dbHealth.js");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
dotenv_1.default.config({ path: path_1.default.join(__dirname, '..', '.env') });
async function main() {
    const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
    const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined;
    const report = await (0, dbHealth_js_1.generateDbHealthReport)({ limit });
    const output = (0, dbHealth_js_1.formatDbHealthReport)(report);
    console.log(output);
}
main().catch((error) => {
    console.error('Failed to generate DB health report:', error);
    process.exitCode = 1;
});
