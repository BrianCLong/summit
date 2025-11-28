#!/usr/bin/env ts-node
/**
 * Ultra-Prime Agent Orchestrator
 *
 * This script provides CLI automation for invoking the Ultra-Prime
 * Recursive Meta-Extrapolative Agent with various configurations.
 *
 * Usage:
 *   pnpm ultra-prime "your request here"
 *   pnpm ultra-prime --file request.txt
 *   pnpm ultra-prime --interactive
 *
 * @module UltraPrimeOrchestrator
 */

import * as fs from 'fs';
import * as path from 'path';
import { ultraPrime, UltraPrimeOutput } from '../tools/ultra-prime-engine';

/**
 * CLI Configuration
 */
interface OrchestratorConfig {
  request?: string;
  inputFile?: string;
  outputDir?: string;
  interactive?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
  format?: 'markdown' | 'json' | 'both';
}

/**
 * Ultra-Prime Orchestrator
 *
 * Handles CLI invocation, output formatting, and file generation
 */
class UltraPrimeOrchestrator {
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    this.config = config;
  }

  /**
   * Main execution flow
   */
  async run(): Promise<void> {
    try {
      // Get the request
      const request = await this.getRequest();

      if (this.config.verbose) {
        console.log('🔍 Ultra-Prime Agent Starting...');
        console.log(`📝 Request: ${request.slice(0, 100)}...`);
        console.log('');
      }

      // Process with ultra-prime engine
      if (this.config.verbose) {
        console.log('🧠 Performing recursive meta-extrapolation...');
      }

      const output = await ultraPrime.process(request);

      if (this.config.verbose) {
        console.log('✅ Meta-extrapolation complete');
        console.log('📊 Generating deliverables...');
      }

      // Output results
      await this.outputResults(output);

      if (this.config.verbose) {
        console.log('');
        console.log('✨ Ultra-Prime processing complete!');
        console.log('');
        this.printSummary(output);
      }
    } catch (error) {
      console.error('❌ Error during ultra-prime processing:');
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Get the request from various sources
   */
  private async getRequest(): Promise<string> {
    if (this.config.request) {
      return this.config.request;
    }

    if (this.config.inputFile) {
      const filePath = path.resolve(this.config.inputFile);
      return fs.readFileSync(filePath, 'utf-8');
    }

    if (this.config.interactive) {
      return await this.interactivePrompt();
    }

    throw new Error('No request provided. Use --request, --file, or --interactive');
  }

  /**
   * Interactive prompt for request input
   */
  private async interactivePrompt(): Promise<string> {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      console.log('🎯 Ultra-Prime Agent - Interactive Mode');
      console.log('');
      console.log('Enter your request (press Ctrl+D when done):');
      console.log('');

      let input = '';

      rl.on('line', (line: string) => {
        input += line + '\n';
      });

      rl.on('close', () => {
        resolve(input.trim());
      });
    });
  }

  /**
   * Output results in the configured format
   */
  private async outputResults(output: UltraPrimeOutput): Promise<void> {
    const outputDir = this.config.outputDir || './ultra-prime-output';

    if (!this.config.dryRun) {
      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Output based on format
      if (this.config.format === 'json' || this.config.format === 'both') {
        await this.outputJSON(output, outputDir);
      }

      if (this.config.format === 'markdown' || this.config.format === 'both') {
        await this.outputMarkdown(output, outputDir);
      }

      // Default: markdown
      if (!this.config.format) {
        await this.outputMarkdown(output, outputDir);
      }
    } else {
      console.log('🚫 Dry run mode - no files written');
      console.log('');
      console.log(JSON.stringify(output, null, 2));
    }
  }

  /**
   * Output results as JSON
   */
  private async outputJSON(output: UltraPrimeOutput, outputDir: string): Promise<void> {
    const jsonPath = path.join(outputDir, 'ultra-prime-output.json');
    fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));

    if (this.config.verbose) {
      console.log(`📄 JSON output written to: ${jsonPath}`);
    }
  }

  /**
   * Output results as formatted markdown
   */
  private async outputMarkdown(
    output: UltraPrimeOutput,
    outputDir: string
  ): Promise<void> {
    const markdown = this.formatAsMarkdown(output);
    const mdPath = path.join(outputDir, 'ultra-prime-output.md');

    fs.writeFileSync(mdPath, markdown);

    if (this.config.verbose) {
      console.log(`📝 Markdown output written to: ${mdPath}`);
    }

    // Also write individual deliverables
    for (const deliverable of output.deliverables) {
      const deliverablePath = path.join(outputDir, deliverable.path);
      const deliverableDir = path.dirname(deliverablePath);

      if (!fs.existsSync(deliverableDir)) {
        fs.mkdirSync(deliverableDir, { recursive: true });
      }

      fs.writeFileSync(deliverablePath, deliverable.content);

      if (this.config.verbose) {
        console.log(`  📦 ${deliverable.type}: ${deliverable.path}`);
      }
    }
  }

  /**
   * Format output as comprehensive markdown document
   */
  private formatAsMarkdown(output: UltraPrimeOutput): string {
    return `# Ultra-Prime Agent Output

> Generated: ${new Date().toISOString()}

---

## 📋 Meta-Extrapolation

### Original Request

\`\`\`
${output.metaExtrapolation.originalRequest}
\`\`\`

### Reconstructed Intent

${output.metaExtrapolation.reconstructedIntent}

### Additional Requirements Identified

${output.metaExtrapolation.additionalRequirements.map((req) => `- ${req}`).join('\n')}

### Extrapolation Levels

${this.formatExtrapolationLevels(output)}

### Candidate Architectures

${this.formatCandidateArchitectures(output)}

### Selected Architecture

**${output.metaExtrapolation.selectedArchitecture.name}**

${output.metaExtrapolation.selectedArchitecture.description}

**Strengths:**
${output.metaExtrapolation.selectedArchitecture.strengths.map((s) => `- ${s}`).join('\n')}

**Scores:**
- Elegance: ${output.metaExtrapolation.selectedArchitecture.scores.elegance}/10
- Performance: ${output.metaExtrapolation.selectedArchitecture.scores.performance}/10
- Maintainability: ${output.metaExtrapolation.selectedArchitecture.scores.maintainability}/10
- Innovation: ${output.metaExtrapolation.selectedArchitecture.scores.innovation}/10
- Risk: ${output.metaExtrapolation.selectedArchitecture.scores.risk}/10

**Overall Score:** ${output.metaExtrapolation.selectedArchitecture.overallScore}/10

### Proposed Approach

${output.metaExtrapolation.proposedApproach}

---

## 🏗️ Architecture

### System Overview

${output.architecture.overview}

### Technology Stack

${Object.entries(output.architecture.technologyStack)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join('\n')}

### Components

${output.architecture.components.map((c) => `- ${c}`).join('\n')}

### Data Flow

${output.architecture.dataFlow}

---

## 💻 Implementation

${this.formatDeliverables(output, 'implementation')}

---

## 🧪 Tests

${this.formatDeliverables(output, 'tests')}

---

## 📚 Documentation

${this.formatDeliverables(output, 'documentation')}

---

## 🚀 DevOps

${this.formatDeliverables(output, 'devops')}

---

## 📦 Pull Request

### Title

\`\`\`
${output.pullRequest.title}
\`\`\`

### Description

${output.pullRequest.description}

### Commits

${output.pullRequest.commits.map((commit) => this.formatCommit(commit)).join('\n\n')}

### Merge Checklist

${output.pullRequest.checklist
  .map((item) => `- [${item.completed ? 'x' : ' '}] ${item.category}: ${item.item}`)
  .join('\n')}

---

## 🔮 Future Considerations

### Potential Enhancements

${output.futureConsiderations.enhancements.map((e) => `- ${e}`).join('\n')}

### Evolution Path

${output.futureConsiderations.evolutionPath}

### Maintenance Notes

${output.futureConsiderations.maintenanceNotes.map((n) => `- ${n}`).join('\n')}

---

## 🎯 Deliverables Summary

${output.deliverables.map((d) => `✅ ${d.type}: ${d.path}`).join('\n')}

---

*Generated by Ultra-Prime Recursive Meta-Extrapolative Agent v1.0.0*
`;
  }

  /**
   * Format extrapolation levels
   */
  private formatExtrapolationLevels(output: UltraPrimeOutput): string {
    const byCategory = output.metaExtrapolation.levels.reduce((acc, level) => {
      if (!acc[level.category]) {
        acc[level.category] = [];
      }
      acc[level.category].push(level);
      return acc;
    }, {} as Record<string, typeof output.metaExtrapolation.levels>);

    let result = '';

    for (const [category, levels] of Object.entries(byCategory)) {
      result += `\n#### ${category.toUpperCase()}\n\n`;
      for (const level of levels) {
        result += `**Level ${level.level}: ${level.aspect}**\n`;
        result += `- ${level.implication}\n`;
        result += `- Priority: ${level.priority}\n\n`;
      }
    }

    return result;
  }

  /**
   * Format candidate architectures
   */
  private formatCandidateArchitectures(output: UltraPrimeOutput): string {
    return output.metaExtrapolation.candidateArchitectures
      .map(
        (arch) => `
#### ${arch.name} (Score: ${arch.overallScore}/10)

${arch.description}

**Strengths:**
${arch.strengths.map((s) => `- ${s}`).join('\n')}

**Weaknesses:**
${arch.weaknesses.map((w) => `- ${w}`).join('\n')}
`
      )
      .join('\n');
  }

  /**
   * Format deliverables by type
   */
  private formatDeliverables(
    output: UltraPrimeOutput,
    type: string
  ): string {
    const deliverables = output.deliverables.filter((d) => d.type === type);

    if (deliverables.length === 0) {
      return '_No deliverables of this type_';
    }

    return deliverables
      .map(
        (d) => `
### ${d.path}

${d.description}

\`\`\`
${d.content}
\`\`\`
`
      )
      .join('\n');
  }

  /**
   * Format a git commit
   */
  private formatCommit(commit: any): string {
    const scope = commit.scope ? `(${commit.scope})` : '';
    const breaking = commit.breaking ? ' [BREAKING]' : '';

    return `
**${commit.type}${scope}: ${commit.subject}${breaking}**

${commit.body}
`.trim();
  }

  /**
   * Print summary of processing
   */
  private printSummary(output: UltraPrimeOutput): void {
    console.log('📊 Summary:');
    console.log('');
    console.log(
      `  Extrapolation Levels: ${output.metaExtrapolation.levels.length}`
    );
    console.log(
      `  Candidate Architectures: ${output.metaExtrapolation.candidateArchitectures.length}`
    );
    console.log(`  Deliverables: ${output.deliverables.length}`);
    console.log(`  Commits: ${output.pullRequest.commits.length}`);
    console.log(
      `  Checklist Items: ${output.pullRequest.checklist.length}`
    );
  }
}

/**
 * Parse command-line arguments
 */
function parseArgs(): OrchestratorConfig {
  const args = process.argv.slice(2);
  const config: OrchestratorConfig = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--request':
      case '-r':
        config.request = args[++i];
        break;

      case '--file':
      case '-f':
        config.inputFile = args[++i];
        break;

      case '--output':
      case '-o':
        config.outputDir = args[++i];
        break;

      case '--interactive':
      case '-i':
        config.interactive = true;
        break;

      case '--verbose':
      case '-v':
        config.verbose = true;
        break;

      case '--dry-run':
        config.dryRun = true;
        break;

      case '--format':
        config.format = args[++i] as 'markdown' | 'json' | 'both';
        break;

      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;

      default:
        // Treat as request if no flag
        if (!config.request) {
          config.request = arg;
        }
        break;
    }
  }

  return config;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Ultra-Prime Agent Orchestrator

Usage:
  ultra-prime [options] "request"
  ultra-prime --file request.txt
  ultra-prime --interactive

Options:
  -r, --request <text>      Request text (inline)
  -f, --file <path>         Read request from file
  -i, --interactive         Interactive prompt mode
  -o, --output <dir>        Output directory (default: ./ultra-prime-output)
  -v, --verbose             Verbose output
  --dry-run                 Show output without writing files
  --format <type>           Output format: markdown, json, or both (default: markdown)
  -h, --help                Show this help message

Examples:
  ultra-prime "Add health check endpoint"
  ultra-prime --file feature-request.txt --output ./output
  ultra-prime --interactive --verbose
  ultra-prime "Design tracing system" --format both

For more information, see prompts/ultra-prime-recursive-meta-extrapolative.md
  `);
}

/**
 * Main entry point
 */
async function main() {
  const config = parseArgs();
  const orchestrator = new UltraPrimeOrchestrator(config);

  await orchestrator.run();
}

// Run if invoked directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { UltraPrimeOrchestrator, OrchestratorConfig };
