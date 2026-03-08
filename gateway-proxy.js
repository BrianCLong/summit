import http from 'http';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
    // Health check endpoint
    if (req.url === '/health' || req.url === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', service: 'gateway-proxy' }));
        return;
    }

    console.log(`[Gateway] Proxying ${req.method} ${req.url}`);

    proxy.web(req, res, { target: process.env.SERVER_URL || 'http://server:4000' }, (e) => {
        console.error('[Gateway] Proxy error:', e.message);
        res.writeHead(502);
        res.end('Gateway Proxy Error');
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`[Gateway] Proxy listening on port ${PORT}`);
});
