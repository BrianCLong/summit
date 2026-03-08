"use strict";
/**
 * Attestation Service Client
 *
 * Leverages services/attest for generating cryptographic attestations.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAttestation = generateAttestation;
const axios_1 = __importDefault(require("axios"));
const ATTEST_SERVICE_URL = process.env.ATTEST_SERVICE_URL || 'http://attest:4040';
async function generateAttestation(artifact, context) {
    try {
        const reportB64 = Buffer.from(JSON.stringify(artifact)).toString('base64');
        const response = await axios_1.default.post(`${ATTEST_SERVICE_URL}/verify`, {
            nodeId: 'FACTCERT-NODE-01',
            provider: 'summit-internal',
            reportB64
        }).catch(() => null);
        if (response?.data?.ok) {
            return `summit://attest/proofs/${response.data.measurement}`;
        }
        return `summit://attest/mock/${Buffer.from(context).toString('hex').substring(0, 8)}`;
    }
    catch (error) {
        console.error('Failed to generate attestation', error);
        return 'summit://attest/error';
    }
}
