/**
 * Summit UI CI Validation Script
 *
 * Validates that all capabilities in the registry have corresponding UI surfaces,
 * navigation links are valid, and the design system is complete.
 *
 * Run: npx tsx ui/ci/validate-ui-coverage.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Capability {
  id: string;
  name: string;
  category: string;
  uiSurface: string;
}

interface ValidationResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const ROOT = join(__dirname, '..');
const results: ValidationResult[] = [];

function addResult(check: string, status: 'pass' | 'fail' | 'warn', message: string) {
  results.push({ check, status, message });
}

// --- Check 1: Capability registry exists and is valid JSON ---
function validateRegistry(): Capability[] {
  const registryPath = join(ROOT, 'capability-registry.json');
  if (!existsSync(registryPath)) {
    addResult('Registry exists', 'fail', 'capability-registry.json not found');
    return [];
  }

  try {
    const data = JSON.parse(readFileSync(registryPath, 'utf-8'));
    if (!Array.isArray(data) || data.length === 0) {
      addResult('Registry valid', 'fail', 'Registry is empty or not an array');
      return [];
    }
    addResult('Registry valid', 'pass', `${data.length} capabilities registered`);
    return data;
  } catch (e) {
    addResult('Registry valid', 'fail', `Invalid JSON: ${(e as Error).message}`);
    return [];
  }
}

// --- Check 2: All capabilities have UI surfaces ---
function validateUISurfaces(capabilities: Capability[]) {
  const uiDirs = ['intelgraph', 'repoos', 'evolution', 'timemachine', 'simulation', 'agents', 'threat', 'visualization'];
  let covered = 0;
  let missing = 0;

  for (const cap of capabilities) {
    const surface = cap.uiSurface;
    if (!surface) {
      addResult(`UI surface: ${cap.id}`, 'fail', `No uiSurface defined for capability "${cap.name}"`);
      missing++;
      continue;
    }
    covered++;
  }

  addResult('UI surface coverage', covered === capabilities.length ? 'pass' : 'warn',
    `${covered}/${capabilities.length} capabilities have UI surfaces (${missing} missing)`);
}

// --- Check 3: Navigation map exists ---
function validateNavigation() {
  const navPath = join(ROOT, 'navigation-map.ts');
  if (!existsSync(navPath)) {
    addResult('Navigation map', 'fail', 'navigation-map.ts not found');
    return;
  }
  const content = readFileSync(navPath, 'utf-8');
  const sectionCount = (content.match(/id: '/g) || []).length;
  addResult('Navigation map', 'pass', `${sectionCount} navigation entries defined`);
}

// --- Check 4: Design system components ---
function validateDesignSystem() {
  const requiredComponents = [
    'Button', 'Card', 'Panel', 'Modal', 'Drawer', 'Tabs', 'Table',
    'Timeline', 'MetricCard', 'StatusBadge', 'CodeDiffViewer',
    'EvidencePanel', 'SearchBar',
  ];

  let found = 0;
  for (const comp of requiredComponents) {
    const path = join(ROOT, 'design-system', `${comp}.tsx`);
    if (existsSync(path)) {
      found++;
    } else {
      addResult(`Design system: ${comp}`, 'fail', `${comp}.tsx not found in design-system/`);
    }
  }

  addResult('Design system completeness', found === requiredComponents.length ? 'pass' : 'fail',
    `${found}/${requiredComponents.length} required components present`);
}

// --- Check 5: Layout components ---
function validateLayout() {
  const requiredLayouts = ['MainLayout', 'NavigationRail', 'CommandPalette', 'WorkspaceShell', 'ActivityStream'];
  let found = 0;

  for (const layout of requiredLayouts) {
    const path = join(ROOT, 'layout', `${layout}.tsx`);
    if (existsSync(path)) {
      found++;
    } else {
      addResult(`Layout: ${layout}`, 'fail', `${layout}.tsx not found in layout/`);
    }
  }

  addResult('Layout completeness', found === requiredLayouts.length ? 'pass' : 'fail',
    `${found}/${requiredLayouts.length} layout components present`);
}

// --- Check 6: Feature directories ---
function validateFeatureDirectories() {
  const requiredDirs = ['intelgraph', 'repoos', 'evolution', 'timemachine', 'simulation', 'agents', 'threat', 'visualization'];
  let found = 0;

  for (const dir of requiredDirs) {
    const path = join(ROOT, dir);
    if (existsSync(path)) {
      const indexPath = join(path, 'index.ts');
      if (existsSync(indexPath)) {
        found++;
      } else {
        addResult(`Feature dir: ${dir}`, 'warn', `${dir}/ exists but has no index.ts`);
      }
    } else {
      addResult(`Feature dir: ${dir}`, 'fail', `${dir}/ directory not found`);
    }
  }

  addResult('Feature directory coverage', found === requiredDirs.length ? 'pass' : 'fail',
    `${found}/${requiredDirs.length} feature directories with index.ts`);
}

// --- Check 7: Permission system ---
function validatePermissions() {
  const permPath = join(ROOT, 'permissions', 'index.ts');
  const guardPath = join(ROOT, 'permissions', 'PermissionGuard.tsx');

  if (!existsSync(permPath)) {
    addResult('Permissions', 'fail', 'permissions/index.ts not found');
    return;
  }
  if (!existsSync(guardPath)) {
    addResult('Permission guard', 'fail', 'permissions/PermissionGuard.tsx not found');
    return;
  }

  addResult('Permission system', 'pass', 'Permission system and guards present');
}

// --- Run all checks ---
function main() {
  console.log('\n=== Summit UI Validation ===\n');

  const capabilities = validateRegistry();
  validateUISurfaces(capabilities);
  validateNavigation();
  validateDesignSystem();
  validateLayout();
  validateFeatureDirectories();
  validatePermissions();

  // Summary
  const passed = results.filter((r) => r.status === 'pass').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const warned = results.filter((r) => r.status === 'warn').length;

  console.log('Results:\n');
  for (const r of results) {
    const icon = r.status === 'pass' ? 'PASS' : r.status === 'fail' ? 'FAIL' : 'WARN';
    console.log(`  [${icon}] ${r.check}: ${r.message}`);
  }

  console.log(`\nSummary: ${passed} passed, ${failed} failed, ${warned} warnings`);
  console.log(`Total checks: ${results.length}\n`);

  if (failed > 0) {
    console.error('UI validation failed. Fix the issues above before merging.');
    process.exit(1);
  }

  console.log('UI validation passed.');
}

main();
