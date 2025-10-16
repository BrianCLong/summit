#!/usr/bin/env node

/**
 * Advanced Documentation Generator for Maestro Build Plane
 * Automatically generates comprehensive documentation from code, comments, and usage patterns
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  statSync,
  readdirSync,
} from 'fs';
import { join, resolve, relative, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class DocsGenerator {
  constructor() {
    this.docsDir = join(root, 'docs');
    this.reportDir = join(root, 'test-results', 'documentation');
    this.startTime = Date.now();
    this.documentationData = {
      components: [],
      hooks: [],
      utils: [],
      services: [],
      types: [],
      api: [],
      pages: [],
      tools: [],
    };
  }

  async setup() {
    console
      .log('📚 Setting up Documentation Generator...')

      [
        // Create directories
        (this.docsDir, this.reportDir)
      ].forEach((dir) => {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      });

    // Create docs subdirectories
    const docsDirs = [
      'components',
      'hooks',
      'utils',
      'services',
      'api',
      'tools',
      'guides',
      'examples',
    ];
    docsDirs.forEach((dir) => {
      const dirPath = join(this.docsDir, dir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  async analyzeCodebase() {
    console.log('🔍 Analyzing codebase for documentation...');

    const sourceFiles = this.getSourceFiles();

    for (const file of sourceFiles) {
      const relativePath = relative(root, file);
      const content = readFileSync(file, 'utf8');
      const analysis = this.analyzeFile(relativePath, content);

      if (analysis) {
        // Categorize based on file path and content
        if (relativePath.includes('components') || analysis.isComponent) {
          this.documentationData.components.push(analysis);
        } else if (relativePath.includes('hooks') || analysis.isHook) {
          this.documentationData.hooks.push(analysis);
        } else if (relativePath.includes('utils') || analysis.isUtility) {
          this.documentationData.utils.push(analysis);
        } else if (relativePath.includes('services') || analysis.isService) {
          this.documentationData.services.push(analysis);
        } else if (relativePath.includes('pages') || analysis.isPage) {
          this.documentationData.pages.push(analysis);
        } else if (relativePath.includes('types') || analysis.hasTypes) {
          this.documentationData.types.push(analysis);
        }
      }
    }

    // Analyze tools directory separately
    await this.analyzeTools();

    console.log(`  ✅ Analyzed ${sourceFiles.length} source files`);
    console.log(`     Components: ${this.documentationData.components.length}`);
    console.log(`     Hooks: ${this.documentationData.hooks.length}`);
    console.log(`     Utilities: ${this.documentationData.utils.length}`);
    console.log(`     Services: ${this.documentationData.services.length}`);
    console.log(`     Tools: ${this.documentationData.tools.length}`);
  }

  analyzeFile(filePath, content) {
    const lines = content.split('\n');
    const analysis = {
      filePath,
      name: this.extractNameFromPath(filePath),
      description: '',
      exports: [],
      imports: [],
      functions: [],
      components: [],
      hooks: [],
      types: [],
      examples: [],
      todos: [],
      isComponent: false,
      isHook: false,
      isUtility: false,
      isService: false,
      isPage: false,
      hasTypes: false,
    };

    let currentFunction = null;
    let currentComment = [];
    let inMultiLineComment = false;
    let inJSDoc = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Track multi-line comments
      if (trimmed.startsWith('/*') && !trimmed.startsWith('/**')) {
        inMultiLineComment = true;
        continue;
      }
      if (trimmed.startsWith('/**')) {
        inJSDoc = true;
        currentComment = [];
        continue;
      }
      if (trimmed.endsWith('*/')) {
        inMultiLineComment = false;
        inJSDoc = false;
        continue;
      }

      // Collect JSDoc comments
      if (inJSDoc && trimmed.startsWith('*')) {
        const commentText = trimmed.replace(/^\*\s?/, '');
        if (commentText) {
          currentComment.push(commentText);
        }
        continue;
      }

      // Single-line comments
      if (trimmed.startsWith('//')) {
        const commentText = trimmed.replace(/^\/\/\s?/, '');
        if (commentText.includes('TODO') || commentText.includes('FIXME')) {
          analysis.todos.push({
            line: i + 1,
            text: commentText,
          });
        }
        currentComment.push(commentText);
        continue;
      }

      // Skip empty lines and comments
      if (!trimmed || inMultiLineComment) continue;

      // Extract imports
      const importMatch = trimmed.match(
        /^import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/,
      );
      if (importMatch) {
        analysis.imports.push({
          what: importMatch[1],
          from: importMatch[2],
          line: i + 1,
        });
        continue;
      }

      // Extract exports
      const exportMatch =
        trimmed.match(/^export\s+(.+)/) ||
        trimmed.match(/^export\s+default\s+(.+)/);
      if (exportMatch) {
        analysis.exports.push({
          what: exportMatch[1],
          isDefault: trimmed.includes('export default'),
          line: i + 1,
        });
      }

      // Detect React components
      const componentMatch = trimmed.match(
        /^(?:export\s+)?(?:const|function)\s+([A-Z][a-zA-Z0-9]*)\s*[=:]?\s*(?:React\.FC|React\.FunctionComponent|\([^)]*\)\s*=>|\([^)]*\)\s*\{)/,
      );
      if (componentMatch) {
        analysis.isComponent = true;
        analysis.components.push({
          name: componentMatch[1],
          line: i + 1,
          description: currentComment.join(' '),
          props: this.extractProps(lines, i),
        });
        currentComment = [];
        continue;
      }

      // Detect custom hooks
      const hookMatch = trimmed.match(
        /^(?:export\s+)?(?:const|function)\s+(use[A-Z][a-zA-Z0-9]*)\s*[=:]?\s*/,
      );
      if (hookMatch) {
        analysis.isHook = true;
        analysis.hooks.push({
          name: hookMatch[1],
          line: i + 1,
          description: currentComment.join(' '),
          returns: this.extractReturnType(lines, i),
        });
        currentComment = [];
        continue;
      }

      // Detect regular functions
      const functionMatch = trimmed.match(
        /^(?:export\s+)?(?:async\s+)?(?:const|function)\s+([a-zA-Z][a-zA-Z0-9]*)\s*[=:]?\s*(?:\([^)]*\)\s*=>|\([^)]*\)\s*\{|async\s*\([^)]*\)\s*=>)/,
      );
      if (functionMatch && !componentMatch && !hookMatch) {
        analysis.functions.push({
          name: functionMatch[1],
          line: i + 1,
          description: currentComment.join(' '),
          isAsync: trimmed.includes('async'),
          params: this.extractParameters(lines, i),
        });
        currentComment = [];
        continue;
      }

      // Detect TypeScript interfaces and types
      const typeMatch = trimmed.match(
        /^(?:export\s+)?(?:interface|type)\s+([A-Z][a-zA-Z0-9]*)\s*[=\{]/,
      );
      if (typeMatch) {
        analysis.hasTypes = true;
        analysis.types.push({
          name: typeMatch[1],
          kind: trimmed.includes('interface') ? 'interface' : 'type',
          line: i + 1,
          description: currentComment.join(' '),
        });
        currentComment = [];
        continue;
      }

      // Reset comment collection if we hit actual code
      if (trimmed && !trimmed.startsWith('//') && !inJSDoc) {
        currentComment = [];
      }
    }

    // Determine file type based on content
    if (analysis.components.length > 0) analysis.isComponent = true;
    if (analysis.hooks.length > 0) analysis.isHook = true;
    if (
      analysis.functions.length > 0 &&
      !analysis.isComponent &&
      !analysis.isHook
    ) {
      if (filePath.includes('service') || filePath.includes('api')) {
        analysis.isService = true;
      } else {
        analysis.isUtility = true;
      }
    }
    if (filePath.includes('pages') || filePath.includes('routes')) {
      analysis.isPage = true;
    }

    // Extract file-level description from initial comments
    analysis.description = this.extractFileDescription(content);

    return analysis;
  }

  extractFileDescription(content) {
    const lines = content.split('\n');
    const description = [];
    let inInitialComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('/**')) {
        inInitialComment = true;
        continue;
      }

      if (inInitialComment && trimmed === '*/') {
        break;
      }

      if (inInitialComment && trimmed.startsWith('*')) {
        const text = trimmed.replace(/^\*\s?/, '');
        if (text && !text.startsWith('@')) {
          description.push(text);
        }
      }

      if (
        trimmed &&
        !trimmed.startsWith('//') &&
        !trimmed.startsWith('/*') &&
        !inInitialComment
      ) {
        break;
      }
    }

    return description.join(' ').trim();
  }

  extractProps(lines, startLine) {
    const props = [];

    // Look for TypeScript interface or type definitions
    for (
      let i = startLine - 10;
      i < Math.min(lines.length, startLine + 10);
      i++
    ) {
      if (i < 0) continue;

      const line = lines[i]?.trim();
      if (!line) continue;

      // Match prop definitions like "name: string" or "onClick?: () => void"
      const propMatch = line.match(
        /^(\w+)(\??):\s*(.+?)[;,]?\s*(?:\/\/\s*(.+))?$/,
      );
      if (propMatch) {
        props.push({
          name: propMatch[1],
          optional: !!propMatch[2],
          type: propMatch[3],
          description: propMatch[4] || '',
        });
      }
    }

    return props;
  }

  extractParameters(lines, startLine) {
    const params = [];
    const functionLine = lines[startLine];

    // Extract parameters from function signature
    const paramMatch = functionLine.match(/\(([^)]*)\)/);
    if (paramMatch) {
      const paramString = paramMatch[1];
      const paramParts = paramString
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      for (const param of paramParts) {
        const [name, type] = param.split(':').map((p) => p.trim());
        params.push({
          name: name.replace(/[{}]/g, ''), // Remove destructuring brackets
          type: type || 'any',
        });
      }
    }

    return params;
  }

  extractReturnType(lines, startLine) {
    const line = lines[startLine];

    // Look for return type annotation
    const returnMatch = line.match(/:\s*([^=>{]+)(?:\s*=>|\s*\{)/);
    if (returnMatch) {
      return returnMatch[1].trim();
    }

    return 'unknown';
  }

  extractNameFromPath(filePath) {
    const name =
      filePath
        .split('/')
        .pop()
        ?.replace(/\.(ts|tsx|js|jsx)$/, '') || 'Unknown';
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  async analyzeTools() {
    console.log('🛠️ Analyzing development tools...');

    const toolsDir = join(root, 'tools');
    if (!existsSync(toolsDir)) return;

    const toolFiles = readdirSync(toolsDir)
      .filter((file) => file.endsWith('.js'))
      .map((file) => join(toolsDir, file));

    for (const toolFile of toolFiles) {
      const content = readFileSync(toolFile, 'utf8');
      const toolName =
        toolFile.split('/').pop()?.replace('.js', '') || 'Unknown';

      const tool = {
        name: toolName,
        description: this.extractToolDescription(content),
        usage: this.extractToolUsage(content),
        features: this.extractToolFeatures(content),
        cli: this.extractCliInterface(content),
      };

      this.documentationData.tools.push(tool);
    }
  }

  extractToolDescription(content) {
    const lines = content.split('\n');

    // Look for the main comment block at the top
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('/**') || line.startsWith('*')) {
        const description = line
          .replace(/^\/?\*+\s?/, '')
          .replace(/\*\/$/, '')
          .trim();
        if (description && !description.startsWith('@')) {
          return description;
        }
      }
    }

    return 'Development tool';
  }

  extractToolUsage(content) {
    const usageExamples = [];

    // Look for CLI usage in comments
    const cliMatch = content.match(/Usage:\s*(.+)/i);
    if (cliMatch) {
      usageExamples.push(cliMatch[1]);
    }

    // Look for npm script references
    const scriptMatches = content.match(/npm run (\w+)/g);
    if (scriptMatches) {
      usageExamples.push(...scriptMatches);
    }

    // Look for node command examples
    const nodeMatches = content.match(/node [\w\/.-]+/g);
    if (nodeMatches) {
      usageExamples.push(...nodeMatches);
    }

    return usageExamples.length > 0
      ? usageExamples
      : ['Run directly with Node.js'];
  }

  extractToolFeatures(content) {
    const features = [];

    // Look for feature descriptions in comments
    const featureRegex = /[-•]\s*(.+)/g;
    let match;
    while ((match = featureRegex.exec(content)) !== null) {
      const feature = match[1].trim();
      if (feature.length > 10 && feature.length < 100) {
        features.push(feature);
      }
    }

    // Extract method names as features
    const methodMatches = content.match(/async\s+(\w+)\s*\(/g);
    if (methodMatches) {
      methodMatches.forEach((m) => {
        const method = m.match(/async\s+(\w+)/)?.[1];
        if (method && method !== 'setup' && method !== 'cleanup') {
          features.push(`${method} functionality`);
        }
      });
    }

    return features;
  }

  extractCliInterface(content) {
    const cli = {
      hasInterface: false,
      options: [],
      commands: [],
    };

    // Check if tool has CLI interface
    if (
      content.includes('process.argv') ||
      content.includes('import.meta.url')
    ) {
      cli.hasInterface = true;

      // Extract CLI options
      const optionMatches = content.match(
        /args\.includes\(['"`]([^'"`]+)['"`]\)/g,
      );
      if (optionMatches) {
        optionMatches.forEach((match) => {
          const option = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
          if (option) {
            cli.options.push(option);
          }
        });
      }

      // Extract CLI arguments
      const argMatches = content.match(
        /args\.find\(arg => arg\.startsWith\(['"`]([^'"`]+)['"`]\)/g,
      );
      if (argMatches) {
        argMatches.forEach((match) => {
          const arg = match.match(/['"`]([^'"`]+)['"`]/)?.[1];
          if (arg) {
            cli.options.push(arg);
          }
        });
      }
    }

    return cli;
  }

  async generateComponentDocs() {
    console.log('⚛️ Generating component documentation...');

    for (const component of this.documentationData.components) {
      const markdown = this.generateComponentMarkdown(component);
      const filename = `${component.name.toLowerCase()}.md`;
      writeFileSync(join(this.docsDir, 'components', filename), markdown);
    }

    // Generate component index
    const indexMarkdown = this.generateComponentIndex();
    writeFileSync(join(this.docsDir, 'components', 'README.md'), indexMarkdown);
  }

  generateComponentMarkdown(component) {
    return `# ${component.name}

${component.description || 'React component'}

## File Location
\`${component.filePath}\`

${
  component.components.length > 0
    ? component.components
        .map(
          (comp) => `
## Component: ${comp.name}

${comp.description || 'Component description'}

${
  comp.props.length > 0
    ? `
### Props

| Name | Type | Optional | Description |
|------|------|----------|-------------|
${comp.props
  .map(
    (prop) =>
      `| ${prop.name} | \`${prop.type}\` | ${prop.optional ? 'Yes' : 'No'} | ${prop.description || '-'} |`,
  )
  .join('\n')}
`
    : ''
}

### Usage

\`\`\`tsx
import { ${comp.name} } from '${component.filePath.replace(/\.(ts|tsx)$/, '')}'

function Example() {
  return (
    <${comp.name}${comp.props.length > 0 ? ` ${comp.props[0].name}="${comp.props[0].type === 'string' ? 'example' : 'value'}"` : ''} />
  )
}
\`\`\`
`,
        )
        .join('\n')
    : ''
}

${
  component.functions.length > 0
    ? `
## Functions

${component.functions
  .map(
    (func) => `
### ${func.name}

${func.description || 'Function description'}

${
  func.params.length > 0
    ? `
**Parameters:**
${func.params.map((param) => `- \`${param.name}\`: \`${param.type}\``).join('\n')}
`
    : ''
}

${func.isAsync ? '**Returns:** Promise' : ''}
`,
  )
  .join('\n')}
`
    : ''
}

${
  component.todos.length > 0
    ? `
## TODOs

${component.todos.map((todo) => `- Line ${todo.line}: ${todo.text}`).join('\n')}
`
    : ''
}

---
*Generated automatically by Maestro Docs Generator*
`;
  }

  generateComponentIndex() {
    return `# Components Documentation

This directory contains automatically generated documentation for all React components in the Maestro Build Plane.

## Component List

${this.documentationData.components
  .map(
    (comp) =>
      `- [${comp.name}](${comp.name.toLowerCase()}.md) - ${comp.description || 'Component'}`,
  )
  .join('\n')}

## Component Guidelines

### Best Practices

1. **TypeScript Props**: Always define TypeScript interfaces for component props
2. **JSDoc Comments**: Add JSDoc comments for better documentation generation
3. **Prop Validation**: Use TypeScript for compile-time prop validation
4. **Default Props**: Provide sensible defaults for optional props

### Example Component Structure

\`\`\`tsx
/**
 * Example component with proper documentation
 * 
 * @param props - Component props
 * @returns JSX element
 */
interface ExampleProps {
  /** The title to display */
  title: string
  /** Optional description */
  description?: string
  /** Click handler */
  onClick?: () => void
}

export const Example: React.FC<ExampleProps> = ({
  title,
  description,
  onClick
}) => {
  return (
    <div onClick={onClick}>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  )
}
\`\`\`

---
*Generated automatically by Maestro Docs Generator*
`;
  }

  async generateHooksDocs() {
    console.log('🪝 Generating hooks documentation...');

    for (const hookFile of this.documentationData.hooks) {
      const markdown = this.generateHooksMarkdown(hookFile);
      const filename = `${hookFile.name.toLowerCase()}.md`;
      writeFileSync(join(this.docsDir, 'hooks', filename), markdown);
    }

    // Generate hooks index
    const indexMarkdown = this.generateHooksIndex();
    writeFileSync(join(this.docsDir, 'hooks', 'README.md'), indexMarkdown);
  }

  generateHooksMarkdown(hookFile) {
    return `# ${hookFile.name}

${hookFile.description || 'Custom React hook'}

## File Location
\`${hookFile.filePath}\`

${hookFile.hooks
  .map(
    (hook) => `
## Hook: ${hook.name}

${hook.description || 'Hook description'}

### Returns
\`${hook.returns}\`

### Usage

\`\`\`tsx
import { ${hook.name} } from '${hookFile.filePath.replace(/\.(ts|tsx)$/, '')}'

function ExampleComponent() {
  const result = ${hook.name}()
  
  return (
    <div>
      {/* Use the hook result */}
    </div>
  )
}
\`\`\`
`,
  )
  .join('\n')}

${
  hookFile.functions.length > 0
    ? `
## Helper Functions

${hookFile.functions
  .map(
    (func) => `
### ${func.name}

${func.description || 'Helper function'}

${
  func.params.length > 0
    ? `
**Parameters:**
${func.params.map((param) => `- \`${param.name}\`: \`${param.type}\``).join('\n')}
`
    : ''
}
`,
  )
  .join('\n')}
`
    : ''
}

---
*Generated automatically by Maestro Docs Generator*
`;
  }

  generateHooksIndex() {
    return `# Hooks Documentation

Custom React hooks used throughout the Maestro Build Plane application.

## Hook List

${this.documentationData.hooks
  .map(
    (hook) =>
      `- [${hook.name}](${hook.name.toLowerCase()}.md) - ${hook.description || 'Custom hook'}`,
  )
  .join('\n')}

## Hook Guidelines

### Best Practices

1. **Naming**: Always prefix custom hooks with "use"
2. **Single Responsibility**: Each hook should have a single, clear purpose
3. **TypeScript**: Use TypeScript for type safety and better documentation
4. **Dependencies**: Properly declare dependencies in useEffect and other hooks

### Example Hook Structure

\`\`\`tsx
/**
 * Custom hook for managing API data
 * 
 * @param url - API endpoint URL
 * @returns Object with data, loading, and error states
 */
interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>(url: string): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Implementation
  }, [url])
  
  return { data, loading, error }
}
\`\`\`

---
*Generated automatically by Maestro Docs Generator*
`;
  }

  async generateToolsDocs() {
    console.log('🛠️ Generating tools documentation...');

    for (const tool of this.documentationData.tools) {
      const markdown = this.generateToolMarkdown(tool);
      const filename = `${tool.name.toLowerCase()}.md`;
      writeFileSync(join(this.docsDir, 'tools', filename), markdown);
    }

    // Generate tools index
    const indexMarkdown = this.generateToolsIndex();
    writeFileSync(join(this.docsDir, 'tools', 'README.md'), indexMarkdown);
  }

  generateToolMarkdown(tool) {
    return `# ${tool.name}

${tool.description}

## Features

${tool.features.map((feature) => `- ${feature}`).join('\n')}

${
  tool.cli.hasInterface
    ? `
## Command Line Interface

${
  tool.cli.options.length > 0
    ? `
### Available Options

${tool.cli.options.map((option) => `- \`${option}\``).join('\n')}
`
    : ''
}

### Usage Examples

${tool.usage.map((usage) => `\`\`\`bash\n${usage}\n\`\`\``).join('\n\n')}
`
    : `
## Usage

Run the tool directly:

\`\`\`bash
node tools/${tool.name}.js
\`\`\`
`
}

## Integration

This tool can be integrated into your development workflow:

1. **Manual Execution**: Run directly when needed
2. **npm Scripts**: Add to package.json scripts section
3. **CI/CD Pipeline**: Include in automated workflows
4. **Pre-commit Hooks**: Run before commits for quality assurance

---
*Generated automatically by Maestro Docs Generator*
`;
  }

  generateToolsIndex() {
    return `# Development Tools Documentation

Comprehensive documentation for all development tools in the Maestro Build Plane project.

## Available Tools

${this.documentationData.tools
  .map(
    (tool) =>
      `- [${tool.name}](${tool.name.toLowerCase()}.md) - ${tool.description}`,
  )
  .join('\n')}

## Tool Categories

### Testing & Quality Assurance
- **test-runner.js** - Comprehensive test suite execution
- **visual-testing.js** - Visual regression testing
- **accessibility-checker.js** - WCAG compliance testing
- **security-scanner.js** - Security vulnerability scanning
- **quality-gate.js** - Automated quality gate system

### Performance & Monitoring
- **performance-monitor.js** - Web Vitals and performance tracking
- **performance-profiler.js** - Detailed performance profiling
- **health-checker.js** - Application health monitoring
- **bundle-analyzer.js** - Bundle size and composition analysis

### Development & Debugging
- **dev-server.js** - Advanced development server
- **debug-helper.js** - Debugging utilities and insights
- **ci-cd-pipeline.js** - CI/CD pipeline management

### Deployment & Infrastructure
- **deployment-manager.js** - Multi-environment deployments
- **docs-generator.js** - Automatic documentation generation

## Getting Started

1. **Install Dependencies**: Ensure all project dependencies are installed
2. **Tool Permissions**: Make sure tools are executable (\`chmod +x tools/*.js\`)
3. **Configuration**: Some tools may require configuration files
4. **Environment**: Set up necessary environment variables

## Integration with npm Scripts

Add tools to your package.json:

\`\`\`json
{
  "scripts": {
    "test:full": "node tools/test-runner.js",
    "security:scan": "node tools/security-scanner.js",
    "perf:monitor": "node tools/performance-monitor.js",
    "quality:gate": "node tools/quality-gate.js",
    "docs:generate": "node tools/docs-generator.js"
  }
}
\`\`\`

---
*Generated automatically by Maestro Docs Generator*
`;
  }

  async generateMainReadme() {
    console.log('📖 Generating main documentation...');

    const readme = `# Maestro Build Plane Documentation

Welcome to the comprehensive documentation for the Maestro Build Plane frontend application.

## Quick Start

1. **Installation**
   \`\`\`bash
   npm install
   \`\`\`

2. **Development**
   \`\`\`bash
   npm run dev
   \`\`\`

3. **Testing**
   \`\`\`bash
   npm run test
   \`\`\`

4. **Build**
   \`\`\`bash
   npm run build
   \`\`\`

## Documentation Sections

### 📦 [Components](components/README.md)
React components with props documentation, usage examples, and best practices.

### 🪝 [Hooks](hooks/README.md) 
Custom React hooks for state management, API calls, and reusable logic.

### 🔧 [Utilities](utils/README.md)
Helper functions, data transformations, and common utilities.

### 🌐 [Services](services/README.md)
API services, data layer, and external integrations.

### 🛠️ [Development Tools](tools/README.md)
Comprehensive tooling for development, testing, and deployment.

### 📚 [API Documentation](api/README.md)
Backend API integration and data models.

## Architecture Overview

The Maestro Build Plane follows a modern React architecture:

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **State Management**: Context API + useReducer for complex state
- **Styling**: Tailwind CSS for utility-first styling
- **Testing**: Playwright for E2E, Jest for unit tests
- **Code Quality**: ESLint, Prettier, TypeScript strict mode

## Project Statistics

- **Total Components**: ${this.documentationData.components.length}
- **Custom Hooks**: ${this.documentationData.hooks.length}
- **Utility Functions**: ${this.documentationData.utils.length}
- **Service Modules**: ${this.documentationData.services.length}
- **Development Tools**: ${this.documentationData.tools.length}

## Development Workflow

### 1. Quality Assurance
\`\`\`bash
# Run comprehensive quality gate
node tools/quality-gate.js

# Individual quality checks
npm run lint
npm run typecheck
npm run test
\`\`\`

### 2. Performance Monitoring
\`\`\`bash
# Monitor performance metrics
node tools/performance-monitor.js

# Detailed performance profiling  
node tools/performance-profiler.js
\`\`\`

### 3. Security Scanning
\`\`\`bash
# Security vulnerability scan
node tools/security-scanner.js

# Accessibility compliance check
node tools/accessibility-checker.js
\`\`\`

### 4. Documentation
\`\`\`bash
# Generate/update documentation
node tools/docs-generator.js
\`\`\`

## Deployment

### Development
\`\`\`bash
node tools/deployment-manager.js deploy --env=local
\`\`\`

### Staging
\`\`\`bash
node tools/deployment-manager.js deploy --env=staging --approve
\`\`\`

### Production
\`\`\`bash
node tools/deployment-manager.js deploy --env=production --approve
\`\`\`

## Contributing

1. **Code Style**: Follow ESLint and Prettier configurations
2. **TypeScript**: Use strict TypeScript for all new code
3. **Testing**: Write tests for new features and components
4. **Documentation**: Update documentation for public APIs
5. **Quality Gate**: Ensure quality gate passes before merging

## Support

- **Issues**: Report bugs and feature requests via GitHub Issues
- **Documentation**: This documentation is auto-generated from code
- **Tools**: All development tools include \`--help\` option

---

*Documentation generated automatically on ${new Date().toISOString()}*
*Total documentation files: ${this.documentationData.components.length + this.documentationData.hooks.length + this.documentationData.tools.length + this.documentationData.utils.length + this.documentationData.services.length}*
`;

    writeFileSync(join(this.docsDir, 'README.md'), readme);
  }

  async generateReport() {
    console.log('📄 Generating documentation report...');

    const totalDuration = Date.now() - this.startTime;
    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      summary: {
        totalFiles: Object.values(this.documentationData).reduce(
          (acc, arr) => acc + arr.length,
          0,
        ),
        components: this.documentationData.components.length,
        hooks: this.documentationData.hooks.length,
        utils: this.documentationData.utils.length,
        services: this.documentationData.services.length,
        tools: this.documentationData.tools.length,
        types: this.documentationData.types.length,
      },
      files: {
        components: this.documentationData.components.map((c) => ({
          name: c.name,
          file: c.filePath,
        })),
        hooks: this.documentationData.hooks.map((h) => ({
          name: h.name,
          file: h.filePath,
        })),
        tools: this.documentationData.tools.map((t) => ({ name: t.name })),
      },
      coverage: {
        documented:
          this.documentationData.components.filter((c) => c.description)
            .length +
          this.documentationData.hooks.filter((h) => h.description).length,
        total:
          this.documentationData.components.length +
          this.documentationData.hooks.length,
        percentage: 0,
      },
    };

    report.coverage.percentage =
      report.coverage.total > 0
        ? Math.round((report.coverage.documented / report.coverage.total) * 100)
        : 0;

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'docs-generation-report.json'),
      JSON.stringify(report, null, 2),
    );

    return report;
  }

  getSourceFiles() {
    const sourceFiles = [];
    const sourceDirs = [
      'src',
      'components',
      'hooks',
      'utils',
      'services',
      'pages',
      'lib',
    ];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    const scanDirectory = (dir) => {
      if (!existsSync(dir)) return;

      try {
        const entries = readdirSync(dir, { withFileTypes: true });

        entries.forEach((entry) => {
          const fullPath = join(dir, entry.name);

          if (
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            entry.name !== 'node_modules'
          ) {
            scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const ext = extname(entry.name);
            if (
              extensions.includes(ext) &&
              !entry.name.includes('.test.') &&
              !entry.name.includes('.spec.')
            ) {
              sourceFiles.push(fullPath);
            }
          }
        });
      } catch (error) {
        // Skip directories we can't read
      }
    };

    // Scan source directories
    sourceDirs.forEach((dir) => {
      const fullDir = join(root, dir);
      scanDirectory(fullDir);
    });

    return sourceFiles;
  }

  async run(options = {}) {
    const {
      generateComponents = true,
      generateHooks = true,
      generateTools = true,
      generateMainDocs = true,
      generateReport = true,
    } = options;

    try {
      await this.setup();
      await this.analyzeCodebase();

      console.log(
        `📚 Generating documentation for ${this.documentationData.components.length + this.documentationData.hooks.length + this.documentationData.tools.length} items...\n`,
      );

      if (generateComponents) {
        await this.generateComponentDocs();
      }

      if (generateHooks) {
        await this.generateHooksDocs();
      }

      if (generateTools) {
        await this.generateToolsDocs();
      }

      if (generateMainDocs) {
        await this.generateMainReadme();
      }

      const report = generateReport ? await this.generateReport() : null;

      console.log('\n🎯 Documentation Generation Summary:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      );
      console.log(
        `  Total Files Processed:   ${report?.summary.totalFiles || 0}`,
      );
      console.log(
        `  Components Documented:   ${report?.summary.components || 0}`,
      );
      console.log(`  Hooks Documented:        ${report?.summary.hooks || 0}`);
      console.log(`  Tools Documented:        ${report?.summary.tools || 0}`);
      console.log(`  Utilities Documented:    ${report?.summary.utils || 0}`);
      console.log(
        `  Services Documented:     ${report?.summary.services || 0}`,
      );
      console.log(
        `  Documentation Coverage:  ${report?.coverage.percentage || 0}%`,
      );
      console.log(
        `  Generation Duration:     ${report ? (report.duration / 1000).toFixed(2) : 0} seconds`,
      );

      console.log('\n📚 Documentation Files Created:');
      console.log(`  📖 Main README:          docs/README.md`);
      console.log(
        `  ⚛️  Components:           docs/components/ (${report?.summary.components || 0} files)`,
      );
      console.log(
        `  🪝 Hooks:                docs/hooks/ (${report?.summary.hooks || 0} files)`,
      );
      console.log(
        `  🛠️ Tools:                docs/tools/ (${report?.summary.tools || 0} files)`,
      );

      if (generateReport) {
        console.log(
          `\n📄 Detailed report: ${join('test-results', 'documentation', 'docs-generation-report.json')}`,
        );
      }

      return true;
    } catch (error) {
      console.error('❌ Documentation generation failed:', error);
      return false;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    generateComponents: !args.includes('--skip-components'),
    generateHooks: !args.includes('--skip-hooks'),
    generateTools: !args.includes('--skip-tools'),
    generateMainDocs: !args.includes('--skip-main'),
    generateReport: !args.includes('--no-report'),
  };

  const generator = new DocsGenerator();
  generator
    .run(options)
    .then((success) => {
      console.log(
        success
          ? '✅ Documentation generation completed successfully!'
          : '❌ Documentation generation failed!',
      );
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Documentation Generator failed:', error);
      process.exit(1);
    });
}

export default DocsGenerator;
