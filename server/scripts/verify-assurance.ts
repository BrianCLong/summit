
import { AssuranceService } from '../src/services/AssuranceService.js';
import fs from 'fs';
import path from 'path';

async function runVerification() {
  console.log('🔍 Starting Assurance Verification...');

  try {
    const service = AssuranceService.getInstance();
    const result = await service.evaluate();

    // Console output for human readability in logs
    console.log(`\nVerification Timestamp: ${result.timestamp}`);
    console.log(`Overall Status: ${result.overallStatus}`);
    console.log('\nSignal Details:');
    result.signals.forEach(signal => {
      console.log(`- [${signal.status}] ${signal.name} (${signal.id}): ${signal.reason}`);
    });

    // Write artifact
    const outputPath = path.resolve(process.cwd(), 'assurance-results.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`\n📄 Results written to: ${outputPath}`);

    // Determine exit code
    if (result.overallStatus === 'FAIL') {
      console.error('\n❌ Assurance Verification FAILED');
      process.exit(1);
    } else {
      console.log('\n✅ Assurance Verification PASSED');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 Critical Error during verification:', error);
    process.exit(1);
  }
}

runVerification();
