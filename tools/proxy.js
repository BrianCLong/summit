#!/usr/bin/env node
// Minimal local proxy: CORS + safe commands + passthrough to LiteLLM
const http = require('http');
const url = require('url');
const { exec } = require('child_process');

const GATEWAY = process.env.GATEWAY || 'http://127.0.0.1:4000';
const PORT = process.env.PROXY_PORT || 4381;

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
}

// Allowlisted safe commands
const ALLOWED_COMMANDS = [
    'just --justfile Justfile.orchestra orchestra-smoke',
    'just --justfile Justfile.orchestra orchestra-fast',
    'just --justfile Justfile.orchestra orchestra',
    'just --justfile Justfile.orchestra backup',
    'python3 tools/status_json.py',
    'python3 tools/symphony.py policy show',
    'python3 tools/symphony.py orchestrator status',
    'bash tools/smoke.sh'
];

const server = http.createServer((req, res) => {
    cors(res);
    
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    // Proxy model requests to LiteLLM
    if (parsedUrl.pathname === '/api/models') {
        const proxyReq = http.get(`${GATEWAY}/v1/models`, (proxyRes) => {
            res.statusCode = proxyRes.statusCode;
            proxyRes.headers && Object.keys(proxyRes.headers).forEach(key => {
                res.setHeader(key, proxyRes.headers[key]);
            });
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
        });
        return;
    }
    
    // Proxy chat completions to LiteLLM
    if (parsedUrl.pathname === '/api/chat/completions' && req.method === 'POST') {
        const proxyReq = http.request(`${GATEWAY}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-anything'
            }
        }, (proxyRes) => {
            res.statusCode = proxyRes.statusCode;
            proxyRes.headers && Object.keys(proxyRes.headers).forEach(key => {
                res.setHeader(key, proxyRes.headers[key]);
            });
            proxyRes.pipe(res);
        });
        
        proxyReq.on('error', (err) => {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
        });
        
        req.pipe(proxyReq);
        return;
    }
    
    // Safe command execution
    if (parsedUrl.pathname === '/api/run') {
        const cmd = decodeURIComponent(parsedUrl.query.cmd || '').trim();
        
        if (!ALLOWED_COMMANDS.includes(cmd)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ 
                error: 'Command not allowed',
                allowed: ALLOWED_COMMANDS
            }));
            return;
        }
        
        console.log(`Executing: ${cmd}`);
        
        exec(cmd, { 
            cwd: process.cwd(),
            timeout: 120000,  // 2 minutes
            maxBuffer: 1024 * 1024  // 1MB
        }, (error, stdout, stderr) => {
            const result = {
                command: cmd,
                success: !error,
                stdout: stdout || '',
                stderr: stderr || '',
                timestamp: new Date().toISOString()
            };
            
            if (error) {
                result.error = error.message;
                result.exitCode = error.code;
            }
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result, null, 2));
        });
        return;
    }
    
    // Health check
    if (parsedUrl.pathname === '/api/health') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            gateway: GATEWAY,
            allowedCommands: ALLOWED_COMMANDS.length
        }));
        return;
    }
    
    // Status JSON endpoint
    if (parsedUrl.pathname === '/status.json') {
        exec('python3 tools/status_json.py', { cwd: process.cwd() }, (error, stdout, stderr) => {
            if (error) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: `Failed to get status: ${stderr}` }));
                return;
            }
            
            let status = {};
            try {
                status = JSON.parse(stdout);
            } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: `Failed to parse status_json.py output: ${e.message}` }));
                return;
            }

            // Augment with additional data (placeholders for now)
            status.last_ci = "2025-08-29T10:00:00Z"; // Placeholder
            status.loa_caps = { "dev": 3, "prod": 1 }; // Placeholder
            status.override_count = 5; // Placeholder
            status.cost_today = 12.34; // Placeholder

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(status, null, 2));
        });
        return;
    }
    
    // 404 for other routes
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`🎼 Symphony Proxy running on http://127.0.0.1:${PORT}`);
    console.log(`   → LiteLLM Gateway: ${GATEWAY}`);
    console.log(`   → Allowed commands: ${ALLOWED_COMMANDS.length}`);
    console.log(`   → Dashboard: open dashboard/index.html and switch to "Local Proxy" mode`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Symphony Proxy shutting down...');
    server.close(() => {
        process.exit(0);
    });
});