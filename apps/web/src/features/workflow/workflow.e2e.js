"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const http_1 = __importDefault(require("http"));
const index_js_1 = __importDefault(require("../../../../../services/workflow/src/index.js"));
let server;
let base;
test_1.test.beforeAll(async () => {
    server = http_1.default.createServer(index_js_1.default);
    await new Promise((resolve) => server.listen(0, () => resolve()));
    const address = server.address();
    const { port } = address;
    base = `http://localhost:${port}`;
    await fetch(`${base}/wf/definition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'p',
            definition: {
                initial: 'open',
                states: {
                    open: { on: { close: 'closed' }, sla: 1 },
                    closed: { on: {} },
                },
                guards: { close: () => true },
            },
        }),
    });
    await fetch(`${base}/wf/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', definition: 'p' }),
    });
});
test_1.test.afterAll(async () => {
    server.close();
});
(0, test_1.test)('start→transition→complete with SLA countdown UI', async ({ page }) => {
    await page.setContent(`<div id="sla"></div><script>
    async function refresh(){
      const res=await fetch('${base}/wf/cases/1');
      const data=await res.json();
      document.getElementById('sla').textContent=data.slaRemaining;
    }
    refresh();
    setInterval(refresh,500);
  </script>`);
    const first = Number(await page.textContent('#sla'));
    await page.waitForTimeout(600);
    const second = Number(await page.textContent('#sla'));
    (0, test_1.expect)(second).toBeLessThan(first);
    await page.evaluate(async (base) => {
        await fetch(`${base}/wf/transition`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: '1', transition: 'close', reason: 'ok' }),
        });
    }, base);
    const state = await page.evaluate(async (base) => {
        const res = await fetch(`${base}/wf/cases/1`);
        return (await res.json()).state;
    }, base);
    (0, test_1.expect)(state).toBe('closed');
});
