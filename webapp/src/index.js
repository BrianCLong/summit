import { Hono } from 'hono'
const app = new Hono()
app.get('/healthz', c => c.json({ ok: true }))
export default app
if (import.meta.main) Bun ? Bun.serve({ fetch: app.fetch, port: 8080 }) :
  (await import('node:http')).createServer((await import('node:stream')).Duplex.toWeb ?
  (await import('node:http')).createServer(app.fetch) : (req,res)=>res.end('use bun')).listen(8080)
