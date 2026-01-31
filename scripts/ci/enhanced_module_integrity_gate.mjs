#!/usr/bin/env node
/**
 * Module Integrity Gate - Enhanced with Issue Generation Automation
 * Provides comprehensive module integrity validation with systematic remediation capabilities
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Regex pattern to extract import/export statements
const IMPORT_EXPORT_REGEX = /(import\s+|from\s+|export\s+.*?from\s+|import\(\s*)["'](.*?\.[jt]sx?)["']/g;

class ModuleIntegrityGate {
  constructor() {
    this.currentErrors = [];
    this.newErrors = [];
    this.existingErrors = [];
    this.checkedFiles = 0;
  }

  /**
   * Find all source files recursively
   */
  findSourceFiles(roots) {
    const files = [];
    
    for (const root of roots) {
      if (!fs.existsSync(root)) continue;
      
      const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (this.isSourceFile(entry.name)) {
            files.push(fullPath);
          }
        }
      };
      
      walk(root);
    }
    
    return files;
  }

  isSourceFile(filename) {
    const ext = path.extname(filename);
    return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext);
  }

  resolveImport(fromFile, importPath) {
    // Only handle relative imports (./ or ../)
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
      return null;
    }

    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, importPath);

    return resolved;
  }

  checkPathExists(resolvedPath) {
    // Check if the exact file exists
    if (fs.existsSync(resolvedPath)) {
      return { exists: true, path: resolvedPath, kind: 'exact' };
    }

    // Check if file exists with different case
    const dir = path.dirname(resolvedPath);
    const basename = path.basename(resolvedPath);

    if (fs.existsSync(dir)) {
      const dirContents = fs.readdirSync(dir, { withFileTypes: true });

      // Look for file with different case
      for (const entry of dirContents) {
        if (entry.name.toLowerCase() === basename.toLowerCase() &&
            entry.name !== basename) {
          return {
            exists: true,
            path: path.join(dir, entry.name),
            kind: 'case_mismatch'
          };
        }
      }

      // Check for directory index files (index.js, index.ts, etc.)
      if (fs.statSync(dir).isDirectory()) {
        for (const ext of ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json']) {
          const indexPath = path.join(resolvedPath, `index${ext}`);
          if (fs.existsSync(indexPath)) {
            return { exists: true, path: indexPath, kind: 'index' };
          }
        }
      }
    }

    return { exists: false, path: resolvedPath, kind: 'missing' };
  }

  parseAndCheckFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = [...content.matchAll(IMPORT_EXPORT_REGEX)];

      for (const match of matches) {
        const importPath = match[2]; // Second capture group contains the import path

        const resolved = this.resolveImport(filePath, importPath);
        if (!resolved) continue; // Skip non-relative imports

        const checkResult = this.checkPathExists(resolved);

        if (!checkResult.exists || checkResult.kind === 'case_mismatch') {
          const errorObj = {
            file: filePath,
            import: importPath,
            kind: checkResult.kind,
            resolved: checkResult.path
          };

          this.currentErrors.push(errorObj);
        }
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error.message);
    }
  }

  compareWithBaseline(baseline) {
    if (!baseline || !baseline.errors) {
      this.newErrors = [...this.currentErrors];
      this.existingErrors = [];
      return;
    }

    const baselineMap = new Map();
    baseline.errors.forEach(error => {
      const key = `${error.file}::${error.import}::${error.kind}`;
      baselineMap.set(key, error);
    });

    for (const currentError of this.currentErrors) {
      const key = `${currentError.file}::${currentError.import}::${currentError.kind}`;
      
      if (baselineMap.has(key)) {
        this.existingErrors.push(currentError);
      } else {
        this.newErrors.push(currentError);
      }
    }
  }

  /**
   * Generate GitHub issue templates for systematic remediation
   */
  generateIssueTemplates(clusters) {
    // Create issues directory if it doesn't exist
    const issuesDir = path.join(__dirname, '../..', 'issues');
    if (!fs.existsSync(issuesDir)) {
      fs.mkdirSync(issuesDir, { recursive: true });
    }
    
    let issuesGenerated = 0;
    
    for (const cluster of clusters) {
      // Limit to clusters with more than 3 violations to reduce noise
      if (cluster.count > 3) {
        const sanitizedDir = cluster.directory.replace(/[\/\\]/g, '-');
        const issueFile = path.join(issuesDir, `module-integrity-${sanitizedDir.replace(':', '_')}.md`);
        
        const issueContent = this.generateIssueContent(cluster);
        fs.writeFileSync(issueFile, issueContent);
        issuesGenerated++;
      }
    }
    
    console.log(`📊 Generated ${issuesGenerated} issue templates for systematic remediation`);
  }

  /**
   * Generate content for a remediation issue
   */
  generateIssueContent(cluster) {
    const priority = this.determinePriority(cluster);
    const surfaces = Array.from(cluster.surfaces).join(', ');
    
    let content = `# Module Integrity Remediation: ${cluster.directory}\n\n`;
    content += `## Summary\n`;
    content += `- **Violations in directory**: ${cluster.count}\n`;
    content += `- **Violation types**: ${Array.from(cluster.types).join(', ')}\n`;
    content += `- **Surface area**: ${surfaces}\n`;
    content += `- **Priority**: ${priority.toUpperCase()}\n\n`;
    
    content += `## Sample Violations\n`;
    content += "```\n";
    for (const error of cluster.violations.slice(0, 10)) {
      content += `${error.kind}: ${error.file} -> \"${error.import}\"\n`;
    }
    if (cluster.violations.length > 10) {
      content += `... and ${cluster.violations.length - 10} more\n`;
    }
    content += "```\n\n";
    
    content += `## Resolution Steps\n`;
    content += `1. Check the full integrity report: \`docs/ops/integrity/module-integrity-report.json\`\n`;
    content += `2. For each violation, either:\n`;
    content += `   - Create the missing file\n`;
    content += `   - Fix the import path case sensitivity\n`;
    content += `   - Add missing index files for barrel exports\n`;
    content += `3. Run verification after fixes: \`node scripts/ci/verify_module_integrity.mjs\`\n\n`;
    
    content += `## Labels\n`;
    content += `- \`integrity:module\`\n`;
    content += `- \`priority:${priority}\`\n`;
    content += `- \`surface:${surfaces.split(',')[0]}\`\n`;
    
    return content;
  }

  /**
   * Determine priority based on directory characteristics
   */
  determinePriority(cluster) {
    if (cluster.directory.includes('/client/src/features/') ||
        cluster.directory.includes('/client/src/components/') ||
        cluster.directory.includes('/server/src/routes/') ||
        cluster.directory.includes('/server/src/controllers/')) {
      return 'high';
    }
    
    if (cluster.directory.includes('/packages/')) {
      return 'medium';
    }
    
    if (cluster.directory.includes('/utils/') ||
        cluster.directory.includes('/helpers/') ||
        cluster.directory.includes('/test/') ||
        cluster.directory.includes('__tests__')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Cluster violations by directory for systematic remediation
   */
  clusterByDirectory(errors) {
    const directoryMap = {};
    
    for (const error of errors) {
      const dir = path.dirname(error.file);
      const dirKey = dir.replace(/\\/g, '/'); // Normalize path separators
      
      if (!directoryMap[dirKey]) {
        directoryMap[dirKey] = {
          directory: dirKey,
          count: 0,
          violations: [],
          types: new Set(),
          surfaces: new Set()
        };
      }
      
      directoryMap[dirKey].count++;
      directoryMap[dirKey].violations.push(error);
      directoryMap[dirKey].types.add(error.kind);
      
      // Determine surface area
      if (error.file.includes('/client/')) {
        directoryMap[dirKey].surfaces.add('client');
      } else if (error.file.includes('/server/')) {
        directoryMap[dirKey].surfaces.add('server');
      } else if (error.file.includes('/packages/')) {
        directoryMap[dirKey].surfaces.add('packages');
      }
    }
    
    return Object.values(directoryMap);
  }

  run() {
    console.log('🔍 Starting module integrity gate with systematic remediation...');
    
    // Define source roots to scan
    const sourceRoots = [
      path.join(__dirname, '../../client/src'),
      path.join(__dirname, '../../server/src')
    ];
    
    // Also check packages if they exist
    const packagesDir = path.join(__dirname, '../../packages');
    if (fs.existsSync(packagesDir)) {
      const packageDirs = fs.readdirSync(packagesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(packagesDir, dirent.name, 'src'))
        .filter(srcPath => fs.existsSync(srcPath));
      
      sourceRoots.push(...packageDirs);
    }
    
    console.log(`📂 Scanning source roots: ${sourceRoots.join(', ')}`);
    
    const sourceFiles = this.findSourceFiles(sourceRoots);
    console.log(`📄 Found ${sourceFiles.length} source files to check`);
    
    this.checkedFiles = sourceFiles.length;
    
    // Check each file for import integrity
    for (const file of sourceFiles) {
      this.parseAndCheckFile(file);
    }
    
    // Load baseline if it exists
    const baselinePath = path.join(__dirname, '../../docs/ops/integrity/module-integrity-baseline.json');
    let baseline = null;
    
    if (fs.existsSync(baselinePath)) {
      try {
        baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        console.log(`📊 Loaded baseline with ${baseline.errors?.length || 0} known violations`);
      } catch (error) {
        console.warn(`⚠️ Could not load baseline: ${error.message}`);
      }
    } else {
      console.log('📊 No baseline found - treating all violations as new');
    }
    
    // Compare current errors with baseline
    this.compareWithBaseline(baseline);

    // Sort errors deterministically
    this.newErrors.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      if (a.import !== b.import) return a.import.localeCompare(b.import);
      return a.kind.localeCompare(b.kind);
    });

    // Generate JSON report
    const report = {
      checkedRoots: sourceRoots,
      checkedFiles: this.checkedFiles,
      currentViolations: this.currentErrors.length,
      existingViolations: this.existingErrors.length,
      newViolations: this.newErrors.length,
      errors: this.currentErrors,
      timestamp: new Date().toISOString().split('T')[0] // Date only, no time for determinism
    };
    
    // Create directory if it doesn't exist
    const projectRoot = path.resolve(__dirname, '../..');
    const reportDir = path.join(projectRoot, 'docs/ops/integrity');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // Write JSON report
    const reportPath = path.join(reportDir, 'module-integrity-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    // If we don't have a baseline yet, save current state as baseline
    if (!fs.existsSync(baselinePath)) {
      const baselineReport = {
        checkedRoots: sourceRoots,
        checkedFiles: this.checkedFiles,
        errors: this.currentErrors,
        timestamp: new Date().toISOString().split('T')[0], // Date only
        baselineEstablishedOn: new Date().toISOString()
      };
      fs.writeFileSync(baselinePath, JSON.stringify(baselineReport, null, 2));
      console.log(`📊 Baseline established with ${this.currentErrors.length} initial violations`);
    }
    
    console.log(`📊 Report written to: ${reportPath}`);
    
    // Generate issue templates for systematic remediation if new baseline was established
    if (baseline === null) {
      const clusters = this.clusterByDirectory(this.currentErrors);
      this.generateIssueTemplates(clusters);
    }
    
    // Print summary
    if (this.newErrors.length > 0) {
      console.log(`❌ Found ${this.newErrors.length} NEW integrity violations (FAILURE - blocking CI):`);
      for (const error of this.newErrors.slice(0, 10)) { // Show first 10 new errors
        console.log(`  • ${error.kind}: ${error.file} -> "${error.import}"`);
      }
      if (this.newErrors.length > 10) {
        console.log(`  ... and ${this.newErrors.length - 10} more new violations`);
      }
      
      // Return false to indicate failure (new errors found)
      return false;
    } else {
      console.log(`✅ No new integrity violations found!`);
      console.log(`📊 Current total: ${this.currentErrors.length} violations (${this.existingErrors.length} existing, ${this.newErrors.length} new)`);
      // Return true to indicate success (no new errors)
      return true;
    }
  }
}

// Run the integrity gate
const gate = new ModuleIntegrityGate();
const success = gate.run();

// Exit with error code if NEW violations found
process.exit(success ? 0 : 1);