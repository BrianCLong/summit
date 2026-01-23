#!/usr/bin/env node
/**
 * Module Integrity Checker - Baseline Mode
 * Verifies that all import/export paths resolve to actual files on disk
 * In baseline mode: Only fails on NEW violations, tolerates existing ones
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supported file extensions for resolving imports
const SUPPORTED_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'];

// Regex patterns to extract import/export statements
// Matches: import ..., export ..., dynamic import()
const IMPORT_EXPORT_REGEX = /(import\s+|from\s+|export\s+.*?from\s+|import\(\s*)["'](.*?\.[jt]sx?)["']/g;

class ModuleIntegrityChecker {
  constructor() {
    this.currentErrors = [];  // All current errors
    this.newErrors = [];      // New errors compared to baseline
    this.existingErrors = []; // Errors that existed in baseline
    this.checkedFiles = 0;
  }

  /**
   * Find all source files in the specified root directories
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

  /**
   * Check if a file name indicates a source file
   */
  isSourceFile(filename) {
    const ext = path.extname(filename);
    return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext);
  }

  /**
   * Resolve an import path relative to a given file
   */
  resolveImport(fromFile, importPath) {
    // Only handle relative imports (./ or ../)
    if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
      return null;
    }

    const dir = path.dirname(fromFile);
    const resolved = path.resolve(dir, importPath);
    
    return resolved;
  }

  /**
   * Check if a path exists with exact case sensitivity
   */
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

  /**
   * Parse a file and check its imports
   */
  parseAndCheckFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = [...content.matchAll(IMPORT_EXPORT_REGEX)];
      
      for (const match of matches) {
        const importPath = match[2]; // Second capture group contains the path
        
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

  /**
   * Compare current errors against baseline
   */
  compareWithBaseline(baseline) {
    if (!baseline || !baseline.errors) {
      // No baseline exists yet, treat everything as new
      this.newErrors = [...this.currentErrors];
      this.existingErrors = [];
      return;
    }

    // Create a map of baseline errors for quick lookup
    const baselineMap = new Map();
    baseline.errors.forEach(error => {
      // Create a unique identifier for each error
      const key = `${error.file}::${error.import}::${error.kind}`;
      baselineMap.set(key, error);
    });

    // Separate current errors into existing and new
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
   * Run the integrity check in baseline mode
   */
  run() {
    console.log('🔍 Starting module integrity check (baseline mode)...');
    
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
    
    console.log(`📊 Report written to: ${reportPath}`);
    
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

// Run the checker
const checker = new ModuleIntegrityChecker();
const success = checker.run();

// Exit with error code if NEW violations found
process.exit(success ? 0 : 1);