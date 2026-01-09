
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to redact secrets
const redact = (obj: any): any => {
  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth', 'cookie', 'credential'];
  const newObj = { ...obj };
  for (const key of Object.keys(newObj)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      newObj[key] = '[REDACTED]';
    } else if (typeof newObj[key] === 'object' && newObj[key] !== null) {
      newObj[key] = redact(newObj[key]);
    }
  }
  return newObj;
};

async function main() {
  const port = process.env.PORT || 4000;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Capturing incident pack from ${baseUrl}...`);

  const timestamp = new Date().toISOString();
  const pack: any = {
    timestamp,
    service: {
      name: 'intelgraph-server',
      version: process.env.npm_package_version || 'unknown',
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      uptime: process.uptime(),
    },
    git: {
        sha: process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'unknown',
        buildTime: process.env.BUILD_TIME || 'unknown',
    },
    system: {
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    },
    config: redact(process.env),
    health: {},
  };

  try {
    // Fetch Liveness
    const liveRes = await fetch(`${baseUrl}/healthz`);
    pack.health.liveness = {
      status: liveRes.status,
      body: liveRes.ok ? await liveRes.json() : await liveRes.text().catch(() => 'error reading body'),
    };
  } catch (err: any) {
    pack.health.liveness = { error: err.message };
  }

  try {
    // Fetch Readiness
    const readyRes = await fetch(`${baseUrl}/readyz`);
    pack.health.readiness = {
      status: readyRes.status,
      body: readyRes.ok ? await readyRes.json() : await readyRes.text().catch(() => 'error reading body'),
    };
  } catch (err: any) {
    pack.health.readiness = { error: err.message };
  }

  try {
    // Fetch Version info
    const verRes = await fetch(`${baseUrl}/version`);
    pack.health.version = {
      status: verRes.status,
      body: verRes.ok ? await verRes.json() : await verRes.text().catch(() => 'error reading body'),
    };
  } catch (err: any) {
    pack.health.version = { error: err.message };
  }

  const outputPath = 'incident-pack.json';
  fs.writeFileSync(outputPath, JSON.stringify(pack, null, 2));
  console.log(`Incident pack captured to ${outputPath}`);
}

main().catch(err => {
  console.error('Failed to capture incident pack:', err);
  process.exit(1);
});
