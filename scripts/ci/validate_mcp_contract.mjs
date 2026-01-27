import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolSchemaPath = path.resolve(__dirname, '../../schemas/mcp/tool.schema.json');
const resourceSchemaPath = path.resolve(__dirname, '../../schemas/mcp/resource.schema.json');

const toolSchema = JSON.parse(fs.readFileSync(toolSchemaPath, 'utf8'));
const resourceSchema = JSON.parse(fs.readFileSync(resourceSchemaPath, 'utf8'));

const ajv = new Ajv();

console.log('Validating MCP Schemas...');

try {
  const validateTool = ajv.compile(toolSchema);
  console.log('✅ Tool schema is valid.');

  const validateResource = ajv.compile(resourceSchema);
  console.log('✅ Resource schema is valid.');

  // Test with valid samples
  const validTool = {
    tool_id: 'summit.test.tool',
    version: '1.0.0',
    permissions: ['read'],
    description: 'A test tool',
    inputSchema: { type: 'object' },
    timeout: 30
  };

  if (validateTool(validTool)) {
    console.log('✅ Valid tool sample passed.');
  } else {
    console.error('❌ Valid tool sample failed:', validateTool.errors);
    process.exit(1);
  }

  const validResource = {
    resource_id: 'summit.test.resource',
    uri: 'file:///tmp/test',
    mimeType: 'text/plain',
    access: 'read-only'
  };

  if (validateResource(validResource)) {
    console.log('✅ Valid resource sample passed.');
  } else {
    console.error('❌ Valid resource sample failed:', validateResource.errors);
    process.exit(1);
  }

  // Test with invalid samples
  const invalidTool = {
    tool_id: 'summit.test.tool'
    // missing required fields
  };

  if (!validateTool(invalidTool)) {
    console.log('✅ Invalid tool sample correctly failed.');
  } else {
    console.error('❌ Invalid tool sample passed validation (should have failed).');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Schema validation error:', error);
  process.exit(1);
}

console.log('MCP Contract Validation Complete.');
