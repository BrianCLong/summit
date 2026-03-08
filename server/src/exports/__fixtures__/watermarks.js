"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLedgerFixtures = exports.manifestFixtures = exports.watermarkFixtures = void 0;
const watermarkRecord = {
    'valid-artifact': 'exportId=export-123;manifestHash=abcd1234;policyHash=policy-v1',
    'tampered-artifact': 'exportId=export-123;manifestHash=ffff0000;policyHash=policy-tampered',
};
const manifestRecord = {
    'export-123': {
        manifestHash: 'abcd1234fedcba9876543210abcd1234fedcba98',
        policyHash: 'policy-v1',
    },
};
const auditLedgerRecord = {
    'export-123': {
        exportId: 'export-123',
        policyHash: 'policy-v1',
        manifestHash: 'abcd1234fedcba9876543210abcd1234fedcba98',
    },
};
exports.watermarkFixtures = Object.freeze({ ...watermarkRecord });
exports.manifestFixtures = Object.freeze({ ...manifestRecord });
exports.auditLedgerFixtures = Object.freeze({ ...auditLedgerRecord });
