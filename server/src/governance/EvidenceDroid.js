"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceDroidService = void 0;
class EvidenceDroidService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!EvidenceDroidService.instance) {
            EvidenceDroidService.instance = new EvidenceDroidService();
        }
        return EvidenceDroidService.instance;
    }
    async collectEvidence(controlId) {
        let data = {};
        if (controlId === 'SOC2-CC6.1') {
            data = { users: ['alice', 'bob'], mfa_enabled: true };
        }
        else {
            data = { status: 'unknown_control' };
        }
        return {
            controlId,
            timestamp: new Date(),
            data,
            signature: 'sha256-mock-signature-' + Date.now()
        };
    }
}
exports.EvidenceDroidService = EvidenceDroidService;
