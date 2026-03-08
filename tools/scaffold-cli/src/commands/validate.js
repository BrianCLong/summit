"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
exports.validateCommand = new commander_1.Command('validate')
    .description('Validate a service against Golden Path requirements')
    .argument('<service>', 'Service name or path to validate')
    .option('-v, --verbose', 'Show detailed output')
    .action(async (service, options) => {
    try {
        const servicePath = await resolveServicePath(service);
        const results = await validateService(servicePath, options.verbose);
        printResults(results);
        const failed = results.filter((r) => !r.passed).length;
        if (failed > 0) {
            console.log(chalk_1.default.red(`\n${failed} check(s) failed`));
            process.exit(1);
        }
        else {
            console.log(chalk_1.default.green('\nAll checks passed!'));
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(chalk_1.default.red(`Error: ${error.message}`));
        }
        process.exit(1);
    }
});
async function resolveServicePath(service) {
    // Check if it's an absolute path
    if (path_1.default.isAbsolute(service)) {
        if (await fs_extra_1.default.pathExists(service)) {
            return service;
        }
        throw new Error(`Path not found: ${service}`);
    }
    // Check common locations
    const locations = [
        path_1.default.join(process.cwd(), service),
        path_1.default.join(process.cwd(), 'services', service),
        path_1.default.join(process.cwd(), 'apps', service),
        path_1.default.join(process.cwd(), 'packages', service),
    ];
    for (const loc of locations) {
        if (await fs_extra_1.default.pathExists(loc)) {
            return loc;
        }
    }
    throw new Error(`Service not found: ${service}`);
}
async function validateService(servicePath, verbose) {
    const results = [];
    if (verbose) {
        console.log(chalk_1.default.cyan(`\nValidating: ${servicePath}\n`));
    }
    // Structure checks
    results.push(...(await validateStructure(servicePath)));
    // Configuration checks
    results.push(...(await validateConfiguration(servicePath)));
    // Health endpoint checks
    results.push(...(await validateHealthEndpoints(servicePath)));
    // Observability checks
    results.push(...(await validateObservability(servicePath)));
    // Security checks
    results.push(...(await validateSecurity(servicePath)));
    // CI/CD checks
    results.push(...(await validateCiCd(servicePath)));
    return results;
}
async function validateStructure(servicePath) {
    const results = [];
    const category = 'Structure';
    // Required directories
    const requiredDirs = ['src', 'tests'];
    for (const dir of requiredDirs) {
        const exists = await fs_extra_1.default.pathExists(path_1.default.join(servicePath, dir));
        results.push({
            category,
            check: `Directory '${dir}/' exists`,
            passed: exists,
            message: exists ? 'Found' : `Missing required directory: ${dir}/`,
        });
    }
    // Recommended directories
    const recommendedDirs = ['slos', 'dashboards', 'policies'];
    for (const dir of recommendedDirs) {
        const exists = await fs_extra_1.default.pathExists(path_1.default.join(servicePath, dir));
        results.push({
            category,
            check: `Directory '${dir}/' exists`,
            passed: exists,
            message: exists ? 'Found' : `Recommended directory missing: ${dir}/`,
        });
    }
    // Required files
    const requiredFiles = ['package.json', 'tsconfig.json', 'README.md'];
    for (const file of requiredFiles) {
        const exists = await fs_extra_1.default.pathExists(path_1.default.join(servicePath, file));
        results.push({
            category,
            check: `File '${file}' exists`,
            passed: exists,
            message: exists ? 'Found' : `Missing required file: ${file}`,
        });
    }
    return results;
}
async function validateConfiguration(servicePath) {
    const results = [];
    const category = 'Configuration';
    // Check package.json
    const packageJsonPath = path_1.default.join(servicePath, 'package.json');
    if (await fs_extra_1.default.pathExists(packageJsonPath)) {
        try {
            const packageJson = await fs_extra_1.default.readJson(packageJsonPath);
            // Required scripts
            const requiredScripts = ['build', 'test', 'lint', 'dev'];
            for (const script of requiredScripts) {
                const hasScript = packageJson.scripts?.[script];
                results.push({
                    category,
                    check: `Script '${script}' defined`,
                    passed: !!hasScript,
                    message: hasScript ? 'Found' : `Missing required script: ${script}`,
                });
            }
            // CompanyOS metadata
            const hasMetadata = packageJson.companyos?.team;
            results.push({
                category,
                check: 'CompanyOS metadata present',
                passed: !!hasMetadata,
                message: hasMetadata
                    ? `Team: ${packageJson.companyos.team}`
                    : 'Missing companyos.team in package.json',
            });
        }
        catch {
            results.push({
                category,
                check: 'package.json valid',
                passed: false,
                message: 'Invalid JSON in package.json',
            });
        }
    }
    // Check tsconfig.json
    const tsconfigPath = path_1.default.join(servicePath, 'tsconfig.json');
    if (await fs_extra_1.default.pathExists(tsconfigPath)) {
        try {
            const tsconfig = await fs_extra_1.default.readJson(tsconfigPath);
            const extendsBase = tsconfig.extends?.includes('tsconfig.base.json');
            results.push({
                category,
                check: 'tsconfig extends base',
                passed: !!extendsBase,
                message: extendsBase
                    ? 'Extends tsconfig.base.json'
                    : 'Should extend tsconfig.base.json',
            });
        }
        catch {
            results.push({
                category,
                check: 'tsconfig.json valid',
                passed: false,
                message: 'Invalid JSON in tsconfig.json',
            });
        }
    }
    return results;
}
async function validateHealthEndpoints(servicePath) {
    const results = [];
    const category = 'Health Endpoints';
    // Look for health route implementation
    const healthRoutePatterns = [
        path_1.default.join(servicePath, 'src/routes/health.ts'),
        path_1.default.join(servicePath, 'src/health.ts'),
        path_1.default.join(servicePath, 'src/routes/health.js'),
    ];
    let foundHealthRoute = false;
    for (const pattern of healthRoutePatterns) {
        if (await fs_extra_1.default.pathExists(pattern)) {
            foundHealthRoute = true;
            const content = await fs_extra_1.default.readFile(pattern, 'utf-8');
            // Check for standard endpoints
            const endpoints = ['/health', '/health/ready', '/health/live'];
            for (const endpoint of endpoints) {
                const hasEndpoint = content.includes(endpoint);
                results.push({
                    category,
                    check: `Endpoint '${endpoint}' implemented`,
                    passed: hasEndpoint,
                    message: hasEndpoint ? 'Found' : `Missing health endpoint: ${endpoint}`,
                });
            }
            break;
        }
    }
    if (!foundHealthRoute) {
        results.push({
            category,
            check: 'Health route file exists',
            passed: false,
            message: 'No health route file found (expected src/routes/health.ts)',
        });
    }
    return results;
}
async function validateObservability(servicePath) {
    const results = [];
    const category = 'Observability';
    // Check for metrics implementation
    const metricsPatterns = [
        path_1.default.join(servicePath, 'src/metrics.ts'),
        path_1.default.join(servicePath, 'src/observability/metrics.ts'),
    ];
    let foundMetrics = false;
    for (const pattern of metricsPatterns) {
        if (await fs_extra_1.default.pathExists(pattern)) {
            foundMetrics = true;
            const content = await fs_extra_1.default.readFile(pattern, 'utf-8');
            // Check for required metrics
            const requiredMetrics = ['http_requests_total', 'http_request_duration'];
            for (const metric of requiredMetrics) {
                const hasMetric = content.includes(metric);
                results.push({
                    category,
                    check: `Metric '${metric}' defined`,
                    passed: hasMetric,
                    message: hasMetric ? 'Found' : `Missing required metric: ${metric}`,
                });
            }
            break;
        }
    }
    if (!foundMetrics) {
        results.push({
            category,
            check: 'Metrics file exists',
            passed: false,
            message: 'No metrics file found (expected src/metrics.ts)',
        });
    }
    // Check for SLO definitions
    const sloPath = path_1.default.join(servicePath, 'slos/slos.yaml');
    const hasSlos = await fs_extra_1.default.pathExists(sloPath);
    results.push({
        category,
        check: 'SLO definitions exist',
        passed: hasSlos,
        message: hasSlos ? 'Found slos/slos.yaml' : 'Missing SLO definitions (slos/slos.yaml)',
    });
    // Check for Grafana dashboard
    const dashboardPath = path_1.default.join(servicePath, 'dashboards/grafana.json');
    const hasDashboard = await fs_extra_1.default.pathExists(dashboardPath);
    results.push({
        category,
        check: 'Grafana dashboard exists',
        passed: hasDashboard,
        message: hasDashboard
            ? 'Found dashboards/grafana.json'
            : 'Missing Grafana dashboard (dashboards/grafana.json)',
    });
    return results;
}
async function validateSecurity(servicePath) {
    const results = [];
    const category = 'Security';
    // Check for OPA policy
    const policyPath = path_1.default.join(servicePath, 'policies/authz.rego');
    const hasPolicy = await fs_extra_1.default.pathExists(policyPath);
    results.push({
        category,
        check: 'OPA policy exists',
        passed: hasPolicy,
        message: hasPolicy
            ? 'Found policies/authz.rego'
            : 'Missing OPA policy (policies/authz.rego)',
    });
    // Check Dockerfile for security best practices
    const dockerfilePath = path_1.default.join(servicePath, 'Dockerfile');
    if (await fs_extra_1.default.pathExists(dockerfilePath)) {
        const dockerfile = await fs_extra_1.default.readFile(dockerfilePath, 'utf-8');
        const runsAsNonRoot = dockerfile.includes('USER node') || dockerfile.includes('USER 1000');
        results.push({
            category,
            check: 'Dockerfile uses non-root user',
            passed: runsAsNonRoot,
            message: runsAsNonRoot ? 'Runs as non-root' : 'Should run as non-root user',
        });
        const hasHealthcheck = dockerfile.includes('HEALTHCHECK');
        results.push({
            category,
            check: 'Dockerfile has HEALTHCHECK',
            passed: hasHealthcheck,
            message: hasHealthcheck ? 'Has HEALTHCHECK instruction' : 'Missing HEALTHCHECK instruction',
        });
    }
    else {
        results.push({
            category,
            check: 'Dockerfile exists',
            passed: false,
            message: 'Missing Dockerfile',
        });
    }
    // Check for .env.example (not .env which should be gitignored)
    const envExamplePath = path_1.default.join(servicePath, '.env.example');
    const hasEnvExample = await fs_extra_1.default.pathExists(envExamplePath);
    results.push({
        category,
        check: '.env.example exists',
        passed: hasEnvExample,
        message: hasEnvExample
            ? 'Environment template found'
            : 'Missing .env.example template',
    });
    return results;
}
async function validateCiCd(servicePath) {
    const results = [];
    const category = 'CI/CD';
    // Check for CI workflow
    const ciWorkflowPatterns = [
        path_1.default.join(servicePath, '.github/workflows/ci.yml'),
        path_1.default.join(servicePath, '.github/workflows/ci.yaml'),
    ];
    let foundCi = false;
    for (const pattern of ciWorkflowPatterns) {
        if (await fs_extra_1.default.pathExists(pattern)) {
            foundCi = true;
            const content = await fs_extra_1.default.readFile(pattern, 'utf-8');
            // Check if it uses reusable workflows
            const usesReusable = content.includes('_golden-path-pipeline.yml');
            results.push({
                category,
                check: 'Uses Golden Path pipeline',
                passed: usesReusable,
                message: usesReusable
                    ? 'Uses reusable workflow'
                    : 'Should use _golden-path-pipeline.yml',
            });
            break;
        }
    }
    if (!foundCi) {
        results.push({
            category,
            check: 'CI workflow exists',
            passed: false,
            message: 'Missing CI workflow (.github/workflows/ci.yml)',
        });
    }
    return results;
}
function printResults(results) {
    const categories = [...new Set(results.map((r) => r.category))];
    for (const category of categories) {
        console.log(chalk_1.default.cyan(`\n${category}:`));
        const categoryResults = results.filter((r) => r.category === category);
        for (const result of categoryResults) {
            const icon = result.passed ? chalk_1.default.green('✓') : chalk_1.default.red('✗');
            const status = result.passed ? chalk_1.default.green('PASS') : chalk_1.default.red('FAIL');
            console.log(`  ${icon} ${result.check} - ${status}`);
            if (!result.passed) {
                console.log(chalk_1.default.gray(`    ${result.message}`));
            }
        }
    }
}
