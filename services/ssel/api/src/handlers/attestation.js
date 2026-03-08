"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttestationHandler = void 0;
const getAttestationHandler = async (req, res) => {
    const response = {
        evidence_id: 'EVID-SSEL-MOCK',
        git_sha: 'mock',
        policy_sha: 'mock'
    };
    res.status(200).json(response);
};
exports.getAttestationHandler = getAttestationHandler;
