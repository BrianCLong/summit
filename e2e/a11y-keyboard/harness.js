"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockUser = void 0;
exports.trackConsoleErrors = trackConsoleErrors;
exports.primeApp = primeApp;
exports.expectNoConsoleErrors = expectNoConsoleErrors;
exports.writeA11yReport = writeA11yReport;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const test_1 = require("@playwright/test");
exports.mockUser = {
    id: 'ga-a11y-tester',
    name: 'GA Accessibility Reviewer',
    role: 'admin',
    permissions: [{ resource: '*', action: '*', effect: 'allow' }],
};
const demoAlerts = [
    {
        id: 'alert-001',
        title: 'Unusual login activity detected',
        severity: 'critical',
        status: 'open',
        description: 'Multiple failed logins followed by success from new device.',
        createdAt: new Date().toISOString(),
        priority: 'high',
        source: 'SIEM',
    },
    {
        id: 'alert-002',
        title: 'Data exfiltration spike',
        severity: 'high',
        status: 'investigating',
        description: 'Outbound traffic exceeded baseline by 450% in the last 10 minutes.',
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        priority: 'medium',
        source: 'NDR',
    },
];
const demoInvestigations = [
    {
        id: 'inv-001',
        title: 'Access anomaly review',
        status: 'active',
        priority: 'high',
        owner: 'GA Accessibility Reviewer',
    },
];
function buildGraphqlPayload() {
    return {
        data: {
            alerts: demoAlerts,
            investigations: demoInvestigations,
            entities: [],
            graphSummary: {},
            updateAlertStatus: {
                id: demoAlerts[0].id,
                status: 'investigating',
                __typename: 'Alert',
            },
        },
    };
}
function trackConsoleErrors(page) {
    const errors = [];
    const allowList = [/chrome-extension:/i, /favicon.ico/i];
    page.on('console', message => {
        if (message.type() !== 'error') {
            return;
        }
        const text = message.text();
        if (allowList.some(pattern => pattern.test(text))) {
            return;
        }
        errors.push(text);
    });
    return () => errors;
}
async function primeApp(page) {
    await page.addInitScript(({ user }) => {
        class NoopWebSocket {
            url;
            readyState = 1;
            constructor(url) {
                this.url = url;
                setTimeout(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const self = this;
                    if (self.onopen) {
                        self.onopen(new Event('open'));
                    }
                }, 0);
            }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            send() { }
            close() {
                this.readyState = 3;
            }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            addEventListener() { }
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            removeEventListener() { }
        }
        // @ts-ignore
        window.WebSocket = NoopWebSocket;
        localStorage.setItem('auth_token', 'ga-a11y-token');
        localStorage.setItem('user', JSON.stringify(user));
    }, { user: exports.mockUser });
    await page.route('**/users/me', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(exports.mockUser),
    }));
    await page.route('**/auth/login', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'ga-a11y-token', user: exports.mockUser }),
    }));
    await page.route('**/auth/logout', route => route.fulfill({ status: 204, body: '' }));
    await page.route('**/monitoring/health', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'healthy', checks: { web: 'ok' } }),
    }));
    await page.route('**/graphql', async (route) => {
        const payload = buildGraphqlPayload();
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(payload),
        });
    });
}
async function expectNoConsoleErrors(readErrors) {
    const errors = readErrors();
    (0, test_1.expect)(errors).toEqual([]);
}
async function writeA11yReport(name, payload, format = 'json') {
    const reportsDir = path_1.default.join('reports', 'a11y-keyboard');
    await promises_1.default.mkdir(reportsDir, { recursive: true });
    const targetPath = path_1.default.join(reportsDir, format === 'json' ? `${name}.json` : `${name}.html`);
    if (format === 'json') {
        await promises_1.default.writeFile(targetPath, JSON.stringify(payload, null, 2), 'utf-8');
        return targetPath;
    }
    const violations = payload?.violations || [];
    const html = `<!doctype html>
  <html lang="en">
    <head><meta charset="UTF-8"><title>${name} accessibility scan</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; }
      h1 { margin-bottom: 8px; }
      .violation { border: 1px solid #ddd; padding: 12px; margin-bottom: 8px; border-radius: 8px; }
      .impact { font-weight: bold; }
      code { background: #f6f8fa; padding: 2px 4px; border-radius: 4px; }
    </style></head>
    <body>
      <h1>${name} accessibility scan</h1>
      <p>Total violations: ${violations.length}</p>
      ${violations
        .map((v) => `
            <div class="violation">
              <div class="impact">Impact: ${v.impact}</div>
              <div><strong>${v.id}</strong>: ${v.description}</div>
              <div>Affected nodes: ${v.nodes?.length || 0}</div>
            </div>
          `)
        .join('\n')}
    </body>
  </html>`;
    await promises_1.default.writeFile(targetPath, html, 'utf-8');
    return targetPath;
}
