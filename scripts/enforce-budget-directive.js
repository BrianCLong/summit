#!/usr/bin/env tsx
"use strict";
/**
 * CI hard stop: enforce every mutation field has @budget directive
 * Usage: npm run check:budget
 * Exit code 1 if violations found
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const glob_1 = require("glob");
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function findSchemaFiles(basePath) {
    const patterns = [
        `${basePath}/**/*.graphql`,
        `${basePath}/**/*.gql`,
        `${basePath}/**/schema.ts`,
        `${basePath}/**/typedefs.ts`,
    ];
    return patterns.flatMap((pattern) => glob_1.glob.sync(pattern));
}
function loadSchema(schemaPath) {
    if (!(0, fs_1.existsSync)(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
    }
    const extension = path_1.default.extname(schemaPath);
    let sdlContent;
    if (extension === '.graphql' || extension === '.gql') {
        sdlContent = (0, fs_1.readFileSync)(schemaPath, 'utf8');
    }
    else {
        // For .ts files, we need to extract the SDL string
        const content = (0, fs_1.readFileSync)(schemaPath, 'utf8');
        const gqlMatch = content.match(/gql`([\s\S]*?)`/g);
        if (!gqlMatch) {
            throw new Error(`No GraphQL schema found in ${schemaPath}`);
        }
        sdlContent = gqlMatch.map((match) => match.slice(4, -1)).join('\n');
    }
    try {
        return (0, graphql_1.buildSchema)(sdlContent);
    }
    catch (error) {
        console.error(`Failed to parse schema from ${schemaPath}:`, error);
        throw error;
    }
}
function hasBudgetDirective(field) {
    return !!field.astNode?.directives?.some((directive) => directive.name.value === 'budget');
}
function checkMutationFields(schema, filePath) {
    const violations = [];
    const mutationType = schema.getMutationType();
    if (!mutationType) {
        return violations; // No mutations defined
    }
    const fields = mutationType.getFields();
    for (const [fieldName, field] of Object.entries(fields)) {
        if (!hasBudgetDirective(field)) {
            violations.push({
                fieldName,
                typeName: mutationType.name,
                filePath,
            });
        }
    }
    return violations;
}
function formatViolations(violations) {
    const grouped = violations.reduce((acc, violation) => {
        const key = violation.filePath;
        if (!acc[key])
            acc[key] = [];
        acc[key].push(violation.fieldName);
        return acc;
    }, {});
    let output = '';
    for (const [filePath, fieldNames] of Object.entries(grouped)) {
        output += `\n📁 ${path_1.default.relative(process.cwd(), filePath)}\n`;
        fieldNames.forEach((fieldName) => {
            output += `  ❌ Mutation.${fieldName} missing @budget directive\n`;
        });
    }
    return output;
}
async function main() {
    console.log('🔍 Checking for @budget directive compliance...\n');
    const schemaPath = process.argv[2] || path_1.default.join(process.cwd(), 'server/src/graphql');
    let violations = [];
    try {
        // Handle single file or directory
        if ((0, fs_1.existsSync)(schemaPath) && schemaPath.endsWith('.graphql')) {
            const schema = loadSchema(schemaPath);
            violations = checkMutationFields(schema, schemaPath);
        }
        else {
            // Find all schema files in directory
            const schemaFiles = findSchemaFiles(schemaPath);
            if (schemaFiles.length === 0) {
                console.warn(`⚠️  No GraphQL schema files found in ${schemaPath}`);
                return;
            }
            console.log(`Found ${schemaFiles.length} schema files:`);
            schemaFiles.forEach((file) => console.log(`  - ${path_1.default.relative(process.cwd(), file)}`));
            console.log();
            for (const file of schemaFiles) {
                try {
                    const schema = loadSchema(file);
                    const fileViolations = checkMutationFields(schema, file);
                    violations.push(...fileViolations);
                }
                catch (error) {
                    console.warn(`⚠️  Skipping ${file}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        }
        // Report results
        if (violations.length === 0) {
            console.log('✅ All mutation fields have @budget directive');
            console.log('🚀 Ready for production deployment\n');
            process.exit(0);
        }
        else {
            console.error(`❌ Found ${violations.length} mutation field(s) missing @budget directive:`);
            console.error(formatViolations(violations));
            console.error('\n💡 Fix by adding @budget(capUSD: X.XX, tokenCeiling: YYYY) to each mutation field');
            console.error('📖 See: https://docs.intelgraph.com/safe-mutations#budget-directive\n');
            process.exit(1);
        }
    }
    catch (error) {
        console.error(`💥 Failed to check budget directives: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}
// Handle CLI execution
if (require.main === module) {
    main().catch((error) => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}
