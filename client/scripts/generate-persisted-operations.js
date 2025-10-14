/**
 * Generate Persisted Operations Manifest
 * 
 * Extracts all GraphQL operations from the codebase and generates
 * a manifest with SHA256 hashes for persisted query enforcement.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { glob } = require('glob');

// Function to extract GraphQL operations from .graphql files
function extractOperationsFromGraphQLFiles() {
  const operations = {};
  const graphqlFiles = glob.sync('src/**/*.graphql', { cwd: process.cwd() });

  for (const file of graphqlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const queries = extractQueriesFromContent(content);
    
    for (const query of queries) {
      const hash = crypto.createHash('sha256').update(query.query).digest('hex');
      operations[hash] = {
        query: query.query,
        operationName: query.operationName,
        file: file
      };
    }
  }

  return operations;
}

// Function to extract GraphQL operations from .js/.jsx/.ts/.tsx files
function extractOperationsFromJSFiles() {
  const operations = {};
  const jsFiles = glob.sync('src/**/*.{js,jsx,ts,tsx}', { cwd: process.cwd() });

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    
    // Extract gql template literals
    const gqlMatches = content.matchAll(/gql`([^`]+)`/g);
    
    for (const match of gqlMatches) {
      const queryText = match[1].trim();
      if (queryText) {
        const operationName = extractOperationName(queryText);
        const hash = crypto.createHash('sha256').update(queryText).digest('hex');
        
        operations[hash] = {
          query: queryText,
          operationName: operationName,
          file: file
        };
      }
    }
  }

  return operations;
}

// Extract individual queries from GraphQL file content
function extractQueriesFromContent(content) {
  const queries = [];
  
  // Remove comments
  const cleanContent = content.replace(/#[^\n\r]*/g, '');
  
  // Match operation definitions
  const operationRegex = /(query|mutation|subscription)\s+(\w+)?\s*\([^)]*\)?\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match;
  
  while ((match = operationRegex.exec(cleanContent)) !== null) {
    const operationType = match[1];
    const operationName = match[2] || 'AnonymousOperation';
    const query = match[0];
    
    queries.push({
      query: query.trim(),
      operationName: operationName,
      operationType: operationType
    });
  }
  
  return queries;
}

// Extract operation name from query text
function extractOperationName(queryText) {
  const match = queryText.match(/(query|mutation|subscription)\s+(\w+)/);
  return match ? match[2] : 'AnonymousOperation';
}

// Generate persisted operations manifest
function generatePersistedOperations() {
  console.log('🔍 Scanning for GraphQL operations...');
  
  const graphqlOperations = extractOperationsFromGraphQLFiles();
  const jsOperations = extractOperationsFromJSFiles();
  
  // Merge operations (GraphQL files take precedence)
  const allOperations = { ...jsOperations, ...graphqlOperations };
  
  console.log(`📊 Found ${Object.keys(allOperations).length} unique operations`);
  
  // Create simplified manifest for server (hash -> query)
  const serverManifest = {};
  const clientManifest = {};
  
  for (const [hash, operation] of Object.entries(allOperations)) {
    serverManifest[hash] = operation.query;
    clientManifest[hash] = {
      operationName: operation.operationName,
      file: operation.file
    };
  }
  
  // Write server manifest
  const serverManifestPath = path.join(process.cwd(), 'persisted-operations.json');
  fs.writeFileSync(serverManifestPath, JSON.stringify(serverManifest, null, 2));
  
  // Write client manifest with metadata
  const clientManifestPath = path.join(process.cwd(), 'src/generated/persisted-operations-client.json');
  
  // Ensure directory exists
  const clientDir = path.dirname(clientManifestPath);
  if (!fs.existsSync(clientDir)) {
    fs.mkdirSync(clientDir, { recursive: true });
  }
  
  fs.writeFileSync(clientManifestPath, JSON.stringify(clientManifest, null, 2));
  
  console.log(`✅ Generated persisted operations manifest:`);
  console.log(`   Server: ${serverManifestPath}`);
  console.log(`   Client: ${clientManifestPath}`);
  
  // Generate operation lookup by name for easy client usage
  const operationsByName = {};
  for (const [hash, operation] of Object.entries(allOperations)) {
    operationsByName[operation.operationName] = hash;
  }
  
  const lookupPath = path.join(process.cwd(), 'src/generated/operation-lookup.json');
  fs.writeFileSync(lookupPath, JSON.stringify(operationsByName, null, 2));
  
  console.log(`   Lookup: ${lookupPath}`);
  console.log(`📈 Summary:`);
  console.log(`   - Unique operations: ${Object.keys(allOperations).length}`);
  console.log(`   - GraphQL files: ${Object.keys(graphqlOperations).length}`);
  console.log(`   - JS/TS files: ${Object.keys(jsOperations).length}`);
  
  return {
    serverManifest,
    clientManifest,
    operationsByName,
    totalOperations: Object.keys(allOperations).length
  };
}

// CLI execution
if (require.main === module) {
  try {
    generatePersistedOperations();
    console.log('🎉 Persisted operations generated successfully!');
  } catch (error) {
    console.error('❌ Failed to generate persisted operations:', error);
    process.exit(1);
  }
}

module.exports = { generatePersistedOperations };