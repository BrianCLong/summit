"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const node_http_1 = __importDefault(require("node:http"));
const __filename = (0, node_url_1.fileURLToPath)(import.meta.url);
const __dirname = node_path_1.default.dirname(__filename);
const OUT_DIR = node_path_1.default.resolve(__dirname, '../../docs/cookbook/screenshots');
const BASE_URL = process.env.UI_URL || 'http://localhost:3000';
const LOG_FILE = node_path_1.default.resolve(__dirname, '../../git-hook.log');
const METADATA_FILE = node_path_1.default.join(OUT_DIR, 'metadata.json');
// Global timeout to ensure we don't hang pre-commit
const globalTimeout = setTimeout(() => {
    log('Global timeout reached (25s). Exiting.');
    process.exit(0);
}, 25000);
globalTimeout.unref(); // Allow process to exit if work finishes early
// Ensure output directory exists
if (!node_fs_1.default.existsSync(OUT_DIR)) {
    node_fs_1.default.mkdirSync(OUT_DIR, { recursive: true });
}
function log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    console.log(message);
    try {
        node_fs_1.default.appendFileSync(LOG_FILE, entry);
    }
    catch (e) {
        // ignore
    }
}
async function checkServer(url) {
    return new Promise((resolve) => {
        const req = node_http_1.default.get(url, (res) => {
            resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => {
            req.destroy();
            resolve(false);
        });
    });
}
async function capturePlaceholder(page, filepath, name) {
    try {
        const html = `
      <html>
        <body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0;font-family:sans-serif;">
          <div style="text-align:center;color:#666;">
            <h1>${name}</h1>
            <p>Screenshot capture failed</p>
            <p>${new Date().toISOString()}</p>
          </div>
        </body>
      </html>
    `;
        const dataUrl = `data:text/html;base64,${Buffer.from(html).toString('base64')}`;
        await page.goto(dataUrl);
        await page.screenshot({ path: filepath });
    }
    catch (e) {
        log(`Failed to generate placeholder for ${name}: ${e}`);
    }
}
const TASKS = [
    {
        name: 'main',
        fn: async (page) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
            await page.screenshot({ path: node_path_1.default.join(OUT_DIR, 'main.png'), fullPage: true });
        }
    },
    {
        name: 'copilot',
        fn: async (page) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
            const ta = page.locator('textarea').first();
            if (await ta.isVisible()) {
                await ta.fill('shortest path from A1 to A2');
            }
            await page.screenshot({ path: node_path_1.default.join(OUT_DIR, 'copilot.png') });
        }
    },
    {
        name: 'ingest',
        fn: async (page) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
            const ingest = page.getByText('Ingest Wizard', { exact: false }).first();
            if (await ingest.count() > 0) {
                await ingest.scrollIntoViewIfNeeded();
                await ingest.screenshot({ path: node_path_1.default.join(OUT_DIR, 'ingest.png') });
            }
            else {
                throw new Error('Ingest Wizard not found');
            }
        }
    },
    {
        name: 'admin',
        fn: async (page) => {
            await page.goto(BASE_URL);
            await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => { });
            const admin = page.getByText('Admin', { exact: false }).first();
            if (await admin.count() > 0) {
                await admin.scrollIntoViewIfNeeded();
                await admin.screenshot({ path: node_path_1.default.join(OUT_DIR, 'admin.png') });
            }
            else {
                throw new Error('Admin section not found');
            }
        }
    }
];
async function runTask(task, browser) {
    let context;
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
        try {
            attempts++;
            context = await browser.newContext();
            const page = await context.newPage();
            // Timeout per page: 5s
            await Promise.race([
                task.fn(page),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout 5s')), 5000))
            ]);
            await context.close();
            return { name: task.name, success: true };
        }
        catch (e) {
            log(`Task ${task.name} failed attempt ${attempts}: ${e.message}`);
            if (context)
                await context.close().catch(() => { });
            if (attempts === maxAttempts) {
                // Generate placeholder
                context = await browser.newContext();
                const page = await context.newPage();
                await capturePlaceholder(page, node_path_1.default.join(OUT_DIR, `${task.name}.png`), task.name);
                await context.close();
                return { name: task.name, success: false };
            }
            // Short delay before retry
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return { name: task.name, success: false };
}
async function main() {
    log('Starting screenshot generation...');
    const serverRunning = await checkServer(BASE_URL);
    if (!serverRunning) {
        log(`Server not running at ${BASE_URL}. Skipping screenshots.`);
        node_fs_1.default.writeFileSync(METADATA_FILE, JSON.stringify({ status: 'skipped', reason: 'server_down' }, null, 2));
        process.exit(0);
    }
    let browser;
    try {
        browser = await test_1.chromium.launch();
    }
    catch (e) {
        log(`Failed to launch browser: ${e.message}`);
        process.exit(0);
        return;
    }
    const finalResults = [];
    const chunks = [];
    for (let i = 0; i < TASKS.length; i += 3) {
        chunks.push(TASKS.slice(i, i + 3));
    }
    for (const chunk of chunks) {
        const chunkResults = await Promise.all(chunk.map(t => runTask(t, browser)));
        finalResults.push(...chunkResults);
    }
    await browser.close();
    const metadata = {
        timestamp: new Date().toISOString(),
        results: finalResults
    };
    node_fs_1.default.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
    log('Screenshot generation complete.');
}
main().catch(e => {
    log(`Unhandled error: ${e.message}`);
    process.exit(0);
});
