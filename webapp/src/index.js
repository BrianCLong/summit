import { Hono } from 'hono'
const app = new Hono()
app.get('/healthz', (c) => c.json({ ok: true }))
export default app
async function start() {
  if (typeof Bun !== 'undefined' && Bun?.serve) {
    Bun.serve({ fetch: app.fetch, port: 8080 })
    return
  }
  const http = await import('node:http')
  const stream = await import('node:stream')
  if (stream.Duplex?.toWeb) {
    const server = http.createServer(app.fetch)
    server.listen(8080)
  } else {
    const server = http.createServer((req, res) => res.end('use bun'))
    server.listen(8080)
  }
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
})
