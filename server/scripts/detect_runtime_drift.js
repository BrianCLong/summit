"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const process_1 = require("process");
const API_URL = process.env.API_URL || 'http://localhost:3000';
async function checkAuth() {
    console.log(`Checking Auth on ${API_URL}/api/auth/verify-token...`);
    try {
        await axios_1.default.get(`${API_URL}/api/auth/verify-token`);
        console.error('FAIL: Auth check failed - Request succeeded but should have been unauthorized');
        return false;
    }
    catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('PASS: Auth check passed (401 received)');
            return true;
        }
        console.error(`FAIL: Auth check failed with unexpected error: ${error.message}`);
        return false;
    }
}
async function checkProvenance() {
    console.log(`Checking Provenance Health on ${API_URL}/api/provenance-beta/health...`);
    try {
        const response = await axios_1.default.get(`${API_URL}/api/provenance-beta/health`);
        if (response.status === 200 && response.data.status === 'ok') {
            console.log('PASS: Provenance health check passed');
            return true;
        }
        console.error('FAIL: Provenance health check failed - Invalid response', response.data);
        return false;
    }
    catch (error) {
        console.error(`FAIL: Provenance health check failed: ${error.message}`);
        return false;
    }
}
async function checkRateLimits() {
    console.log(`Checking Rate Limit Headers on ${API_URL}/api/auth/verify-token...`);
    try {
        // We expect 401, but headers should be there
        await axios_1.default.get(`${API_URL}/api/auth/verify-token`);
    }
    catch (error) {
        if (error.response) {
            const headers = error.response.headers;
            const limit = headers['x-ratelimit-limit'];
            const remaining = headers['x-ratelimit-remaining'];
            if (limit && remaining) {
                console.log(`PASS: Rate limit headers present (Limit: ${limit}, Remaining: ${remaining})`);
                return true;
            }
            console.error('FAIL: Rate limit headers missing', headers);
            return false;
        }
        console.error(`FAIL: Rate limit check failed with no response: ${error.message}`);
        return false;
    }
    return false;
}
async function main() {
    console.log('Starting Runtime Drift Detection...');
    const authPass = await checkAuth();
    const provPass = await checkProvenance();
    const ratePass = await checkRateLimits();
    if (authPass && provPass && ratePass) {
        console.log('\nAll checks PASSED: System is stable.');
        (0, process_1.exit)(0);
    }
    else {
        console.error('\nSome checks FAILED: Drift or outage detected.');
        (0, process_1.exit)(1);
    }
}
main();
