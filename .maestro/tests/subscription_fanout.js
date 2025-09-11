const { io } = require('socket.io-client');
const fetch = require('node-fetch');
const url = process.env.GRAPHQL_URL; // e.g., http://localhost:4000/graphql
const subUrl = process.env.SUB_URL || (url.replace('/graphql',''));
const jwt = process.env.JWT;
const tenant = process.env.TENANT_ID || 'tenant-123';
const runs = Number(process.env.RUNS || 200);

function now() { return Date.now(); }

async function publish(value) {
  const body = { query: 'mutation($input:PublishCoherenceSignalInput!){ publishCoherenceSignal(input:$input) }', variables: { input: { tenantId: tenant, type: 'subtest', value, source: 'fanout', ts: new Date().toISOString() } } };
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('publish failed ' + res.status);
}

(async () => {
  const socket = io(subUrl, { auth: { token: jwt }, transports: ['websocket'] });
  const lats = [];
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('connect timeout')), 10000);
    socket.on('connect', () => { clearTimeout(timeout); resolve(); });
    socket.on('connect_error', reject);
  });
  socket.emit('subscribe', { tenantId: tenant });
  socket.on('coherenceEvents', async (evt) => {
    if (evt && evt._t0) lats.push(now() - evt._t0);
    if (lats.length >= runs) {
      socket.close();
      const p95 = quantile(lats, 0.95);
      const p99 = quantile(lats, 0.99);
      const out = { count: lats.length, p95_ms: p95, p99_ms: p99 };
      console.log(JSON.stringify(out));
      require('fs').writeFileSync('fanout.json', JSON.stringify(out, null, 2));
      process.exit(p95 > 250 ? 1 : 0);
    }
  });
  // warmup
  for (let i = 0; i < runs; i++) {
    await publish(Math.random());
    // mark time origin for latency calc; server should echo _t0 back in event for precision
    socket.emit('t0', { _t0: now(), tenantId: tenant });
    await new Promise(r => setTimeout(r, 10));
  }
})();

function quantile(arr, q) {
  const a = arr.slice().sort((x,y)=>x-y); const pos = (a.length - 1) * q; const base = Math.floor(pos); const rest = pos - base;
  return a[base + 1] !== undefined ? a[base] + rest * (a[base + 1] - a[base]) : a[base];
}