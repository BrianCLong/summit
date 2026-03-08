"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dev_threat_audit_js_1 = require("../src/gates/dev_threat_audit.js");
const fs_1 = __importDefault(require("fs"));
const assert_1 = __importDefault(require("assert"));
const badFile = 'packages/supplychain-guard/test/temp_bad.ps1';
const goodFile = 'packages/supplychain-guard/test/temp_good.js';
fs_1.default.writeFileSync(badFile, 'powershell -EncodedCommand foobar');
fs_1.default.writeFileSync(goodFile, 'console.log("hello")');
console.log('Running manual verification for Dev Threat Audit...');
try {
    const findingsBad = (0, dev_threat_audit_js_1.auditFile)(badFile);
    assert_1.default.strictEqual(findingsBad.length, 1, 'Should detect bad pattern');
    assert_1.default.ok(findingsBad[0].pattern.includes('powershell'), 'Should match powershell pattern');
    console.log('✅ Bad file detected');
    const findingsGood = (0, dev_threat_audit_js_1.auditFile)(goodFile);
    assert_1.default.strictEqual(findingsGood.length, 0, 'Should pass good file');
    console.log('✅ Good file passed');
}
catch (e) {
    console.error('❌ Verification Failed:', e);
    process.exit(1);
}
finally {
    if (fs_1.default.existsSync(badFile))
        fs_1.default.unlinkSync(badFile);
    if (fs_1.default.existsSync(goodFile))
        fs_1.default.unlinkSync(goodFile);
}
