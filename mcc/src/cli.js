"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCli = buildCli;
exports.runCli = runCli;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const commander_1 = require("commander");
const compiler_js_1 = require("./compiler.js");
const canonical_js_1 = require("./canonical.js");
const errors_js_1 = require("./errors.js");
const hooks_js_1 = require("./hooks.js");
const signer_js_1 = require("./signer.js");
const gallery_js_1 = require("./gallery.js");
const yaml_1 = require("yaml");
const validator_js_1 = require("./validator.js");
function buildCli() {
    const program = new commander_1.Command();
    program.name('mcc').description('Model Card Compiler (MCC)').version('0.1.0');
    program
        .command('validate')
        .description('Validate a YAML model card without writing output.')
        .argument('<modelCard>', 'Path to the YAML model card')
        .action((modelCardPath) => {
        try {
            const raw = (0, node_fs_1.readFileSync)(modelCardPath, 'utf8');
            const parsed = (0, yaml_1.parse)(raw);
            (0, validator_js_1.validateModelCard)(parsed);
            process.stdout.write('Model card is valid.\n');
        }
        catch (error) {
            if (error instanceof errors_js_1.ModelCardValidationError) {
                process.stderr.write('Model card validation failed:\n');
                error.issues.forEach((issue) => process.stderr.write(` - ${issue}\n`));
                process.exitCode = 1;
                return;
            }
            throw error;
        }
    });
    program
        .command('compile')
        .description('Compile and sign a YAML model card, emitting JSON output.')
        .argument('<modelCard>', 'Path to the YAML model card')
        .option('-o, --output <path>', 'Where to write the signed JSON card')
        .requiredOption('--private-key <path>', 'Path to an Ed25519 private key in PEM format')
        .option('--public-key <path>', 'Optional path to the public key (otherwise derived from the private key)')
        .action((modelCardPath, options) => {
        try {
            const result = (0, compiler_js_1.compileModelCardFromFile)(modelCardPath, options.output, {
                privateKeyPath: (0, node_path_1.resolve)(options.privateKey),
                publicKeyPath: options.publicKey ? (0, node_path_1.resolve)(options.publicKey) : undefined,
            });
            process.stdout.write(`Model card compiled for ${result.card.metadata.modelId}#${result.card.metadata.version}.\n`);
            if (options.output) {
                process.stdout.write(`Signed card written to ${(0, node_path_1.resolve)(options.output)}.\n`);
            }
        }
        catch (error) {
            if (error instanceof errors_js_1.ModelCardValidationError) {
                process.stderr.write('Model card validation failed:\n');
                error.issues.forEach((issue) => process.stderr.write(` - ${issue}\n`));
                process.exitCode = 1;
                return;
            }
            throw error;
        }
    });
    program
        .command('verify')
        .description('Verify the signature embedded in a compiled model card JSON file.')
        .argument('<compiledCard>', 'Path to the compiled model card JSON file')
        .action((compiledCardPath) => {
        const card = JSON.parse((0, node_fs_1.readFileSync)(compiledCardPath, 'utf8'));
        const canonical = (0, canonical_js_1.canonicalize)({
            metadata: card.metadata,
            description: card.description,
            metrics: card.metrics,
            intendedUse: card.intendedUse,
            dataLineage: card.dataLineage,
            risk: card.risk,
            enforcement: card.enforcement,
        });
        const isValid = (0, signer_js_1.verifySignature)(canonical, card.signature);
        if (!isValid) {
            process.stderr.write('Signature verification failed.\n');
            process.exitCode = 1;
            return;
        }
        process.stdout.write('Signature verification succeeded.\n');
    });
    program
        .command('hooks')
        .description('Generate TypeScript enforcement hooks for a compiled model card.')
        .argument('<compiledCard>', 'Path to the compiled model card JSON file')
        .option('-o, --output <path>', 'Path to write a TypeScript module (defaults to stdout)')
        .action((compiledCardPath, options) => {
        const card = JSON.parse((0, node_fs_1.readFileSync)(compiledCardPath, 'utf8'));
        const _hooks = (0, hooks_js_1.createEnforcementHooks)(card);
        const moduleBody = `import card from './${compiledCardPath}';\n\nexport function denyIfOutOfScope(purpose: string) {\n  const hooks = (${hooks_js_1.createEnforcementHooks.toString()})(card);\n  hooks.denyIfOutOfScope({ purpose });\n}\n`;
        if (options.output) {
            (0, node_fs_1.writeFileSync)((0, node_path_1.resolve)(options.output), moduleBody, 'utf8');
            process.stdout.write(`Hook module written to ${(0, node_path_1.resolve)(options.output)}.\n`);
        }
        else {
            process.stdout.write(`${moduleBody}\n`);
        }
    });
    program
        .command('gallery')
        .description('Build a JSON dataset for the static gallery UI from compiled cards.')
        .argument('<output>', 'Path to write the gallery dataset (JSON)')
        .argument('<compiledCards...>', 'Compiled model card JSON files to include in the gallery')
        .action((output, compiledCards) => {
        const cards = compiledCards.map((cardPath) => JSON.parse((0, node_fs_1.readFileSync)(cardPath, 'utf8')));
        (0, gallery_js_1.writeGalleryDataset)((0, node_path_1.resolve)(output), cards);
        process.stdout.write(`Gallery dataset written to ${(0, node_path_1.resolve)(output)} with ${cards.length} card(s).\n`);
    });
    return program;
}
function runCli(argv = process.argv) {
    const cli = buildCli();
    cli.parse(argv);
}
if (import.meta.url === `file://${process.argv[1]}`) {
    runCli();
}
