import fs from 'fs';
import path from 'path';

interface AutonomySignal {
  trigger_type: string;
  severity?: string; // critical, high, medium, low
  source: string;
  description: string;
}

interface AnomalyReport {
  timestamp: string;
  signals: AutonomySignal[];
}

async function main() {
  const args = process.argv.slice(2);
  const reportFile = args[0];

  if (!reportFile) {
    console.error('Usage: tsx scripts/autonomy/enforce_stop_the_line.ts <anomaly_report.json>');
    process.exit(1);
  }

  const report: AnomalyReport = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const criticalSignals = report.signals.filter(s => s.severity === 'critical');

  const outputDir = path.join(process.cwd(), 'artifacts/autonomy', new Date().toISOString().split('T')[0]);
  if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
  }

  const stopTheLineArtifact = path.join(outputDir, 'stop-the-line.json');

  if (criticalSignals.length > 0) {
    console.error('STOP THE LINE: Critical signals detected.');
    criticalSignals.forEach(s => console.error(`- [${s.source}] ${s.description}`));

    const artifact = {
      active: true,
      reason: 'Critical signals detected',
      signals: criticalSignals,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(stopTheLineArtifact, JSON.stringify(artifact, null, 2));

    // Create stamp
    fs.writeFileSync(path.join(outputDir, 'stamp.json'), JSON.stringify({ status: 'STOPPED', reason: 'Critical signals' }, null, 2));

    process.exit(1); // Fail the build
  }

  console.log('Stop-the-line checks passed.');
  const artifact = {
      active: false,
      timestamp: new Date().toISOString()
  };
  fs.writeFileSync(stopTheLineArtifact, JSON.stringify(artifact, null, 2));
}

main();
