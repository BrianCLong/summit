"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyManifest = verifyManifest;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const schema_js_1 = require("./schema.js");
async function getFileHash(filePath) {
    const fileBuffer = await fs_1.promises.readFile(filePath);
    return (0, crypto_1.createHash)('sha256').update(fileBuffer).digest('hex');
}
async function verifyManifest(manifestPath, exportDir) {
    const errors = [];
    // 1. Check if manifest exists
    let manifestContent;
    try {
        manifestContent = await fs_1.promises.readFile(manifestPath, 'utf-8');
    }
    catch (error) {
        return { success: false, errors: [`Manifest file not found at ${manifestPath}`] };
    }
    // 2. Validate manifest schema
    let manifest;
    try {
        const manifestJson = JSON.parse(manifestContent);
        manifest = schema_js_1.manifestSchema.parse(manifestJson);
    }
    catch (error) {
        if (error.errors) {
            const validationErrors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
            return { success: false, errors: ['Manifest schema validation failed:', ...validationErrors] };
        }
        return { success: false, errors: ['Manifest file is not a valid JSON or does not match the schema.'] };
    }
    // 3. Verify file hashes
    for (const [relativePath, fileInfo] of Object.entries(manifest.files)) {
        const filePath = path_1.default.join(exportDir, relativePath);
        const resolvedPath = path_1.default.resolve(filePath);
        const resolvedExportDir = path_1.default.resolve(exportDir);
        if (!resolvedPath.startsWith(resolvedExportDir)) {
            errors.push(`Path traversal detected for file: ${relativePath}`);
            continue;
        }
        // Check if file exists
        try {
            await fs_1.promises.access(filePath);
        }
        catch (error) {
            errors.push(`File not found: ${relativePath}`);
            continue;
        }
        // Check file hash
        const actualHash = await getFileHash(filePath);
        if (actualHash !== fileInfo.hash) {
            errors.push(`Hash mismatch for file: ${relativePath}. Expected ${fileInfo.hash}, got ${actualHash}`);
        }
    }
    return {
        success: errors.length === 0,
        errors,
    };
}
