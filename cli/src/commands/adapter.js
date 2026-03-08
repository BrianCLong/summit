"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdapterCommands = registerAdapterCommands;
const node_fs_1 = __importDefault(require("node:fs"));
const ora_1 = __importDefault(require("ora"));
const adapter_sdk_1 = require("@intelgraph/adapter-sdk");
const errors_js_1 = require("../utils/errors.js");
const output_js_1 = require("../utils/output.js");
function readJsonFile(filePath) {
    const raw = node_fs_1.default.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}
function registerAdapterCommands(program) {
    const adapter = program
        .command('adapter')
        .description('Adapter packaging and verification utilities');
    adapter
        .command('package')
        .description('Build, attest, and sign an adapter bundle')
        .requiredOption('-s, --source <path>', 'Adapter payload directory to include in the bundle')
        .requiredOption('-m, --manifest <path>', 'Adapter manifest JSON')
        .requiredOption('-c, --config-schema <path>', 'Adapter config schema JSON')
        .requiredOption('--compatibility <path>', 'Compatibility matrix JSON')
        .requiredOption('-k, --key <path>', 'Private key for cosign signing')
        .option('-o, --output <dir>', 'Output directory for bundle artifacts', 'dist')
        .option('--sbom <path>', 'Existing SBOM JSON to embed (optional)')
        .option('--slsa <path>', 'Existing SLSA attestation JSON to embed (optional)')
        .option('--cosign <binary>', 'Cosign binary to use', 'cosign')
        .action(async (options) => {
        const spinner = (0, ora_1.default)('Building adapter bundle...').start();
        try {
            const manifest = readJsonFile(options.manifest);
            const compatibility = readJsonFile(options.compatibility);
            const result = await (0, adapter_sdk_1.buildAdapterBundle)({
                manifest,
                compatibility,
                sourceDir: options.source,
                configSchemaPath: options.configSchema,
                outputDir: options.output,
                sbomPath: options.sbom,
                slsaPath: options.slsa,
                cosignBinary: options.cosign,
                signingKeyPath: options.key,
            });
            spinner.succeed('Bundle created');
            if (program.opts().json) {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                (0, output_js_1.success)('Adapter bundle packaged and signed');
                console.log(`  Bundle: ${result.bundlePath}`);
                console.log(`  Signature: ${result.signaturePath}`);
                console.log(`  Digest: ${result.bundleDigest}`);
            }
        }
        catch (err) {
            spinner.fail('Failed to build bundle');
            if (err instanceof adapter_sdk_1.BundleValidationError) {
                (0, output_js_1.error)(err.message);
                return;
            }
            (0, errors_js_1.handleError)(err instanceof Error ? err : new Error(String(err)));
        }
    });
    adapter
        .command('verify <bundle>')
        .description('Verify an adapter bundle signature and compatibility')
        .requiredOption('-s, --signature <path>', 'Cosign signature file')
        .requiredOption('-k, --key <path>', 'Cosign public key')
        .requiredOption('--sdk-version <version>', 'Expected adapter SDK version range')
        .option('--cosign <binary>', 'Cosign binary to use', 'cosign')
        .option('--allow-prerelease', 'Allow prerelease versions when evaluating ranges', false)
        .action(async (bundle, options) => {
        const spinner = (0, ora_1.default)('Verifying adapter bundle...').start();
        try {
            const result = await (0, adapter_sdk_1.verifyAdapterBundle)({
                bundlePath: bundle,
                signaturePath: options.signature,
                publicKeyPath: options.key,
                expectedSdkVersion: options.sdkVersion,
                cosignBinary: options.cosign,
                allowPrerelease: options.allowPrerelease,
            });
            spinner.succeed('Bundle verified');
            if (program.opts().json) {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                (0, output_js_1.success)(`Signature validated for ${result.manifest.name}@${result.manifest.version}`);
                for (const line of result.diagnostics) {
                    console.log(`  • ${line}`);
                }
            }
        }
        catch (err) {
            spinner.fail('Bundle verification failed');
            if (err instanceof adapter_sdk_1.BundleValidationError) {
                (0, output_js_1.error)(err.message);
                return;
            }
            (0, errors_js_1.handleError)(err instanceof Error ? err : new Error(String(err)));
        }
    });
}
