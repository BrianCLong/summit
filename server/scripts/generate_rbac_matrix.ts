
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse, visit, FieldDefinitionNode, DirectiveNode, StringValueNode } from 'graphql';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base paths
const SERVER_ROOT = path.resolve(__dirname, '../');
const ROUTES_DIR = path.resolve(SERVER_ROOT, 'src/routes');
const GRAPHQL_SCHEMA_PATH = path.resolve(SERVER_ROOT, 'src/graphql/schema.ts');
const OUTPUT_FILE = path.resolve(SERVER_ROOT, '../docs/RBAC_MATRIX.md');

interface RouteInfo {
  file: string;
  method: string;
  path: string;
  permission: string | null;
}

interface GraphQLFieldInfo {
  type: 'Query' | 'Mutation' | 'Subscription';
  field: string;
  permission: string | null;
}

// Helper to scan directory recursively
function getFiles(dir: string): string[] {
  let files: string[] = [];
  if (!fs.existsSync(dir)) return [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      files = files.concat(getFiles(filePath));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        files.push(filePath);
      }
    }
  }
  return files;
}

// 1. Scan Express Routes
function scanRoutes(): RouteInfo[] {
  const routes: RouteInfo[] = [];
  const files = getFiles(ROUTES_DIR);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(ROUTES_DIR, file);

    // Regex to find router calls
    // Matches: router.get('/path', requirePermission('permission'), ...)
    const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*)['"`]\s*,[\s\S]*?(?:requirePermission\s*\(\s*['"`]([^'"`]+)['"`]\s*\)|requirePermission)/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const permission = match[3] || 'TODO: Missing';

      routes.push({
        file: relativePath,
        method,
        path: routePath,
        permission,
      });
    }
  }
  return routes;
}

// 2. Scan GraphQL Schema
function scanGraphQL(): GraphQLFieldInfo[] {
  const fields: GraphQLFieldInfo[] = [];
  const content = fs.readFileSync(GRAPHQL_SCHEMA_PATH, 'utf-8');

  // Extract typeDefs string content if it's exported as variable
  // The file is `export const typeDefs = \` ... \`;`
  const match = content.match(/export const typeDefs = `([\s\S]*)`;/);
  if (!match) {
      console.error("Could not find typeDefs in schema file");
      return [];
  }
  const schemaString = match[1];

  try {
      const ast = parse(schemaString);

      visit(ast, {
        ObjectTypeDefinition(node) {
            if (['Query', 'Mutation', 'Subscription'].includes(node.name.value)) {
                const typeName = node.name.value as 'Query' | 'Mutation' | 'Subscription';
                node.fields?.forEach((field: FieldDefinitionNode) => {
                    const authDirective = field.directives?.find(d => d.name.value === 'auth');
                    let permission = null;
                    if (authDirective) {
                        const requiresArg = authDirective.arguments?.find(a => a.name.value === 'requires');
                        if (requiresArg && requiresArg.value.kind === 'StringValue') {
                            permission = (requiresArg.value as StringValueNode).value;
                        }
                    }

                    fields.push({
                        type: typeName,
                        field: field.name.value,
                        permission: permission || 'TODO: Missing'
                    });
                });
            }
        }
      });
  } catch (e: any) {
      console.error("Error parsing GraphQL schema:", e.message);
  }

  return fields;
}

// 3. Generate Matrix
function generateMatrix(routes: RouteInfo[], graphql: GraphQLFieldInfo[]) {
  let md = '# API Authorization Matrix\n\n';
  md += 'This document is auto-generated. It lists all API endpoints and GraphQL operations with their required permissions.\n\n';

  md += '## GraphQL API\n\n';
  md += '| Type | Field | Required Permission | Status |\n';
  md += '|------|-------|---------------------|--------|\n';

  let missingGraphql = 0;
  for (const item of graphql) {
    const status = item.permission === 'TODO: Missing' ? '❌ MISSING' : '✅ Enforced';
    if (item.permission === 'TODO: Missing') missingGraphql++;
    md += `| ${item.type} | \`${item.field}\` | \`${item.permission || 'NONE'}\` | ${status} |\n`;
  }

  md += '\n## Express API Routes\n\n';
  md += '| Method | Path | File | Required Permission | Status |\n';
  md += '|--------|------|------|---------------------|--------|\n';

  let missingRoutes = 0;
  for (const item of routes) {
    const status = item.permission === 'TODO: Missing' ? '❌ MISSING' : '✅ Enforced';
    if (item.permission === 'TODO: Missing') missingRoutes++;
    md += `| ${item.method} | \`${item.path}\` | \`${item.file}\` | \`${item.permission || 'NONE'}\` | ${status} |\n`;
  }

  fs.writeFileSync(OUTPUT_FILE, md);
  console.log(`Matrix generated at ${OUTPUT_FILE}`);
  console.log(`GraphQL Total: ${graphql.length}, Missing: ${missingGraphql}`);
  console.log(`Routes Total: ${routes.length}, Missing: ${missingRoutes}`);

  if (missingGraphql > 0 || missingRoutes > 0) {
      console.log('WARNING: Some endpoints are missing permission checks.');
      process.exit(1);
  }
}

const routes = scanRoutes();
const graphql = scanGraphQL();
generateMatrix(routes, graphql);
