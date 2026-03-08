"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretManager = void 0;
// NOTE: This is a mock implementation for development purposes.
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const secretsFilePath = path_1.default.join('/tmp', 'secrets.json');
async function readSecrets() {
    try {
        const data = await promises_1.default.readFile(secretsFilePath, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        // If the file doesn't exist, return a default structure
        if (error.code === 'ENOENT') {
            return {
                TEST_SECRET: {
                    v1: 'secret-value-1',
                    v2: 'secret-value-2',
                },
            };
        }
        throw error;
    }
}
async function writeSecrets(secrets) {
    await promises_1.default.writeFile(secretsFilePath, JSON.stringify(secrets, null, 2));
}
class SecretManager {
    async getSecret(secretName, version) {
        const secrets = await readSecrets();
        return secrets[secretName]?.[version];
    }
    async setSecret(secretName, version, value) {
        const secrets = await readSecrets();
        if (!secrets[secretName]) {
            secrets[secretName] = {};
        }
        secrets[secretName][version] = value;
        await writeSecrets(secrets);
    }
}
exports.SecretManager = SecretManager;
