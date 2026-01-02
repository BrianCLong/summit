#!/usr/bin/env node
// tools/remove-dead-code.js
// Identifies and removes dead or demo-only UI paths/components

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

console.log('🗑️  Starting Dead Code Identification...');

// Configuration
const SOURCE_DIR = './client/src';
const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('-d');
const DELETE_DEAD = process.argv.includes('--delete') || process.argv.includes('-D');

// Patterns for demo/sample/unused components
const DEMO_PATTERNS = [
  /.*[\/]?(demo|sample|sandbox|playground|test|experiment).*\.(tsx|jsx)$/i,
  /.*[\/]?Test(Component|Page|View).*\.(tsx|jsx)$/i,
  /.*[\/]?(temp|draft|wip|stub|mock).*\.(tsx|jsx)$/i,
  /.*[\/]?(sandbox|playground).*\//i
];

// Patterns for potentially dead code
const DEAD_CODE_PATTERNS = [
  /.*[\/]?(deprecated|legacy|obsolete).*\.(tsx|jsx)$/i,
  /.*[\/]?(backup|copy|old).*\.(tsx|jsx)$/i,
  /.*\.backup\.(tsx|jsx)$/i,
  /.*\.old\.(tsx|jsx)$/i,
  /.*\.copy\.(tsx|jsx)$/i
];

// Find all React component files
const files = globSync(path.join(SOURCE_DIR, '**/*.{tsx,jsx}'));

console.log(`📋 Scanning ${files.length} files...`);

let deadFiles = [];
let demoFiles = [];

files.forEach(file => {
  const basename = path.basename(file);
  const fullRelativePath = path.relative(SOURCE_DIR, file);
  
  // Check if file matches demo patterns
  if (DEMO_PATTERNS.some(pattern => pattern.test(file))) {
    demoFiles.push({
      file: file,
      path: fullRelativePath,
      reason: 'Matches demo/sample pattern'
    });
  }
  
  // Check if file matches dead code patterns
  if (DEAD_CODE_PATTERNS.some(pattern => pattern.test(file))) {
    deadFiles.push({
      file: file,
      path: fullRelativePath,
      reason: 'Matches dead code pattern'
    });
  }
});

// Additional check: Components with no references
const unreferenced = findUnreferencedComponents(files, demoFiles.map(d => d.file));

// Combine all potentially removable files
const removableFiles = [
  ...demoFiles,
  ...deadFiles,
  ...unreferenced
];

console.log(`🔍 Analysis Results:`);
console.log(`   Demo files: ${demoFiles.length}`);
console.log(`   Dead code files: ${deadFiles.length}`);
console.log(`   Unreferenced components: ${unreferenced.length}`);
console.log(`   Total potentially removable: ${removableFiles.length}`);

// Show the files that match patterns
if (removableFiles.length > 0) {
  console.log('\n📁 Files identified for review:');
  removableFiles.forEach(({ file, reason }) => {
    console.log(`   - ${file} (${reason})`);
  });
  
  if (DELETE_DEAD && !DRY_RUN) {
    console.log('\n🗑️  Deleting files (with confirmation)...');
    removableFiles.forEach(({ file }) => {
      const confirmed = getUserConfirmation(`Delete ${file}? (y/N): `);
      if (confirmed) {
        try {
          fs.unlinkSync(file);
          console.log(`   ✅ Deleted: ${file}`);
        } catch (error) {
          console.error(`   ❌ Failed to delete ${file}: ${error.message}`);
        }
      }
    });
  } else if (DRY_RUN) {
    console.log('\n📋 DRY RUN: No files will be deleted with --dry-run flag');
  }
} else {
  console.log('\n✅ No dead or demo-only files found matching the patterns');
}

// Export a summary report
const report = {
  timestamp: new Date().toISOString(),
  sourceDir: SOURCE_DIR,
  totalFiles: files.length,
  demoFiles: demoFiles.map(f => f.path),
  deadCodeFiles: deadFiles.map(f => f.path),
  unreferencedFiles: unreferenced.map(f => f.path),
  totalRemovable: removableFiles.length,
  dryRun: DRY_RUN,
  deletionMode: DELETE_DEAD
};

fs.writeFileSync('./dead-code-report.json', JSON.stringify(report, null, 2));
console.log(`\n📊 Report saved to: dead-code-report.json`);

function findUnreferencedComponents(allFiles, excludedFiles) {
  console.log('🔍 Checking for unreferenced components...');
  
  // Get all imports/references in the codebase
  const allReferences = new Set();
  
  allFiles.forEach(file => {
    if (excludedFiles.includes(file)) return; // Skip files already identified as demo/dead
    
    const content = fs.readFileSync(file, 'utf8');
    
    // Find import statements
    const importMatches = [
      ...content.matchAll(/import\s+.*?\s+from\s+['"](.+?)['"]/g),
      ...content.matchAll(/import\s+['"](.+?)['"]/g),
      ...content.matchAll(/from\s+['"](.+?)['"]/g)
    ];
    
    importMatches.forEach(match => {
      let ref = match[1];
      
      // Convert relative paths to absolute for comparison
      if (ref.startsWith('.')) {
        const dir = path.dirname(file);
        ref = path.resolve(dir, ref).replace(/\\/g, '/');
      }
      
      // Add possible file extensions
      if (!ref.endsWith('.tsx') && !ref.endsWith('.jsx')) {
        allReferences.add(ref + '.tsx');
        allReferences.add(ref + '.jsx');
      } else {
        allReferences.add(ref);
      }
    });
  });
  
  // Find components that are defined but not imported/referenced
  const unreferenced = [];
  
  allFiles.forEach(file => {
    // Skip files already marked as demo/dead
    if (excludedFiles.includes(file)) return;
    
    const basenameNoExt = path.basename(file, path.extname(file));
    const filepath = file.replace(/\\/g, '/');
    
    // Check if this component's name appears in any import statements
    const isReferenced = Array.from(allReferences).some(ref => {
      return ref.includes(basenameNoExt) || 
             ref.includes(filepath) ||
             path.basename(ref, path.extname(ref)) === basenameNoExt;
    });
    
    if (!isReferenced) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Additional check: if the file only contains test-related code, mark as dead
      if (content.includes('test') && content.includes('it(') && content.includes('describe(')) {
        unreferenced.push({
          file: file,
          path: path.relative(SOURCE_DIR, file),
          reason: 'Unreferenced + test-related code'
        });
      } else {
        // For now, don't mark as dead just for being unreferenced - requires manual review
        console.log(`   💬 Unreferenced (not marked for removal): ${filepath} - review manually`);
      }
    }
  });
  
  return unreferenced;
}

// Helper function to get user confirmation (simplified for this script)
function getUserConfirmation(message) {
  console.log(message);
  return false; // Default to false in script - this would be interactive in real usage
}

console.log('\n✅ Dead Code Identification Complete!');
console.log(`   See full report in: dead-code-report.json`);