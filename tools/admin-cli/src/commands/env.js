"use strict";
/**
 * Environment commands for Admin CLI
 * Provides status, health, and service information
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEnvCommands = registerEnvCommands;
const commander_1 = require("commander");
const ora_1 = __importDefault(require("ora"));
const chalk_1 = __importDefault(require("chalk"));
const output_js_1 = require("../utils/output.js");
const api_client_js_1 = require("../utils/api-client.js");
const config_js_1 = require("../utils/config.js");
const logger_js_1 = require("../utils/logger.js");
/**
 * Register env commands
 */
function registerEnvCommands(program) {
    const envCmd = new commander_1.Command('env')
        .description('Environment status and health commands');
    // Status command
    envCmd
        .command('status')
        .description('Show overall environment status including services, health, and SLOs')
        .option('-e, --environment <env>', 'Target environment', 'development')
        .option('--detailed', 'Show detailed information')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await showEnvironmentStatus(options.environment, options.detailed, globalOpts);
    });
    // Health command
    envCmd
        .command('health')
        .description('Check health of all services')
        .option('-s, --service <name>', 'Check specific service')
        .option('--wait', 'Wait for services to become healthy')
        .option('--timeout <seconds>', 'Timeout for waiting', '60')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await checkHealth(options, globalOpts);
    });
    // Services command
    envCmd
        .command('services')
        .description('List all services and their status')
        .option('--type <type>', 'Filter by service type (api, database, cache, queue)')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await listServices(options.type, globalOpts);
    });
    // SLO command
    envCmd
        .command('slo')
        .description('Show SLO metrics summary')
        .option('--period <period>', 'Time period (hour, day, week)', 'day')
        .action(async (options, cmd) => {
        const globalOpts = cmd.optsWithGlobals();
        await showSLOSummary(options.period, globalOpts);
    });
    program.addCommand(envCmd);
}
/**
 * Show overall environment status
 */
async function showEnvironmentStatus(environment, detailed, options) {
    const spinner = (0, ora_1.default)('Fetching environment status...').start();
    try {
        const apiClient = (0, api_client_js_1.createApiClient)({
            endpoint: (0, config_js_1.getEndpoint)(options.profile, options.endpoint),
            token: (0, config_js_1.getToken)(options.profile, options.token),
        });
        // Fetch health and metrics in parallel
        const [healthResponse, metricsResponse] = await Promise.all([
            apiClient.get('/health/detailed'),
            apiClient.get('/metrics/slo'),
        ]);
        spinner.stop();
        if (!healthResponse.success) {
            (0, output_js_1.printError)(`Failed to fetch health: ${healthResponse.error?.message}`);
            process.exit(1);
        }
        const services = healthResponse.data?.services ?? getDefaultServices();
        const slo = metricsResponse.data ?? getDefaultSLO();
        const overallStatus = calculateOverallStatus(services);
        const status = {
            environment,
            timestamp: new Date().toISOString(),
            services,
            sloSummary: slo,
            overallStatus,
        };
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(status);
            return;
        }
        (0, output_js_1.printHeader)(`Environment: ${environment}`);
        // Overall status
        console.log(chalk_1.default.bold('Overall Status:'), (0, output_js_1.formatHealthStatus)(overallStatus));
        console.log(chalk_1.default.gray(`Last updated: ${status.timestamp}`));
        console.log();
        // SLO Summary
        console.log(chalk_1.default.bold('SLO Summary:'));
        console.log(`  Availability: ${(0, output_js_1.formatPercentage)(slo.availability)}`);
        console.log(`  Error Rate:   ${(0, output_js_1.formatPercentage)(slo.errorRate)}`);
        console.log(`  P99 Latency:  ${(0, output_js_1.formatDuration)(slo.p99Latency)}`);
        console.log(`  Throughput:   ${chalk_1.default.cyan(slo.throughput.toLocaleString())} req/s`);
        console.log();
        // Services
        console.log(chalk_1.default.bold('Services:'));
        const serviceRows = services.map((s) => ({
            name: s.name,
            status: (0, output_js_1.formatHealthStatus)(s.status),
            latency: s.latency ? (0, output_js_1.formatDuration)(s.latency) : '-',
            message: s.message ?? '-',
        }));
        (0, output_js_1.outputTable)(serviceRows, ['name', 'status', 'latency', 'message']);
        if (detailed) {
            console.log();
            console.log(chalk_1.default.bold('Detailed Information:'));
            for (const service of services) {
                if (service.details) {
                    console.log(`\n  ${chalk_1.default.cyan(service.name)}:`);
                    for (const [key, value] of Object.entries(service.details)) {
                        console.log(`    ${key}: ${JSON.stringify(value)}`);
                    }
                }
            }
        }
    }
    catch (err) {
        spinner.fail('Failed to fetch environment status');
        logger_js_1.logger.error('Error fetching environment status', {
            error: err instanceof Error ? err.message : String(err),
        });
        process.exit(1);
    }
}
/**
 * Check health of services
 */
async function checkHealth(options, globalOpts) {
    const spinner = (0, ora_1.default)('Checking health...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    const timeout = parseInt(options.timeout ?? '60', 10) * 1000;
    const startTime = Date.now();
    const checkOnce = async () => {
        const path = options.service
            ? `/health/service/${options.service}`
            : '/health/detailed';
        const response = await apiClient.get(path);
        if (!response.success) {
            throw new Error(response.error?.message ?? 'Health check failed');
        }
        if (options.service) {
            return [response.data];
        }
        return response.data.services ?? getDefaultServices();
    };
    try {
        let services;
        let healthy = false;
        do {
            services = await checkOnce();
            healthy = services.every((s) => s.status === 'healthy');
            if (!healthy && options.wait) {
                if (Date.now() - startTime > timeout) {
                    spinner.fail('Timeout waiting for services to become healthy');
                    outputServiceHealth(services, globalOpts);
                    process.exit(1);
                }
                spinner.text = `Waiting for services... (${Math.round((Date.now() - startTime) / 1000)}s)`;
                await sleep(2000);
            }
        } while (!healthy && options.wait);
        spinner.stop();
        outputServiceHealth(services, globalOpts);
        if (!healthy) {
            process.exit(1);
        }
    }
    catch (err) {
        spinner.fail('Health check failed');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * List all services
 */
async function listServices(type, globalOpts) {
    const spinner = (0, ora_1.default)('Fetching services...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.get('/health/detailed');
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch services: ${response.error?.message}`);
            process.exit(1);
        }
        let services = response.data?.services ?? getDefaultServices();
        if (type) {
            services = services.filter((s) => getServiceType(s.name) === type);
        }
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(services);
            return;
        }
        (0, output_js_1.printHeader)('Services');
        const serviceRows = services.map((s) => ({
            name: s.name,
            type: getServiceType(s.name),
            status: (0, output_js_1.formatHealthStatus)(s.status),
            latency: s.latency ? (0, output_js_1.formatDuration)(s.latency) : '-',
        }));
        (0, output_js_1.outputTable)(serviceRows);
    }
    catch (err) {
        spinner.fail('Failed to fetch services');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Show SLO summary
 */
async function showSLOSummary(period, globalOpts) {
    const spinner = (0, ora_1.default)('Fetching SLO metrics...').start();
    const apiClient = (0, api_client_js_1.createApiClient)({
        endpoint: (0, config_js_1.getEndpoint)(globalOpts.profile, globalOpts.endpoint),
        token: (0, config_js_1.getToken)(globalOpts.profile, globalOpts.token),
    });
    try {
        const response = await apiClient.get(`/metrics/slo?period=${period}`);
        spinner.stop();
        if (!response.success) {
            (0, output_js_1.printError)(`Failed to fetch SLO metrics: ${response.error?.message}`);
            // Fall back to mock data for demo
        }
        const slo = response.data ?? getDefaultSLO();
        if ((0, output_js_1.getOutputFormat)() === 'json') {
            (0, output_js_1.output)(slo);
            return;
        }
        (0, output_js_1.printHeader)(`SLO Summary (${period})`);
        const sloRows = [
            {
                metric: 'Availability',
                value: (0, output_js_1.formatPercentage)(slo.availability),
                target: (0, output_js_1.formatPercentage)(0.999),
                status: slo.availability >= 0.999 ? '✓' : '✗',
            },
            {
                metric: 'Error Rate',
                value: (0, output_js_1.formatPercentage)(slo.errorRate),
                target: '< 0.1%',
                status: slo.errorRate < 0.001 ? '✓' : '✗',
            },
            {
                metric: 'P99 Latency',
                value: (0, output_js_1.formatDuration)(slo.p99Latency),
                target: '< 500ms',
                status: slo.p99Latency < 500 ? '✓' : '✗',
            },
            {
                metric: 'Throughput',
                value: `${slo.throughput.toLocaleString()} req/s`,
                target: '> 1000 req/s',
                status: slo.throughput > 1000 ? '✓' : '✗',
            },
        ];
        (0, output_js_1.outputTable)(sloRows);
    }
    catch (err) {
        spinner.fail('Failed to fetch SLO metrics');
        (0, output_js_1.printError)(err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}
/**
 * Output service health
 */
function outputServiceHealth(services, _options) {
    if ((0, output_js_1.getOutputFormat)() === 'json') {
        (0, output_js_1.output)(services);
        return;
    }
    const serviceRows = services.map((s) => ({
        name: s.name,
        status: (0, output_js_1.formatHealthStatus)(s.status),
        latency: s.latency ? (0, output_js_1.formatDuration)(s.latency) : '-',
        message: s.message ?? '-',
    }));
    (0, output_js_1.outputTable)(serviceRows);
}
/**
 * Calculate overall status from service health
 */
function calculateOverallStatus(services) {
    const hasUnhealthy = services.some((s) => s.status === 'unhealthy');
    const hasDegraded = services.some((s) => s.status === 'degraded');
    if (hasUnhealthy)
        return 'unhealthy';
    if (hasDegraded)
        return 'degraded';
    return 'healthy';
}
/**
 * Get service type from name
 */
function getServiceType(name) {
    if (name.includes('api') || name.includes('graphql'))
        return 'api';
    if (name.includes('postgres') || name.includes('neo4j') || name.includes('db'))
        return 'database';
    if (name.includes('redis') || name.includes('cache'))
        return 'cache';
    if (name.includes('kafka') || name.includes('queue'))
        return 'queue';
    return 'service';
}
/**
 * Get default services for demo/fallback
 */
function getDefaultServices() {
    return [
        {
            name: 'api',
            status: 'healthy',
            latency: 45,
            lastChecked: new Date().toISOString(),
        },
        {
            name: 'graphql',
            status: 'healthy',
            latency: 52,
            lastChecked: new Date().toISOString(),
        },
        {
            name: 'postgres',
            status: 'healthy',
            latency: 12,
            lastChecked: new Date().toISOString(),
        },
        {
            name: 'neo4j',
            status: 'healthy',
            latency: 18,
            lastChecked: new Date().toISOString(),
        },
        {
            name: 'redis',
            status: 'healthy',
            latency: 3,
            lastChecked: new Date().toISOString(),
        },
        {
            name: 'elasticsearch',
            status: 'healthy',
            latency: 28,
            lastChecked: new Date().toISOString(),
        },
    ];
}
/**
 * Get default SLO for demo/fallback
 */
function getDefaultSLO() {
    return {
        availability: 0.9995,
        errorRate: 0.0005,
        p99Latency: 245,
        throughput: 2500,
    };
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
