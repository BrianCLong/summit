"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const test_1 = require("@playwright/test");
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
const recordVideo = process.env.RECORD_GOLDEN_PATH_VIDEO === 'true';
exports.default = (0, test_1.defineConfig)({
    timeout: 60_000,
    retries: 1,
    reporter: [
        [
            'html',
            { outputFolder: node_path_1.default.join(__dirname, 'playwright-report'), open: 'never' },
        ],
    ],
    outputDir: node_path_1.default.join(__dirname, 'test-results'),
    use: {
        baseURL: process.env.WEB_URL || 'http://localhost:3000',
        trace: 'on-first-retry',
        video: recordVideo ? 'on' : 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
});
