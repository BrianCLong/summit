const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadPolicy(policyPath = path.join(__dirname, '..', 'policy.yaml')) {
  const content = fs.readFileSync(policyPath, 'utf-8');
  return yaml.load(content);
}

function generateSpdx(image, policy) {
  const now = new Date().toISOString();
  return {
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    creationInfo: {
      created: now,
      creators: ['Tool: summit-supply-chain-node'],
      licenseListVersion: '3.23'
    },
    documentNamespace: `urn:spdx:sbom:${encodeURIComponent(image)}`,
    name: `SBOM for ${image}`,
    packages: [],
    policy
  };
}

function generateCycloneDx(image, policy) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    serialNumber: `urn:uuid:${cryptoSafeId()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: 'summit-supply-chain-node', vendor: 'summit' }],
      component: { name: image }
    },
    components: [],
    policy
  };
}

function cryptoSafeId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function evaluateVulnerabilities(reportPath, policy) {
  const raw = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const failing = raw.vulnerabilities.filter((vuln) => vuln.cvss >= policy.baseline_cvss);
  return { failing, passed: failing.length === 0 };
}

function evaluateLicenses(sbomPath, policy) {
  const data = JSON.parse(fs.readFileSync(sbomPath, 'utf-8'));
  const licenses = data.packages?.map((pkg) => pkg.license).filter(Boolean) || [];
  const blocked = licenses.filter((license) => policy.blocked_licenses.includes(license));
  return { blocked, passed: blocked.length === 0 };
}

function dualControlSatisfied(exception) {
  const uniqueApprovers = new Set(exception.approvers || []);
  return uniqueApprovers.size >= (exception.minimum_approvers || 2);
}

function createSigstoreAttestation(manifestPath, signaturePath, policy) {
  return {
    manifestPath,
    signaturePath,
    provenance: policy.reproducible_builds?.provenance_format || 'in-toto',
    attestationRequired: Boolean(policy.reproducible_builds?.attestation_required),
    createdAt: new Date().toISOString()
  };
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = Object.fromEntries(rest.map((arg) => arg.split('=')));
  const policy = loadPolicy(args['--policy']);

  switch (command) {
    case 'sbom': {
      const image = args['--image'];
      const format = args['--format'] || 'spdx';
      const output = args['--output'] || `artifacts/sbom.${format}.json`;
      const payload = format === 'cyclonedx' ? generateCycloneDx(image, policy) : generateSpdx(image, policy);
      writeJson(output, payload);
      console.log(`SBOM (${format}) written to ${output}`);
      break;
    }
    case 'scan': {
      const report = args['--report'];
      const { failing, passed } = evaluateVulnerabilities(report, policy);
      writeJson(args['--output'] || 'artifacts/vuln-gate.json', { failing, passed });
      if (!passed) {
        console.error('Vulnerability gate failed');
        process.exitCode = 1;
      }
      break;
    }
    case 'licenses': {
      const sbomPath = args['--sbom'];
      const exception = {
        approvers: (args['--approvers'] || '').split(',').filter(Boolean),
        minimum_approvers: policy.dual_control?.minimum_approvers || 2
      };
      const { blocked, passed } = evaluateLicenses(sbomPath, policy);
      const dualControl = dualControlSatisfied(exception);
      writeJson(args['--output'] || 'artifacts/license-gate.json', { blocked, passed, dualControl });
      if (!passed || !dualControl) {
        console.error('License gate failed');
        process.exitCode = 1;
      }
      break;
    }
    case 'attest': {
      const payload = createSigstoreAttestation(args['--manifest'], args['--signature-path'], policy);
      writeJson(args['--output'] || 'artifacts/attestation.json', payload);
      console.log('Attestation manifest generated');
      break;
    }
    default:
      console.error('Supported commands: sbom, scan, licenses, attest');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadPolicy,
  generateSpdx,
  generateCycloneDx,
  evaluateVulnerabilities,
  evaluateLicenses,
  createSigstoreAttestation,
  dualControlSatisfied
};
