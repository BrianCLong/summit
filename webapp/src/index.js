import { Hono } from 'hono'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const app = new Hono()

const blueprintDir = path.resolve(process.cwd(), '../workflows/blueprints')

const loadBlueprintSummaries = () => {
  if (!fs.existsSync(blueprintDir)) return []
  return fs
    .readdirSync(blueprintDir)
    .filter((file) => file.endsWith('.yaml') || file.endsWith('.yml'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(blueprintDir, file), 'utf-8')
      const parsed = yaml.load(raw)
      return {
        id: parsed?.metadata?.id || file,
        name: parsed?.metadata?.name || file.replace(/\.ya?ml$/, ''),
        description: parsed?.metadata?.description || 'Guided workflow blueprint',
        risk_level: parsed?.metadata?.risk_level || 'unknown',
        steps: parsed?.steps?.length || 0,
      }
    })
}

const simulateRun = (id) => {
  return {
    runId: `demo-${id}`,
    status: 'succeeded',
    actionTrace: [
      { type: 'STEP_STARTED', message: 'Collected inputs', timestamp: new Date().toISOString() },
      {
        type: 'STEP_COMPLETED',
        message: 'Tools executed in sandbox',
        timestamp: new Date().toISOString(),
      },
      { type: 'DEBUG_NOTE', message: 'Action trace persisted', timestamp: new Date().toISOString() },
    ],
    artifacts: [`/artifacts/${id}/result.json`],
  }
}

app.get('/healthz', (c) => c.json({ ok: true }))

app.get('/api/guided-workflows', (c) => c.json({ workflows: loadBlueprintSummaries() }))

app.post('/api/guided-workflows/run', async (c) => {
  const body = await c.req.json()
  const run = simulateRun(body.workflowId)
  return c.json(run)
})

app.get('/guided-workflows', (c) => {
  const workflows = loadBlueprintSummaries()
  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Guided Workflows</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 900px; margin: 2rem auto; padding: 1rem; }
        .wizard { border: 1px solid #ddd; border-radius: 8px; padding: 1rem; }
        .step { padding: 0.5rem 0; }
        .trace { background: #f7f7f7; padding: 0.75rem; border-radius: 6px; margin-top: 1rem; }
        button { padding: 0.5rem 1rem; }
      </style>
    </head>
    <body>
      <h1>Guided Workflows</h1>
      <p>Select a blueprint to launch a chat-style guided execution.</p>
      <div class="wizard">
        <label>Workflow
          <select id="workflow">
            ${workflows
              .map(
                (wf) =>
                  `<option value="${wf.id}">${wf.name} (risk: ${wf.risk_level}, steps: ${wf.steps})</option>`
              )
              .join('')}
          </select>
        </label>
        <div class="step">
          <label>Structured input
            <textarea id="input" rows="4" style="width:100%;" placeholder="Provide JSON inputs"></textarea>
          </label>
        </div>
        <button id="run">Run workflow</button>
        <div id="status" class="step"></div>
        <div id="trace" class="trace" style="display:none;"></div>
      </div>
      <script type="module">
        const runBtn = document.getElementById('run')
        const statusEl = document.getElementById('status')
        const traceEl = document.getElementById('trace')
        runBtn.onclick = async () => {
          statusEl.textContent = 'Running...'
          traceEl.style.display = 'none'
          const workflowId = document.getElementById('workflow').value
          const resp = await fetch('/api/guided-workflows/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workflowId, input: document.getElementById('input').value || '{}' }),
          })
          const result = await resp.json()
          statusEl.textContent = `Status: ${result.status}. Artifact: ${result.artifacts?.[0] || 'n/a'}`
          traceEl.innerHTML = '<strong>Action trace</strong><ul>' +
            result.actionTrace.map((e) => `<li>[${e.type}] ${e.message}</li>`).join('') + '</ul>'
          traceEl.style.display = 'block'
        }
      </script>
    </body>
  </html>`
  return c.html(html)
})

export default app
if (import.meta.main)
  Bun
    ? Bun.serve({ fetch: app.fetch, port: 8080 })
    : (await import('node:http'))
        .createServer(
          (await import('node:stream')).Duplex.toWeb
            ? (await import('node:http')).createServer(app.fetch)
            : (req, res) => res.end('use bun'),
        )
        .listen(8080)
