#!/usr/bin/env node

/**
 * Summit GA Evidence Completeness Verifier
 * 
 * Purpose: Ensures that the GA evidence bundle, SBOM, and provenance
 * records are complete and valid for the newly deployed version.
 */

import fs from 'fs';
import { execSync } from 'child_process';

async function verifyEvidenceBundle() {
  const bundlePath = 'evidence-bundle.tar.gz';
  if (!fs.existsSync(bundlePath)) {
    return { ok: false, message: 'Missing evidence-bundle.tar.gz in root.' };
  }

  try {
    const files = execSync(`tar -tf ${bundlePath}`).toString().split('\n');
    const required = ['sbom.json', 'provenance.json', 'attestation.json'];
    const missing = required.filter(f => !files.some(line => line.includes(f)));
    
    if (missing.length > 0) {
      return { ok: false, message: `Bundle missing required files: ${missing.join(', ')}` };
    }
    return { ok: true, message: 'Evidence bundle structure verified.' };
  } catch (err) {
    return { ok: false, message: `Failed to read evidence bundle: ${err.message}` };
  }
}

async function verifyGovernanceLedger(baseUrl) {
  const url = `${baseUrl}:4010/api/v1/ledger/latest`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, message: `Ledger unreachable: HTTP ${res.status}` };
    const data = await res.json();
    if (!data.signature) return { ok: false, message: 'Ledger returned unsigned state.' };
    return { ok: true, message: `Ledger verified. Root: ${data.merkleRoot.substring(0, 8)}...` };
  } catch (err) {
    return { ok: false, message: `Ledger check failed: ${err.message}` };
  }
}

async function run() {
  console.log('📜 Verifying Summit GA Evidence & Governance Completeness...\n');
  const baseUrl = process.env.BASE_URL || 'http://localhost';

  const [bundle, ledger] = await Promise.all([
    verifyEvidenceBundle(),
    verifyGovernanceLedger(baseUrl)
  ]);

  console.log('--- Evidence Bundle ---');
  console.log(bundle.ok ? `✅ ${bundle.message}` : `❌ ${bundle.message}`);

  console.log('\n--- Governance Ledger ---');
  console.log(ledger.ok ? `✅ ${ledger.message}` : `❌ ${ledger.message}`);

  if (!bundle.ok || !ledger.ok) {
    console.log('\n🔴 EVIDENCE VERIFICATION FAILED');
    process.exit(1);
  } else {
    console.log('\n💚 ALL EVIDENCE GATES PASSED');
    process.exit(0);
  }
}

run();
