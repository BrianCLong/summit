const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PolicyAudit } = require('../../packages/policy-audit');

function createServer(opts = {}) {
  const policyDir =
    opts.policyDir ||
    process.env.POLICY_DIR ||
    path.join(__dirname, '../../contracts/policy');
  const auditDir =
    opts.auditDir || process.env.AUDIT_DIR || path.join(__dirname, '../../audit');
  const baseUrl = opts.baseUrl || process.env.POLICY_API_URL;
  const pa = new PolicyAudit({ policyDir, auditDir, baseUrl });

  const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/v0/eval') {
      collect(req, async (body) => {
        try {
          const { subject, action, resource, context } = JSON.parse(body || '{}');
          const result = await pa.evaluate({ subject, action, resource, context });
          respond(res, result);
        } catch (err) {
          res.statusCode = 400;
          respond(res, { error: err.message });
        }
      });
    } else if (req.method === 'POST' && req.url === '/v0/audit') {
      collect(req, async (body) => {
        try {
          const { decision, reason, subject, resource } = JSON.parse(body || '{}');
          const auditId = await pa.audit({ decision, reason, subject, resource });
          respond(res, { auditId });
        } catch (err) {
          res.statusCode = 400;
          respond(res, { error: err.message });
        }
      });
    } else if (req.method === 'GET' && req.url === '/v0/health') {
      pa
        .baseUrl()
        .then(() => respond(res, { status: 'ok' }))
        .catch((err) => {
          res.statusCode = 500;
          respond(res, { status: 'error', error: err.message });
        });
    } else if (req.method === 'GET' && req.url === '/v0/bundle/hash') {
      const hash = computeBundleHash(policyDir);
      respond(res, { hash });
    } else {
      res.statusCode = 404;
      res.end();
    }
  });

  server.on('close', () => {
    pa.close().catch(() => {});
  });

  return server;
}

function collect(req, cb) {
  let data = '';
  req.on('data', (chunk) => (data += chunk));
  req.on('end', () => cb(data));
}

function respond(res, payload) {
  const json = JSON.stringify(payload);
  res.setHeader('Content-Type', 'application/json');
  res.end(json);
}

function computeBundleHash(policyDir) {
  const rego = fs.readFileSync(path.join(policyDir, 'abac.rego'));
  return crypto.createHash('sha256').update(rego).digest('hex');
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createServer().listen(port);
}

module.exports = { createServer };
