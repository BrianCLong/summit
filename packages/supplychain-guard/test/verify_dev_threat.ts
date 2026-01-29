import { auditFile } from '../src/gates/dev_threat_audit.js';
import fs from 'fs';
import assert from 'assert';

const badFile = 'packages/supplychain-guard/test/temp_bad.ps1';
const goodFile = 'packages/supplychain-guard/test/temp_good.js';

fs.writeFileSync(badFile, 'powershell -EncodedCommand foobar');
fs.writeFileSync(goodFile, 'console.log("hello")');

console.log('Running manual verification for Dev Threat Audit...');

try {
    const findingsBad = auditFile(badFile);
    assert.strictEqual(findingsBad.length, 1, 'Should detect bad pattern');
    assert.ok(findingsBad[0].pattern.includes('powershell'), 'Should match powershell pattern');
    console.log('✅ Bad file detected');

    const findingsGood = auditFile(goodFile);
    assert.strictEqual(findingsGood.length, 0, 'Should pass good file');
    console.log('✅ Good file passed');

} catch (e) {
    console.error('❌ Verification Failed:', e);
    process.exit(1);
} finally {
    if (fs.existsSync(badFile)) fs.unlinkSync(badFile);
    if (fs.existsSync(goodFile)) fs.unlinkSync(goodFile);
}
