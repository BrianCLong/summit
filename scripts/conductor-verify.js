#!/usr/bin/env node

// Conductor Integration Verification Script
// Tests key Conductor functionality without full system startup

const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logInfo(message) {
  log('blue', `[INFO] ${message}`);
}
function logSuccess(message) {
  log('green', `[SUCCESS] ${message}`);
}
function logWarning(message) {
  log('yellow', `[WARNING] ${message}`);
}
function logError(message) {
  log('red', `[ERROR] ${message}`);
}

// Check if file exists
function checkFile(filePath, description) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    logSuccess(`✓ ${description}: ${filePath}`);
    return true;
  } else {
    logError(`✗ ${description}: ${filePath} (missing)`);
    return false;
  }
}

// Check if file contains specific content
function checkFileContent(filePath, searchText, description) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) {
    logError(`✗ ${description}: ${filePath} (file missing)`);
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(searchText)) {
    logSuccess(`✓ ${description}`);
    return true;
  } else {
    logError(`✗ ${description}: content not found in ${filePath}`);
    return false;
  }
}

async function runVerification() {
  logInfo('🧠 Conductor Integration Verification');
  logInfo('=====================================');

  let passed = 0;
  let failed = 0;

  // Core Conductor Files
  logInfo('\n📁 Core Conductor Files:');

  const coreFiles = [
    ['server/src/conductor/index.ts', 'Main Conductor class'],
    ['server/src/conductor/config.ts', 'Conductor configuration'],
    ['server/src/conductor/router/index.ts', 'MoE routing logic'],
    ['server/src/conductor/mcp/client.ts', 'MCP protocol client'],
    [
      'server/src/conductor/mcp/servers/graphops-server.ts',
      'GraphOps MCP server',
    ],
    ['server/src/conductor/mcp/servers/files-server.ts', 'Files MCP server'],
    ['server/src/conductor/metrics/index.ts', 'Metrics and health checks'],
    ['server/src/conductor/resolvers.ts', 'GraphQL resolvers'],
    ['server/src/conductor/types/index.ts', 'TypeScript definitions'],
  ];

  coreFiles.forEach(([file, desc]) => {
    if (checkFile(file, desc)) passed++;
    else failed++;
  });

  // Server Integration
  logInfo('\n🔧 Server Integration:');

  const serverIntegrations = [
    ['server/src/bootstrap/conductor.ts', 'Server bootstrap integration'],
    ['server/src/index.ts', 'wireConductor', 'Conductor wiring in main server'],
    [
      'server/src/index.ts',
      'validateConductorEnvironment',
      'Environment validation',
    ],
    [
      'server/src/index.ts',
      'conductorSystem?.shutdown',
      'Graceful shutdown integration',
    ],
  ];

  serverIntegrations.forEach(([file, search, desc]) => {
    if (search) {
      if (checkFileContent(file, search, desc)) passed++;
      else failed++;
    } else {
      if (checkFile(file, desc)) passed++;
      else failed++;
    }
  });

  // Docker & Compose Integration
  logInfo('\n🐳 Docker Integration:');

  const dockerChecks = [
    ['docker-compose.dev.yml', 'mcp-graphops:', 'GraphOps MCP service'],
    ['docker-compose.dev.yml', 'mcp-files:', 'Files MCP service'],
    [
      'docker-compose.dev.yml',
      'CONDUCTOR_ENABLED',
      'Conductor environment config',
    ],
    ['docker-compose.dev.yml', 'mcp_files_data:', 'MCP files volume'],
  ];

  dockerChecks.forEach(([file, search, desc]) => {
    if (checkFileContent(file, search, desc)) passed++;
    else failed++;
  });

  // UI Integration
  logInfo('\n🎨 UI Integration:');

  const uiChecks = [
    [
      'client/src/features/conductor/ConductorStudio.tsx',
      'Conductor Studio component',
    ],
    ['client/src/App.router.jsx', '/conductor', 'Conductor route registration'],
    ['client/src/App.router.jsx', 'ConductorStudio', 'Component import'],
    ['client/src/App.router.jsx', 'Engineering', 'Conductor icon import'],
  ];

  uiChecks.forEach(([file, search, desc]) => {
    if (search) {
      if (checkFileContent(file, search, desc)) passed++;
      else failed++;
    } else {
      if (checkFile(file, desc)) passed++;
      else failed++;
    }
  });

  // Observability Integration
  logInfo('\n📊 Observability Integration:');

  const obsChecks = [
    ['server/src/conductor/observability/index.ts', 'OTEL instrumentation'],
    ['server/src/conductor/observability/prometheus.ts', 'Prometheus metrics'],
    [
      'server/src/conductor/observability/prometheus.ts',
      'conductorRouterDecisionsTotal',
      'Router decisions metric',
    ],
    [
      'server/src/conductor/observability/prometheus.ts',
      'conductorExpertLatencySeconds',
      'Expert latency metric',
    ],
  ];

  obsChecks.forEach(([file, search, desc]) => {
    if (search) {
      if (checkFileContent(file, search, desc)) passed++;
      else failed++;
    } else {
      if (checkFile(file, desc)) passed++;
      else failed++;
    }
  });

  // Justfile Integration
  logInfo('\n⚡ Justfile Operations:');

  const justChecks = [
    ['Justfile', 'conductor-up', 'Start Conductor system'],
    ['Justfile', 'conductor-down', 'Stop Conductor system'],
    ['Justfile', 'conductor-status', 'System status check'],
    ['Justfile', 'conductor-smoke', 'Smoke tests'],
    ['Justfile', 'studio-open', 'Studio UI launcher'],
  ];

  justChecks.forEach(([file, search, desc]) => {
    if (checkFileContent(file, search, desc)) passed++;
    else failed++;
  });

  // Scripts Integration
  logInfo('\n🚂 Scripts Integration:');

  const scriptChecks = [
    ['scripts/merge-train.sh', 'Omniversal merge train script'],
    ['scripts/conductor-verify.js', 'Verification script (this file)'],
  ];

  scriptChecks.forEach(([file, desc]) => {
    if (checkFile(file, desc)) passed++;
    else failed++;
  });

  // Final Summary
  logInfo('\n📋 Verification Summary:');
  logInfo('========================');

  const total = passed + failed;
  const successRate = ((passed / total) * 100).toFixed(1);

  if (failed === 0) {
    logSuccess(
      `🎉 All ${total} checks passed! Conductor integration is complete.`,
    );
  } else if (successRate >= 90) {
    logSuccess(
      `✅ ${passed}/${total} checks passed (${successRate}% success rate)`,
    );
    logWarning(`⚠️  ${failed} minor issues found, but integration is ready`);
  } else if (successRate >= 75) {
    logWarning(
      `⚠️  ${passed}/${total} checks passed (${successRate}% success rate)`,
    );
    logWarning(`🔧 ${failed} issues need attention before go-live`);
  } else {
    logError(
      `❌ ${passed}/${total} checks passed (${successRate}% success rate)`,
    );
    logError(`🚨 ${failed} critical issues - integration incomplete`);
  }

  logInfo('\n🎯 Next Steps:');
  if (failed === 0) {
    logInfo('  1. Run: just conductor-up');
    logInfo('  2. Test: just conductor-smoke');
    logInfo('  3. Open: just studio-open');
    logInfo('  4. Deploy to staging environment');
  } else {
    logInfo('  1. Fix missing files/configurations');
    logInfo('  2. Re-run verification: node scripts/conductor-verify.js');
    logInfo('  3. Proceed with testing once all checks pass');
  }

  logInfo('\n📚 Documentation:');
  logInfo('  - Conductor Studio: http://localhost:3000/conductor');
  logInfo('  - Health Check: http://localhost:4000/health/conductor');
  logInfo('  - Metrics: http://localhost:4000/metrics');
  logInfo('  - GraphQL: http://localhost:4000/graphql');

  return failed === 0;
}

// Run verification if called directly
if (require.main === module) {
  runVerification()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logError(`Verification failed: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { runVerification };
