import http from 'http';
import httpProxy from 'http-proxy';

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
    // Simple routing: forward everything to the server service
    console.log(`[Gateway] Proxying ${req.method} ${req.url}`);

    proxy.web(req, res, { target: 'http://server:4000' }, (e) => {
        console.error('[Gateway] Proxy error:', e.message);
        res.writeHead(502);
        res.end('Gateway Proxy Error');
    });
});

const PORT = 4000;
server.listen(PORT, () => {
    console.log(`[Gateway] Proxy listening on port ${PORT}`);
});
