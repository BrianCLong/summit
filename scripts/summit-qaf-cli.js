#!/usr/bin/env -S npx ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const axios_1 = __importDefault(require("axios"));
// In a real CLI this would be configured via config file or env var
const API_URL = process.env.QAF_API_URL || 'http://localhost:3000/api/qaf';
const program = new commander_1.Command();
program
    .name('summit-cli')
    .description('Summit IntelGraph CLI')
    .version('1.0.0');
const qaf = program.command('qaf').description('Summit Quantum-Agent Factory commands');
qaf
    .command('factory')
    .description('Deploy or interact with the agent factory')
    .option('--deploy <provider>', 'Deploy to cloud provider (azure|gcp)')
    .option('--mtls', 'Enable mTLS')
    .option('--roi-dashboard', 'Launch ROI dashboard')
    .action(async (options) => {
    if (options.deploy) {
        console.log(`Deploying factory to ${options.deploy}...`);
        // In real CLI, this would shell out to Terraform/Helm
        console.log('✅ Deployment simulated.');
    }
    if (options.mtls) {
        console.log('🔒 mTLS enabled for factory.');
    }
    if (options.roiDashboard) {
        console.log('📊 Opening ROI Dashboard: https://qaf.summit.internal/dashboard');
    }
    if (!options.deploy && !options.mtls && !options.roiDashboard) {
        console.log('Checking factory status...');
        try {
            const res = await axios_1.default.get(`${API_URL}/telemetry`);
            console.log('Status:', res.data);
        }
        catch (e) {
            console.error('Error contacting factory:', e.message);
        }
    }
});
qaf.command('spawn')
    .description('Spawn a new agent')
    .requiredOption('--name <name>', 'Agent name')
    .requiredOption('--role <role>', 'Agent role')
    .option('--quantum', 'Ensure quantum safety', true)
    .action(async (options) => {
    const config = {
        name: options.name,
        role: options.role,
        tenantId: 'cli-user',
        capabilities: ['cli-spawned'],
        securityLevel: options.quantum ? 'quantum-secure' : 'standard',
    };
    try {
        console.log(`Spawning agent ${config.name}...`);
        const res = await axios_1.default.post(`${API_URL}/spawn`, config);
        console.log('✅ Agent Spawned:');
        console.log(JSON.stringify(res.data, null, 2));
    }
    catch (e) {
        console.error('Spawn failed:', e.message);
    }
});
program.parse(process.argv);
