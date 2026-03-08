#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const conf_1 = __importDefault(require("conf"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const graphql_request_1 = require("graphql-request");
const date_fns_1 = require("date-fns");
// Configuration store
const config = new conf_1.default({
    projectName: 'intelgraph-sandbox-cli',
    schema: {
        apiEndpoint: {
            type: 'string',
            default: 'http://localhost:4100/graphql',
        },
        authToken: {
            type: 'string',
            default: '',
        },
    },
});
// GraphQL client
function getClient() {
    const endpoint = config.get('apiEndpoint');
    const token = config.get('authToken');
    return new graphql_request_1.GraphQLClient(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
}
// GraphQL queries and mutations
const QUERIES = {
    listSandboxes: (0, graphql_request_1.gql) `
    query ListSandboxes($status: SandboxStatus, $limit: Int) {
      sandboxes(status: $status, limit: $limit) {
        id
        name
        status
        isolationLevel
        tenantType
        createdAt
        expiresAt
        ownerId
      }
    }
  `,
    getSandbox: (0, graphql_request_1.gql) `
    query GetSandbox($id: UUID!) {
      sandbox(id: $id) {
        id
        name
        description
        status
        isolationLevel
        tenantType
        dataAccessPolicy {
          mode
          maxRecords
          allowLinkbackToProduction
        }
        resourceQuotas {
          maxCpuMs
          maxMemoryMb
          maxStorageGb
        }
        integrationRestrictions {
          allowFederation
          allowExternalExports
        }
        createdAt
        updatedAt
        expiresAt
        tags
      }
    }
  `,
    getPresets: (0, graphql_request_1.gql) `
    query GetPresets {
      sandboxPresets {
        name
        description
        isolationLevel
        tenantType
      }
    }
  `,
    checkEnforcement: (0, graphql_request_1.gql) `
    query CheckEnforcement($sandboxId: UUID!, $operation: String!, $connectorType: ConnectorType) {
      checkEnforcement(sandboxId: $sandboxId, operation: $operation, connectorType: $connectorType) {
        allowed
        reason
        code
        warnings
      }
    }
  `,
    listPromotions: (0, graphql_request_1.gql) `
    query ListPromotions($sandboxId: UUID!, $status: PromotionStatus) {
      promotionRequests(sandboxId: $sandboxId, status: $status) {
        id
        artifactName
        promotionType
        status
        createdAt
        justification
      }
    }
  `,
};
const MUTATIONS = {
    createSandbox: (0, graphql_request_1.gql) `
    mutation CreateSandbox($input: CreateSandboxInput!) {
      createSandbox(input: $input) {
        id
        name
        status
        isolationLevel
      }
    }
  `,
    activateSandbox: (0, graphql_request_1.gql) `
    mutation ActivateSandbox($id: UUID!) {
      activateSandbox(id: $id) {
        id
        name
        status
      }
    }
  `,
    suspendSandbox: (0, graphql_request_1.gql) `
    mutation SuspendSandbox($id: UUID!, $reason: String!) {
      suspendSandbox(id: $id, reason: $reason) {
        id
        name
        status
      }
    }
  `,
    archiveSandbox: (0, graphql_request_1.gql) `
    mutation ArchiveSandbox($id: UUID!) {
      archiveSandbox(id: $id) {
        id
        name
        status
      }
    }
  `,
    deleteSandbox: (0, graphql_request_1.gql) `
    mutation DeleteSandbox($id: UUID!) {
      deleteSandbox(id: $id)
    }
  `,
    cloneData: (0, graphql_request_1.gql) `
    mutation CloneData($input: DataCloneInput!) {
      cloneData(input: $input) {
        id
        status
        statistics {
          sourceRecords
          clonedRecords
          anonymizedFields
        }
      }
    }
  `,
    generateSynthetic: (0, graphql_request_1.gql) `
    mutation GenerateSynthetic($input: SyntheticDataInput!) {
      generateSyntheticData(input: $input) {
        id
        status
        statistics {
          entitiesGenerated
          relationshipsGenerated
        }
      }
    }
  `,
    createPromotion: (0, graphql_request_1.gql) `
    mutation CreatePromotion($input: CreatePromotionInput!) {
      createPromotionRequest(input: $input) {
        id
        status
        artifactName
      }
    }
  `,
};
// CLI Program
const program = new commander_1.Command();
program
    .name('sandbox')
    .description('CLI tool for managing IntelGraph sandboxes and data labs')
    .version('1.0.0');
// Config commands
const configCmd = program.command('config');
configCmd
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action((key, value) => {
    config.set(key, value);
    console.log(chalk_1.default.green(`Set ${key} = ${value}`));
});
configCmd
    .command('get <key>')
    .description('Get a configuration value')
    .action((key) => {
    console.log(config.get(key));
});
configCmd
    .command('list')
    .description('List all configuration values')
    .action(() => {
    console.log(JSON.stringify(config.store, null, 2));
});
// Sandbox commands
const sandboxCmd = program.command('sandbox').alias('sb');
sandboxCmd
    .command('list')
    .description('List all sandboxes')
    .option('-s, --status <status>', 'Filter by status (ACTIVE, SUSPENDED, etc.)')
    .option('-l, --limit <number>', 'Limit results', '20')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Fetching sandboxes...').start();
    try {
        const client = getClient();
        const data = await client.request(QUERIES.listSandboxes, {
            status: options.status?.toUpperCase(),
            limit: parseInt(options.limit),
        });
        spinner.stop();
        const table = new cli_table3_1.default({
            head: ['ID', 'Name', 'Status', 'Isolation', 'Type', 'Expires'],
            colWidths: [40, 25, 12, 12, 10, 20],
        });
        data.sandboxes.forEach((sb) => {
            table.push([
                sb.id,
                sb.name.substring(0, 23),
                colorStatus(sb.status),
                sb.isolationLevel,
                sb.tenantType,
                sb.expiresAt ? (0, date_fns_1.formatDistanceToNow)(new Date(sb.expiresAt)) : 'N/A',
            ]);
        });
        console.log(table.toString());
        console.log(chalk_1.default.dim(`Total: ${data.sandboxes.length} sandboxes`));
    }
    catch (error) {
        spinner.fail('Failed to fetch sandboxes');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
sandboxCmd
    .command('get <id>')
    .description('Get sandbox details')
    .action(async (id) => {
    const spinner = (0, ora_1.default)('Fetching sandbox...').start();
    try {
        const client = getClient();
        const data = await client.request(QUERIES.getSandbox, { id });
        spinner.stop();
        if (!data.sandbox) {
            console.log(chalk_1.default.yellow('Sandbox not found'));
            return;
        }
        const sb = data.sandbox;
        console.log(chalk_1.default.bold('\nSandbox Details'));
        console.log(chalk_1.default.dim('─'.repeat(50)));
        console.log(`${chalk_1.default.cyan('ID:')}          ${sb.id}`);
        console.log(`${chalk_1.default.cyan('Name:')}        ${sb.name}`);
        console.log(`${chalk_1.default.cyan('Description:')} ${sb.description || 'N/A'}`);
        console.log(`${chalk_1.default.cyan('Status:')}      ${colorStatus(sb.status)}`);
        console.log(`${chalk_1.default.cyan('Isolation:')}   ${sb.isolationLevel}`);
        console.log(`${chalk_1.default.cyan('Type:')}        ${sb.tenantType}`);
        console.log(`${chalk_1.default.cyan('Created:')}     ${(0, date_fns_1.format)(new Date(sb.createdAt), 'PPpp')}`);
        console.log(`${chalk_1.default.cyan('Expires:')}     ${sb.expiresAt ? (0, date_fns_1.format)(new Date(sb.expiresAt), 'PPpp') : 'N/A'}`);
        console.log(`${chalk_1.default.cyan('Tags:')}        ${sb.tags?.join(', ') || 'None'}`);
        console.log(chalk_1.default.bold('\nData Access Policy'));
        console.log(chalk_1.default.dim('─'.repeat(50)));
        console.log(`${chalk_1.default.cyan('Mode:')}              ${sb.dataAccessPolicy.mode}`);
        console.log(`${chalk_1.default.cyan('Max Records:')}       ${sb.dataAccessPolicy.maxRecords}`);
        console.log(`${chalk_1.default.cyan('Linkback Allowed:')}  ${sb.dataAccessPolicy.allowLinkbackToProduction ? chalk_1.default.red('Yes') : chalk_1.default.green('No')}`);
        console.log(chalk_1.default.bold('\nIntegration Restrictions'));
        console.log(chalk_1.default.dim('─'.repeat(50)));
        console.log(`${chalk_1.default.cyan('Federation:')}        ${sb.integrationRestrictions.allowFederation ? chalk_1.default.red('Allowed') : chalk_1.default.green('Blocked')}`);
        console.log(`${chalk_1.default.cyan('External Exports:')} ${sb.integrationRestrictions.allowExternalExports ? chalk_1.default.red('Allowed') : chalk_1.default.green('Blocked')}`);
    }
    catch (error) {
        spinner.fail('Failed to fetch sandbox');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
sandboxCmd
    .command('create')
    .description('Create a new sandbox')
    .option('-n, --name <name>', 'Sandbox name')
    .option('-d, --description <description>', 'Description')
    .option('-p, --preset <preset>', 'Use preset (dataLab, research, demo, airgapped)')
    .option('-i, --isolation <level>', 'Isolation level (STANDARD, ENHANCED, AIRGAPPED, RESEARCH)')
    .option('-e, --expires <days>', 'Expiration in days', '30')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('--interactive', 'Interactive mode')
    .action(async (options) => {
    let input = {};
    if (options.interactive) {
        // Interactive mode
        const presets = await getClient().request(QUERIES.getPresets);
        const answers = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'Sandbox name:',
                validate: (v) => v.length > 0 || 'Name is required',
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description:',
            },
            {
                type: 'list',
                name: 'preset',
                message: 'Select a preset:',
                choices: [
                    { name: 'None (custom)', value: null },
                    ...presets.sandboxPresets.map((p) => ({
                        name: `${p.name} - ${p.description}`,
                        value: p.name,
                    })),
                ],
            },
            {
                type: 'list',
                name: 'isolationLevel',
                message: 'Isolation level:',
                choices: ['STANDARD', 'ENHANCED', 'AIRGAPPED', 'RESEARCH'],
                when: (a) => !a.preset,
            },
            {
                type: 'number',
                name: 'expiresInDays',
                message: 'Expiration (days):',
                default: 30,
            },
            {
                type: 'input',
                name: 'tags',
                message: 'Tags (comma-separated):',
            },
        ]);
        input = {
            name: answers.name,
            description: answers.description || undefined,
            preset: answers.preset || undefined,
            isolationLevel: answers.isolationLevel || undefined,
            expiresInDays: answers.expiresInDays,
            tags: answers.tags ? answers.tags.split(',').map((t) => t.trim()) : undefined,
        };
    }
    else {
        if (!options.name) {
            console.error(chalk_1.default.red('Name is required. Use --name or --interactive'));
            return;
        }
        input = {
            name: options.name,
            description: options.description,
            preset: options.preset,
            isolationLevel: options.isolation?.toUpperCase(),
            expiresInDays: parseInt(options.expires),
            tags: options.tags?.split(',').map((t) => t.trim()),
        };
    }
    const spinner = (0, ora_1.default)('Creating sandbox...').start();
    try {
        const client = getClient();
        const data = await client.request(MUTATIONS.createSandbox, { input });
        spinner.succeed(chalk_1.default.green(`Sandbox created: ${data.createSandbox.id}`));
        console.log(`Status: ${colorStatus(data.createSandbox.status)}`);
        console.log(`Isolation: ${data.createSandbox.isolationLevel}`);
    }
    catch (error) {
        spinner.fail('Failed to create sandbox');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
sandboxCmd
    .command('activate <id>')
    .description('Activate a sandbox')
    .action(async (id) => {
    const spinner = (0, ora_1.default)('Activating sandbox...').start();
    try {
        const client = getClient();
        const data = await client.request(MUTATIONS.activateSandbox, { id });
        spinner.succeed(chalk_1.default.green(`Sandbox activated: ${data.activateSandbox.name}`));
    }
    catch (error) {
        spinner.fail('Failed to activate sandbox');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
sandboxCmd
    .command('suspend <id>')
    .description('Suspend a sandbox')
    .requiredOption('-r, --reason <reason>', 'Suspension reason')
    .action(async (id, options) => {
    const spinner = (0, ora_1.default)('Suspending sandbox...').start();
    try {
        const client = getClient();
        const data = await client.request(MUTATIONS.suspendSandbox, {
            id,
            reason: options.reason,
        });
        spinner.succeed(chalk_1.default.yellow(`Sandbox suspended: ${data.suspendSandbox.name}`));
    }
    catch (error) {
        spinner.fail('Failed to suspend sandbox');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
sandboxCmd
    .command('archive <id>')
    .description('Archive a sandbox')
    .action(async (id) => {
    const spinner = (0, ora_1.default)('Archiving sandbox...').start();
    try {
        const client = getClient();
        const data = await client.request(MUTATIONS.archiveSandbox, { id });
        spinner.succeed(chalk_1.default.dim(`Sandbox archived: ${data.archiveSandbox.name}`));
    }
    catch (error) {
        spinner.fail('Failed to archive sandbox');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
sandboxCmd
    .command('delete <id>')
    .description('Delete a sandbox permanently')
    .option('-f, --force', 'Skip confirmation')
    .action(async (id, options) => {
    if (!options.force) {
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: chalk_1.default.red('Are you sure you want to permanently delete this sandbox?'),
                default: false,
            },
        ]);
        if (!confirm) {
            console.log('Cancelled');
            return;
        }
    }
    const spinner = (0, ora_1.default)('Deleting sandbox...').start();
    try {
        const client = getClient();
        await client.request(MUTATIONS.deleteSandbox, { id });
        spinner.succeed(chalk_1.default.red('Sandbox deleted'));
    }
    catch (error) {
        spinner.fail('Failed to delete sandbox');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
sandboxCmd
    .command('check <id> <operation>')
    .description('Check if an operation is allowed in sandbox')
    .option('-c, --connector <type>', 'Connector type (DATABASE, API, FEDERATION, etc.)')
    .action(async (id, operation, options) => {
    const spinner = (0, ora_1.default)('Checking enforcement...').start();
    try {
        const client = getClient();
        const data = await client.request(QUERIES.checkEnforcement, {
            sandboxId: id,
            operation: operation.toUpperCase(),
            connectorType: options.connector?.toUpperCase(),
        });
        spinner.stop();
        const decision = data.checkEnforcement;
        if (decision.allowed) {
            console.log(chalk_1.default.green('ALLOWED'));
        }
        else {
            console.log(chalk_1.default.red('BLOCKED'));
        }
        console.log(`Reason: ${decision.reason}`);
        if (decision.code) {
            console.log(`Code: ${decision.code}`);
        }
        if (decision.warnings?.length > 0) {
            console.log(chalk_1.default.yellow('Warnings:'));
            decision.warnings.forEach((w) => console.log(`  - ${w}`));
        }
    }
    catch (error) {
        spinner.fail('Failed to check enforcement');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
// Data Lab commands
const datalabCmd = program.command('datalab').alias('dl');
datalabCmd
    .command('clone')
    .description('Clone data into sandbox')
    .requiredOption('-s, --sandbox <id>', 'Sandbox ID')
    .requiredOption('-n, --name <name>', 'Clone name')
    .requiredOption('--source <type>', 'Source type (NEO4J, POSTGRESQL, INVESTIGATION)')
    .requiredOption('--strategy <strategy>', 'Clone strategy (STRUCTURE_ONLY, SYNTHETIC, ANONYMIZED, SAMPLED)')
    .option('--sample-size <number>', 'Sample size for SAMPLED strategy')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Cloning data...').start();
    try {
        const client = getClient();
        const data = await client.request(MUTATIONS.cloneData, {
            input: {
                sandboxId: options.sandbox,
                name: options.name,
                sourceType: options.source.toUpperCase(),
                sourceConfig: {},
                strategy: options.strategy.toUpperCase(),
                sampleSize: options.sampleSize ? parseInt(options.sampleSize) : undefined,
            },
        });
        spinner.succeed(chalk_1.default.green('Data cloned successfully'));
        console.log(`Clone ID: ${data.cloneData.id}`);
        console.log(`Status: ${data.cloneData.status}`);
        console.log(`Records: ${data.cloneData.statistics.clonedRecords}`);
        console.log(`Anonymized fields: ${data.cloneData.statistics.anonymizedFields}`);
    }
    catch (error) {
        spinner.fail('Failed to clone data');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
datalabCmd
    .command('generate')
    .description('Generate synthetic data')
    .requiredOption('-s, --sandbox <id>', 'Sandbox ID')
    .requiredOption('-n, --name <name>', 'Generation name')
    .requiredOption('-c, --count <number>', 'Number of entities to generate')
    .option('--seed <number>', 'Random seed for reproducibility')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Generating synthetic data...').start();
    try {
        const client = getClient();
        const data = await client.request(MUTATIONS.generateSynthetic, {
            input: {
                sandboxId: options.sandbox,
                name: options.name,
                schemas: [
                    {
                        entityType: 'Person',
                        fields: [
                            { name: 'name', type: 'string', generator: 'fullName' },
                            { name: 'email', type: 'string', generator: 'email' },
                        ],
                    },
                ],
                config: {
                    totalEntities: parseInt(options.count),
                    seed: options.seed ? parseInt(options.seed) : undefined,
                },
            },
        });
        spinner.succeed(chalk_1.default.green('Synthetic data generated'));
        console.log(`Generation ID: ${data.generateSyntheticData.id}`);
        console.log(`Status: ${data.generateSyntheticData.status}`);
        console.log(`Entities: ${data.generateSyntheticData.statistics.entitiesGenerated}`);
        console.log(`Relationships: ${data.generateSyntheticData.statistics.relationshipsGenerated}`);
    }
    catch (error) {
        spinner.fail('Failed to generate synthetic data');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
// Promotion commands
const promoCmd = program.command('promotion').alias('promo');
promoCmd
    .command('list <sandboxId>')
    .description('List promotion requests for a sandbox')
    .option('-s, --status <status>', 'Filter by status')
    .action(async (sandboxId, options) => {
    const spinner = (0, ora_1.default)('Fetching promotions...').start();
    try {
        const client = getClient();
        const data = await client.request(QUERIES.listPromotions, {
            sandboxId,
            status: options.status?.toUpperCase(),
        });
        spinner.stop();
        const table = new cli_table3_1.default({
            head: ['ID', 'Artifact', 'Type', 'Status', 'Created'],
            colWidths: [40, 25, 15, 15, 20],
        });
        data.promotionRequests.forEach((pr) => {
            table.push([
                pr.id,
                pr.artifactName.substring(0, 23),
                pr.promotionType,
                colorPromoStatus(pr.status),
                (0, date_fns_1.formatDistanceToNow)(new Date(pr.createdAt)),
            ]);
        });
        console.log(table.toString());
    }
    catch (error) {
        spinner.fail('Failed to fetch promotions');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
promoCmd
    .command('create')
    .description('Create a promotion request')
    .requiredOption('-s, --sandbox <id>', 'Source sandbox ID')
    .requiredOption('-t, --target <id>', 'Target tenant ID')
    .requiredOption('--type <type>', 'Promotion type (QUERY, WORKFLOW, SCRIPT, CONFIGURATION, MODEL)')
    .requiredOption('--artifact-id <id>', 'Artifact ID')
    .requiredOption('--artifact-name <name>', 'Artifact name')
    .requiredOption('-j, --justification <text>', 'Justification')
    .option('-r, --rollback <plan>', 'Rollback plan')
    .action(async (options) => {
    const spinner = (0, ora_1.default)('Creating promotion request...').start();
    try {
        const client = getClient();
        const data = await client.request(MUTATIONS.createPromotion, {
            input: {
                sandboxId: options.sandbox,
                targetTenantId: options.target,
                promotionType: options.type.toUpperCase(),
                artifactId: options.artifactId,
                artifactName: options.artifactName,
                justification: options.justification,
                rollbackPlan: options.rollback,
            },
        });
        spinner.succeed(chalk_1.default.green('Promotion request created'));
        console.log(`Request ID: ${data.createPromotionRequest.id}`);
        console.log(`Status: ${colorPromoStatus(data.createPromotionRequest.status)}`);
    }
    catch (error) {
        spinner.fail('Failed to create promotion request');
        console.error(chalk_1.default.red(error instanceof Error ? error.message : 'Unknown error'));
    }
});
// Helper functions
function colorStatus(status) {
    switch (status) {
        case 'ACTIVE':
            return chalk_1.default.green(status);
        case 'PROVISIONING':
            return chalk_1.default.blue(status);
        case 'SUSPENDED':
            return chalk_1.default.yellow(status);
        case 'EXPIRED':
        case 'TERMINATED':
            return chalk_1.default.red(status);
        case 'ARCHIVED':
            return chalk_1.default.dim(status);
        default:
            return status;
    }
}
function colorPromoStatus(status) {
    switch (status) {
        case 'APPROVED':
        case 'PROMOTED':
            return chalk_1.default.green(status);
        case 'PENDING_REVIEW':
        case 'UNDER_REVIEW':
            return chalk_1.default.blue(status);
        case 'DRAFT':
            return chalk_1.default.dim(status);
        case 'REJECTED':
        case 'ROLLED_BACK':
            return chalk_1.default.red(status);
        default:
            return status;
    }
}
// Parse command line arguments
program.parse();
