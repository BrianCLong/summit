import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const ARTIFACTS_DIR = path.join(process.cwd(), 'artifacts', 'observability');
const DOCKER_COMPOSE_PATH = path.join(process.cwd(), 'docker-compose.observability.yml');
const OTEL_CONFIG_PATH = path.join(process.cwd(), 'otel-collector.yaml');

const main = () => {
  console.log('🔍 Starting Observability Validation...');

  // 1. Ensure artifacts directory exists
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  }

  const report = {
    timestamp: new Date().toISOString(),
    checks: [] as any[],
    success: false,
  };

  // 2. Check Docker Compose
  try {
    if (fs.existsSync(DOCKER_COMPOSE_PATH)) {
      const compose = yaml.load(fs.readFileSync(DOCKER_COMPOSE_PATH, 'utf8')) as any;
      const services = compose.services ? Object.keys(compose.services) : [];
      report.checks.push({
        name: 'docker-compose.observability.yml exists',
        status: 'PASS',
        details: `Found services: ${services.join(', ')}`
      });

      // Check for key services
      const requiredServices = ['prometheus', 'grafana', 'otel-collector'];
      const missingServices = requiredServices.filter(s => !services.includes(s));

      if (missingServices.length > 0) {
        report.checks.push({
          name: 'Required Observability Services',
          status: 'FAIL',
          details: `Missing: ${missingServices.join(', ')}`
        });
      } else {
         report.checks.push({
          name: 'Required Observability Services',
          status: 'PASS',
          details: 'All required services present.'
        });
      }

    } else {
      report.checks.push({
        name: 'docker-compose.observability.yml exists',
        status: 'FAIL',
        details: 'File not found'
      });
    }
  } catch (e: any) {
    report.checks.push({
      name: 'Docker Compose Parse',
      status: 'FAIL',
      details: e.message
    });
  }

  // 3. Check OTEL Config
  try {
    if (fs.existsSync(OTEL_CONFIG_PATH)) {
      const otel = yaml.load(fs.readFileSync(OTEL_CONFIG_PATH, 'utf8')) as any;
      const exporters = otel.exporters ? Object.keys(otel.exporters) : [];

      report.checks.push({
        name: 'otel-collector.yaml exists',
        status: 'PASS',
        details: `Found exporters: ${exporters.join(', ')}`
      });

      if (exporters.length === 0) {
         report.checks.push({
          name: 'OTEL Exporters Configured',
          status: 'FAIL',
          details: 'No exporters defined.'
        });
      } else {
        report.checks.push({
          name: 'OTEL Exporters Configured',
          status: 'PASS',
          details: 'Exporters found.'
        });
      }

    } else {
       report.checks.push({
        name: 'otel-collector.yaml exists',
        status: 'FAIL',
        details: 'File not found'
      });
    }
  } catch (e: any) {
    report.checks.push({
      name: 'OTEL Config Parse',
      status: 'FAIL',
      details: e.message
    });
  }

  // 4. Determine Overall Success
  const failures = report.checks.filter(c => c.status === 'FAIL');
  report.success = failures.length === 0;

  // 5. Write Report
  const reportPath = path.join(ARTIFACTS_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📝 Report written to ${reportPath}`);

  if (!report.success) {
    console.error('❌ Validation Failed.');
    failures.forEach(f => console.error(` - ${f.name}: ${f.details}`));
    process.exit(1);
  }

  console.log('✅ Observability Validation Passed.');
};

main();
