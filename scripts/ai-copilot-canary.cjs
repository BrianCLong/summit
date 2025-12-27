const fs = require('fs');
const yaml = require('js-yaml');

const requiredFiles = [
  'slo/ai-copilot.yaml',
  'ALERT_POLICIES.yaml',
  'RUNBOOKS/ai-copilot-service.md'
];

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing required file: ${filePath}`);
    process.exit(1);
  }
}

function validateSloConfig() {
  const contents = fs.readFileSync('slo/ai-copilot.yaml', 'utf8');
  const docs = [];
  yaml.loadAll(contents, (doc) => {
    if (doc) {
      docs.push(doc);
    }
  });

  const hasService = docs.some((doc) => doc?.spec?.service === 'ai-copilot');
  if (!hasService) {
    console.error('SLO config does not declare service: ai-copilot');
    process.exit(1);
  }
}

function validateAlertPolicies() {
  const contents = fs.readFileSync('ALERT_POLICIES.yaml', 'utf8');
  if (!contents.includes('service: ai-copilot')) {
    console.error('Alert policies missing ai-copilot service labels');
    process.exit(1);
  }
}

function validateRunbook() {
  const contents = fs.readFileSync('RUNBOOKS/ai-copilot-service.md', 'utf8');
  if (!contents.includes('AI Copilot Service Runbook')) {
    console.error('Runbook is missing expected title');
    process.exit(1);
  }
}

function runCanary() {
  console.log('AI Copilot canary: validating config artifacts');
  requiredFiles.forEach(assertFileExists);
  validateSloConfig();
  validateAlertPolicies();
  validateRunbook();
  console.log('AI Copilot canary: ✅ config artifacts present and valid');
}

runCanary();
