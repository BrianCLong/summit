#!/usr/bin/env node

/**
 * Feature Coverage Verification Script
 * Validates that all features have required documentation artifacts
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class FeatureCoverageValidator {
  constructor(featuresPath = 'docs/_meta/features.yml', docsPath = 'docs') {
    this.featuresPath = featuresPath;
    this.docsPath = docsPath;
    this.errors = [];
    this.warnings = [];
    this.stats = {
      totalFeatures: 0,
      coveredFeatures: 0,
      missingArtifacts: 0,
      optionalMissing: 0,
    };
  }

  /**
   * Validate feature documentation coverage
   */
  async validate() {
    console.log('🔍 Validating feature documentation coverage...');

    // Load and validate features configuration
    const featuresConfig = this.loadFeaturesConfig();
    if (!featuresConfig) return { success: false };

    // Validate each feature's documentation
    this.validateFeatures(featuresConfig);

    // Check for orphaned documentation
    this.findOrphanedDocs(featuresConfig);

    // Generate coverage report
    this.generateCoverageReport();

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      stats: this.stats,
      coveragePercentage: this.calculateCoveragePercentage(),
    };
  }

  /**
   * Load and validate features configuration
   */
  loadFeaturesConfig() {
    try {
      if (!fs.existsSync(this.featuresPath)) {
        this.errors.push(
          `Features configuration not found: ${this.featuresPath}`,
        );
        return null;
      }

      const content = fs.readFileSync(this.featuresPath, 'utf8');
      const config = yaml.load(content);

      // Validate configuration structure
      this.validateConfigStructure(config);

      return config;
    } catch (error) {
      this.errors.push(`Failed to load features config: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate features configuration structure
   */
  validateConfigStructure(config) {
    const requiredFields = ['features', 'validationRules', 'qualityThresholds'];

    requiredFields.forEach((field) => {
      if (!config[field]) {
        this.errors.push(`Missing required field in features config: ${field}`);
      }
    });

    if (!config.features || !Array.isArray(config.features)) {
      this.errors.push('Features must be an array');
      return;
    }

    // Validate individual features
    config.features.forEach((feature, index) => {
      this.validateFeatureStructure(feature, index);
    });
  }

  /**
   * Validate individual feature structure
   */
  validateFeatureStructure(feature, index) {
    const requiredFields = [
      'id',
      'name',
      'category',
      'status',
      'owners',
      'priority',
    ];

    requiredFields.forEach((field) => {
      if (!feature[field]) {
        this.errors.push(`Feature ${index}: Missing required field: ${field}`);
      }
    });

    if (!feature.docs || typeof feature.docs !== 'object') {
      this.errors.push(
        `Feature ${feature.id}: Missing or invalid docs configuration`,
      );
    }
  }

  /**
   * Validate documentation coverage for all features
   */
  validateFeatures(config) {
    this.stats.totalFeatures = config.features.length;

    config.features.forEach((feature) => {
      const coverage = this.validateFeatureCoverage(
        feature,
        config.validationRules,
      );
      if (coverage.hasRequiredDocs) {
        this.stats.coveredFeatures++;
      }
    });
  }

  /**
   * Validate documentation coverage for a single feature
   */
  validateFeatureCoverage(feature, validationRules) {
    console.log(
      `  📋 Validating ${feature.id} (${feature.status}, ${feature.priority})`,
    );

    const coverage = {
      hasRequiredDocs: true,
      requiredDocs: [],
      missingRequired: [],
      missingOptional: [],
      existingDocs: [],
    };

    // Determine required documentation based on status and priority
    const requiredDocs = this.getRequiredDocs(feature, validationRules);
    const recommendedDocs = this.getRecommendedDocs(feature, validationRules);

    coverage.requiredDocs = requiredDocs;

    // Check required documentation
    requiredDocs.forEach((docType) => {
      const docPath = feature.docs[docType];

      if (!docPath) {
        this.errors.push(
          `${feature.id}: Missing required ${docType} documentation`,
        );
        coverage.missingRequired.push(docType);
        coverage.hasRequiredDocs = false;
        this.stats.missingArtifacts++;
      } else {
        const fullPath = path.join(this.docsPath, docPath);
        if (!fs.existsSync(fullPath)) {
          this.errors.push(
            `${feature.id}: ${docType} file not found: ${fullPath}`,
          );
          coverage.missingRequired.push(docType);
          coverage.hasRequiredDocs = false;
          this.stats.missingArtifacts++;
        } else {
          coverage.existingDocs.push({ type: docType, path: docPath });
          this.validateDocumentContent(fullPath, feature, docType);
        }
      }
    });

    // Check recommended documentation
    recommendedDocs.forEach((docType) => {
      const docPath = feature.docs[docType];

      if (!docPath) {
        this.warnings.push(
          `${feature.id}: Missing recommended ${docType} documentation`,
        );
        coverage.missingOptional.push(docType);
        this.stats.optionalMissing++;
      } else {
        const fullPath = path.join(this.docsPath, docPath);
        if (!fs.existsSync(fullPath)) {
          this.warnings.push(
            `${feature.id}: ${docType} file not found: ${fullPath}`,
          );
          coverage.missingOptional.push(docType);
          this.stats.optionalMissing++;
        } else {
          coverage.existingDocs.push({ type: docType, path: docPath });
        }
      }
    });

    return coverage;
  }

  /**
   * Get required documentation types for a feature
   */
  getRequiredDocs(feature, validationRules) {
    const statusRequirements = validationRules.statusRequirements[
      feature.status
    ] || { required: [] };
    const priorityRequirements = validationRules.priorityRequirements[
      feature.priority
    ] || { required: [] };

    // Combine status and priority requirements
    const required = new Set([
      ...statusRequirements.required,
      ...priorityRequirements.required,
    ]);

    return Array.from(required);
  }

  /**
   * Get recommended documentation types for a feature
   */
  getRecommendedDocs(feature, validationRules) {
    const statusRequirements = validationRules.statusRequirements[
      feature.status
    ] || { recommended: [] };
    const priorityRequirements = validationRules.priorityRequirements[
      feature.priority
    ] || { recommended: [] };

    // Combine status and priority recommendations
    const recommended = new Set([
      ...statusRequirements.recommended,
      ...priorityRequirements.recommended,
    ]);

    return Array.from(recommended);
  }

  /**
   * Validate content of a documentation file
   */
  validateDocumentContent(filePath, feature, docType) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');

      // Check for frontmatter
      if (!content.startsWith('---')) {
        this.warnings.push(
          `${feature.id}: ${docType} missing frontmatter: ${filePath}`,
        );
      }

      // Check for feature mentions
      if (!content.includes(feature.name) && !content.includes(feature.id)) {
        this.warnings.push(
          `${feature.id}: ${docType} doesn't mention feature name or ID: ${filePath}`,
        );
      }

      // Validate code examples for features that require them
      if (feature.validation && feature.validation.codeExamples) {
        if (!content.includes('```')) {
          this.warnings.push(
            `${feature.id}: ${docType} missing code examples: ${filePath}`,
          );
        }
      }

      // Check for validation requirements
      if (feature.validation) {
        this.validateFeatureValidationRequirements(
          feature,
          docType,
          content,
          filePath,
        );
      }
    } catch (error) {
      this.errors.push(
        `${feature.id}: Failed to validate ${docType} content: ${error.message}`,
      );
    }
  }

  /**
   * Validate feature-specific validation requirements
   */
  validateFeatureValidationRequirements(feature, docType, content, filePath) {
    const validation = feature.validation;

    // API testing requirements
    if (validation.apiTesting && docType === 'reference') {
      if (!content.includes('API') && !content.includes('endpoint')) {
        this.warnings.push(
          `${feature.id}: API documentation missing API/endpoint references: ${filePath}`,
        );
      }
    }

    // Security testing requirements
    if (validation.securityTesting && docType === 'howto') {
      const securityTerms = [
        'security',
        'authentication',
        'authorization',
        'permissions',
      ];
      const hasSecurityContent = securityTerms.some((term) =>
        content.toLowerCase().includes(term.toLowerCase()),
      );

      if (!hasSecurityContent) {
        this.warnings.push(
          `${feature.id}: Security-sensitive feature missing security guidance: ${filePath}`,
        );
      }
    }

    // Compliance testing requirements
    if (validation.complianceTesting && docType === 'concept') {
      const complianceTerms = [
        'compliance',
        'regulation',
        'audit',
        'governance',
      ];
      const hasComplianceContent = complianceTerms.some((term) =>
        content.toLowerCase().includes(term.toLowerCase()),
      );

      if (!hasComplianceContent) {
        this.warnings.push(
          `${feature.id}: Compliance-related feature missing compliance guidance: ${filePath}`,
        );
      }
    }
  }

  /**
   * Find documentation not linked to any feature
   */
  findOrphanedDocs(config) {
    console.log('  🔍 Checking for orphaned documentation...');

    const linkedDocs = new Set();

    // Collect all linked documentation paths
    config.features.forEach((feature) => {
      if (feature.docs) {
        Object.values(feature.docs).forEach((docPath) => {
          if (docPath) {
            linkedDocs.add(docPath);
          }
        });
      }
    });

    // Find documentation files not linked to features
    const allDocs = this.getAllDocumentationFiles();
    const orphanedDocs = allDocs.filter((docPath) => {
      const relativePath = path.relative(this.docsPath, docPath);
      return !linkedDocs.has(relativePath) && this.shouldBeLinked(relativePath);
    });

    if (orphanedDocs.length > 0) {
      this.warnings.push(
        `Found ${orphanedDocs.length} potentially orphaned documentation files`,
      );
      orphanedDocs.forEach((docPath) => {
        this.warnings.push(`Orphaned: ${docPath}`);
      });
    }
  }

  /**
   * Check if a document should be linked to a feature
   */
  shouldBeLinked(relativePath) {
    // Exclude certain directories and files that don't need to be linked
    const excludePatterns = [
      /^governance\//,
      /^_meta\//,
      /^_templates\//,
      /README\.md$/,
      /index\.md$/,
      /^releases\//,
    ];

    return !excludePatterns.some((pattern) => pattern.test(relativePath));
  }

  /**
   * Get all documentation files
   */
  getAllDocumentationFiles() {
    const files = [];

    const walkDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      items.forEach((item) => {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          walkDir(itemPath);
        } else if (item.endsWith('.md') || item.endsWith('.mdx')) {
          files.push(itemPath);
        }
      });
    };

    walkDir(this.docsPath);
    return files;
  }

  /**
   * Calculate overall coverage percentage
   */
  calculateCoveragePercentage() {
    if (this.stats.totalFeatures === 0) return 0;
    return Math.round(
      (this.stats.coveredFeatures / this.stats.totalFeatures) * 100,
    );
  }

  /**
   * Generate comprehensive coverage report
   */
  generateCoverageReport() {
    const coveragePercentage = this.calculateCoveragePercentage();

    console.log('\n📊 Feature Documentation Coverage Report');
    console.log('==========================================');

    console.log(`\n📈 Coverage Statistics:`);
    console.log(`  Total Features: ${this.stats.totalFeatures}`);
    console.log(`  Covered Features: ${this.stats.coveredFeatures}`);
    console.log(`  Coverage Percentage: ${coveragePercentage}%`);
    console.log(`  Missing Required Artifacts: ${this.stats.missingArtifacts}`);
    console.log(`  Missing Optional Artifacts: ${this.stats.optionalMissing}`);

    if (this.errors.length > 0) {
      console.log(`\n❌ Critical Issues (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.slice(0, 10).forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });

      if (this.warnings.length > 10) {
        console.log(`  ... and ${this.warnings.length - 10} more warnings`);
      }
    }

    // Generate detailed JSON report
    const report = {
      timestamp: new Date().toISOString(),
      coverage: {
        percentage: coveragePercentage,
        totalFeatures: this.stats.totalFeatures,
        coveredFeatures: this.stats.coveredFeatures,
        missingArtifacts: this.stats.missingArtifacts,
        missingOptional: this.stats.optionalMissing,
      },
      errors: this.errors,
      warnings: this.warnings,
      status: this.errors.length === 0 ? 'PASS' : 'FAIL',
    };

    fs.writeFileSync(
      'feature-coverage-report.json',
      JSON.stringify(report, null, 2),
    );
    console.log('\n📄 Detailed report saved to feature-coverage-report.json');

    // Generate coverage badge data
    this.generateCoverageBadge(coveragePercentage);
  }

  /**
   * Generate coverage badge data
   */
  generateCoverageBadge(percentage) {
    const badgeColor =
      percentage >= 95
        ? 'brightgreen'
        : percentage >= 85
          ? 'green'
          : percentage >= 70
            ? 'yellow'
            : percentage >= 50
              ? 'orange'
              : 'red';

    const badgeData = {
      schemaVersion: 1,
      label: 'docs coverage',
      message: `${percentage}%`,
      color: badgeColor,
    };

    fs.writeFileSync('coverage-badge.json', JSON.stringify(badgeData, null, 2));
  }
}

// CLI execution
if (require.main === module) {
  const featuresPath = process.argv[2] || 'docs/_meta/features.yml';
  const docsPath = process.argv[3] || 'docs';

  // Ensure required dependencies are available
  try {
    require('js-yaml');
  } catch (error) {
    console.error('❌ Missing dependency: js-yaml');
    console.error('Install with: npm install js-yaml');
    process.exit(1);
  }

  const validator = new FeatureCoverageValidator(featuresPath, docsPath);

  validator
    .validate()
    .then((result) => {
      const threshold = 85; // Minimum coverage threshold

      if (!result.success || result.coveragePercentage < threshold) {
        console.error(`\n❌ Feature coverage validation failed`);
        console.error(
          `Coverage: ${result.coveragePercentage}% (minimum: ${threshold}%)`,
        );
        process.exit(1);
      } else {
        console.log(`\n✅ Feature coverage validation passed!`);
        console.log(`Coverage: ${result.coveragePercentage}%`);
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = FeatureCoverageValidator;
