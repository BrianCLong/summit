#!/usr/bin/env node

/**
 * UX CI Enforcer
 * Validates all code changes against the authoritative UX doctrine
 * Blocks PRs/commits that violate UX governance decisions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Load UX Doctrine
const uxDoctrine = JSON.parse(fs.readFileSync('./ux-doctrine.json', 'utf8'));

class UXCIEnforcer {
  constructor() {
    this.violations = [];
    this.changes = this.getChangedFiles();
  }

  getChangedFiles() {
    try {
      // Get list of files changed in current commit/PR
      const changedFiles = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf-8' });
      return changedFiles.trim().split('\n').filter(f => f.length > 0);
    } catch (e) {
      console.log('Not in a git repository, checking all tracked files');
      const allFiles = execSync('git ls-files', { encoding: 'utf-8' });
      return allFiles.trim().split('\n').filter(f => f.length > 0);
    }
  }

  validate() {
    console.log('🔍 Running UX CI Enforcer...\n');

    // Validate each type of violation
    this.validateAccessibilityCompliance();
    this.validateCriticalActionPattern();
    this.validateDesignSystemConsistency();
    this.validateInformationHierarchy();
    this.validateTrustBoundaries();

    const report = {
      timestamp: new Date().toISOString(),
      violations: this.violations,
      filesChecked: this.changes.length
    };

    // Report results
    if (this.violations.length > 0) {
      console.log('\n❌ UX CI Enforcer found violations:');
      this.violations.forEach((violation, index) => {
        console.log(`${index + 1}. ${violation.type}: ${violation.message}`);
        console.log(`   File: ${violation.file}`);
        console.log(`   Severity: ${violation.severity}\n`);
      });
      
      console.log('⚠️  UX Violations detected! PR/Commit blocked.');
      fs.writeFileSync('ux-governance-report.json', JSON.stringify(report, null, 2));
      process.exit(1);
    } else {
      console.log('✅ All UX checks passed! No violations detected.');
      // Optionally write success report too
      fs.writeFileSync('ux-governance-report.json', JSON.stringify(report, null, 2));
      process.exit(0);
    }
  }

  validateAccessibilityCompliance() {
    // Check for accessibility violations in JSX/TSX files
    const jsxFiles = this.changes.filter(file => 
      (file.endsWith('.jsx') || file.endsWith('.tsx')) && 
      fs.existsSync(file)
    );

    jsxFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for missing alt attributes in images
      const imgWithoutAlt = /<img(?!\s+alt=)[^>]*>/g;
      const matches = content.match(imgWithoutAlt);
      if (matches) {
        this.violations.push({
          type: 'ACCESSIBILITY',
          message: `Image elements missing 'alt' attributes (${matches.length} instances)`,
          file: file,
          severity: 'P0'
        });
      }

      // Check for missing ARIA labels
      const interactiveWithoutAria = /<(button|input|select|textarea|a)[^>]*(?!aria-)[^>]*>/g;
      const ariaMatches = content.match(interactiveWithoutAria);
      if (ariaMatches) {
        this.violations.push({
          type: 'ACCESSIBILITY',
          message: `Interactive elements missing ARIA attributes (${ariaMatches.length} instances)`,
          file: file,
          severity: 'P0'
        });
      }
    });
  }

  validateCriticalActionPattern() {
    // Check for critical actions without proper confirmation
    const jsxFiles = this.changes.filter(file => 
      (file.endsWith('.jsx') || file.endsWith('.tsx')) && 
      fs.existsSync(file)
    );

    jsxFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Look for destructive operations without confirmation
      const destructiveActions = [
        /delete/i,
        /remove/i,
        /destroy/i,
        /erase/i,
        /clear/i,
        /reset/i
      ];
      
      for (const pattern of destructiveActions) {
        if (pattern.test(content) && !this.hasConfirmPattern(content)) {
          this.violations.push({
            type: 'CRITICAL_ACTION',
            message: `Critical action without proper confirmation pattern detected`,
            file: file,
            severity: 'P0'
          });
        }
      }
    });
  }

  hasConfirmPattern(content) {
    // Check if content has confirmation patterns (modal, dialog, etc.)
    return /confirm|dialog|modal|prompt|verification|warning/.test(content.toLowerCase());
  }

  validateDesignSystemConsistency() {
    // Check for mixed design system usage
    const jsxFiles = this.changes.filter(file => 
      (file.endsWith('.jsx') || file.endsWith('.tsx')) && 
      fs.existsSync(file)
    );

    jsxFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for mixed design system imports
      const hasMui = /@mui\/material/.test(content);
      const hasRadix = /@radix-ui/.test(content);
      const hasTailwind = /className=.*tw-/.test(content) || /className=.*\s+bg-/.test(content);
      
      if (hasMui && (hasRadix || hasTailwind)) {
        this.violations.push({
          type: 'DESIGN_SYSTEM',
          message: `Mixed design systems detected: MUI components used with Radix/Tailwind patterns`,
          file: file,
          severity: 'P1'
        });
      }
    });
  }

  validateInformationHierarchy() {
    // Check for dashboard information overload
    const jsxFiles = this.changes.filter(file => 
      (file.endsWith('.jsx') || file.endsWith('.tsx')) && 
      fs.existsSync(file) &&
      (file.includes('dashboard') || file.includes('Dashboard'))
    );

    jsxFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for excessive metrics/components in dashboards
      // Count number of visual components
      const componentCount = (content.match(/<\w+(?!\s+className=.*simplified)/g) || []).length;
      
      if (componentCount > 10) {  // Arbitrary threshold, adjust as needed
        this.violations.push({
          type: 'INFO_HIERARCHY',
          message: `Dashboard has ${componentCount} components (exceeds recommended limit of 10)`,
          file: file,
          severity: 'P1'
        });
      }
    });
  }

  validateTrustBoundaries() {
    // Check for oversimplified trust indicators
    const jsxFiles = this.changes.filter(file => 
      (file.endsWith('.jsx') || file.endsWith('.tsx')) && 
      fs.existsSync(file)
    );

    jsxFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Look for simple trust indicators without detail
      if (/(✅ Attested|trusted|secure)/i.test(content) && !this.hasTrustDetail(content)) {
        this.violations.push({
          type: 'TRUST_BOUNDARY',
          message: `Trust indicator without detailed information detected`,
          file: file,
          severity: 'P1'
        });
      }
    });
  }

  hasTrustDetail(content) {
    // Check if trust indicators include detailed information
    return /detail|status|verification|certificate|fingerprint|timestamp/.test(content.toLowerCase());
  }
}

// Run the enforcer
const enforcer = new UXCIEnforcer();
enforcer.validate();
