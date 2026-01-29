import { Router } from 'express';
import { logger } from '../config/logger.js';

const router = Router();

// Mock Investigation Canvas HTML
const INVESTIGATION_CANVAS_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background: #f8fafc; color: #334155; }
    h2 { color: #0f172a; margin-bottom: 20px; }
    .canvas {
      border: 1px solid #e2e8f0;
      background: white;
      height: 400px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
      margin-bottom: 20px;
    }
    .controls { display: flex; gap: 10px; }
    button {
      padding: 10px 16px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: white;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }
    button:hover { background: #f1f5f9; border-color: #94a3b8; }
    button.primary { background: #2563eb; color: white; border-color: #2563eb; }
    button.primary:hover { background: #1d4ed8; border-color: #1d4ed8; }

    .status {
        margin-top: 20px;
        padding: 10px;
        background: #f1f5f9;
        border-radius: 4px;
        font-family: monospace;
        font-size: 0.9em;
        border: 1px solid #e2e8f0;
    }
  </style>
</head>
<body>
  <h2>Investigation Canvas</h2>
  <div class="canvas" id="canvas-area">
    <div style="text-align: center">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
        <p>Graph Visualization Placeholder</p>
    </div>
  </div>
  <div class="controls">
    <button onclick="expandGraph()">Expand Neighborhood</button>
    <button onclick="filterNodes()">Filter: High Risk</button>
    <button class="primary" onclick="requestApproval()">Request Approval</button>
  </div>
  <div class="status" id="status">Ready</div>

  <script>
    function sendRpc(method, params) {
      const id = Date.now();
      const message = {
        jsonrpc: '2.0',
        id: id,
        method: method,
        params: params
      };
      // Send to parent window
      window.parent.postMessage(message, '*');
      document.getElementById('status').innerText = 'Sent: ' + method;
    }

    function expandGraph() {
      sendRpc('tool/call', { name: 'graph.expand', arguments: { depth: 1 } });
    }

    function filterNodes() {
      sendRpc('context/update', { filter: 'risk > 0.8' });
    }

    function requestApproval() {
      sendRpc('tool/call', { name: 'approval.request', arguments: { reason: 'Investigate suspicious IP' } });
    }

    window.addEventListener('message', event => {
      const data = event.data;
      if (data && (data.result || data.error)) {
         document.getElementById('status').innerText = 'Response: ' + JSON.stringify(data);
      }
    });
  </script>
</body>
</html>
`;

router.get('/render', (req, res) => {
  const { uri, signature } = req.query;

  // Audit Log: Record access to MCP App resources
  // This serves as the start of the Interaction Ledger for UI loading
  logger.info({
    audit: true,
    action: 'mcp_app_render',
    resource: uri,
    user: (req as any).user?.sub || 'anonymous',
    signaturePresent: !!signature
  }, 'Serving MCP App Resource');

  // Security: Signature Verification
  // In a real implementation, we would verify HMAC(uri, secret) or a digital signature
  if (!signature && process.env.NODE_ENV === 'production') {
      logger.warn({ uri }, 'Missing signature for MCP App resource in production context');
      // For now, we allow it but log the security exception
  }

  if (uri === 'ui://investigation-canvas/main') {
    res.setHeader('Content-Type', 'text/html');
    res.send(INVESTIGATION_CANVAS_HTML);
  } else {
    logger.warn(`MCP UI Resource not found: ${uri}`);
    res.status(404).send('UI Resource not found');
  }
});

router.post('/rpc', (req, res) => {
    // This endpoint might be used for direct server-side comms in the future
    res.json({ jsonrpc: '2.0', id: req.body.id, result: 'ack' });
});

export default router;
