import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { supplyChainMiddleware } from './supply-chain/cosign-verify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const API_BASE = '/api/maestro/v1';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Note: In production, remove unsafe-inline and unsafe-eval
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.GRAFANA_URL || "https://grafana.intelgraph.io"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permissionsPolicy: {
    features: {
      clipboard: ["self"],
      camera: [],
      microphone: [],
      geolocation: [],
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  }
});
app.use('/api', limiter);

// Session configuration for CSRF protection
app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 15 * 60 * 1000, // 15 minutes
    sameSite: 'strict'
  }
}));

// CSRF Token generation middleware
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
});

// CSRF validation for state-changing requests
const validateCSRF = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const token = req.headers['x-csrf-token'] || req.body.csrfToken;
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        code: 'CSRF_VALIDATION_FAILED'
      });
    }
  }
  next();
};

// Apply CSRF validation to all API routes
app.use(API_BASE, validateCSRF);

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://maestro.intelgraph.io'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Supply chain verification middleware
app.use(API_BASE, supplyChainMiddleware({
  cosignBinary: process.env.COSIGN_BINARY || 'cosign',
  rekorUrl: process.env.REKOR_URL || 'https://rekor.sigstore.dev',
  fulcioUrl: process.env.FULCIO_URL || 'https://fulcio.sigstore.dev',
  enableExperimental: process.env.COSIGN_EXPERIMENTAL !== '0'
}));

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.session.csrfToken });
});

// Authentication endpoints
app.post(`${API_BASE}/auth/token`, async (req, res) => {
  try {
    const { provider, code, codeVerifier, redirectUri } = req.body;
    
    // In production, this would exchange the authorization code for tokens
    // with the respective IdP (Auth0, Azure AD, Google)
    
    // Mock token exchange for development
    const tokens = {
      accessToken: `mock_token_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
      expiresIn: 3600,
      tokenType: 'Bearer'
    };
    
    res.json(tokens);
  } catch (error) {
    res.status(400).json({ error: 'Token exchange failed', details: error.message });
  }
});

app.get(`${API_BASE}/auth/userinfo`, (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Mock user info - in production this would validate the token and fetch real user data
  const mockUser = {
    id: 'user_123',
    email: 'demo@intelgraph.io',
    name: 'Demo User',
    roles: ['viewer', 'operator'],
    tenants: ['acme', 'globex'],
    preferredTenant: 'acme',
    idpProvider: 'auth0',
    groups: ['maestro-users', 'intelgraph-operators']
  };
  
  res.json(mockUser);
});

app.post(`${API_BASE}/auth/refresh`, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    // Mock token refresh - in production would validate refresh token with IdP
    const tokens = {
      accessToken: `refreshed_token_${Date.now()}`,
      expiresIn: 3600,
      tokenType: 'Bearer'
    };
    
    res.json(tokens);
  } catch (error) {
    res.status(400).json({ error: 'Token refresh failed', details: error.message });
  }
});

app.post(`${API_BASE}/auth/logout`, (req, res) => {
  // Clear session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Middleware to validate user and extract tenant info
const validateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Mock user validation - in production would validate JWT token
  const mockUser = {
    id: 'user_123',
    email: 'demo@intelgraph.io',
    name: 'Demo User',
    roles: ['viewer', 'operator'],
    tenants: ['acme', 'globex'],
    preferredTenant: 'acme',
    idpProvider: 'auth0',
    groups: ['maestro-users', 'intelgraph-operators']
  };
  
  req.user = mockUser;
  next();
};

// Middleware to enforce tenant isolation
const validateTenantAccess = (req, res, next) => {
  const requestedTenant = req.query.tenant || req.params.tenant || req.body.tenant || req.user?.preferredTenant;
  
  if (requestedTenant && !req.user?.tenants.includes(requestedTenant)) {
    return res.status(403).json({ 
      error: 'Tenant access denied',
      code: 'TENANT_ACCESS_DENIED',
      availableTenants: req.user?.tenants || []
    });
  }
  
  req.tenant = requestedTenant;
  next();
};

// Middleware to enforce role-based access control
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user?.roles.includes(requiredRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'ROLE_REQUIRED',
        requiredRole,
        userRoles: req.user?.roles || []
      });
    }
    next();
  };
};

// Apply authentication to protected routes
app.use(`${API_BASE}/runs`, validateUser, validateTenantAccess);
app.use(`${API_BASE}/pipelines`, validateUser, validateTenantAccess);
app.use(`${API_BASE}/secrets`, validateUser, requireRole('admin'));
app.use(`${API_BASE}/budgets`, validateUser, validateTenantAccess);
app.use(`${API_BASE}/routing`, validateUser, requireRole('operator'));
app.use(`${API_BASE}/ops/dlq`, validateUser, requireRole('operator'));

// Helper function to run shell commands
const runShellCommand = (command, callback) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
        callback(code, stdout, stderr);
    });
};

// Endpoint to get status from tools/status_json.py
app.get('/api/status', (req, res) => {
    const scriptPath = path.join(__dirname, '../../tools/status_json.py');
    const python = spawn('python3', [scriptPath]);

    let dataToSend = '';
    python.stdout.on('data', (data) => {
        dataToSend += data.toString();
    });

    python.stderr.on('data', (data) => {
        console.error(`stderr from status_json.py: ${data}`);
    });

    python.on('close', (code) => {
        if (code === 0) {
            const statusFilePath = path.join(__dirname, '../../dashboard/status.json');
            fs.readFile(statusFilePath, 'utf8', (err, data) => {
                if (err) {
                    res.status(500).json({ error: 'Failed to read status.json', details: err.message });
                } else {
                    try {
                        const status = JSON.parse(data);
                        res.json(status);
                    } catch (parseError) {
                        res.status(500).json({ error: 'Failed to parse status.json', details: parseError.message });
                    }
                }
            });
        } else {
            res.status(500).json({ error: 'Failed to run status_json.py', details: dataToSend });
        }
    });
});

// Endpoint to run just commands
app.post('/api/run-just-command', (req, res) => {
    const { justfile, target, args } = req.body;
    if (!justfile || !target) {
        return res.status(400).json({ error: 'justfile and target are required' });
    }

    const command = `just --justfile ${path.join(__dirname, '../../', justfile)} ${target} ${args || ''}`;
    console.log(`Executing command: ${command}`);

    runShellCommand(command, (code, stdout, stderr) => {
        if (code === 0) {
            res.json({ success: true, stdout, stderr });
        } else {
            res.status(500).json({ success: false, stdout, stderr, code });
        }
    });
});

// New endpoint to get conductor process status
app.get('/api/conductor-status', (req, res) => {
    const scriptPath = path.join(__dirname, '../../start-conductor.sh');
    runShellCommand(`${scriptPath} status`, (code, stdout, stderr) => {
        if (code === 0) {
            const statusLines = stdout.trim().split('\n');
            const backendStatus = statusLines.find(line => line.includes('Backend:')) || 'Backend: UNKNOWN';
            const frontendStatus = statusLines.find(line => line.includes('Frontend:')) || 'Frontend: UNKNOWN';
            res.json({
                backend: backendStatus.replace('Backend: ', '').trim(),
                frontend: frontendStatus.replace('Frontend: ', '').trim()
            });
        } else {
            res.status(500).json({ error: 'Failed to get conductor status', details: stderr });
        }
    });
});

// New endpoint to stop conductor processes
app.post('/api/conductor-stop', (req, res) => {
    const scriptPath = path.join(__dirname, '../../start-conductor.sh');
    runShellCommand(`${scriptPath} stop`, (code, stdout, stderr) => {
        if (code === 0) {
            res.json({ success: true, stdout, stderr });
        } else {
            res.status(500).json({ success: false, stdout, stderr, code });
        }
    });
});

// Supply chain verification API endpoints
app.get(`${API_BASE}/supply-chain/cosign/signature/:artifact`, async (req, res) => {
  try {
    const artifact = decodeURIComponent(req.params.artifact);
    const result = await req.supplyChain.verify(artifact);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(`${API_BASE}/supply-chain/sbom/:artifact`, async (req, res) => {
  try {
    const artifact = decodeURIComponent(req.params.artifact);
    const format = req.query.format || 'spdx-json';
    const result = await req.supplyChain.getSBOM(artifact, format);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(`${API_BASE}/supply-chain/slsa/:artifact`, async (req, res) => {
  try {
    const artifact = decodeURIComponent(req.params.artifact);
    const result = await req.supplyChain.getAttestation(artifact, 'https://slsa.dev/provenance/v0.2');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(`${API_BASE}/supply-chain/vulnerabilities/scan`, async (req, res) => {
  try {
    const { name, version, purl } = req.body;
    
    // Mock vulnerability scan - in production integrate with OSV, NVD, etc.
    const mockVulns = [];
    
    // Simulate some vulnerabilities for demo purposes
    if (name.includes('lodash') && version.startsWith('4.17.')) {
      mockVulns.push({
        id: 'CVE-2021-23337',
        severity: 'high',
        component: name,
        version: version,
        fixedVersion: '4.17.21',
        description: 'Regular Expression Denial of Service (ReDoS) vulnerability'
      });
    }
    
    if (name.includes('express') && version.startsWith('4.1')) {
      mockVulns.push({
        id: 'CVE-2022-24999',
        severity: 'medium',
        component: name,
        version: version,
        fixedVersion: '4.18.0',
        description: 'Open redirect vulnerability'
      });
    }
    
    res.json(mockVulns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(`${API_BASE}/runs/:runId/supply-chain/verify`, validateUser, validateTenantAccess, async (req, res) => {
  try {
    const { artifacts = [], options = {} } = req.body;
    const results = [];
    
    for (const artifact of artifacts) {
      const verificationResult = await req.supplyChain.verify(artifact, options);
      
      // Also get SBOM and SLSA data
      const sbomResult = await req.supplyChain.getSBOM(artifact);
      const slsaResult = await req.supplyChain.getAttestation(artifact, 'https://slsa.dev/provenance/v0.2');
      
      results.push({
        artifact,
        cosignVerification: verificationResult,
        sbom: sbomResult,
        slsa: slsaResult,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ runId: req.params.runId, results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New Supply Chain Verification Endpoint
app.post(`${API_BASE}/supplychain/verify`, validateUser, async (req, res) => {
  const { image, digest, sbomUrl, runId, prId } = req.body;
  const artifactIdentifier = image || digest || sbomUrl;

  if (!artifactIdentifier) {
    return res.status(400).json({ error: 'Missing image, digest, or sbomUrl in request body.' });
  }

  let verificationStatus = {
    ok: true,
    cosign: { verified: false, details: 'Not checked' },
    slsa: { verified: false, details: 'Not checked' },
    sbom: { present: false, details: 'Not checked' },
  };

  try {
    // Simulate Cosign verification
    const cosignResult = await req.supplyChain.verify(image || digest);
    verificationStatus.cosign = { verified: cosignResult.verified, details: cosignResult.message || '' };
    if (!cosignResult.verified) verificationStatus.ok = false;

    // Simulate SLSA provenance verification
    const slsaResult = await req.supplyChain.getAttestation(image || digest, 'https://slsa.dev/provenance/v0.2');
    verificationStatus.slsa = { verified: slsaResult.present, details: slsaResult.message || '' };
    if (!slsaResult.present) verificationStatus.ok = false;

    // Simulate SBOM presence check
    if (sbomUrl) {
      const sbomContent = await req.supplyChain.getSBOM(sbomUrl); // Assuming getSBOM can fetch from URL
      verificationStatus.sbom = { present: !!sbomContent, details: sbomContent ? 'SBOM present' : 'SBOM not found' };
      if (!sbomContent) verificationStatus.ok = false;
    } else {
      verificationStatus.sbom = { present: false, details: 'No SBOM URL provided' };
      verificationStatus.ok = false;
    }

    // Simulate S3 WORM storage
    const evidencePath = `maestro-evidence/${runId || prId || 'unknown'}/${Date.now()}/evidence.json`;
    console.log(`Simulating S3 WORM write to: s3://${evidencePath}`);
    // In a real implementation, use an S3 client with object lock headers
    // For example: s3Client.putObject({ Bucket: 'your-bucket', Key: evidencePath, Body: JSON.stringify(verificationStatus), ObjectLockMode: 'COMPLIANCE', ObjectLockRetainUntilDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) });

    if (!verificationStatus.ok) {
      // Emit AlertCenter event on failure
      globalThis.__alertEvents.push({
        id: uid(),
        type: 'supply-chain',
        severity: 'critical',
        title: 'EVIDENCE_VERIFY_FAILED',
        body: `Supply chain verification failed for artifact: ${artifactIdentifier}. Details: ${JSON.stringify(verificationStatus)}`,
        ts: Date.now(),
        meta: { artifact: artifactIdentifier, runId, prId, verificationStatus },
      });
    }

    res.json(verificationStatus);
  } catch (error) {
    console.error('Supply chain verification error:', error);
    // Emit AlertCenter event on unexpected errors during verification
    globalThis.__alertEvents.push({
      id: uid(),
      type: 'supply-chain',
      severity: 'critical',
      title: 'EVIDENCE_VERIFY_ERROR',
      body: `Supply chain verification encountered an error for artifact: ${artifactIdentifier}. Error: ${error.message}`,
      ts: Date.now(),
      meta: { artifact: artifactIdentifier, runId, prId, error: error.message },
    });
    res.status(500).json({ ok: false, error: error.message });
  }
});

// New SBOM Diff Endpoint
app.post(`${API_BASE}/supplychain/sbom-diff`, validateUser, async (req, res) => {
  const { baseUrl, headUrl } = req.body;

  if (!baseUrl || !headUrl) {
    return res.status(400).json({ error: 'Both baseUrl and headUrl are required for SBOM diff.' });
  }

  try {
    // In a real scenario, you would fetch SBOMs from baseUrl and headUrl
    // and then use a tool like `syft diff` or `sbom-diff` to compare them.
    // For this stub, we'll simulate a diff result.

    const mockDiff = {
      added: [
        { component: 'new-lib-v1.0.0', license: 'MIT', severity: 'none' },
        { component: 'risky-dep-v2.1.0', license: 'Apache-2.0', severity: 'high' },
      ],
      removed: [
        { component: 'old-lib-v0.9.0', license: 'GPL-3.0', severity: 'none' },
      ],
      changed: [
        { component: 'updated-lib-v3.0.0', fromVersion: '2.0.0', toVersion: '3.0.0', severity: 'medium' },
      ],
      summary: {
        addedCount: 2,
        removedCount: 1,
        changedCount: 1,
        highSeverityAdded: 1,
        mediumSeverityChanged: 1,
      },
    };

    // Simulate policy breach for demo
    const policyBreach = mockDiff.summary.highSeverityAdded > 0;

    res.json({ diff: mockDiff, policyBreach });
  } catch (error) {
    console.error('SBOM diff error:', error);
    res.status(500).json({ error: error.message });
  }
});

// OpenTelemetry endpoints
app.get(`${API_BASE}/telemetry/traces/:traceId`, validateUser, async (req, res) => {
  try {
    const { traceId } = req.params;
    
    // Mock trace data - in production, this would query your observability backend
    const mockSpans = [
      {
        spanId: 'span-001',
        traceId: traceId,
        name: 'maestro.run.execute',
        kind: 1,
        startTime: Date.now() - 5000,
        endTime: Date.now() - 1000,
        duration: 4000,
        status: 1,
        attributes: {
          'maestro.run.id': req.query.runId || 'run_001',
          'maestro.node.id': 'source',
          'service.name': 'maestro-orchestrator',
          'operation.name': 'execute_run'
        },
        events: [
          {
            name: 'run.started',
            timestamp: Date.now() - 5000,
            attributes: { 'run.config': 'standard' }
          }
        ],
        links: [],
        resource: {
          attributes: {
            'service.name': 'maestro-orchestrator',
            'service.version': '1.0.0',
            'deployment.environment': 'production'
          }
        },
        instrumentationScope: {
          name: '@maestro/telemetry',
          version: '1.0.0'
        }
      },
      {
        spanId: 'span-002',
        traceId: traceId,
        parentSpanId: 'span-001',
        name: 'node.execute',
        kind: 1,
        startTime: Date.now() - 4500,
        endTime: Date.now() - 2000,
        duration: 2500,
        status: 1,
        attributes: {
          'maestro.node.id': 'validate',
          'node.type': 'validation',
          'service.name': 'maestro-worker'
        },
        events: [],
        links: [],
        resource: {
          attributes: {
            'service.name': 'maestro-worker',
            'service.version': '1.0.0'
          }
        },
        instrumentationScope: {
          name: '@maestro/telemetry',
          version: '1.0.0'
        }
      }
    ];
    
    res.json({ spans: mockSpans });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(`${API_BASE}/telemetry/traces/search`, validateUser, async (req, res) => {
  try {
    const { timeRange, services, operations, tags, limit = 20 } = req.body;
    
    // Mock search results - in production, query your observability backend
    const mockTraces = [
      {
        traceId: 'trace-001',
        spans: [
          {
            spanId: 'span-001',
            traceId: 'trace-001',
            name: 'maestro.run.execute',
            startTime: Date.now() - 300000,
            duration: 45000,
            status: 1,
            attributes: {
              'maestro.run.id': tags?.['maestro.run.id'] || 'run_001',
              'service.name': 'maestro-orchestrator'
            },
            resource: { attributes: { 'service.name': 'maestro-orchestrator' } },
            instrumentationScope: { name: '@maestro/telemetry' },
            events: [],
            links: []
          }
        ],
        summary: {
          duration: 45000,
          spanCount: 8,
          errorCount: 0,
          services: ['maestro-orchestrator', 'maestro-worker']
        }
      }
    ];
    
    res.json({ traces: mockTraces });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(`${API_BASE}/telemetry/spans`, validateUser, async (req, res) => {
  try {
    const { resourceSpans } = req.body;
    
    // In production, forward to your observability backend (Jaeger, Tempo, etc.)
    console.log('Received telemetry spans:', JSON.stringify(resourceSpans, null, 2));
    
    res.status(201).json({ status: 'accepted', spansReceived: resourceSpans.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New Trace correlation endpoint for a specific run
app.get(`${API_BASE}/runs/:id/trace`, validateUser, async (req, res) => {
  try {
    const { id } = req.params;
    // In a real scenario, you would query your trace backend (e.g., Tempo) for the trace associated with this run ID.
    // For this mock, we'll generate a consistent trace ID based on the run ID.
    const traceId = `run-trace-${id}`;
    const spanId = `run-span-${id}`;

    // Mock spans for the run
    const spans = [
      {
        spanId: spanId,
        traceId: traceId,
        name: `maestro.run.execute.${id}`,
        kind: 1, // SpanKind.INTERNAL
        startTime: Date.now() - 5000,
        endTime: Date.now() - 1000,
        duration: 4000,
        status: { code: 1 }, // StatusCode.OK
        attributes: {
          'maestro.run.id': id,
          'service.name': 'maestro-orchestrator',
          'operation.name': 'execute_run'
        },
      },
      // Add more mock spans as needed for a more detailed trace view
    ];

    // Loki query templates for logs correlated to this trace
    const lokiQueryTemplates = {
      runLogs: `{{grafanaBase}}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22loki%22,%7B%22expr%22:%22%7Bjob%3D%5C%22maestro-logs%5C%22%7D%20%7C%3D%20%5C%22traceId%3D${traceId}%5C%22%22%7D%5D`,
      nodeLogs: (nodeId) => `{{grafanaBase}}/explore?orgId=1&left=%5B%22now-1h%22,%22now%22,%22loki%22,%7B%22expr%22:%22%7Bjob%3D%5C%22maestro-logs%5C%22%7D%20%7C%3D%20%5C%22traceId%3D${traceId}%5C%22%20%7C%3D%20%5C%22nodeId%3D${nodeId}%5C%22%22%7D%5D`,
    };

    res.json({ traceId, spanId, spans, lokiQueryTemplates });
  } catch (error) {
    console.error('Error fetching run trace:', error);
    res.status(500).json({ error: error.message });
  }
});

// Trace correlation endpoint
app.get(`${API_BASE}/runs/:runId/traces`, validateUser, validateTenantAccess, async (req, res) => {
  try {
    const { runId } = req.params;
    const run = findRun(runId);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    // Mock trace correlation - in production, query by run ID
    const correlatedTraces = [
      {
        traceId: `trace-${runId}`,
        startTime: run.createdAt,
        duration: run.durationMs,
        spanCount: 12,
        errorCount: run.status === 'failed' ? 2 : 0,
        services: ['maestro-orchestrator', 'maestro-worker', 'maestro-ui'],
        rootOperation: 'maestro.run.execute'
      }
    ];
    
    res.json({ runId, traces: correlatedTraces });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SLO Management endpoints
app.get(`${API_BASE}/slo/slos`, validateUser, validateTenantAccess, async (req, res) => {
  try {
    const { service, status, limit = 50 } = req.query;
    
    // Mock SLO data - in production, this would query your SLO database
    const mockSLOs = [
      {
        id: 'slo-001',
        name: 'API Response Time',
        description: 'API requests should complete within 200ms',
        service: 'maestro-api',
        objective: 99.5,
        window: '30d',
        sli: {
          type: 'latency',
          query: 'http_request_duration_seconds_bucket',
          threshold: 0.2
        },
        errorBudget: {
          total: 216000, // 30 days * 24 hours * 60 minutes * 60 seconds * 0.005
          consumed: 10800, // 5% consumed
          remaining: 205200,
          consumedPercentage: 5,
          burnRate: 15,
          isHealthy: true
        },
        alerting: {
          enabled: true,
          channels: [
            { type: 'email', target: 'sre@intelgraph.io', enabled: true },
            { type: 'slack', target: '#alerts', enabled: true }
          ],
          rules: [],
          severity: 'warning'
        },
        status: {
          currentSLI: 99.8,
          objective: 99.5,
          compliance: 99.8,
          trend: 'stable',
          lastUpdated: new Date().toISOString(),
          health: 'healthy'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'slo-002',
        name: 'Database Availability',
        description: 'Database should be available 99.9% of the time',
        service: 'maestro-db',
        objective: 99.9,
        window: '30d',
        sli: {
          type: 'availability',
          ratioQueries: {
            good: 'sum(rate(db_requests_total{status!="error"}[5m]))',
            total: 'sum(rate(db_requests_total[5m]))'
          }
        },
        errorBudget: {
          total: 25920, // 30 days * 24 hours * 60 minutes * 0.001
          consumed: 2592, // 10% consumed
          remaining: 23328,
          consumedPercentage: 10,
          burnRate: 3.6,
          isHealthy: true
        },
        alerting: {
          enabled: true,
          channels: [
            { type: 'email', target: 'sre@intelgraph.io', enabled: true },
            { type: 'pagerduty', target: 'sre-escalation', enabled: true }
          ],
          rules: [],
          severity: 'critical'
        },
        status: {
          currentSLI: 99.95,
          objective: 99.9,
          compliance: 99.95,
          trend: 'improving',
          lastUpdated: new Date().toISOString(),
          health: 'healthy'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'slo-003',
        name: 'Run Success Rate',
        description: 'Maestro runs should succeed 99% of the time',
        service: 'maestro-orchestrator',
        objective: 99.0,
        window: '7d',
        sli: {
          type: 'error_rate',
          goodQuery: 'sum(rate(maestro_runs_total{status="success"}[5m]))',
          totalQuery: 'sum(rate(maestro_runs_total[5m]))'
        },
        errorBudget: {
          total: 10080, // 7 days * 24 hours * 60 minutes * 0.01
          consumed: 8064, // 80% consumed
          remaining: 2016,
          consumedPercentage: 80,
          burnRate: 48,
          exhaustionDate: new Date(Date.now() + 42 * 60 * 60 * 1000).toISOString(),
          isHealthy: false
        },
        alerting: {
          enabled: true,
          channels: [
            { type: 'slack', target: '#maestro-alerts', enabled: true }
          ],
          rules: [],
          severity: 'warning'
        },
        status: {
          currentSLI: 98.2,
          objective: 99.0,
          compliance: 98.2,
          trend: 'degrading',
          lastUpdated: new Date().toISOString(),
          health: 'warning'
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      }
    ];
    
    // Apply filters
    let filteredSLOs = mockSLOs;
    
    if (service) {
      filteredSLOs = filteredSLOs.filter(slo => slo.service === service);
    }
    
    if (status) {
      filteredSLOs = filteredSLOs.filter(slo => slo.status.health === status);
    }
    
    res.json(filteredSLOs.slice(0, parseInt(limit)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get(`${API_BASE}/slo/slos/:id`, validateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Mock single SLO fetch
    const slo = {
      id,
      name: 'API Response Time',
      description: 'API requests should complete within 200ms',
      service: 'maestro-api',
      objective: 99.5,
      window: '30d',
      sli: {
        type: 'latency',
        query: 'http_request_duration_seconds_bucket',
        threshold: 0.2
      },
      errorBudget: {
        total: 216000,
        consumed: 10800,
        remaining: 205200,
        consumedPercentage: 5,
        burnRate: 15,
        isHealthy: true
      },
      alerting: {
        enabled: true,
        channels: [],
        rules: [],
        severity: 'warning'
      },
      status: {
        currentSLI: 99.8,
        objective: 99.5,
        compliance: 99.8,
        trend: 'stable',
        lastUpdated: new Date().toISOString(),
        health: 'healthy'
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    };
    
    res.json(slo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(`${API_BASE}/slo/slos`, validateUser, validateTenantAccess, requireRole('operator'), async (req, res) => {
  try {
    const sloData = req.body;
    
    // In production, validate and save to database
    const newSLO = {
      id: `slo-${Date.now()}`,
      ...sloData,
      status: {
        currentSLI: 100,
        objective: sloData.objective,
        compliance: 100,
        trend: 'stable',
        lastUpdated: new Date().toISOString(),
        health: 'healthy'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    res.status(201).json(newSLO);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post(`${API_BASE}/slo/slos/:id/sli`, validateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { timeRange } = req.body;
    
    // Mock SLI calculation
    const now = Date.now();
    const windowMs = timeRange.from === 'now-24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
    const datapoints: Array<[number, number]> = [];
    
    // Generate mock datapoints
    for (let i = 0; i < 100; i++) {
      const timestamp = now - windowMs + (i * windowMs / 100);
      const value = 99 + Math.random() * 1.5 - 0.5; // 98.5-100.5%
      datapoints.push([timestamp, value]);
    }
    
    const avgValue = datapoints.reduce((sum, [_, value]) => sum + value, 0) / datapoints.length;
    
    res.json({
      value: avgValue,
      datapoints,
      metadata: {
        goodCount: Math.floor(avgValue * 10),
        totalCount: 1000,
        window: timeRange.from
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grafana dashboard integration
app.post(`${API_BASE}/slo/grafana/dashboards`, validateUser, requireRole('operator'), async (req, res) => {
  try {
    const { sloId } = req.body;
    
    // Mock Grafana dashboard creation
    const dashboard = {
      id: Math.floor(Math.random() * 10000),
      uid: `slo-${sloId}-${Date.now()}`,
      title: `SLO Dashboard - ${sloId}`,
      url: `https://grafana.intelgraph.io/d/slo-${sloId}`,
      version: 1,
      created: new Date().toISOString()
    };
    
    res.status(201).json({
      message: 'Dashboard created successfully',
      dashboard
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SLO reporting
app.post(`${API_BASE}/slo/reports`, validateUser, async (req, res) => {
  try {
    const { sloIds, timeRange } = req.body;
    
    // Mock report generation
    const mockSLOData = [
      {
        slo: {
          id: 'slo-001',
          name: 'API Response Time',
          service: 'maestro-api',
          objective: 99.5,
          window: '30d'
        },
        compliance: 99.8,
        errorBudget: {
          total: 216000,
          consumed: 10800,
          remaining: 205200,
          consumedPercentage: 5,
          burnRate: 15,
          isHealthy: true
        },
        trend: 'stable'
      },
      {
        slo: {
          id: 'slo-002',
          name: 'Database Availability',
          service: 'maestro-db',
          objective: 99.9,
          window: '30d'
        },
        compliance: 99.95,
        errorBudget: {
          total: 25920,
          consumed: 2592,
          remaining: 23328,
          consumedPercentage: 10,
          burnRate: 3.6,
          isHealthy: true
        },
        trend: 'improving'
      },
      {
        slo: {
          id: 'slo-003',
          name: 'Run Success Rate',
          service: 'maestro-orchestrator',
          objective: 99.0,
          window: '7d'
        },
        compliance: 98.2,
        errorBudget: {
          total: 10080,
          consumed: 8064,
          remaining: 2016,
          consumedPercentage: 80,
          burnRate: 48,
          isHealthy: false
        },
        trend: 'degrading'
      }
    ];
    
    const filteredData = mockSLOData.filter(item => sloIds.includes(item.slo.id));
    
    const summary = {
      totalSLOs: filteredData.length,
      compliantSLOs: filteredData.filter(item => item.compliance >= item.slo.objective).length,
      atRiskSLOs: filteredData.filter(item => item.errorBudget.consumedPercentage > 80).length,
      averageCompliance: filteredData.reduce((sum, item) => sum + item.compliance, 0) / filteredData.length
    };
    
    res.json({
      summary,
      slos: filteredData,
      generatedAt: new Date().toISOString(),
      timeRange
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Alert management
app.get(`${API_BASE}/slo/alerts`, validateUser, async (req, res) => {
  try {
    const { severity, limit = 20 } = req.query;
    
    // Mock alerts
    const mockAlerts = [
      {
        id: 'alert-001',
        sloId: 'slo-001',
        sloName: 'API Response Time',
        rule: 'SLI Breach',
        severity: 'warning',
        status: 'firing',
        message: 'API response time SLI has been below target (99.5%) for 5 minutes',
        startsAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        annotations: {
          description: 'Current SLI: 99.2%',
          runbook_url: 'https://runbooks.intelgraph.io/slo-api-latency'
        }
      },
      {
        id: 'alert-002',
        sloId: 'slo-003',
        sloName: 'Run Success Rate',
        rule: 'Error Budget Critical',
        severity: 'critical',
        status: 'firing',
        message: 'Error budget for Run Success Rate is 80% consumed',
        startsAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        annotations: {
          description: 'Budget will be exhausted in ~42 hours at current rate',
          runbook_url: 'https://runbooks.intelgraph.io/slo-run-success'
        }
      }
    ];
    
    let filteredAlerts = mockAlerts;
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    res.json({
      alerts: filteredAlerts.slice(0, parseInt(limit)),
      total: filteredAlerts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

// --------------------------- In-memory Maestro API (dev stub) ---------------------------
// This section exposes minimal REST endpoints to unblock the Maestro UI end-to-end.
// It is safe for local development and does not persist state.

const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const nowISO = () => new Date().toISOString();

const db = {
  budgets: { cap: 5000, utilization: 42 },
  runs: [],
  pipelines: [
    { id: 'pl_1', name: 'Build IntelGraph', version: '1.0.0', owner: 'alice', yaml: 'steps:\n  - build\n  - test\n  - package' },
    { id: 'pl_2', name: 'Run Tests', version: '1.2.0', owner: 'bob', yaml: 'steps:\n  - test' },
  ],
  secrets: [
    { id: 'sec_aws_kms', ref: 'kms/aws/prod/master', provider: 'AWS KMS', lastAccess: nowISO(), rotationDue: '2025-12-31' },
    { id: 'sec_vault_llm', ref: 'kv/maestro/providers/litellm', provider: 'Vault', lastAccess: nowISO(), rotationDue: '2025-10-01' },
  ],
};

// Seed runs
globalThis.__runs = globalThis.__runs || [];
for (let i = 0; i < 8; i++) {
  const ts = Date.now() - (8 - i) * 60_000;
  const id = `run_${ts}_${i}`;
  const rec = {
    id,
    pipeline: i % 2 ? 'Build IntelGraph' : 'Run Tests',
    status: ['Queued', 'Running', 'Succeeded', 'Failed'][i % 4],
    durationMs: rnd(400, 4200),
    cost: Number((Math.random() * 2).toFixed(2)),
    startedAt: new Date(ts).toISOString(),
    createdAt: ts,
    autonomyLevel: 3,
    canary: 0.1,
    budgetCap: 200,
    commitSha: 'abc1234',
    repo: 'org/repo',
    ghRunUrl: 'https://github.com/org/repo/actions/runs/123456',
  };
  db.runs.push(rec);
  globalThis.__runs.push(rec);
}

// Helper: find run by id
const findRun = (id) => db.runs.find((r) => r.id === id);

function errSigNormalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, '{hex}')
    .replace(/\b\d{3,}\b/g, '{num}')
    .replace(/timeout after \d+ms/g, 'timeout after {num}ms')
    .replace(/at .+:\d+:\d+/g, 'at {file}:{num}:{num}')
    .slice(0, 200);
}

function previousRunId(currId) {
  const all = (globalThis.__runs || []).sort((a, b) => a.createdAt - b.createdAt);
  const idx = all.findIndex((r) => r.id === currId);
  return idx > 0 ? all[idx - 1].id : null;
}

function fakeGraphFor(_id) {
  // Simple variation for demo
  const baseNodes = [
    { id: 'source', label: 'source', status: 'succeeded', durationMs: rnd(120, 300) },
    { id: 'validate', label: 'validate', status: 'succeeded', durationMs: rnd(80, 200) },
    { id: 'enrich', label: 'enrich', status: 'running', durationMs: rnd(200, 500), retryCount: 1 },
    { id: 'plan', label: 'plan', status: 'queued', durationMs: rnd(50, 150) },
    { id: 'execute', label: 'execute', status: 'queued', durationMs: 0 },
    { id: 'report', label: 'report', status: 'queued', durationMs: 0 },
  ];
  const edges = [
    { source: 'source', target: 'validate' },
    { source: 'validate', target: 'enrich' },
    { source: 'enrich', target: 'plan' },
    { source: 'plan', target: 'execute' },
    { source: 'execute', target: 'report' },
  ];
  return { nodes: baseNodes, edges };
}

// GET /runs
app.get(`${API_BASE}/runs`, (req, res) => {
  res.json({ items: db.runs });
});

// GET /runs/:id
app.get(`${API_BASE}/runs/:id`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  res.json(run);
});

// GET /runs/:id/graph
app.get(`${API_BASE}/runs/:id/graph`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  const t0 = Date.now();
  const nodes = [
    { id: 'source', label: 'source', state: 'succeeded', retries: 0, startMs: 0 },
    { id: 'validate', label: 'validate', state: 'succeeded', retries: 0, startMs: 180 },
    { id: 'enrich', label: 'enrich', state: 'running', retries: 1, startMs: 420 },
    { id: 'plan', label: 'plan', state: 'queued', retries: 0, startMs: 920 },
    { id: 'execute', label: 'execute', state: 'queued', retries: 0, startMs: 0 },
    { id: 'report', label: 'report', state: 'queued', retries: 0, startMs: 0 },
    { id: 'fallback', label: 'fallback', state: 'queued', retries: 0, compensated: false, startMs: 300 },
  ];
  const edges = [
    { from: 'source', to: 'validate' },
    { from: 'validate', to: 'enrich' },
    { from: 'enrich', to: 'plan' },
    { from: 'plan', to: 'execute' },
    { from: 'execute', to: 'report' },
    { from: 'source', to: 'fallback' },
  ];
  res.json({ nodes, edges });
});

// Graph compare (current vs baseline)
app.get(`${API_BASE}/runs/:id/graph-compare`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  const baseId = req.query.baseline || previousRunId(run.id);
  const current = fakeGraphFor(run.id);
  const baseline = baseId ? fakeGraphFor(baseId) : { nodes: [], edges: [] };
  res.json({ runId: run.id, baselineRunId: baseId, current, baseline });
});

// SSE: GET /runs/:id/logs?stream=true
app.get(`${API_BASE}/runs/:id/logs`, (req, res) => {
  const { stream, nodeId } = req.query;
  if (!stream) return res.json({ lines: [] });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  let count = 0;
  const nodeIds = ['source','validate','enrich','plan','execute','report','fallback'];
  const timer = setInterval(() => {
    const n = nodeId || nodeIds[count % nodeIds.length];
    const line = { ts: nowISO(), nodeId: String(n), text: `[${n}] log line ${++count} for run ${req.params.id}` };
    res.write(`data: ${JSON.stringify(line)}\n\n`);
    if (count > 1000) { clearInterval(timer); res.end(); }
  }, 400);
  req.on('close', () => clearInterval(timer));
});

// Node-level metrics
app.get(`${API_BASE}/runs/:id/nodes/:nodeId/metrics`, (req, res) => {
  res.json({
    cpuPct: Number((Math.random() * 70).toFixed(1)),
    memMB: rnd(150, 500),
    tokens: rnd(1000, 20000),
    cost: Number((Math.random() * 0.05).toFixed(4)),
    durationMs: rnd(120, 2400),
    retries: rnd(0, 2),
  });
});

// Node-level evidence
app.get(`${API_BASE}/runs/:id/nodes/:nodeId/evidence`, (req, res) => {
  res.json({
    artifacts: [
      { name: `${req.params.nodeId}-output.json`, digest: 'sha256:deadbeef', size: '12KB' },
    ],
    traceId: 'trace-123-abc',
    provenance: { sbom: 'present', cosign: 'verified', slsa: 'attested' },
  });
});

// Run-level evidence summary
app.get(`${API_BASE}/runs/:id/evidence`, (req, res) => {
  const id = req.params.id;
  res.json({
    runId: id,
    sbom: { present: true, href: `https://example.com/artifacts/${id}/sbom.spdx.json` },
    cosign: { signed: true, verifyCmd: `cosign verify --key cosign.pub ghcr.io/intelgraph/app@sha256:deadbeef` },
    slsa: { present: true, href: `https://example.com/artifacts/${id}/slsa.attestation` },
    attestations: [
      { type: 'provenance', issuer: 'cosign', ref: 'ghcr.io/intelgraph/builder', ts: Date.now() - 120000 },
      { type: 'policy', issuer: 'opa', ref: 'build.safety', ts: Date.now() - 60000 }
    ],
  });
});

// ===== Evidence integrity check per node ====================================
app.get(`${API_BASE}/runs/:id/evidence/check`, (req, res) => {
  const id = req.params.id;
  const nodes = ['fetch_sources','build_container','scan_sbom','sign_image'].map(n => {
    const sbom = Math.random() > 0.1, cosign = Math.random() > 0.15, slsa = Math.random() > 0.2;
    return {
      nodeId: n,
      sbom: { present: sbom, url: sbom ? `https://example.com/${id}/${n}/sbom.json` : null },
      cosign: { present: cosign, verified: cosign && Math.random() > 0.05, url: cosign ? `https://example.com/${id}/${n}/cosign.sig` : null },
      slsa: { present: slsa, level: slsa ? 'L2' : null, url: slsa ? `https://example.com/${id}/${n}/slsa.intoto` : null },
    };
  });
  const summary = {
    nodes: nodes.length,
    sbom: nodes.filter(x => x.sbom.present).length,
    cosign: nodes.filter(x => x.cosign.present && x.cosign.verified).length,
    slsa: nodes.filter(x => x.slsa.present).length,
    pass: nodes.every(x => x.sbom.present && x.cosign.present && x.cosign.verified && x.slsa.present),
  };
  res.json({ runId: id, summary, nodes });
});

// POST /runs/:id/replay
app.post(`${API_BASE}/runs/:id/replay`, (req, res) => {
  // accept { nodeId, reason }
  res.json({ ok: true, replayRunId: `run_${Date.now()}_replay` });
});

// BudgetGuard Middleware
const budgetGuard = (projectedCostKey) => {
  return (req, res, next) => {
    const tenant = req.user?.preferredTenant || 'acme'; // Assuming tenant from authenticated user
    const currentMonthSpend = globalThis.__budgets[tenant]?.currentSpend || 0; // Mock current spend
    const budgetPolicy = globalThis.__budgets[tenant]?.policy || { type: 'hard', limit: 1000, grace: 0.1 }; // Mock policy
    const projectedCost = req.body[projectedCostKey] || 0; // Cost from request body

    const totalProjectedSpend = currentMonthSpend + projectedCost;

    if (budgetPolicy.type === 'hard' && totalProjectedSpend > budgetPolicy.limit) {
      // Hard cap: deny and raise alert
      globalThis.__alertEvents.push({
        id: uid(),
        type: 'billing',
        severity: 'critical',
        title: 'BUDGET_HARD_CAP_HIT',
        body: `Tenant ${tenant} hit hard budget cap. Projected spend: ${totalProjectedSpend}, Limit: ${budgetPolicy.limit}`,
        ts: Date.now(),
        meta: { tenant, projectedSpend: totalProjectedSpend, limit: budgetPolicy.limit },
      });
      return res.status(403).json({
        error: 'Budget hard cap hit',
        code: 'BUDGET_HARD_CAP_HIT',
        details: `Projected spend ${totalProjectedSpend} exceeds hard cap ${budgetPolicy.limit}.`
      });
    } else if (budgetPolicy.type === 'soft' && totalProjectedSpend > budgetPolicy.limit) {
      // Soft cap: warn and allow (if within grace %)
      const graceLimit = budgetPolicy.limit * (1 + budgetPolicy.grace);
      if (totalProjectedSpend > graceLimit) {
        globalThis.__alertEvents.push({
          id: uid(),
          type: 'billing',
          severity: 'warning',
          title: 'BUDGET_SOFT_CAP_EXCEEDED',
          body: `Tenant ${tenant} exceeded soft budget cap and grace period. Projected spend: ${totalProjectedSpend}, Limit: ${budgetPolicy.limit}, Grace Limit: ${graceLimit}`,
          ts: Date.now(),
          meta: { tenant, projectedSpend: totalProjectedSpend, limit: budgetPolicy.limit, graceLimit },
        });
        return res.status(403).json({
          error: 'Budget soft cap exceeded grace',
          code: 'BUDGET_SOFT_CAP_EXCEEDED_GRACE',
          details: `Projected spend ${totalProjectedSpend} exceeds soft cap ${budgetPolicy.limit} and grace period.`
        });
      } else {
        globalThis.__alertEvents.push({
          id: uid(),
          type: 'billing',
          severity: 'info',
          title: 'BUDGET_SOFT_CAP_WARN',
          body: `Tenant ${tenant} approaching soft budget cap. Projected spend: ${totalProjectedSpend}, Limit: ${budgetPolicy.limit}`,
          ts: Date.now(),
          meta: { tenant, projectedSpend: totalProjectedSpend, limit: budgetPolicy.limit },
        });
        // Allow the request to proceed
        next();
      }
    } else {
      // Within budget or no policy, allow
      next();
    }
  };
};

// Apply budget guard to run creation
app.post(`${API_BASE}/runs`, validateUser, validateTenantAccess, budgetGuard('estimatedCost'), async (req, res) => {
  // This is a mock run creation endpoint. In a real scenario, this would trigger the actual run.
  const { pipeline, estimatedCost } = req.body;
  const newRunId = `run_${Date.now()}`;
  const newRun = {
    id: newRunId,
    pipeline: pipeline || 'default',
    status: 'Queued',
    durationMs: 0,
    cost: 0,
    startedAt: new Date().toISOString(),
    createdAt: Date.now(),
    autonomyLevel: 3,
    canary: 0.1,
    budgetCap: globalThis.__budgets[req.user?.preferredTenant || 'acme']?.policy?.limit || 1000,
    commitSha: 'mock-sha',
    repo: 'mock-repo',
    ghRunUrl: 'mock-url',
    traceId: `run-trace-${newRunId}`,
  };
  db.runs.push(newRun);
  globalThis.__runs.push(newRun);

  // Simulate step execution dispatch with budget check
  // In a real system, this would be part of the orchestrator/worker logic
  console.log(`Simulating step execution dispatch for run ${newRunId} with estimated cost ${estimatedCost}`);
  // Example: budgetGuard('stepCost')(req, res, () => { console.log('Step allowed'); });

  res.status(201).json(newRun);
});

// PATCH /autonomy
app.patch(`${API_BASE}/autonomy`, (req, res) => {
  const { level } = req.body || {};
  const gates = level >= 3 ? ['dualApproval'] : [];
  res.json({ decision: { allowed: true, gates, reasons: [] }, preview: { riskBands: { low: 60, med: 30, high: 10 } } });
});

// Budgets
app.get(`${API_BASE}/budgets`, (req, res) => {
  res.json(db.budgets);
});
app.put(`${API_BASE}/budgets`, (req, res) => {
  const { cap } = req.body || {};
  if (typeof cap === 'number') db.budgets.cap = cap;
  res.json(db.budgets);
});

// New endpoint for monthly usage export
app.post(`${API_BASE}/billing/export`, validateUser, validateTenantAccess, async (req, res) => {
  const { tenant, month } = req.query;

  if (!tenant || !month) {
    return res.status(400).json({ error: 'Tenant and month (YYYY-MM) are required.' });
  }

  try {
    // Simulate fetching usage data for the given tenant and month
    const mockUsageData = [
      { date: `${month}-01`, pipeline: 'intelgraph_pr_build', runId: 'run_001', model: 'gpt-4o-mini', provider: 'openai', tokens: 1500000, costUSD: 150.23, tags: { env: 'prod' } },
      { date: `${month}-05`, pipeline: 'intelgraph_release', runId: 'run_002', model: 'claude-3-haiku', provider: 'anthropic', tokens: 800000, costUSD: 80.10, tags: { env: 'prod' } },
      { date: `${month}-10`, pipeline: 'security_scan', runId: 'run_003', model: 'n/a', provider: 'internal', tokens: 0, costUSD: 10.50, tags: { env: 'dev' } },
    ];

    // Generate CSV
    const csvHeader = ['Date', 'Pipeline', 'Run ID', 'Model', 'Provider', 'Tokens', 'Cost (USD)', 'Tags'].join(',');
    const csvRows = mockUsageData.map(row => [
      row.date,
      row.pipeline,
      row.runId,
      row.model,
      row.provider,
      row.tokens,
      row.costUSD,
      JSON.stringify(row.tags),
    ].map(field => `"${String(field).replace(/

// Policy explain
app.post(`${API_BASE}/policies/explain`, (req, res) => {
  const input = req.body?.input || {};
  const deny = input?.env === 'prod' && input?.riskScore >= 8;
  res.json({
    allowed: !deny,
    rulePath: deny ? 'policy.freeze.prod_risk_high' : 'policy.default.allow',
    reasons: deny ? ['Risk score >= 8 in prod'] : [],
    inputs: input,
    trace: [
      'eval policy.freeze',
      `input.env = ${input.env || 'unknown'}`,
      `input.riskScore = ${input.riskScore || 'n/a'}`,
      deny ? 'deny due to high risk' : 'allow by default',
    ],
    whatIf: {
      withLowerRisk: { allowed: true, reasons: [] },
      withNonProd: { allowed: true, reasons: [] },
    },
  });
});

// Routing preview
app.post(`${API_BASE}/routing/preview`, (req, res) => {
  const task = req.body?.task || 'unknown';
  res.json({
    decision: { model: 'gpt-4o-mini', confidence: 0.72, reason: `chosen for task: ${task.slice(0,30)}` },
    candidates: [
      { model: 'gpt-4o-mini', score: 0.72 },
      { model: 'gpt-4o', score: 0.65 },
      { model: 'ollama/llama3.1:8b', score: 0.52 },
    ],
  });
});

// Routing pins (per route)
globalThis.__routingPins = globalThis.__routingPins || {};
app.get(`${API_BASE}/routing/pins`, (_req, res) => {
  res.json(globalThis.__routingPins);
});
app.put(`${API_BASE}/routing/pin`, (req, res) => {
  const { route, model } = req.body || {};
  if (!route || !model) return res.status(400).json({ error: 'route & model required' });
  globalThis.__routingPins[route] = model;
  res.json({ ok: true });
});
// Unpin route
app.delete(`${API_BASE}/routing/pin`, (req, res) => {
  const route = req.query.route;
  if (!route) return res.status(400).json({ error: 'route required' });
  delete globalThis.__routingPins[route];
  res.json({ ok: true });
});

// CI Annotations (per run)
globalThis.__ci = globalThis.__ci || [];
app.get(`${API_BASE}/runs/:id/ci/annotations`, (req, res) => {
  const run = findRun(req.params.id);
  if (!run) return res.status(404).json({ error: 'run not found' });
  // Generate sample annotations with repo/sha
  const anns = [
    { id: `a_${Date.now()}_1`, runId: run.id, level: 'failure', ts: Date.now(), repo: run.repo, sha: run.commitSha, path: 'src/lib/util.ts', startLine: 42, message: 'Unit test failed', url: `${run.ghRunUrl}` },
    { id: `a_${Date.now()}_2`, runId: run.id, level: 'warning', ts: Date.now(), repo: run.repo, sha: run.commitSha, path: 'client/index.html', startLine: 1, message: 'Lighthouse perf drop', url: `${run.ghRunUrl}` },
  ];
  res.json({ items: anns });
});

// CI Annotations (global filtered)
app.get(`${API_BASE}/ci/annotations`, (req, res) => {
  const level = req.query.level; // 'failure'|'warning'|'notice'
  const repo = req.query.repo;
  const sinceMs = parseInt(req.query.sinceMs || (24*3600*1000), 10);
  const now = Date.now();
  const allRuns = (globalThis.__runs || []).slice(-10);
  const anns = [];
  for (const r of allRuns) {
    anns.push({ id: `g_${r.id}_1`, runId: r.id, level: 'failure', ts: r.createdAt, repo: r.repo, sha: r.commitSha, path: 'src/lib/util.ts', startLine: 42, message: 'Unit test failed', url: r.ghRunUrl });
    anns.push({ id: `g_${r.id}_2`, runId: r.id, level: 'warning', ts: r.createdAt, repo: r.repo, sha: r.commitSha, path: 'client/index.html', startLine: 1, message: 'Lighthouse perf drop', url: r.ghRunUrl });
  }
  const filtered = anns.filter(a => (now - a.ts) <= sinceMs && (!level || a.level === level) && (!repo || a.repo === repo));
  res.json({ annotations: filtered });
});

// ---- Per-tenant SLO summaries & time series -------------------------------
app.get(`${API_BASE}/metrics/slo`, (req, res) => {
  const tenant = req.query.tenant || null;
  const slo = 0.995;
  const fastBurn = Math.max(0, 0.8 + Math.random() * 0.8);
  const slowBurn = Math.max(0, 0.6 + Math.random() * 0.7);
  res.json({
    tenant,
    slo,
    windowFast: '1h',
    windowSlow: '6h',
    fastBurn,
    slowBurn,
    errorRate: { fast: (1 - slo) * fastBurn, slow: (1 - slo) * slowBurn },
    updatedAt: Date.now(),
  });
});

app.get(`${API_BASE}/metrics/slo/timeseries`, (req, res) => {
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const stepMs = parseInt(req.query.stepMs || 10 * 60 * 1000, 10);
  const tenant = req.query.tenant || null;
  const pts = [];
  let t = Date.now() - windowMs;
  while (t <= Date.now()) {
    const baseline = Math.sin(t / 3.6e6) * 0.3 + 1.0; // 0.7..1.3
    pts.push({
      ts: t,
      fastBurn: Math.max(0, baseline + (Math.random() - 0.5) * 0.3),
      slowBurn: Math.max(0, baseline * 0.8 + (Math.random() - 0.5) * 0.2),
    });
    t += stepMs;
  }
  res.json({ tenant, points: pts });
});

// ---- DLQ signature persistence & trend lines ------------------------------
globalThis.__dlq = globalThis.__dlq || [];
globalThis.__dlqSig = globalThis.__dlqSig || {};

function canonSig(s) {
  return (s || '')
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, '{hex}')
    .replace(/\b\d{3,}\b/g, '{num}')
    .replace(/timeout after \d+ms/g, 'timeout after {num}ms')
    .replace(/at .+:\d+:\d+/g, 'at {file}:{num}:{num}')
    .slice(0, 200);
}

function recordDlq(item) {
  globalThis.__dlq.push(item);
  const sig = canonSig(item.error);
  const now = Date.now();
  const rec = globalThis.__dlqSig[sig] || { count: 0, lastTs: 0, timeseries: [] };
  rec.count += 1;
  rec.lastTs = now;
  const bucket = Math.floor(now / (10 * 60 * 1000)) * (10 * 60 * 1000);
  const last = rec.timeseries[rec.timeseries.length - 1];
  if (!last || last.ts !== bucket) rec.timeseries.push({ ts: bucket, count: 1 });
  else last.count += 1;
  globalThis.__dlqSig[sig] = rec;
}

// list persisted signatures, trend direction by last two buckets
app.get(`${API_BASE}/ops/dlq/signatures`, (_req, res) => {
  const out = Object.entries(globalThis.__dlqSig).map(([sig, rec]) => {
    const series = rec.timeseries || [];
    const n = series.length;
    const trend = n >= 2 ? Math.sign(series[n - 1].count - series[n - 2].count) : 0;
    return { sig, count: rec.count, lastTs: rec.lastTs, trend, sample: series[n - 1] || null };
  }).sort((a, b) => b.count - a.count);
  res.json({ signatures: out });
});

// time series for a signature
app.get(`${API_BASE}/ops/dlq/signatures/timeseries`, (req, res) => {
  const sig = req.query.sig;
  const rec = globalThis.__dlqSig[sig] || { timeseries: [] };
  res.json({ sig, points: rec.timeseries });
});

// ---- DLQ auto-replay policy ----------------------------------------------
globalThis.__dlqPolicy = globalThis.__dlqPolicy || {
  enabled: false,
  dryRun: true,
  allowKinds: ['BUILD_IMAGE', 'LITELLM_CHAT'],
  allowSignatures: [],
  maxReplaysPerMinute: 20,
};
globalThis.__dlqAudit = globalThis.__dlqAudit || [];

app.get(`${API_BASE}/ops/dlq/policy`, (_req, res) => res.json(globalThis.__dlqPolicy));
app.put(`${API_BASE}/ops/dlq/policy`, (req, res) => {
  const p = req.body || {};
  globalThis.__dlqPolicy = { ...globalThis.__dlqPolicy, ...p };
  globalThis.__dlqAudit.push({ ts: Date.now(), action: 'policy.update', details: p });
  res.json({ ok: true, policy: globalThis.__dlqPolicy });
});
app.get(`${API_BASE}/ops/dlq/audit`, (_req, res) => res.json({ items: globalThis.__dlqAudit.slice(-50).reverse() }));

let tokens = globalThis.__dlqPolicy.maxReplaysPerMinute;
setInterval(() => {
  tokens = globalThis.__dlqPolicy.maxReplaysPerMinute;
}, 60 * 1000);

setInterval(() => {
  const pol = globalThis.__dlqPolicy;
  if (!pol.enabled) return;
  const allowSig = pol.allowSignatures || [];
  const allowKinds = new Set(pol.allowKinds || []);
  const keep = [];
  for (const item of globalThis.__dlq) {
    const sig = canonSig(item.error);
    const passKind = allowKinds.has(item.kind);
    const passSig = allowSig.length === 0 || allowSig.some(s => sig.includes(s));
    if (passKind && passSig && tokens > 0) {
      tokens--;
      globalThis.__dlqAudit.push({ ts: Date.now(), action: pol.dryRun ? 'autoreplay.dryrun' : 'autoreplay.replay', details: { id: item.id, runId: item.runId, stepId: item.stepId, kind: item.kind, sig } });
      if (!pol.dryRun) {
        continue;
      }
    }
    keep.push(item);
  }
  globalThis.__dlq = keep;
}, 5000);

// Compare previous run
app.get(`${API_BASE}/runs/:id/compare/previous`, (req, res) => {
  res.json({ durationDeltaMs: -320, costDelta: -0.05, changedNodes: [ { id: 'enrich', durationDeltaMs: -120 }, { id: 'plan', durationDeltaMs: 80 } ] });
});

// Pipelines validation
app.post(`${API_BASE}/pipelines/:id/validate`, (req, res) => {
  const valid = true;
  res.json({ valid, errors: [] });
});

// Providers status + test connection
let providers = [
  { id: 'litellm', name: 'LiteLLM Router', status: 'UP', latencyMs: 120 },
  { id: 'ollama', name: 'Ollama Node', status: 'UP', latencyMs: 30 },
];
app.get(`${API_BASE}/providers`, (req, res) => {
  res.json({ items: providers });
});
app.post(`${API_BASE}/providers/:id/test`, (req, res) => {
  const p = providers.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  p.status = 'UP'; p.latencyMs = rnd(20, 180);
  res.json({ ok: true, item: p });
});

// Node routing decision/candidates
app.get(`${API_BASE}/runs/:id/nodes/:nodeId/routing`, (req, res) => {
  const nodeId = req.params.nodeId;
  const candidates = [
    { model: 'gpt-4o-mini', score: 0.72, cost: 0.002, p95ms: 180 },
    { model: 'gpt-4o', score: 0.65, cost: 0.004, p95ms: 220 },
    { model: 'ollama/llama3.1:8b', score: 0.52, cost: 0, p95ms: 90 },
  ];
  const decision = candidates[0];
  const policy = { allow: true, rulePath: 'policy.default.allow', reasons: [] };
  res.json({ nodeId, decision, candidates, policy });
});

// Serving lane metrics (toy)
app.get(`${API_BASE}/serving/metrics`, (_req, res) => {
  const now = Date.now();
  const recent = Array.from({ length: 24 }).map((_, i) => ({
    ts: now - (24 - i) * 60 * 1000,
    qDepth: Math.floor(Math.random() * 20),
    batch: Math.floor(1 + Math.random() * 8),
    kvHit: +(0.5 + Math.random() * 0.5).toFixed(2),
  }));
  res.json({
    summary: { qDepth: recent[recent.length - 1].qDepth, batch: recent[recent.length - 1].batch, kvHit: recent[recent.length - 1].kvHit },
    series: recent,
  });
});

// CI trends (counts by level per bucket)
app.get(`${API_BASE}/ci/annotations/trends`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || (24 * 3600 * 1000), 10);
  const stepMs = parseInt(req.query.stepMs || (60 * 60 * 1000), 10);
  const now = Date.now();
  const out = [];
  for (let t = now - sinceMs; t <= now; t += stepMs) {
    out.push({ ts: t, failure: Math.floor(Math.random() * 4), warning: Math.floor(Math.random() * 6), notice: Math.floor(Math.random() * 3) });
  }
  res.json({ buckets: out });
});

// Pipelines
app.get(`${API_BASE}/pipelines`, (req, res) => {
  res.json({ items: db.pipelines.map(p => ({ id: p.id, name: p.name, version: p.version, owner: p.owner })) });
});
app.get(`${API_BASE}/pipelines/:id`, (req, res) => {
  const p = db.pipelines.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'pipeline not found' });
  res.json(p);
});
app.post(`${API_BASE}/pipelines/:id/plan`, (req, res) => {
  // naive diff preview: always return a fake change set
  res.json({ changes: [ { type: 'modify', path: 'steps[1]', before: 'test', after: 'test:ci' } ], costEstimate: { delta: 0.02 } });
});

// Secrets
app.get(`${API_BASE}/secrets`, (req, res) => {
  res.json({ items: db.secrets });
});
app.post(`${API_BASE}/secrets/:id/rotate`, (req, res) => {
  const s = db.secrets.find(x => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: 'not found' });
  s.rotationDue = '2026-01-01';
  res.json({ ok: true, item: s });
});

// ===== EvalOps: scorecards & gates ==========================================
globalThis.__evalBaselines = globalThis.__evalBaselines || {
  intelgraph_pr_build: { latencyMs: 600000, failPct: 0.02, costUsd: 2.5, policy: 0 },
};

function evalRun(runId) {
  const latency = Math.floor(3 * 60e3 + Math.random() * 10 * 60e3); // 3–13m
  const fail = Math.random() < 0.1 ? 1 : 0;
  const cost = +(0.5 + Math.random() * 4).toFixed(2);
  const policy = Math.random() < 0.1 ? 1 : 0;
  return { runId, latencyMs: latency, fail, costUsd: cost, policyViolations: policy };
}

app.get(`${API_BASE}/eval/scorecards/run/:id`, (req, res) => {
  const measures = evalRun(req.params.id);
  const pipeline = 'intelgraph_pr_build';
  const base = globalThis.__evalBaselines[pipeline];
  const rows = [
    { metric: 'latencyMs', value: measures.latencyMs, target: base.latencyMs, pass: measures.latencyMs <= base.latencyMs },
    { metric: 'fail', value: measures.fail, target: 0, pass: measures.fail === 0 },
    { metric: 'costUsd', value: measures.costUsd, target: base.costUsd, pass: measures.costUsd <= base.costUsd },
    { metric: 'policyViolations', value: measures.policyViolations, target: 0, pass: measures.policyViolations === 0 },
  ];
  const pass = rows.every(r => r.pass);
  res.json({ runId: measures.runId, pipeline, rows, overall: pass ? 'PASS' : 'FAIL' });
});

app.get(`${API_BASE}/eval/scorecards/pipeline/:id/baseline`, (req, res) => {
  const id = req.params.id;
  res.json({ pipeline: id, baseline: globalThis.__evalBaselines[id] || null });
});

app.put(`${API_BASE}/eval/scorecards/pipeline/:id/baseline`, (req, res) => {
  const id = req.params.id;
  const b = req.body || {};
  globalThis.__evalBaselines[id] = { latencyMs: b.latencyMs || 600000, failPct: b.failPct || 0.02, costUsd: b.costUsd || 2.5, policy: b.policy || 0 };
  res.json({ ok: true, pipeline: id, baseline: globalThis.__evalBaselines[id] });
});

globalThis.__evalGates = globalThis.__evalGates || { intelgraph_pr_build: { blockOn: ['latencyMs', 'fail', 'policyViolations'] } };

app.get(`${API_BASE}/eval/gates/pipeline/:id`, (req, res) => {
  const id = req.params.id;
  res.json({ pipeline: id, gate: globalThis.__evalGates[id] || { blockOn: [] } });
});

app.post(`${API_BASE}/eval/gates/check`, (req, res) => {
  const { runId, pipeline } = req.body || {};
  const sc = evalRun(runId);
  const base = globalThis.__evalBaselines[pipeline] || { latencyMs: 600000, costUsd: 2.5 };
  const rows = [
    { metric: 'latencyMs', pass: sc.latencyMs <= base.latencyMs, value: sc.latencyMs, target: base.latencyMs },
    { metric: 'fail', pass: sc.fail === 0, value: sc.fail, target: 0 },
    { metric: 'costUsd', pass: sc.costUsd <= base.costUsd, value: sc.costUsd, target: base.costUsd },
    { metric: 'policyViolations', pass: sc.policyViolations === 0, value: sc.policyViolations, target: 0 },
  ];
  const gate = globalThis.__evalGates[pipeline] || { blockOn: [] };
  const failing = rows.filter(r => gate.blockOn.includes(r.metric) && !r.pass).map(r => r.metric);
  res.json({ runId, pipeline, rows, gate, status: failing.length ? 'BLOCK' : 'ALLOW', failing });
});

// ===== Agent/HITL ============================================================
globalThis.__agentSteps = globalThis.__agentSteps || {};
function makeStep(id, role, text) { return { id, role, text, ts: Date.now(), state: 'pending' }; }

app.get(`${API_BASE}/runs/:id/agent/steps`, (req, res) => {
  const id = req.params.id;
  if (!globalThis.__agentSteps[id]) {
    globalThis.__agentSteps[id] = [
      makeStep('s1', 'planner', 'Plan build tasks'),
      makeStep('s2', 'critic', 'Check for risky steps'),
      makeStep('s3', 'executor', 'Run container build'),
    ];
  }
  res.json({ runId: id, steps: globalThis.__agentSteps[id] });
});

app.get(`${API_BASE}/runs/:id/agent/stream`, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const id = req.params.id;
  let i = 0;
  const timer = setInterval(() => {
    const st = (globalThis.__agentSteps[id] ||= []);
    if (i < st.length) {
      st[i].state = 'need_approval';
      res.write(`event: step\n`);
      res.write(`data: ${JSON.stringify(st[i])}\n\n`);
      i++;
    } else {
      clearInterval(timer);
      res.end();
    }
  }, 2000);
  req.on('close', () => clearInterval(timer));
});

app.post(`${API_BASE}/runs/:id/agent/actions`, (req, res) => {
  const id = req.params.id;
  const { stepId, action, patch } = req.body || {};
  const steps = globalThis.__agentSteps[id] || [];
  const s = steps.find(x => x.id === stepId);
  if (!s) return res.status(404).json({ error: 'step not found' });
  if (action === 'approve') s.state = 'approved';
  if (action === 'block') s.state = 'blocked';
  if (action === 'edit') { s.text = patch || s.text; s.state = 'approved'; }
  res.json({ ok: true, step: s });
});

// ===== AlertCenter correlation ==============================================
app.get(`${API_BASE}/alertcenter/incidents`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 6 * 60 * 60 * 1000, 10);
  const windowMs = parseInt(req.query.windowMs || 15 * 60 * 1000, 10);
  const now = Date.now();
  const feed = (globalThis.__alertEvents || []).map(e => ({ ...e, type: e.kind==='serving'?'serving':'forecast', severity: e.severity || 'page', title: e.title }))
    .concat(((globalThis.__ci || []).filter(a => (now - a.ts) <= sinceMs).map(a => ({ id: `ci:${a.id}`, ts: a.ts, type: 'ci', severity: a.level === 'failure' ? 'page' : 'warn', title: a.message, link: a.url || null, meta: { runId: a.runId, repo: a.repo } }))))
    .concat(['acme', 'globex'].map(t => ({ id: `slo:${t}:${now}`, ts: now - Math.floor(Math.random() * windowMs), type: 'slo', severity: 'warn', title: `SLO burn ${t}`, link: null, meta: { tenant: t } })));
  const bucket = (ts) => Math.floor(ts / windowMs);
  const groups = new Map();
  for (const e of feed) {
    const tenant = e.meta?.tenant || 'acme';
    const key = `${tenant}|${bucket(e.ts)}`;
    const g = groups.get(key) || { id: key, tenant, startTs: e.ts, endTs: e.ts, events: [] };
    g.startTs = Math.min(g.startTs, e.ts); g.endTs = Math.max(g.endTs, e.ts); g.events.push(e);
    groups.set(key, g);
  }
  const incidents = [...groups.values()].map(g => {
    const sev = g.events.some(x => x.severity === 'page') ? 'page' : g.events.some(x => x.severity === 'warn') ? 'warn' : 'info';
    return { ...g, severity: sev, count: g.events.length };
  }).sort((a, b) => b.endTs - a.endTs);
  res.json({ incidents });
});
// ---------- Tenant Cost Drill-down (stub data) ------------------------------
app.get(`${API_BASE}/metrics/cost/tenant`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const totalUsd = +(Math.random() * 12 + 3).toFixed(2);
  const byPipeline = [
    { pipeline: 'intelgraph_pr_build', usd: +(totalUsd * 0.52).toFixed(2) },
    { pipeline: 'intelgraph_release', usd: +(totalUsd * 0.33).toFixed(2) },
    { pipeline: 'security_scan', usd: +(totalUsd * 0.15).toFixed(2) },
  ];
  const byModelProvider = [
    { provider: 'openai', model: 'gpt-4o-mini', usd: +(totalUsd * 0.28).toFixed(2) },
    { provider: 'bedrock', model: 'anthropic.claude-3-haiku', usd: +(totalUsd * 0.22).toFixed(2) },
    { provider: 'ollama', model: 'qwen2.5-coder:14b', usd: +(totalUsd * 0.18).toFixed(2) },
    { provider: 'openai', model: 'text-embedding-3-small', usd: +(totalUsd * 0.07).toFixed(2) },
    { provider: 'other', model: 'misc', usd: +(totalUsd * 0.25).toFixed(2) },
  ];
  const recentRuns = Array.from({ length: 8 }).map((_, i) => ({
    runId: `r${Math.random().toString(16).slice(2, 10)}`,
    pipeline: byPipeline[i % byPipeline.length].pipeline,
    startedAt: Date.now() - i * 3600 * 1000,
    durationMs: Math.floor(Math.random() * 8 + 3) * 60 * 1000,
    usd: +(Math.random() * 2).toFixed(2),
    tokens: Math.floor(Math.random() * 50000),
  }));
  res.json({ tenant, windowMs, totalUsd, byPipeline, byModelProvider, recentRuns });
});

app.get(`${API_BASE}/metrics/cost/tenant/timeseries`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const stepMs = parseInt(req.query.stepMs || 10 * 60 * 1000, 10);
  const now = Date.now();
  const points = [];
  for (let t = now - windowMs; t <= now; t += stepMs) {
    points.push({ ts: t, usd: +(Math.max(0, Math.sin(t / 2e6) + 1) * 0.5 + Math.random() * 0.15).toFixed(3) });
  }
  res.json({ tenant, points });
});

// ---------- DLQ list + root causes + simulator ------------------------------
// list DLQ items (toy)
app.get(`${API_BASE}/ops/dlq`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 7 * 24 * 3600 * 1000, 10);
  const now = Date.now();
  const items = (globalThis.__dlq || []).filter(x => now - x.ts <= sinceMs);
  res.json({ items });
});

// root-cause groups by step+kind+provider
app.get(`${API_BASE}/ops/dlq/rootcauses`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 7 * 24 * 3600 * 1000, 10);
  const now = Date.now();
  const rows = (globalThis.__dlq || []).filter(x => now - x.ts <= sinceMs);
  const map = new Map();
  for (const x of rows) {
    const provider = /openai|gpt|claude|anthropic|mistral|ollama/i.test(x.error)
      ? 'llm'
      : x.kind?.includes('BUILD')
      ? 'ci'
      : 'other';
    const key = `${x.stepId}|${x.kind}|${provider}`;
    const g = map.get(key) || {
      stepId: x.stepId,
      kind: x.kind,
      provider,
      count: 0,
      lastTs: 0,
      itemIds: [],
      signature: canonSig(x.error),
      sampleError: x.error,
    };
    g.count++;
    g.lastTs = Math.max(g.lastTs, x.ts || Date.now());
    g.itemIds.push(x.id);
    map.set(key, g);
  }
  res.json({ groups: [...map.values()].sort((a, b) => b.count - a.count) });
});

// policy simulate for DLQ item
app.post(`${API_BASE}/ops/dlq/policy/simulate`, (req, res) => {
  const item = req.body?.item || {};
  const pol = globalThis.__dlqPolicy || {};
  const sig = canonSig(item.error || '');
  const passKind = (pol.allowKinds || []).includes(item.kind);
  const passSig = (pol.allowSignatures || []).length === 0 || (pol.allowSignatures || []).some(s => sig.includes(s));
  const enabled = !!pol.enabled;
  const limited = (pol.maxReplaysPerMinute || 0) <= 0;
  const allow = enabled && passKind && passSig && !limited;
  res.json({
    enabled,
    dryRun: !!pol.dryRun,
    passKind,
    passSig,
    rateLimited: limited,
    decision: allow ? (pol.dryRun ? 'DRY_RUN' : 'ALLOW') : 'DENY',
    reasons: [
      enabled ? null : 'policy disabled',
      passKind ? null : `kind ${item.kind} not in allowKinds`,
      passSig ? null : `signature not allowed`,
      limited ? 'rate limit exhausted' : null,
    ].filter(Boolean),
    normalizedSignature: sig,
  });
});

// ---------- Budgets + Forecast + Anomalies ---------------------------------
globalThis.__budgets = globalThis.__budgets || { acme: { monthlyUsd: 100 } };

app.get(`${API_BASE}/budgets/tenant`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const b = globalThis.__budgets[tenant] || { monthlyUsd: 100 };
  res.json({ tenant, monthlyUsd: b.monthlyUsd });
});
app.put(`${API_BASE}/budgets/tenant`, (req, res) => {
  const { tenant, monthlyUsd } = req.body || {};
  if (!tenant || typeof monthlyUsd !== 'number') return res.status(400).json({ error: 'tenant & monthlyUsd required' });
  globalThis.__budgets[tenant] = { monthlyUsd };
  res.json({ ok: true, tenant, monthlyUsd });
});

function synthCostSeries(windowMs = 24 * 3600 * 1000, stepMs = 60 * 60 * 1000) {
  const now = Date.now();
  const pts = [];
  for (let t = now - windowMs; t <= now; t += stepMs) {
    const base = Math.max(0, Math.sin(t / 2e6) + 1) * 0.4 + 0.05;
    pts.push({ ts: t, usd: +(base + (Math.random() - 0.5) * 0.1).toFixed(3) });
  }
  return pts;
}
function ema(series, alpha = 0.5) {
  if (!series.length) return [];
  let s = series[0].usd;
  const out = [{ ts: series[0].ts, ema: s }];
  for (let i = 1; i < series.length; i++) {
    s = alpha * series[i].usd + (1 - alpha) * s;
    out.push({ ts: series[i].ts, ema: s });
  }
  return out;
}

app.get(`${API_BASE}/metrics/cost/tenant/forecast`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const hours = parseInt(req.query.hours || 48, 10);
  const alpha = parseFloat(req.query.alpha || 0.5);
  const budgetUsd = req.query.budgetUsd ? parseFloat(req.query.budgetUsd) : (globalThis.__budgets[tenant]?.monthlyUsd || 100);
  const stepMs = 60 * 60 * 1000;
  const hist = synthCostSeries(48 * stepMs, stepMs);
  const smooth = ema(hist, alpha);
  const mean = hist.reduce((a, b) => a + b.usd, 0) / (hist.length || 1);
  const std = Math.sqrt(hist.reduce((a, b) => a + Math.pow(b.usd - mean, 2), 0) / (hist.length || 1)) || 0.1;
  const last = smooth[smooth.length - 1]?.ema || mean;
  const startTs = hist[hist.length - 1]?.ts || Date.now();
  const forecast = Array.from({ length: hours }).map((_, i) => ({ ts: startTs + (i + 1) * stepMs, usd: +last.toFixed(3), lo: +(last - std).toFixed(3), hi: +(last + std).toFixed(3) }));
  const hourlyAvg = mean;
  const projectedMonthUsd = +(hourlyAvg * 24 * 30).toFixed(2);
  const risk = projectedMonthUsd >= budgetUsd * 1.05 ? 'BREACH' : projectedMonthUsd >= budgetUsd * 0.8 ? 'WARN' : 'HEALTHY';

  // Emit forecast event if route exists
  const route = (globalThis.__alertRoutes || []).find(r => r.tenant === tenant && r.type === 'forecast');
  if (route && risk === 'BREACH') {
    globalThis.__alertEvents = globalThis.__alertEvents || [];
    globalThis.__alertEvents.push({ id: Math.random().toString(16).slice(2, 10), routeId: route.id, ts: Date.now(), tenant, severity: route.severity || 'page', title: `Budget forecast breach for ${tenant}`, body: `Projected ${projectedMonthUsd} >= budget ${budgetUsd}` });
  }

  res.json({ tenant, budgetUsd, hourlyAvg: +hourlyAvg.toFixed(3), projectedMonthUsd, hist, smooth, forecast, risk });
});

app.get(`${API_BASE}/metrics/cost/tenant/anomalies`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const windowMs = parseInt(req.query.windowMs || 24 * 3600 * 1000, 10);
  const stepMs = parseInt(req.query.stepMs || 60 * 60 * 1000, 10);
  const thr = parseFloat(req.query.z || 3.0);
  const series = synthCostSeries(windowMs, stepMs);
  const mean = series.reduce((a, b) => a + b.usd, 0) / (series.length || 1);
  const std = Math.sqrt(series.reduce((a, b) => a + Math.pow(b.usd - mean, 2), 0) / (series.length || 1)) || 1;
  const anomalies = series.map(p => ({ ...p, z: +(Math.abs((p.usd - mean) / std)).toFixed(2) })).filter(p => p.z >= thr);
  res.json({ tenant, mean: +mean.toFixed(3), std: +std.toFixed(3), threshold: thr, series, anomalies });
});

// ---------- Alert routes & events ------------------------------------------
globalThis.__alertRoutes = globalThis.__alertRoutes || [];
globalThis.__alertEvents = globalThis.__alertEvents || [];
function uid() { return Math.random().toString(16).slice(2, 10); }

app.get(`${API_BASE}/alerts/routes`, (_req, res) => {
  res.json({ routes: globalThis.__alertRoutes });
});
app.post(`${API_BASE}/alerts/routes`, (req, res) => {
  const { type, tenant, severity = 'page', receiver = 'email', meta = {} } = req.body || {};
  if (type !== 'forecast' || !tenant) return res.status(400).json({ error: 'type=forecast and tenant required' });
  const r = { id: uid(), type, tenant, severity, receiver, meta, createdAt: Date.now() };
  globalThis.__alertRoutes.push(r);
  res.json({ ok: true, route: r });
});
app.delete(`${API_BASE}/alerts/routes/:id`, (req, res) => {
  const id = req.params.id;
  globalThis.__alertRoutes = (globalThis.__alertRoutes || []).filter(r => r.id !== id);
  res.json({ ok: true });
});
app.get(`${API_BASE}/alerts/events`, (_req, res) => {
  res.json({ events: (globalThis.__alertEvents || []).slice(-200).reverse() });
});
app.post(`${API_BASE}/alerts/events/test`, (req, res) => {
  const { tenant, title = 'Budget breach (TEST)', severity = 'page', body = '' } = req.body || {};
  const route = (globalThis.__alertRoutes || []).find(r => r.tenant === tenant && r.type === 'forecast');
  if (!route) return res.status(404).json({ error: 'no route for tenant' });
  const ev = { id: uid(), routeId: route.id, ts: Date.now(), tenant, severity, title, body };
  globalThis.__alertEvents.push(ev);
  res.json({ ok: true, event: ev });
});

// AlertCenter aggregator
app.get(`${API_BASE}/alertcenter/events`, (req, res) => {
  const sinceMs = parseInt(req.query.sinceMs || 6 * 60 * 60 * 1000, 10);
  const now = Date.now();
  const ci = (globalThis.__ci || []).filter(a => now - a.ts <= sinceMs).map(a => ({ id: `ci:${a.id}`, ts: a.ts, type: 'ci', severity: a.level === 'failure' ? 'page' : 'warn', title: `CI ${a.level.toUpperCase()}: ${a.message}`, link: a.url || (a.repo && a.sha ? `https://github.com/${a.repo}/commit/${a.sha}` : null), meta: { runId: a.runId, repo: a.repo } }));
  const tenants = ['acme', 'globex'];
  const slo = tenants.map(t => {
    const slo = 0.995; const fastBurn = Math.max(0, 0.7 + Math.random() * 1.2); const slowBurn = Math.max(0, 0.6 + Math.random() * 1.0);
    const sev = fastBurn >= 2 || slowBurn >= 2 ? 'page' : fastBurn >= 1 || slowBurn >= 1 ? 'warn' : 'info';
    return { id: `slo:${t}:${now}`, ts: now - Math.floor(Math.random() * sinceMs / 2), type: 'slo', severity: sev, title: `SLO burn (${t}): fast=${fastBurn.toFixed(2)}x slow=${slowBurn.toFixed(2)}x`, link: null, meta: { tenant: t, slo, fastBurn, slowBurn } };
  });
  const forecast = (globalThis.__alertEvents || []).filter(e => now - e.ts <= sinceMs && !e.kind).map(e => ({ id: `fc:${e.id}`, ts: e.ts, type: 'forecast', severity: e.severity || 'page', title: e.title, link: null, meta: { tenant: e.tenant, body: e.body, routeId: e.routeId } }));
  const serving = (globalThis.__alertEvents || []).filter(e => now - e.ts <= sinceMs && e.kind === 'serving').map(e => ({ id: `serv:${e.id}`, ts: e.ts, type: 'serving', severity: e.severity || 'warn', title: e.title, link: null, meta: { body: e.body } }));
  const events = [...ci, ...slo, ...forecast, ...serving].sort((a, b) => b.ts - a.ts).slice(0, 200);
  res.json({ events });
});

// ---------- Provider limits and usage --------------------------------------
globalThis.__providerLimits = globalThis.__providerLimits || {};
app.put(`${API_BASE}/providers/:id/limits`, (req, res) => {
  const id = req.params.id; const rpm = Number(req.body?.rpm || 0);
  if (!id || isNaN(rpm) || rpm <= 0) return res.status(400).json({ error: 'rpm>0 required' });
  globalThis.__providerLimits[id] = { rpm, updatedAt: Date.now() };
  res.json({ ok: true, provider: id, rpm });
});
app.get(`${API_BASE}/providers/limits`, (_req, res) => res.json({ limits: globalThis.__providerLimits }));
app.get(`${API_BASE}/providers/usage`, (req, res) => {
  const windowMs = parseInt(req.query.windowMs || 60 * 60 * 1000, 10);
  const providers = ['openai', 'bedrock', 'ollama'];
  const out = providers.map(p => {
    const limit = globalThis.__providerLimits?.[p]?.rpm || 120;
    const rpm = Math.floor(Math.random() * (limit * 1.1));
    const dropRate = Math.max(0, rpm > limit ? +(((rpm - limit) / (rpm || 1))).toFixed(2) : 0);
    const p95ms = Math.floor(300 + Math.random() * 700);
    return { provider: p, rpm, limit, dropRate, p95ms, windowMs };
  });
  res.json({ items: out });
});

// ===== Router what-if simulate =============================================
app.post(`${API_BASE}/routing/simulate`, (req, res) => {
  const { route = 'codegen', model = 'gpt-4o-mini', tokens = 1500, tenant = 'acme' } = req.body || {};
  const catalogue = {
    'gpt-4o-mini': { cpm: 0.6, p95: 700, avail: 0.999 },
    'claude-3-haiku': { cpm: 0.4, p95: 650, avail: 0.997 },
    'qwen2.5-coder:14b': { cpm: 0.05, p95: 1200, avail: 0.98 },
  };
  const cat = catalogue[model] || { cpm: 0.5, p95: 800, avail: 0.995 };
  const usd = +(tokens / 1000 * cat.cpm).toFixed(3);
  const score = +(((1 / (1 + cat.cpm)) * 0.5 + (1 / (1 + cat.p95 / 1000)) * 0.3 + (cat.avail) * 0.2)).toFixed(3);
  const okBudget = usd < 2;
  const allow = okBudget && cat.avail >= 0.98;
  const rules = [
    { id: 'routing.affordability', effect: okBudget ? 'allow' : 'deny', reason: okBudget ? 'within per-call cap' : 'exceeds per-call cap' },
    { id: 'routing.availability', effect: cat.avail >= 0.98 ? 'allow' : 'deny', reason: `avail=${cat.avail}` },
  ];
  const candidates = Object.entries(catalogue).map(([m, v]) => {
    const _usd = +(tokens / 1000 * v.cpm).toFixed(3);
    const _score = +(((1 / (1 + v.cpm)) * 0.5 + (1 / (1 + v.p95 / 1000)) * 0.3 + (v.avail) * 0.2)).toFixed(3);
    return { model: m, score: _score, usd: _usd, p95: v.p95, avail: v.avail };
  }).sort((a, b) => b.score - a.score);
  res.json({ route, model, tokens, usd, score, decision: { allow, rules }, candidates });
});

// ===== Serving Alerts config + generator ===================================
globalThis.__servingAlertCfg = globalThis.__servingAlertCfg || { enabled: true, qDepthMax: 20, batchMax: 128, kvHitMin: 0.8 };
app.get(`${API_BASE}/serving/alerts/config`, (_req, res) => res.json(globalThis.__servingAlertCfg));
app.put(`${API_BASE}/serving/alerts/config`, (req, res) => {
  globalThis.__servingAlertCfg = { ...globalThis.__servingAlertCfg, ...(req.body || {}) };
  res.json({ ok: true, cfg: globalThis.__servingAlertCfg });
});
setInterval(() => {
  const cfg = globalThis.__servingAlertCfg; if (!cfg?.enabled) return;
  const pt = { qDepth: Math.floor(Math.random() * 40), batch: Math.floor(Math.random() * 256), kvHit: +(0.6 + Math.random() * 0.4).toFixed(2) };
  let title = null;
  if (pt.qDepth > cfg.qDepthMax) title = `Serving alert: qDepth ${pt.qDepth} > ${cfg.qDepthMax}`;
  else if (pt.batch > cfg.batchMax) title = `Serving alert: batch ${pt.batch} > ${cfg.batchMax}`;
  else if (pt.kvHit < cfg.kvHitMin) title = `Serving alert: kvHit ${pt.kvHit} < ${cfg.kvHitMin}`;
  if (title) {
    (globalThis.__alertEvents ||= []).push({ id: uid(), routeId: 'serving', ts: Date.now(), tenant: 'n/a', severity: 'warn', title, body: JSON.stringify(pt), kind: 'serving' });
  }
}, 25000);

// ===== Router bench + perf ==================================================
app.post(`${API_BASE}/routing/bench`, (req, res) => {
  const { route = 'codegen', models = ['gpt-4o-mini', 'claude-3-haiku', 'qwen2.5-coder:14b'], tokens = 1500 } = req.body || {};
  const out = models.map(m => ({ model: m, score: +(Math.random() * 0.4 + 0.6).toFixed(3), usd: +(tokens / 1000 * (0.05 + Math.random() * 0.7)).toFixed(3), p95: Math.floor(500 + Math.random() * 600) }));
  res.json({ route, tokens, results: out.sort((a, b) => b.score - a.score) });
});
app.get(`${API_BASE}/routing/perf`, (req, res) => {
  const route = req.query.route || 'codegen';
  const points = Array.from({ length: 24 }).map((_, i) => ({ ts: Date.now() - i * 3600e3, p95: Math.floor(600 + Math.random() * 500) })).reverse();
  res.json({ route, points });
});

// ---------- Pin history + rollback + watchdog ------------------------------
globalThis.__pinHistory = globalThis.__pinHistory || [];
app.put(`${API_BASE}/routing/pin`, (req, res) => {
  const { route, model, note } = req.body || {};
  if (!route || !model) return res.status(400).json({ error: 'route & model required' });
  const prev = globalThis.__routingPins[route];
  globalThis.__routingPins[route] = model;
  globalThis.__pinHistory.push({ ts: Date.now(), route, prevModel: prev || null, newModel: model, note, action: 'pin' });
  res.json({ ok: true });
});
app.get(`${API_BASE}/routing/pins/history`, (req, res) => {
  const route = req.query.route;
  const hist = (globalThis.__pinHistory || []).filter(x => !route || x.route === route).slice(-100).reverse();
  res.json({ history: hist });
});
app.post(`${API_BASE}/routing/rollback`, (req, res) => {
  const { route, reason } = req.body || {};
  if (!route) return res.status(400).json({ error: 'route required' });
  const hist = (globalThis.__pinHistory || []).filter(x => x.route === route);
  const last = hist[hist.length - 1];
  const prevModel = last?.prevModel || null;
  if (!prevModel) return res.status(400).json({ error: 'no previous model to rollback to' });
  const cur = globalThis.__routingPins[route];
  globalThis.__routingPins[route] = prevModel;
  globalThis.__pinHistory.push({ ts: Date.now(), route, prevModel: cur, newModel: prevModel, note: reason, action: 'rollback' });
  globalThis.__alertEvents.push({ id: uid(), routeId: 'rollback', ts: Date.now(), tenant: 'n/a', severity: 'warn', title: `Auto-rollback route ${route} to ${prevModel}`, body: reason || '' });
  res.json({ ok: true, route, model: prevModel });
});

globalThis.__watchdog = globalThis.__watchdog || { enabled: false, routes: {} };
globalThis.__watchdogEvents = globalThis.__watchdogEvents || [];
app.get(`${API_BASE}/routing/watchdog/configs`, (_req, res) => res.json(globalThis.__watchdog));
app.put(`${API_BASE}/routing/watchdog/configs`, (req, res) => {
  const b = req.body || {};
  globalThis.__watchdog = { ...globalThis.__watchdog, ...b, routes: { ...(globalThis.__watchdog.routes || {}), ...(b.routes || {}) } };
  res.json({ ok: true, watchdog: globalThis.__watchdog });
});
app.get(`${API_BASE}/routing/watchdog/events`, (_req, res) => res.json({ items: (globalThis.__watchdogEvents || []).slice(-100).reverse() }));

setInterval(() => {
  const wd = globalThis.__watchdog;
  if (!wd.enabled) return;
  for (const [route, cfg] of Object.entries(wd.routes || {})) {
    if (!cfg.enabled) continue;
    const now = Date.now();
    const dlq10m = (globalThis.__dlq || []).filter(x => now - x.ts <= 10 * 60 * 1000).length;
    const z = +(0.8 + Math.random() * 1.5).toFixed(2);
    const breachZ = cfg.maxCostZ && z >= cfg.maxCostZ;
    const breachDLQ = cfg.maxDLQ10m && dlq10m >= cfg.maxDLQ10m;
    if (breachZ || breachDLQ) {
      const reason = breachZ ? `cost z=${z} >= ${cfg.maxCostZ}` : `DLQ10m=${dlq10m} >= ${cfg.maxDLQ10m}`;
      try {
        const cur = globalThis.__routingPins[route];
        const hist = (globalThis.__pinHistory || []).filter(x => x.route === route);
        const prev = hist[hist.length - 1]?.prevModel;
        if (prev) {
          globalThis.__routingPins[route] = prev;
          globalThis.__pinHistory.push({ ts: Date.now(), route, prevModel: cur, newModel: prev, note: reason, action: 'rollback' });
          globalThis.__watchdogEvents.push({ ts: Date.now(), route, reason, kind: 'rollback' });
          globalThis.__alertEvents.push({ id: uid(), routeId: 'watchdog', ts: Date.now(), tenant: 'n/a', severity: 'warn', title: `Watchdog rolled back ${route} → ${prev}`, body: reason });
        } else {
          globalThis.__watchdogEvents.push({ ts: Date.now(), route, reason: reason + ' (no prev model)', kind: 'noop' });
        }
      } catch (e) {
        globalThis.__watchdogEvents.push({ ts: Date.now(), route, reason: 'rollback error', kind: 'error' });
      }
    }
  }
}, 30000);

// ---------- Per-model cost anomalies ---------------------------------------
app.get(`${API_BASE}/metrics/cost/models/anomalies`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const models = [
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'bedrock', model: 'anthropic.claude-3-haiku' },
    { provider: 'ollama', model: 'qwen2.5-coder:14b' },
  ];
  const out = models.map(m => {
    const series = Array.from({ length: 24 }).map((_, i) => ({ ts: Date.now() - i * 3600e3, usd: +(Math.random() * 0.15 + 0.02).toFixed(3) })).reverse();
    const mean = series.reduce((a, b) => a + b.usd, 0) / (series.length || 1);
    const std = Math.sqrt(series.reduce((a, b) => a + Math.pow(b.usd - mean, 2), 0) / (series.length || 1)) || 1;
    const z = (series[series.length - 1].usd - mean) / std;
    return { tenant, ...m, mean: +mean.toFixed(3), std: +std.toFixed(3), last: series[series.length - 1].usd, z: +z.toFixed(2), series };
  });
  res.json({ items: out });
});

// Usage export (conceptual)
app.get(`${API_BASE}/metrics/cost/tenant/export`, (req, res) => {
  const tenant = req.query.tenant || 'acme';
  const format = req.query.format || 'csv';
  const data = [
    ['Date', 'Tenant', 'Pipeline', 'CostUSD', 'Tokens'],
    ['2025-08-01', tenant, 'intelgraph_pr_build', '150.23', '1500000'],
    ['2025-08-01', tenant, 'intelgraph_release', '80.10', '800000'],
    ['2025-08-02', tenant, 'intelgraph_pr_build', '145.50', '1450000'],
  ];
  let output = '';
  if (format === 'csv') {
    output = data.map(row => row.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=usage_export_${tenant}.csv`);
  } else {
    output = JSON.stringify(data, null, 2);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=usage_export_${tenant}.json`);
  }
  res.send(output);
});

// Add necessary imports (e.g., for crypto, node-fetch or axios, oidc-client-helper if available)
// For simplicity, I'll use basic Node.js features and assume 'node-fetch' is available for HTTP requests.
const crypto = require('crypto');
const fetch = require('node-fetch'); // You might need to 'npm install node-fetch'

// In a real app, these would come from secure environment variables
const OIDC_CONFIGS = {
  auth0: {
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    issuer: process.env.AUTH0_ISSUER, // e.g., https://YOUR_DOMAIN.auth0.com/
    redirectUri: process.env.AUTH0_REDIRECT_URI, // e.g., http://localhost:3000/auth/oidc/callback/auth0
  },
  azuread: {
    clientId: process.env.AZUREAD_CLIENT_ID,
    clientSecret: process.env.AZUREAD_CLIENT_SECRET,
    tenantId: process.env.AZUREAD_TENANT_ID, // e.g., common or your tenant ID
    issuer: `https://login.microsoftonline.com/${process.env.AZUREAD_TENANT_ID}/v2.0`,
    redirectUri: process.env.AZUREAD_REDIRECT_URI,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    issuer: 'https://accounts.google.com',
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  },
  // ... other IdPs
};

// Helper to generate a random string for state/nonce
function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// Helper to generate PKCE code_challenge
function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

// OIDC Callback endpoint
app.get('/auth/oidc/callback/:provider', async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).send('Missing code or state');
  }

  const oidcConfig = OIDC_CONFIGS[provider];
  if (!oidcConfig) {
    return res.status(400).send('Invalid OIDC provider');
  }

  // Retrieve code_verifier from session/storage (this is crucial for PKCE)
  // In a real app, you'd store this securely, e.g., in a server-side session
  // For this stub, we'll assume it's passed in a way that's not secure for production
  // but demonstrates the flow. In a real app, 'state' would be used to look up
  // the corresponding 'code_verifier' and other session data.
  const storedState = req.session?.oauthState; // Example: using express-session
  const storedCodeVerifier = req.session?.oauthCodeVerifier;

  if (!storedState || storedState !== state) {
    return res.status(400).send('Invalid or missing state parameter');
  }
  if (!storedCodeVerifier) {
    return res.status(400).send('Missing code_verifier in session');
  }

  // Discover IdP endpoints (in a real app, you'd cache this)
  let discoveryResponse;
  try {
    discoveryResponse = await fetch(`${oidcConfig.issuer}/.well-known/openid-configuration`).then(r => r.json());
  } catch (error) {
    console.error(`OIDC Discovery failed for ${provider}:`, error);
    return res.status(500).send('Failed to discover OIDC endpoints');
  }

  const tokenEndpoint = discoveryResponse.token_endpoint;

  // Exchange authorization code for tokens
  try {
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: oidcConfig.clientId,
        client_secret: oidcConfig.clientSecret, // Not used for public clients with PKCE, but some IdPs might still expect it
        code: code,
        redirect_uri: oidcConfig.redirectUri,
        code_verifier: storedCodeVerifier,
      }).toString(),
    }).then(r => r.json());

    if (tokenResponse.error) {
      console.error(`Token exchange error for ${provider}:`, tokenResponse.error_description || tokenResponse.error);
      return res.status(400).send(`Token exchange failed: ${tokenResponse.error_description || tokenResponse.error}`);
    }

    const { id_token, access_token } = tokenResponse;

    // Validate ID Token (signature, expiry, audience, issuer)
    // In a real app, use a library like 'jsonwebtoken' or 'node-jose'
    // For this stub, we'll just decode (not validate)
    const decodedIdToken = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());

    // --- User Provisioning and RBAC Mapping ---
    let userRoles = ['viewer']; // Default role
    let userTenant = 'default'; // Default tenant

    // Example: Map IdP groups/claims to roles
    if (decodedIdToken.groups && Array.isArray(decodedIdToken.groups)) {
      if (decodedIdToken.groups.includes('admin_group_from_idp')) {
        userRoles.push('admin');
      } else if (decodedIdToken.groups.includes('operator_group_from_idp')) {
        userRoles.push('operator');
      }
    }
    // Example: Extract tenant from a custom claim or based on IdP
    if (decodedIdToken.tenant_id_claim) {
      userTenant = decodedIdToken.tenant_id_claim;
    }

    // Store user session (e.g., in req.session or a JWT cookie)
    req.session.user = {
      id: decodedIdToken.sub, // Subject ID from IdP
      email: decodedIdToken.email,
      name: decodedIdToken.name,
      roles: userRoles,
      tenant: userTenant,
      idToken: id_token,
      accessToken: access_token,
    };

    // Clear PKCE verifier from session
    delete req.session.oauthState;
    delete req.session.oauthCodeVerifier;

    // Redirect to a success page or the main application UI
    res.redirect('/maestro'); // Or a more dynamic redirect based on original request
  } catch (error) {
    console.error(`OIDC Token Exchange or User Processing failed for ${provider}:`, error);
    res.status(500).send('Authentication failed');
  }
});

// Middleware for tenant-boundary checks (conceptual)
app.use((req, res, next) => {
  // This is a very basic example. In a real app, you'd check
  // req.session.user.tenant against the resource's tenant.
  if (req.session?.user?.tenant) {
    // Attach tenant to request for downstream use
    req.tenantId = req.session.user.tenant;
  }
  next();
});

// Example of a protected route with tenant check
app.get('/api/maestro/v1/data/:tenantId/resource', (req, res) => {
  if (req.tenantId && req.tenantId !== req.params.tenantId) {
    return res.status(403).send('Access denied: Tenant mismatch');
  }
  // ... proceed with serving data
});
