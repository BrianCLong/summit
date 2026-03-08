"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFederatedBundle = validateFederatedBundle;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fs_1 = require("fs");
const path_1 = require("path");
// Load the schema
const schemaPath = (0, path_1.resolve)(__dirname, '../../schemas/federation/federated_bundle.schema.json');
const schema = JSON.parse((0, fs_1.readFileSync)(schemaPath, 'utf-8'));
// Create a new Ajv instance
const ajv = new ajv_1.default();
(0, ajv_formats_1.default)(ajv);
// Compile the schema
const validate = ajv.compile(schema);
/**
 * Validates a federated evidence bundle against the schema.
 * @param bundle The bundle to validate.
 * @returns A promise that resolves if the bundle is valid, and rejects with an error otherwise.
 */
async function validateFederatedBundle(bundle) {
    return new Promise((resolvePromise, rejectPromise) => {
        const isValid = validate(bundle);
        if (isValid) {
            resolvePromise();
        }
        else {
            rejectPromise(new Error(`Invalid federated bundle: ${ajv.errorsText(validate.errors)}`));
        }
    });
}
// Example usage:
if (require.main === module) {
    (async () => {
        try {
            const bundlePath = process.argv[2];
            if (!bundlePath) {
                console.error('Usage: ts-node validate_federated_bundle.ts <path-to-bundle.json>');
                process.exit(1);
            }
            const bundle = JSON.parse((0, fs_1.readFileSync)(bundlePath, 'utf-8'));
            await validateFederatedBundle(bundle);
            console.log('Federated bundle is valid.');
        }
        catch (error) {
            console.error(error.message);
            process.exit(1);
        }
    })();
}
