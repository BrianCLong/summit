import fs from 'fs/promises'
import path from 'path'
import { expect, type Page } from '@playwright/test'

export const mockUser = {
  id: 'ga-a11y-tester',
  name: 'GA Accessibility Reviewer',
  role: 'admin',
  permissions: [{ resource: '*', action: '*', effect: 'allow' }],
}

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
]

const demoInvestigations = [
  {
    id: 'inv-001',
    title: 'Access anomaly review',
    status: 'active',
    priority: 'high',
    owner: 'GA Accessibility Reviewer',
  },
]

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
  }
}

export function trackConsoleErrors(page: Page) {
  const errors: string[] = []
  const allowList = [/chrome-extension:/i, /favicon.ico/i]

  page.on('console', message => {
    if (message.type() !== 'error') {return}
    const text = message.text()
    if (allowList.some(pattern => pattern.test(text))) {return}
    errors.push(text)
  })

  return () => errors
}

export async function primeApp(page: Page) {
  await page.addInitScript(({ user }) => {
    class NoopWebSocket {
      url: string
      readyState = 1
      constructor(url: string) {
        this.url = url
        setTimeout(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const self = this as any
          if (self.onopen) {
            self.onopen(new Event('open'))
          }
        }, 0)
      }
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      send() {}
      close() {
        this.readyState = 3
      }
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      addEventListener() {}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      removeEventListener() {}
    }

    // @ts-ignore
    window.WebSocket = NoopWebSocket
    localStorage.setItem('auth_token', 'ga-a11y-token')
    localStorage.setItem('user', JSON.stringify(user))
  }, { user: mockUser })

  await page.route('**/users/me', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUser),
    }),
  )

  await page.route('**/auth/login', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ token: 'ga-a11y-token', user: mockUser }),
    }),
  )

  await page.route('**/auth/logout', route =>
    route.fulfill({ status: 204, body: '' }),
  )

  await page.route('**/monitoring/health', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'healthy', checks: { web: 'ok' } }),
    }),
  )

  await page.route('**/graphql', async route => {
    const payload = buildGraphqlPayload()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

export async function expectNoConsoleErrors(readErrors: () => string[]) {
  const errors = readErrors()
  expect(errors).toEqual([])
}

export async function writeA11yReport(
  name: string,
  payload: unknown,
  format: 'json' | 'html' = 'json',
) {
  const reportsDir = path.join('reports', 'a11y-keyboard')
  await fs.mkdir(reportsDir, { recursive: true })
  const targetPath = path.join(
    reportsDir,
    format === 'json' ? `${name}.json` : `${name}.html`,
  )

  if (format === 'json') {
    await fs.writeFile(targetPath, JSON.stringify(payload, null, 2), 'utf-8')
    return targetPath
  }

  const violations = (payload as any)?.violations || []
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
        .map(
          (v: any) => `
            <div class="violation">
              <div class="impact">Impact: ${v.impact}</div>
              <div><strong>${v.id}</strong>: ${v.description}</div>
              <div>Affected nodes: ${v.nodes?.length || 0}</div>
            </div>
          `,
        )
        .join('\n')}
    </body>
  </html>`

  await fs.writeFile(targetPath, html, 'utf-8')
  return targetPath
}
