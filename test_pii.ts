import { piiDetector } from './server/src/privacy/PIIDetector.js';

async function test() {
    const piiScan = await piiDetector.scanText("Hello John Doe! My SSN is 000-00-0000", { includeValue: true });
    console.log(piiScan.data.riskScore);
}
test().catch(console.error);
