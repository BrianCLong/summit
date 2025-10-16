#!/usr/bin/env node

/**
 * Advanced Debug Helper for Maestro Build Plane
 * Provides debugging utilities, performance profiling, and development insights
 */

import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  statSync,
  readdirSync,
} from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class DebugHelper {
  constructor() {
    this.reportDir = join(root, 'test-results', 'debug');
    this.startTime = Date.now();
    this.debugSessions = [];
    this.performanceData = {
      bundleAnalysis: null,
      memoryUsage: [],
      buildTimes: [],
      testPerformance: null,
    };
  }

  async setup() {
    console.log('🐛 Setting up Debug Helper...');

    // Create report directory
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async analyzeBundle() {
    console.log('📦 Analyzing bundle composition and performance...');

    try {
      const distDir = join(root, 'dist');

      if (!existsSync(distDir)) {
        console.log('  ⚠️ No build found. Running build first...');
        await execAsync('npm run build', { cwd: root });
      }

      const bundleAnalysis = {
        timestamp: new Date().toISOString(),
        files: [],
        totalSize: 0,
        duplicates: [],
        largeFiles: [],
        unusedExports: [],
        recommendations: [],
      };

      // Analyze all files in dist directory
      const files = this.getFilesRecursively(distDir);

      for (const file of files) {
        const stats = statSync(file);
        const relativePath = file.replace(distDir + '/', '');
        const extension = file.split('.').pop();

        const fileInfo = {
          path: relativePath,
          size: stats.size,
          sizeKB: (stats.size / 1024).toFixed(2),
          extension,
          modified: stats.mtime,
        };

        bundleAnalysis.files.push(fileInfo);
        bundleAnalysis.totalSize += stats.size;

        // Check for large files
        if (stats.size > 1024 * 1024) {
          // > 1MB
          bundleAnalysis.largeFiles.push({
            ...fileInfo,
            recommendation: 'Consider code splitting or compression',
          });
        }

        // Analyze JavaScript files for potential issues
        if (extension === 'js') {
          const content = readFileSync(file, 'utf8');

          // Check for common issues
          if (content.includes('console.log') && !file.includes('.map')) {
            bundleAnalysis.recommendations.push({
              type: 'console_logs',
              file: relativePath,
              message: 'Console logs found in production build',
            });
          }

          if (content.includes('debugger')) {
            bundleAnalysis.recommendations.push({
              type: 'debugger',
              file: relativePath,
              message: 'Debugger statement found in production build',
            });
          }

          // Check for duplicate code patterns
          const lines = content.split('\n');
          const duplicateThreshold = 10;
          const codeBlocks = this.extractCodeBlocks(lines, duplicateThreshold);

          for (const block of codeBlocks) {
            const existing = bundleAnalysis.duplicates.find(
              (d) => d.code === block.code,
            );
            if (existing) {
              existing.files.push(relativePath);
              existing.occurrences++;
            } else {
              bundleAnalysis.duplicates.push({
                code: block.code.substring(0, 200) + '...',
                files: [relativePath],
                occurrences: 1,
                lines: block.lines,
              });
            }
          }
        }
      }

      // Filter significant duplicates
      bundleAnalysis.duplicates = bundleAnalysis.duplicates.filter(
        (d) => d.occurrences > 1,
      );

      // Generate performance recommendations
      this.generateBundleRecommendations(bundleAnalysis);

      this.performanceData.bundleAnalysis = bundleAnalysis;

      console.log(
        `  ✅ Analyzed ${bundleAnalysis.files.length} files (${(bundleAnalysis.totalSize / 1024).toFixed(2)} KB total)`,
      );
      console.log(
        `  📊 Found ${bundleAnalysis.largeFiles.length} large files, ${bundleAnalysis.duplicates.length} duplicate patterns`,
      );

      return bundleAnalysis;
    } catch (error) {
      console.log(`  ❌ Bundle analysis failed: ${error.message}`);
      return null;
    }
  }

  extractCodeBlocks(lines, minLines = 10) {
    const blocks = [];

    for (let i = 0; i <= lines.length - minLines; i++) {
      const block = lines.slice(i, i + minLines).join('\n');

      // Skip blocks that are mostly whitespace or comments
      const codeLines = block
        .split('\n')
        .filter(
          (line) =>
            line.trim() &&
            !line.trim().startsWith('//') &&
            !line.trim().startsWith('/*') &&
            !line.trim().startsWith('*'),
        );

      if (codeLines.length >= minLines * 0.7) {
        blocks.push({
          code: block,
          startLine: i + 1,
          lines: minLines,
        });
      }
    }

    return blocks;
  }

  generateBundleRecommendations(analysis) {
    const recommendations = analysis.recommendations;

    // Size-based recommendations
    if (analysis.totalSize > 5 * 1024 * 1024) {
      // > 5MB
      recommendations.push({
        type: 'bundle_size',
        priority: 'high',
        message:
          'Bundle size is very large. Consider aggressive code splitting.',
        details: `Total size: ${(analysis.totalSize / 1024 / 1024).toFixed(2)} MB`,
      });
    }

    // JavaScript specific recommendations
    const jsFiles = analysis.files.filter((f) => f.extension === 'js');
    const avgJsSize =
      jsFiles.reduce((acc, f) => acc + f.size, 0) / jsFiles.length;

    if (avgJsSize > 512 * 1024) {
      // > 512KB average
      recommendations.push({
        type: 'js_optimization',
        priority: 'moderate',
        message:
          'JavaScript files are large on average. Consider minification and tree shaking.',
        details: `Average JS file size: ${(avgJsSize / 1024).toFixed(2)} KB`,
      });
    }

    // Duplicate code recommendations
    if (analysis.duplicates.length > 5) {
      recommendations.push({
        type: 'duplicate_code',
        priority: 'moderate',
        message:
          'Significant code duplication detected. Consider refactoring common patterns.',
        details: `${analysis.duplicates.length} duplicate code patterns found`,
      });
    }

    // Asset optimization recommendations
    const imageFiles = analysis.files.filter((f) =>
      ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(f.extension),
    );
    const totalImageSize = imageFiles.reduce((acc, f) => acc + f.size, 0);

    if (totalImageSize > 2 * 1024 * 1024) {
      // > 2MB of images
      recommendations.push({
        type: 'image_optimization',
        priority: 'moderate',
        message:
          'Large amount of image assets. Consider optimization and modern formats.',
        details: `Total image size: ${(totalImageSize / 1024 / 1024).toFixed(2)} MB`,
      });
    }
  }

  async profileMemoryUsage() {
    console.log('🧠 Profiling memory usage during build...');

    try {
      const memoryProfile = {
        timestamp: new Date().toISOString(),
        samples: [],
        peakUsage: 0,
        averageUsage: 0,
      };

      // Start memory monitoring
      const monitorInterval = setInterval(() => {
        const usage = process.memoryUsage();
        const sample = {
          timestamp: Date.now(),
          rss: usage.rss,
          heapTotal: usage.heapTotal,
          heapUsed: usage.heapUsed,
          external: usage.external,
        };

        memoryProfile.samples.push(sample);
        memoryProfile.peakUsage = Math.max(memoryProfile.peakUsage, usage.rss);
      }, 1000);

      // Run build process
      const buildStart = Date.now();
      await execAsync('npm run build', { cwd: root });
      const buildTime = Date.now() - buildStart;

      // Stop monitoring
      clearInterval(monitorInterval);

      // Calculate statistics
      if (memoryProfile.samples.length > 0) {
        memoryProfile.averageUsage =
          memoryProfile.samples.reduce((acc, s) => acc + s.rss, 0) /
          memoryProfile.samples.length;
        memoryProfile.buildTime = buildTime;
      }

      this.performanceData.memoryUsage.push(memoryProfile);

      console.log(`  ✅ Memory profiling completed`);
      console.log(
        `     Peak usage: ${(memoryProfile.peakUsage / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(
        `     Average usage: ${(memoryProfile.averageUsage / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(`     Build time: ${(buildTime / 1000).toFixed(2)}s`);

      return memoryProfile;
    } catch (error) {
      console.log(`  ❌ Memory profiling failed: ${error.message}`);
      return null;
    }
  }

  async analyzeSourceCode() {
    console.log('🔍 Analyzing source code for debugging insights...');

    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        files: {
          total: 0,
          byType: {},
          bySize: [],
        },
        codeMetrics: {
          totalLines: 0,
          codeLines: 0,
          commentLines: 0,
          blankLines: 0,
          complexity: 0,
        },
        issues: {
          todos: [],
          fixmes: [],
          console_logs: [],
          debugger_statements: [],
          unused_variables: [],
          potential_bugs: [],
        },
        dependencies: {
          production: [],
          development: [],
          unused: [],
          outdated: [],
        },
      };

      // Analyze source files
      const sourceFiles = this.getSourceFiles();

      for (const file of sourceFiles) {
        const stats = statSync(file);
        const relativePath = file.replace(root + '/', '');
        const extension = file.split('.').pop();
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n');

        // File statistics
        analysis.files.total++;
        analysis.files.byType[extension] =
          (analysis.files.byType[extension] || 0) + 1;
        analysis.files.bySize.push({
          path: relativePath,
          size: stats.size,
          lines: lines.length,
        });

        // Code metrics
        analysis.codeMetrics.totalLines += lines.length;

        lines.forEach((line, index) => {
          const trimmed = line.trim();

          if (!trimmed) {
            analysis.codeMetrics.blankLines++;
          } else if (trimmed.startsWith('//') || trimmed.startsWith('/*')) {
            analysis.codeMetrics.commentLines++;
          } else {
            analysis.codeMetrics.codeLines++;
          }

          // Issue detection
          if (trimmed.includes('TODO') || trimmed.includes('FIXME')) {
            const issueType = trimmed.includes('TODO') ? 'todos' : 'fixmes';
            analysis.issues[issueType].push({
              file: relativePath,
              line: index + 1,
              text: trimmed,
              context: lines.slice(Math.max(0, index - 1), index + 2),
            });
          }

          if (trimmed.includes('console.log') && !trimmed.startsWith('//')) {
            analysis.issues.console_logs.push({
              file: relativePath,
              line: index + 1,
              text: trimmed,
            });
          }

          if (trimmed.includes('debugger') && !trimmed.startsWith('//')) {
            analysis.issues.debugger_statements.push({
              file: relativePath,
              line: index + 1,
              text: trimmed,
            });
          }

          // Simple complexity metrics
          const complexityIndicators = [
            'if',
            'else',
            'while',
            'for',
            'switch',
            'case',
            'try',
            'catch',
            '&&',
            '||',
            '?',
          ];

          complexityIndicators.forEach((indicator) => {
            const matches = (trimmed.match(new RegExp(indicator, 'g')) || [])
              .length;
            analysis.codeMetrics.complexity += matches;
          });
        });

        // Detect potential issues in JavaScript/TypeScript files
        if (['js', 'ts', 'tsx', 'jsx'].includes(extension)) {
          this.detectPotentialBugs(
            content,
            relativePath,
            analysis.issues.potential_bugs,
          );
        }
      }

      // Sort files by size
      analysis.files.bySize.sort((a, b) => b.size - a.size);

      // Analyze dependencies
      await this.analyzeDependencies(analysis.dependencies);

      console.log(`  ✅ Analyzed ${analysis.files.total} source files`);
      console.log(`     Code lines: ${analysis.codeMetrics.codeLines}`);
      console.log(
        `     Issues found: ${Object.values(analysis.issues).reduce((acc, arr) => acc + arr.length, 0)}`,
      );

      return analysis;
    } catch (error) {
      console.log(`  ❌ Source code analysis failed: ${error.message}`);
      return null;
    }
  }

  detectPotentialBugs(content, filePath, bugsList) {
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Common bug patterns
      const bugPatterns = [
        {
          pattern: /===/g,
          opposite: /==/g,
          type: 'loose_equality',
          message: 'Consider using === instead of ==',
        },
        {
          pattern: /var\s+/g,
          type: 'var_usage',
          message: 'Consider using let or const instead of var',
        },
        {
          pattern: /\.\w+\(\)\s*\./g,
          type: 'method_chaining',
          message: 'Potential null/undefined error in method chaining',
        },
        {
          pattern: /parseInt\([^,)]+\)/g,
          type: 'parseint_radix',
          message: 'parseInt should include radix parameter',
        },
      ];

      bugPatterns.forEach(({ pattern, type, message, opposite }) => {
        if (opposite && opposite.test(trimmed) && !pattern.test(trimmed)) {
          bugsList.push({
            file: filePath,
            line: index + 1,
            type,
            message,
            text: trimmed,
          });
        } else if (!opposite && pattern.test(trimmed)) {
          bugsList.push({
            file: filePath,
            line: index + 1,
            type,
            message,
            text: trimmed,
          });
        }
      });
    });
  }

  async analyzeDependencies(deps) {
    try {
      const packageJson = JSON.parse(
        readFileSync(join(root, 'package.json'), 'utf8'),
      );

      deps.production = Object.keys(packageJson.dependencies || {});
      deps.development = Object.keys(packageJson.devDependencies || {});

      // Check for outdated packages
      try {
        const { stdout } = await execAsync('npm outdated --json', {
          cwd: root,
          timeout: 30000,
        });
        const outdated = JSON.parse(stdout || '{}');
        deps.outdated = Object.keys(outdated);
      } catch (error) {
        // npm outdated returns non-zero exit code when packages are outdated
        if (error.stdout) {
          try {
            const outdated = JSON.parse(error.stdout);
            deps.outdated = Object.keys(outdated);
          } catch (parseError) {
            deps.outdated = [];
          }
        }
      }

      // Simple unused dependency detection (basic heuristic)
      const sourceFiles = this.getSourceFiles();
      const importedPackages = new Set();

      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf8');

        // Extract import statements
        const importMatches =
          content.match(/(?:import|require)\s*\(?[^'"]*['"]([^'"]+)['"]/g) ||
          [];

        importMatches.forEach((match) => {
          const packageMatch = match.match(/['"]([^'"]+)['"]/);
          if (packageMatch) {
            const packageName = packageMatch[1];
            // Extract package name (handle scoped packages)
            const normalized = packageName.startsWith('@')
              ? packageName.split('/').slice(0, 2).join('/')
              : packageName.split('/')[0];

            if (!normalized.startsWith('.') && !normalized.startsWith('/')) {
              importedPackages.add(normalized);
            }
          }
        });
      }

      // Find potentially unused dependencies
      deps.unused = deps.production.filter(
        (dep) => !importedPackages.has(dep) && !this.isUtilityPackage(dep),
      );
    } catch (error) {
      console.log(`  ⚠️ Dependency analysis partial failure: ${error.message}`);
    }
  }

  isUtilityPackage(packageName) {
    const utilityPackages = [
      'react',
      'react-dom',
      'typescript',
      'vite',
      '@vitejs/plugin-react',
      'eslint',
      'prettier',
    ];

    return (
      utilityPackages.includes(packageName) ||
      packageName.startsWith('@types/') ||
      packageName.startsWith('@typescript-eslint/')
    );
  }

  async generateDebugReport() {
    console.log('📄 Generating comprehensive debug report...');

    const totalDuration = Date.now() - this.startTime;

    // Run all analysis if not already done
    const bundleAnalysis =
      this.performanceData.bundleAnalysis || (await this.analyzeBundle());
    const sourceAnalysis = await this.analyzeSourceCode();
    const memoryProfile = await this.profileMemoryUsage();

    const report = {
      timestamp: new Date().toISOString(),
      duration: totalDuration,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        cwd: process.cwd(),
      },
      bundle: bundleAnalysis,
      source: sourceAnalysis,
      performance: {
        memory: memoryProfile,
        build: this.performanceData.buildTimes,
      },
      recommendations: this.generateDebugRecommendations(
        bundleAnalysis,
        sourceAnalysis,
      ),
    };

    // Write JSON report
    writeFileSync(
      join(this.reportDir, 'debug-report.json'),
      JSON.stringify(report, null, 2),
    );

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync(join(this.reportDir, 'debug-report.html'), htmlReport);

    console.log(`  ✅ Debug report generated`);
    console.log(
      `     Bundle size: ${bundleAnalysis ? (bundleAnalysis.totalSize / 1024).toFixed(2) + ' KB' : 'N/A'}`,
    );
    console.log(
      `     Source files: ${sourceAnalysis ? sourceAnalysis.files.total : 'N/A'}`,
    );
    console.log(
      `     Issues found: ${sourceAnalysis ? Object.values(sourceAnalysis.issues).reduce((acc, arr) => acc + arr.length, 0) : 'N/A'}`,
    );

    return report;
  }

  generateDebugRecommendations(bundleAnalysis, sourceAnalysis) {
    const recommendations = [];

    // Bundle-based recommendations
    if (bundleAnalysis) {
      if (bundleAnalysis.largeFiles.length > 0) {
        recommendations.push({
          category: 'Performance',
          priority: 'high',
          title: 'Optimize Large Bundle Files',
          description: `${bundleAnalysis.largeFiles.length} files are larger than 1MB. Consider code splitting or compression.`,
          files: bundleAnalysis.largeFiles.map((f) => f.path),
        });
      }

      if (bundleAnalysis.duplicates.length > 3) {
        recommendations.push({
          category: 'Code Quality',
          priority: 'moderate',
          title: 'Eliminate Code Duplication',
          description: `${bundleAnalysis.duplicates.length} duplicate code patterns detected. Consider refactoring.`,
          details: bundleAnalysis.duplicates.slice(0, 3),
        });
      }
    }

    // Source-based recommendations
    if (sourceAnalysis) {
      if (sourceAnalysis.issues.console_logs.length > 10) {
        recommendations.push({
          category: 'Code Quality',
          priority: 'moderate',
          title: 'Remove Console Logs',
          description: `${sourceAnalysis.issues.console_logs.length} console.log statements found. Remove for production.`,
          count: sourceAnalysis.issues.console_logs.length,
        });
      }

      if (sourceAnalysis.issues.debugger_statements.length > 0) {
        recommendations.push({
          category: 'Code Quality',
          priority: 'high',
          title: 'Remove Debugger Statements',
          description: `${sourceAnalysis.issues.debugger_statements.length} debugger statements found.`,
          files: sourceAnalysis.issues.debugger_statements.map(
            (d) => `${d.file}:${d.line}`,
          ),
        });
      }

      if (sourceAnalysis.issues.potential_bugs.length > 5) {
        recommendations.push({
          category: 'Bug Prevention',
          priority: 'moderate',
          title: 'Address Potential Issues',
          description: `${sourceAnalysis.issues.potential_bugs.length} potential code issues detected.`,
          types: [
            ...new Set(sourceAnalysis.issues.potential_bugs.map((b) => b.type)),
          ],
        });
      }

      if (sourceAnalysis.dependencies.unused.length > 0) {
        recommendations.push({
          category: 'Dependencies',
          priority: 'low',
          title: 'Remove Unused Dependencies',
          description: `${sourceAnalysis.dependencies.unused.length} potentially unused dependencies detected.`,
          packages: sourceAnalysis.dependencies.unused,
        });
      }

      if (sourceAnalysis.dependencies.outdated.length > 5) {
        recommendations.push({
          category: 'Dependencies',
          priority: 'moderate',
          title: 'Update Outdated Packages',
          description: `${sourceAnalysis.dependencies.outdated.length} packages are outdated.`,
          count: sourceAnalysis.dependencies.outdated.length,
        });
      }
    }

    return recommendations;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug & Performance Report</title>
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; margin: 40px; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 1400px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; color: #007bff; }
        .metric-label { font-size: 1em; color: #666; }
        .section { margin: 30px 0; }
        .section-title { font-size: 1.2em; font-weight: bold; margin-bottom: 15px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; }
        .recommendations { margin: 30px 0; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 10px 0; }
        .recommendation.high { background: #f8d7da; border-color: #f5c6cb; }
        .recommendation.moderate { background: #ffeaa7; border-color: #faebcc; }
        .recommendation.low { background: #d4edda; border-color: #c3e6cb; }
        .issues-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .issue-card { background: #f8f9fa; border-left: 4px solid #007bff; padding: 15px; border-radius: 0 8px 8px 0; }
        .issue-card.warning { border-left-color: #ffc107; }
        .issue-card.error { border-left-color: #dc3545; }
        .code-block { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 8px; font-family: monospace; margin: 10px 0; overflow-x: auto; }
        .file-list { max-height: 200px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 0.9em; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; }
        .stat-item { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .chart-placeholder { background: linear-gradient(45deg, #f8f9fa 25%, transparent 25%), linear-gradient(-45deg, #f8f9fa 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f8f9fa 75%), linear-gradient(-45deg, transparent 75%, #f8f9fa 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; height: 200px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐛 Debug & Performance Report</h1>
            <p><strong>Generated:</strong> ${report.timestamp}</p>
            <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(2)} seconds</p>
            <p><strong>Environment:</strong> Node ${report.environment.nodeVersion} on ${report.environment.platform}</p>
        </div>

        <div class="metrics">
            ${
              report.bundle
                ? `
                <div class="metric">
                    <div class="metric-value">${(report.bundle.totalSize / 1024).toFixed(1)}KB</div>
                    <div class="metric-label">Bundle Size</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.bundle.files.length}</div>
                    <div class="metric-label">Bundle Files</div>
                </div>
            `
                : ''
            }
            ${
              report.source
                ? `
                <div class="metric">
                    <div class="metric-value">${report.source.files.total}</div>
                    <div class="metric-label">Source Files</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${report.source.codeMetrics.codeLines}</div>
                    <div class="metric-label">Lines of Code</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${Object.values(report.source.issues).reduce((acc, arr) => acc + arr.length, 0)}</div>
                    <div class="metric-label">Issues Found</div>
                </div>
            `
                : ''
            }
            ${
              report.performance.memory
                ? `
                <div class="metric">
                    <div class="metric-value">${(report.performance.memory.peakUsage / 1024 / 1024).toFixed(1)}MB</div>
                    <div class="metric-label">Peak Memory</div>
                </div>
            `
                : ''
            }
        </div>

        ${
          report.recommendations.length > 0
            ? `
            <div class="section">
                <div class="section-title">💡 Recommendations</div>
                <div class="recommendations">
                    ${report.recommendations
                      .map(
                        (rec) => `
                        <div class="recommendation ${rec.priority}">
                            <h4>${rec.title} <span style="color: #666; font-size: 0.8em; font-weight: normal;">(${rec.priority.toUpperCase()})</span></h4>
                            <p>${rec.description}</p>
                            ${
                              rec.files
                                ? `<div class="file-list">${rec.files
                                    .slice(0, 5)
                                    .map((f) => `<div>${f}</div>`)
                                    .join('')}</div>`
                                : ''
                            }
                            ${rec.packages ? `<div class="file-list">${rec.packages.slice(0, 10).join(', ')}</div>` : ''}
                            ${rec.count ? `<p><strong>Count:</strong> ${rec.count}</p>` : ''}
                        </div>
                    `,
                      )
                      .join('')}
                </div>
            </div>
        `
            : ''
        }

        ${
          report.bundle
            ? `
            <div class="section">
                <div class="section-title">📦 Bundle Analysis</div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <h4>File Distribution</h4>
                        ${Object.entries(
                          report.bundle.files.reduce((acc, f) => {
                            acc[f.extension] = (acc[f.extension] || 0) + 1;
                            return acc;
                          }, {}),
                        )
                          .map(
                            ([ext, count]) =>
                              `<div>${ext}: ${count} files</div>`,
                          )
                          .join('')}
                    </div>
                    <div class="stat-item">
                        <h4>Largest Files</h4>
                        <div class="file-list">
                            ${report.bundle.files
                              .slice(0, 10)
                              .map(
                                (f) => `<div>${f.path} (${f.sizeKB}KB)</div>`,
                              )
                              .join('')}
                        </div>
                    </div>
                    ${
                      report.bundle.largeFiles.length > 0
                        ? `
                        <div class="stat-item">
                            <h4>Large Files (>1MB)</h4>
                            <div class="file-list">
                                ${report.bundle.largeFiles
                                  .map(
                                    (f) =>
                                      `<div>${f.path} (${f.sizeKB}KB)</div>`,
                                  )
                                  .join('')}
                            </div>
                        </div>
                    `
                        : ''
                    }
                </div>
            </div>
        `
            : ''
        }

        ${
          report.source
            ? `
            <div class="section">
                <div class="section-title">🔍 Source Code Analysis</div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <h4>Code Metrics</h4>
                        <div>Total Lines: ${report.source.codeMetrics.totalLines}</div>
                        <div>Code Lines: ${report.source.codeMetrics.codeLines}</div>
                        <div>Comment Lines: ${report.source.codeMetrics.commentLines}</div>
                        <div>Blank Lines: ${report.source.codeMetrics.blankLines}</div>
                        <div>Complexity Score: ${report.source.codeMetrics.complexity}</div>
                    </div>
                    <div class="stat-item">
                        <h4>File Types</h4>
                        ${Object.entries(report.source.files.byType)
                          .map(
                            ([type, count]) =>
                              `<div>.${type}: ${count} files</div>`,
                          )
                          .join('')}
                    </div>
                    <div class="stat-item">
                        <h4>Dependencies</h4>
                        <div>Production: ${report.source.dependencies.production.length}</div>
                        <div>Development: ${report.source.dependencies.development.length}</div>
                        <div>Unused: ${report.source.dependencies.unused.length}</div>
                        <div>Outdated: ${report.source.dependencies.outdated.length}</div>
                    </div>
                </div>
                
                <div class="issues-grid">
                    ${Object.entries(report.source.issues)
                      .filter(([key, issues]) => issues.length > 0)
                      .map(
                        ([type, issues]) => `
                        <div class="issue-card ${type.includes('console') || type.includes('debugger') ? 'warning' : type.includes('potential') ? 'error' : ''}">
                            <h4>${type.replace(/_/g, ' ').toUpperCase()} (${issues.length})</h4>
                            <div class="file-list">
                                ${issues
                                  .slice(0, 5)
                                  .map(
                                    (issue) =>
                                      `<div>${issue.file}:${issue.line} - ${issue.text ? issue.text.substring(0, 50) + '...' : issue.message || ''}</div>`,
                                  )
                                  .join('')}
                                ${issues.length > 5 ? `<div>... and ${issues.length - 5} more</div>` : ''}
                            </div>
                        </div>
                    `,
                      )
                      .join('')}
                </div>
            </div>
        `
            : ''
        }

        ${
          report.performance.memory
            ? `
            <div class="section">
                <div class="section-title">🧠 Memory Performance</div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <h4>Memory Usage</h4>
                        <div>Peak Usage: ${(report.performance.memory.peakUsage / 1024 / 1024).toFixed(2)} MB</div>
                        <div>Average Usage: ${(report.performance.memory.averageUsage / 1024 / 1024).toFixed(2)} MB</div>
                        <div>Build Time: ${(report.performance.memory.buildTime / 1000).toFixed(2)}s</div>
                        <div>Samples Collected: ${report.performance.memory.samples.length}</div>
                    </div>
                    <div class="stat-item">
                        <h4>Memory Profile Chart</h4>
                        <div class="chart-placeholder">
                            Memory usage over time<br>
                            <small>(${report.performance.memory.samples.length} data points)</small>
                        </div>
                    </div>
                </div>
            </div>
        `
            : ''
        }

        <div class="section">
            <div class="section-title">⚙️ Environment Information</div>
            <div class="code-block">
                <div>Node Version: ${report.environment.nodeVersion}</div>
                <div>Platform: ${report.environment.platform} (${report.environment.arch})</div>
                <div>Memory: RSS ${(report.environment.memory.rss / 1024 / 1024).toFixed(2)}MB, Heap ${(report.environment.memory.heapUsed / 1024 / 1024).toFixed(2)}MB</div>
                <div>Working Directory: ${report.environment.cwd}</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;
  }

  getSourceFiles() {
    const sourceFiles = [];
    const sourceDirs = [
      'src',
      'lib',
      'components',
      'pages',
      'utils',
      'hooks',
      'services',
    ];
    const extensions = ['js', 'ts', 'tsx', 'jsx', 'vue', 'svelte'];

    const scanDirectory = (dir) => {
      if (!existsSync(dir)) return;

      try {
        const entries = readdirSync(dir, { withFileTypes: true });

        entries.forEach((entry) => {
          const fullPath = join(dir, entry.name);

          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            scanDirectory(fullPath);
          } else if (entry.isFile()) {
            const extension = entry.name.split('.').pop();
            if (extensions.includes(extension)) {
              sourceFiles.push(fullPath);
            }
          }
        });
      } catch (error) {
        // Skip directories we can't read
      }
    };

    // Scan common source directories
    sourceDirs.forEach((dir) => {
      const fullDir = join(root, dir);
      scanDirectory(fullDir);
    });

    // Also scan root level source files
    try {
      const rootFiles = readdirSync(root).filter((file) => {
        const extension = file.split('.').pop();
        return (
          extensions.includes(extension) && statSync(join(root, file)).isFile()
        );
      });

      rootFiles.forEach((file) => {
        sourceFiles.push(join(root, file));
      });
    } catch (error) {
      // Skip if can't read root
    }

    return sourceFiles;
  }

  getFilesRecursively(dir) {
    const files = [];

    const scan = (currentDir) => {
      try {
        const entries = readdirSync(currentDir, { withFileTypes: true });

        entries.forEach((entry) => {
          const fullPath = join(currentDir, entry.name);

          if (entry.isDirectory()) {
            scan(fullPath);
          } else {
            files.push(fullPath);
          }
        });
      } catch (error) {
        // Skip directories we can't read
      }
    };

    scan(dir);
    return files;
  }

  async run(options = {}) {
    const {
      analyzeBundle = true,
      analyzeSource = true,
      profileMemory = false,
      generateReport = true,
    } = options;

    try {
      await this.setup();

      console.log('🐛 Starting debug analysis...\n');

      // Run requested analyses
      if (analyzeBundle) {
        await this.analyzeBundle();
      }

      if (analyzeSource) {
        await this.analyzeSourceCode();
      }

      if (profileMemory) {
        await this.profileMemoryUsage();
      }

      // Generate comprehensive report
      if (generateReport) {
        const report = await this.generateDebugReport();

        console.log('\n🎯 Debug Analysis Summary:');
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        console.log(
          `  Analysis Duration:    ${(report.duration / 1000).toFixed(2)} seconds`,
        );

        if (report.bundle) {
          console.log(
            `  Bundle Size:          ${(report.bundle.totalSize / 1024).toFixed(2)} KB`,
          );
          console.log(`  Bundle Files:         ${report.bundle.files.length}`);
          console.log(
            `  Large Files:          ${report.bundle.largeFiles.length}`,
          );
        }

        if (report.source) {
          console.log(`  Source Files:         ${report.source.files.total}`);
          console.log(
            `  Lines of Code:        ${report.source.codeMetrics.codeLines}`,
          );
          console.log(
            `  Issues Found:         ${Object.values(report.source.issues).reduce((acc, arr) => acc + arr.length, 0)}`,
          );
        }

        if (report.performance.memory) {
          console.log(
            `  Peak Memory:          ${(report.performance.memory.peakUsage / 1024 / 1024).toFixed(2)} MB`,
          );
        }

        console.log(`  Recommendations:      ${report.recommendations.length}`);

        if (report.recommendations.length > 0) {
          console.log('\n💡 Top Recommendations:');
          report.recommendations.slice(0, 3).forEach((rec) => {
            console.log(`  • ${rec.title} (${rec.priority})`);
          });
        }

        console.log(
          `\n📄 Detailed report: ${join('test-results', 'debug', 'debug-report.html')}`,
        );

        return true;
      }
    } catch (error) {
      console.error('❌ Debug analysis failed:', error);
      return false;
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    analyzeBundle: !args.includes('--skip-bundle'),
    analyzeSource: !args.includes('--skip-source'),
    profileMemory: args.includes('--profile-memory'),
    generateReport: !args.includes('--no-report'),
  };

  const debugHelper = new DebugHelper();
  debugHelper
    .run(options)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Debug Helper failed:', error);
      process.exit(1);
    });
}

export default DebugHelper;
