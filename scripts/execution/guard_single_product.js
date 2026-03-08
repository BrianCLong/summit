"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.checkOverride = checkOverride;
exports.getChangedFiles = getChangedFiles;
exports.validateFiles = validateFiles;
exports.main = main;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const child_process_1 = require("child_process");
const url_1 = require("url");
// Fix for __dirname in ESM
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
// Adjust config path assuming script is in scripts/execution/
const CONFIG_PATH = path_1.default.resolve(__dirname, '../../config/execution_governor.yml');
function loadConfig(configPath = CONFIG_PATH) {
    if (!fs_1.default.existsSync(configPath)) {
        console.error(`Config file not found at ${configPath}`);
        process.exit(1);
    }
    const fileContents = fs_1.default.readFileSync(configPath, 'utf8');
    return js_yaml_1.default.load(fileContents);
}
function checkOverride(overrideFile) {
    const overridePath = path_1.default.resolve(process.cwd(), overrideFile);
    if (!fs_1.default.existsSync(overridePath)) {
        return false;
    }
    const content = fs_1.default.readFileSync(overridePath, 'utf8').trim();
    const lines = content.split('\n');
    const expiryLine = lines.find(line => line.toLowerCase().startsWith('expires:'));
    if (!expiryLine) {
        console.error(`Error: ${overrideFile} found but missing 'Expires: YYYY-MM-DD' line.`);
        return false;
    }
    const dateStr = expiryLine.split(':')[1].trim();
    const expiryDate = new Date(dateStr);
    const now = new Date();
    if (isNaN(expiryDate.getTime())) {
        console.error(`Error: Invalid expiry date format in ${overrideFile}. Use YYYY-MM-DD.`);
        return false;
    }
    // Set expiry to end of day to avoid timezone confusion issues on the same day
    expiryDate.setHours(23, 59, 59, 999);
    if (expiryDate < now) {
        console.error(`Error: Override file ${overrideFile} has expired on ${dateStr}.`);
        return false;
    }
    console.log(`Override active until ${dateStr}.`);
    return true;
}
function getChangedFiles() {
    try {
        let baseRef = 'origin/main';
        try {
            (0, child_process_1.execSync)('git rev-parse --verify origin/main', { stdio: 'ignore' });
        }
        catch {
            try {
                (0, child_process_1.execSync)('git rev-parse --verify main', { stdio: 'ignore' });
                baseRef = 'main';
            }
            catch {
                console.warn("Could not find 'origin/main' or 'main'. Checking only staged/modified files.");
                const output = (0, child_process_1.execSync)('git diff --name-only HEAD', { encoding: 'utf8' });
                return output.split('\n').filter(line => line.trim() !== '');
            }
        }
        const command = `git diff --name-only ${baseRef}...HEAD`;
        const output = (0, child_process_1.execSync)(command, { encoding: 'utf8' });
        return output.split('\n').filter(line => line.trim() !== '');
    }
    catch (error) {
        console.warn("Git diff failed, falling back to HEAD diff", error);
        try {
            const output = (0, child_process_1.execSync)('git diff --name-only HEAD', { encoding: 'utf8' });
            return output.split('\n').filter(line => line.trim() !== '');
        }
        catch (e) {
            return [];
        }
    }
}
function validateFiles(files, config) {
    const violations = [];
    const frozenProducts = config.frozen_products || [];
    const allowedPaths = config.allowed_paths_always || [];
    for (const file of files) {
        if (!file)
            continue;
        // Check if file is in allowed paths (prefix match)
        const isAllowed = allowedPaths.some(allowed => file.startsWith(allowed));
        if (isAllowed)
            continue;
        // Check if file touches a frozen product
        const parts = file.split('/');
        for (const frozen of frozenProducts) {
            if (parts.includes(frozen)) {
                violations.push(file);
                break;
            }
        }
    }
    return violations;
}
function main() {
    const config = loadConfig();
    if (checkOverride(config.override_file)) {
        console.log("Single Product Mode overridden.");
        process.exit(0);
    }
    const changedFiles = getChangedFiles();
    const violations = validateFiles(changedFiles, config);
    if (violations.length > 0) {
        console.error("ERROR: Single Product Mode Violation.");
        console.error(`Active Product: ${config.active_product}`);
        console.error("The following files touch frozen product areas:");
        violations.forEach(v => console.error(` - ${v}`));
        console.error(`\nTo bypass, add a ${config.override_file} file with 'Reason' and 'Expires: YYYY-MM-DD'.`);
        process.exit(1);
    }
    console.log(`Single Product Mode check passed. Active: ${config.active_product}`);
}
if (import.meta.url === (0, url_1.pathToFileURL)(process.argv[1]).href) {
    main();
}
