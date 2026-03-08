"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compilePolicy = compilePolicy;
exports.runAnalytic = runAnalytic;
exports.verifyAttestation = verifyAttestation;
exports.analyzeGraph = analyzeGraph;
const node_child_process_1 = require("node:child_process");
function resolveBin(options) {
    return options?.binPath ?? process.env.PSC_RUNNER_BIN ?? 'psc-runner';
}
function invokeRunner(args, options) {
    const bin = resolveBin(options);
    const result = (0, node_child_process_1.spawnSync)(bin, args, {
        encoding: 'utf8',
        env: options?.env,
    });
    if (result.error) {
        throw new Error(`failed to run ${bin}: ${result.error.message}`);
    }
    if (result.status !== 0) {
        const stderr = result.stderr?.trim() ?? 'unknown error';
        throw new Error(`psc-runner exited with code ${result.status}: ${stderr}`);
    }
    return (result.stdout ?? '').trim();
}
function compilePolicy(policyPath, outputPath, options) {
    const args = [
        'compile',
        '--policy',
        policyPath,
        '--secret-hex',
        options.secretHex,
        '--out',
        outputPath,
        '--key-id',
        options.keyId ?? 'demo-key',
    ];
    return invokeRunner(args, options);
}
function runAnalytic(policyPath, inputPath, options) {
    const args = [
        'run',
        '--policy',
        policyPath,
        '--input',
        inputPath,
        '--sealed-out',
        options.sealedOut,
        '--proof-out',
        options.proofOut,
    ];
    return invokeRunner(args, options);
}
function verifyAttestation(policyPath, sealedPath, proofPath, options) {
    const args = [
        'verify',
        '--policy',
        policyPath,
        '--sealed',
        sealedPath,
        '--proof',
        proofPath,
    ];
    return invokeRunner(args, options);
}
function analyzeGraph(options) {
    const args = [
        'graph',
        '--graph',
        options.graphPath,
        '--out',
        options.outPath,
        '--algorithm',
        options.algorithm,
    ];
    if (options.algorithm === 'shortest-path') {
        if (!options.start || !options.end) {
            throw new Error('start and end are required for shortest-path');
        }
        args.push('--start', options.start, '--end', options.end);
    }
    if (options.algorithm === 'page-rank') {
        if (typeof options.damping === 'number') {
            args.push('--damping', options.damping.toString());
        }
        if (typeof options.tolerance === 'number') {
            args.push('--tolerance', options.tolerance.toString());
        }
        if (typeof options.iterations === 'number') {
            args.push('--iterations', options.iterations.toString());
        }
    }
    return invokeRunner(args, options);
}
