"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpaController = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const os_1 = __importDefault(require("os"));
const uuid_1 = require("uuid");
const http_param_js_1 = require("../utils/http-param.js");
const POLICY_DIR = path_1.default.resolve(process.cwd(), '../policy'); // Assuming server is running from server/ directory? No, usually process.cwd() is repo root in this sandbox, but let's check.
// In the sandbox, process.cwd() is likely the repo root.
// However, the server code often assumes it's running from `server/`.
// Let's use absolute paths based on `process.cwd()`.
// Helper to find OPA binary
const findOPA = async () => {
    // Check common locations or PATH
    const locations = [
        'opa', // PATH
        './opa',
        './server/bin/opa',
        '/usr/local/bin/opa'
    ];
    for (const loc of locations) {
        try {
            await new Promise((resolve, reject) => {
                const proc = (0, child_process_1.spawn)(loc, ['version']);
                proc.on('error', reject);
                proc.on('close', (code) => {
                    if (code === 0)
                        resolve(true);
                    else
                        reject(new Error('Non-zero exit'));
                });
            });
            return loc;
        }
        catch (e) {
            // ignore
        }
    }
    return 'opa'; // Default to PATH and hope for the best
};
class OpaController {
    static async getPolicies(req, res) {
        try {
            // Verify policy dir exists
            try {
                await promises_1.default.access(POLICY_DIR);
            }
            catch (e) {
                // Fallback to relative path if process.cwd() is different
                // If we are in server/, policy is ../policy
                // If we are in root, policy is ./policy
            }
            const realPolicyDir = (await promises_1.default.stat('policy').catch(() => false)) ? 'policy' : '../policy';
            const files = await promises_1.default.readdir(realPolicyDir);
            const regoFiles = files.filter((f) => f.endsWith('.rego'));
            res.json({ policies: regoFiles });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async getPolicyContent(req, res) {
        try {
            const filename = (0, http_param_js_1.firstString)(req.params.filename);
            if (!filename || !filename.endsWith('.rego')) {
                return res.status(400).json({ error: 'Invalid filename' });
            }
            const realPolicyDir = (await promises_1.default.stat('policy').catch(() => false)) ? 'policy' : '../policy';
            const filepath = path_1.default.join(realPolicyDir, filename);
            // Prevent directory traversal
            if (!filepath.startsWith(path_1.default.resolve(realPolicyDir))) {
                return res.status(403).json({ error: 'Access denied' });
            }
            const content = await promises_1.default.readFile(filepath, 'utf-8');
            res.json({ content });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    static async evaluatePolicy(req, res) {
        const { policy, input, entrypoint } = req.body;
        if (!policy) {
            return res.status(400).json({ error: 'Policy content is required' });
        }
        const tmpDir = os_1.default.tmpdir();
        const id = (0, uuid_1.v4)();
        const policyFile = path_1.default.join(tmpDir, `${id}.rego`);
        const inputFile = path_1.default.join(tmpDir, `${id}.json`);
        try {
            await promises_1.default.writeFile(policyFile, policy);
            await promises_1.default.writeFile(inputFile, JSON.stringify(input || {}));
            const opaCmd = await findOPA();
            // opa eval -i input.json -d policy.rego "data"
            const args = ['eval', '-i', inputFile, '-d', policyFile, entrypoint || 'data'];
            const result = await new Promise((resolve, reject) => {
                const proc = (0, child_process_1.spawn)(opaCmd, args);
                let stdout = '';
                let stderr = '';
                proc.stdout.on('data', (data) => stdout += data.toString());
                proc.stderr.on('data', (data) => stderr += data.toString());
                proc.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`OPA exited with code ${code}: ${stderr}`));
                    }
                    else {
                        resolve(stdout);
                    }
                });
                proc.on('error', (err) => {
                    reject(new Error(`Failed to start OPA: ${err.message}`));
                });
            });
            res.json(JSON.parse(result));
        }
        catch (error) {
            // If OPA is missing, return a mock response for testing if requested
            if (error.message.includes('ENOENT') || error.message.includes('Failed to start OPA')) {
                return res.status(500).json({
                    error: 'OPA binary not found',
                    details: error.message,
                    suggestion: 'Please install OPA or ensure it is in the PATH.'
                });
            }
            res.status(500).json({ error: error.message });
        }
        finally {
            // Cleanup
            await promises_1.default.unlink(policyFile).catch(() => { });
            await promises_1.default.unlink(inputFile).catch(() => { });
        }
    }
    static async validatePolicy(req, res) {
        const { policy } = req.body;
        if (!policy) {
            return res.status(400).json({ error: 'Policy content is required' });
        }
        const tmpDir = os_1.default.tmpdir();
        const id = (0, uuid_1.v4)();
        const policyFile = path_1.default.join(tmpDir, `${id}.rego`);
        try {
            await promises_1.default.writeFile(policyFile, policy);
            const opaCmd = await findOPA();
            // opa check policy.rego
            const args = ['check', policyFile];
            await new Promise((resolve, reject) => {
                const proc = (0, child_process_1.spawn)(opaCmd, args);
                let stderr = '';
                proc.stderr.on('data', (data) => stderr += data.toString());
                proc.on('close', (code) => {
                    if (code !== 0)
                        reject(new Error(stderr || 'Validation failed'));
                    else
                        resolve();
                });
                proc.on('error', (err) => reject(err));
            });
            res.json({ valid: true });
        }
        catch (error) {
            res.json({ valid: false, error: error.message });
        }
        finally {
            await promises_1.default.unlink(policyFile).catch(() => { });
        }
    }
}
exports.OpaController = OpaController;
