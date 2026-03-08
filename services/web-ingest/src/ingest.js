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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshot = snapshot;
const playwright_1 = require("playwright");
const robots_parser_1 = __importDefault(require("robots-parser"));
const readability_1 = require("@mozilla/readability");
const jsdom_1 = require("jsdom");
const crypto_1 = __importDefault(require("crypto"));
const http = __importStar(require("node:http"));
async function allowedByRobots(targetUrl) {
    const robotsUrl = new URL('/robots.txt', targetUrl).toString();
    return new Promise((resolve) => {
        http
            .get(robotsUrl, (res) => {
            let data = '';
            res.on('data', (c) => (data += c));
            res.on('end', () => {
                try {
                    const parser = (0, robots_parser_1.default)(robotsUrl, data);
                    resolve(parser.isAllowed(targetUrl, 'IntelGraph-Symphony/1.0'));
                }
                catch {
                    resolve(true); // be permissive if robots.txt is malformed
                }
            });
        })
            .on('error', () => resolve(true));
    });
}
async function snapshot(url) {
    if (!(await allowedByRobots(url)))
        throw new Error('robots.txt disallows');
    const b = await playwright_1.chromium.launch();
    const p = await b.newPage({
        userAgent: 'IntelGraph-Symphony/1.0 (+contact@example.com)',
    });
    await p.goto(url, { waitUntil: 'networkidle' });
    const html = await p.content();
    const dom = new jsdom_1.JSDOM(html, { url });
    const article = new readability_1.Readability(dom.window.document).parse();
    await b.close();
    const hash = crypto_1.default.createHash('sha256').update(html).digest('hex');
    return {
        url,
        title: article?.title,
        text: article?.textContent,
        html,
        sha256: hash,
        fetchedAt: new Date().toISOString(),
    };
}
