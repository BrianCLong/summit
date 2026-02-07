const http = require('node:http');

const port = Number(process.env.PORT || 4000);
const targetHost = 'api'; // In docker network
const targetPort = 4000;

console.log(`[GATEWAY-PROXY] Starting proxy from :${port} to http://${targetHost}:${targetPort}`);

const server = http.createServer((req, res) => {
    console.log(`[GATEWAY-PROXY] Handling ${req.method} ${req.url}`);

    const options = {
        hostname: targetHost,
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
    });

    req.pipe(proxyReq, { end: true });

    proxyReq.on('error', (err) => {
        console.error(`[GATEWAY-PROXY] Proxy error: ${err.message}`);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'gateway_error', message: err.message }));
    });
});

server.listen(port, '0.0.0.0', () => {
    console.log(`[GATEWAY-PROXY] Listening on port ${port}`);
});
