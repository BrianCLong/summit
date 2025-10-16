#!/usr/bin/env node
const https = require('https');
const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib
      .get(url, (res) => {
        let data = '';
        res.on('data', (d) => (data += d));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      })
      .on('error', reject);
  });
}

async function main() {
  const args = require('minimist')(process.argv.slice(2));
  const runbook = args.runbook || process.env.SLO_RUNBOOK || 'conductor';
  const tenant = args.tenant || process.env.SLO_TENANT || 'acme';
  const maxBurn = parseFloat(args.maxBurn || process.env.SLO_MAX_BURN || '0.5');
  const base = process.env.SLO_GATE_BASE || 'http://localhost:4000';
  const url = `${base}/api/slo?runbook=${encodeURIComponent(runbook)}&tenant=${encodeURIComponent(tenant)}`;
  const { status, body } = await get(url);
  if (status !== 200) throw new Error(`SLO API failed: ${status}`);
  const j = JSON.parse(body);
  const burn = Number(j.burnRate || 0);
  console.log(`SLO burn for ${runbook}/${tenant}: ${burn}`);
  if (burn >= maxBurn) {
    console.error(`Burn ${burn} >= max ${maxBurn} — blocking promotion`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(2);
});
