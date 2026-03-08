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
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
(async () => {
    const base = process.env.APP_BASE_URL || 'http://localhost:5173';
    const browser = await playwright_1.chromium.launch();
    const page = await browser.newPage();
    const paths = ['/', '/settings', '/projects', '/exports'];
    const catalog = {};
    for (const p of paths) {
        await page.goto(base + p, { waitUntil: 'networkidle' });
        const texts = await page.$$eval('body *', (els) => els
            .map((el) => ({
            t: el.innerText?.trim() || '',
            a: el.getAttribute('aria-label') || '',
        }))
            .filter((x) => (x.t && x.t.length < 200) || x.a)
            .map((x) => x.a || x.t));
        catalog[p] = Array.from(new Set(texts.filter(Boolean)));
    }
    fs.mkdirSync('docs/ops/ui', { recursive: true });
    fs.writeFileSync('docs/ops/ui/ui-catalog.json', JSON.stringify({ base, catalog }, null, 2));
    await browser.close();
})();
