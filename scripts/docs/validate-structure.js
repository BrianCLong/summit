#!/usr/bin/env node

/**
 * Documentation Structure Validator
 * Validates documentation follows required structure and conventions
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

class DocumentationStructureValidator {
  constructor(docsPath = 'docs') {
    this.docsPath = docsPath;
    this.errors = [];
    this.warnings = [];

    // Required frontmatter fields
    this.requiredFields = [
      'title',
      'summary',
      'version',
      'lastUpdated',
      'owner',
    ];

    // Valid owner teams
    this.validOwners = [
      'docs',
      'api',
      'platform',
      'ml',
      'infra',
      'security',
      'ops',
      'product',
      'engineering',
      'support',
    ];

    // Required sections for different content types
    this.requiredSections = {
      'how-to': ['Prerequisites', 'Steps', 'Validation', 'Troubleshooting'],
      tutorial: ['Overview', 'Prerequisites', 'Next steps'],
      concept: ['Overview', 'Why it matters', 'How it works'],
      reference: ['Overview', 'Syntax', 'Examples'],
    };
  }

  /**
   * Validate overall documentation structure
   */
  async validate() {
    console.log('🔍 Validating documentation structure...');

    // Check directory structure
    this.validateDirectoryStructure();

    // Validate individual files
    await this.validateFiles();

    // Check for required top-level files
    this.validateRequiredFiles();

    // Validate navigation structure
    this.validateNavigation();

    // Generate report
    this.generateReport();

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
    };
  }

  /**
   * Validate directory structure follows conventions
   */
  validateDirectoryStructure() {
    console.log('  📁 Checking directory structure...');

    const requiredDirs = [
      'docs/getting-started',
      'docs/how-to',
      'docs/tutorials',
      'docs/concepts',
      'docs/reference',
      'docs/api',
      'docs/releases',
      'docs/governance',
    ];

    requiredDirs.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        this.errors.push(`Missing required directory: ${dir}`);
      }
    });

    // Check for deprecated directories
    const deprecatedDirs = ['docs/legacy', 'docs/old', 'docs/archived'];

    deprecatedDirs.forEach((dir) => {
      if (fs.existsSync(dir)) {
        this.warnings.push(`Deprecated directory found: ${dir}`);
      }
    });
  }

  /**
   * Validate individual documentation files
   */
  async validateFiles() {
    console.log('  📄 Validating individual files...');

    const files = this.getAllMarkdownFiles();

    for (const file of files) {
      await this.validateFile(file);
    }
  }

  /**
   * Validate a single documentation file
   */
  async validateFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = matter(content);

      // Validate frontmatter
      this.validateFrontmatter(filePath, parsed.data);

      // Validate content structure
      this.validateContent(filePath, parsed.content, parsed.data);

      // Validate markdown syntax
      this.validateMarkdownSyntax(filePath, content);
    } catch (error) {
      this.errors.push(`Failed to parse ${filePath}: ${error.message}`);
    }
  }

  /**
   * Validate frontmatter fields
   */
  validateFrontmatter(filePath, frontmatter) {
    // Check required fields
    this.requiredFields.forEach((field) => {
      if (!frontmatter[field]) {
        this.errors.push(
          `${filePath}: Missing required frontmatter field: ${field}`,
        );
      }
    });

    // Validate owner
    if (frontmatter.owner && !this.validOwners.includes(frontmatter.owner)) {
      this.errors.push(
        `${filePath}: Invalid owner '${frontmatter.owner}'. Must be one of: ${this.validOwners.join(', ')}`,
      );
    }

    // Validate lastUpdated format
    if (frontmatter.lastUpdated) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(frontmatter.lastUpdated)) {
        this.errors.push(
          `${filePath}: Invalid lastUpdated format. Use YYYY-MM-DD`,
        );
      } else {
        // Check if date is not too old (warn if > 6 months)
        const lastUpdated = new Date(frontmatter.lastUpdated);
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        if (lastUpdated < sixMonthsAgo) {
          this.warnings.push(
            `${filePath}: Content is more than 6 months old (${frontmatter.lastUpdated})`,
          );
        }
      }
    }

    // Validate version format
    if (frontmatter.version) {
      const validVersions = ['latest', 'deprecated', 'draft'];
      const semverRegex = /^\d+\.\d+\.\d+$/;

      if (
        !validVersions.includes(frontmatter.version) &&
        !semverRegex.test(frontmatter.version)
      ) {
        this.warnings.push(
          `${filePath}: Version should be 'latest', 'deprecated', 'draft', or semantic version (x.y.z)`,
        );
      }
    }
  }

  /**
   * Validate content structure based on document type
   */
  validateContent(filePath, content, frontmatter) {
    const contentType = this.detectContentType(filePath, frontmatter);

    // Check for required sections based on content type
    if (this.requiredSections[contentType]) {
      this.requiredSections[contentType].forEach((section) => {
        const sectionRegex = new RegExp(`^##\\s+${section}`, 'm');
        if (!sectionRegex.test(content)) {
          this.errors.push(
            `${filePath}: Missing required section '${section}' for ${contentType} content`,
          );
        }
      });
    }

    // Check for "See also" and "Next steps" sections (best practice)
    if (!content.includes('## See also') && !content.includes('##See also')) {
      this.warnings.push(
        `${filePath}: Consider adding a 'See also' section for better navigation`,
      );
    }

    if (
      !content.includes('## Next steps') &&
      !content.includes('##Next steps')
    ) {
      this.warnings.push(
        `${filePath}: Consider adding a 'Next steps' section to guide users`,
      );
    }

    // Validate heading hierarchy
    this.validateHeadingHierarchy(filePath, content);

    // Check for code blocks without language specification
    this.validateCodeBlocks(filePath, content);
  }

  /**
   * Detect content type based on file path and frontmatter
   */
  detectContentType(filePath, frontmatter) {
    if (frontmatter.type) {
      return frontmatter.type;
    }

    if (filePath.includes('/how-to/')) return 'how-to';
    if (filePath.includes('/tutorials/')) return 'tutorial';
    if (filePath.includes('/concepts/')) return 'concept';
    if (filePath.includes('/reference/')) return 'reference';

    return 'general';
  }

  /**
   * Validate heading hierarchy (h1 -> h2 -> h3, etc.)
   */
  validateHeadingHierarchy(filePath, content) {
    const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
    let lastLevel = 0;

    headings.forEach((heading, index) => {
      const level = heading.match(/^#+/)[0].length;

      if (level > lastLevel + 1) {
        this.warnings.push(
          `${filePath}: Heading hierarchy skip detected at line with '${heading.trim()}'. Consider using h${lastLevel + 1} instead of h${level}`,
        );
      }

      lastLevel = level;
    });
  }

  /**
   * Validate code blocks have language specification
   */
  validateCodeBlocks(filePath, content) {
    const codeBlockRegex = /```\s*\n/g;
    let match;
    let lineNumber = 1;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Count line numbers up to this match
      const beforeMatch = content.substring(0, match.index);
      lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

      this.warnings.push(
        `${filePath}:${lineNumber}: Code block without language specification. Consider adding language for syntax highlighting`,
      );
    }
  }

  /**
   * Validate markdown syntax issues
   */
  validateMarkdownSyntax(filePath, content) {
    // Check for common markdown issues

    // Unmatched brackets
    const openBrackets = (content.match(/\[/g) || []).length;
    const closeBrackets = (content.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      this.errors.push(`${filePath}: Unmatched square brackets detected`);
    }

    // Unmatched parentheses in links
    const openParens = (content.match(/\]\(/g) || []).length;
    const closeParens =
      (content.match(/\)\s/g) || []).length +
      (content.match(/\)$/gm) || []).length;
    if (openParens > closeParens) {
      this.warnings.push(
        `${filePath}: Possible unmatched parentheses in links`,
      );
    }

    // Check for empty links
    if (content.includes('[]()') || content.includes('[](')) {
      this.errors.push(`${filePath}: Empty links detected`);
    }

    // Check for missing alt text in images
    const imageRegex = /!\[\]\(/g;
    if (imageRegex.test(content)) {
      this.errors.push(
        `${filePath}: Images missing alt text for accessibility`,
      );
    }
  }

  /**
   * Check for required top-level files
   */
  validateRequiredFiles() {
    console.log('  📋 Checking required files...');

    const requiredFiles = [
      'docs/README.md',
      'docs/getting-started/index.md',
      'docs/governance/documentation-charter.md',
      'docs/_meta/features.yml',
    ];

    requiredFiles.forEach((file) => {
      if (!fs.existsSync(file)) {
        this.errors.push(`Missing required file: ${file}`);
      }
    });
  }

  /**
   * Validate navigation structure
   */
  validateNavigation() {
    console.log('  🧭 Validating navigation structure...');

    const sidebarPath = 'docs-site/sidebars.js';
    if (!fs.existsSync(sidebarPath)) {
      this.errors.push('Missing sidebars.js configuration');
      return;
    }

    try {
      const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

      // Basic validation - check for required sections
      const requiredSections = [
        'getting-started',
        'tutorials',
        'how-to',
        'concepts',
        'reference',
        'api',
      ];

      requiredSections.forEach((section) => {
        if (!sidebarContent.includes(section)) {
          this.warnings.push(`Sidebar missing section: ${section}`);
        }
      });
    } catch (error) {
      this.errors.push(`Failed to validate sidebar: ${error.message}`);
    }
  }

  /**
   * Get all markdown files in documentation
   */
  getAllMarkdownFiles() {
    const files = [];

    const walkDir = (dir) => {
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

    if (fs.existsSync(this.docsPath)) {
      walkDir(this.docsPath);
    }

    return files;
  }

  /**
   * Generate validation report
   */
  generateReport() {
    console.log('\n📊 Structure Validation Report');
    console.log('================================');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All validation checks passed!');
      return;
    }

    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Warnings (${this.warnings.length}):`);
      this.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }

    // Generate JSON report for CI
    const report = {
      timestamp: new Date().toISOString(),
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        passed: this.errors.length === 0,
      },
    };

    fs.writeFileSync(
      'docs-structure-report.json',
      JSON.stringify(report, null, 2),
    );
    console.log('\n📄 Detailed report saved to docs-structure-report.json');
  }
}

// CLI execution
if (require.main === module) {
  const docsPath = process.argv[2] || 'docs';

  // Ensure required dependencies are available
  try {
    require('gray-matter');
  } catch (error) {
    console.error('❌ Missing dependency: gray-matter');
    console.error('Install with: npm install gray-matter');
    process.exit(1);
  }

  const validator = new DocumentationStructureValidator(docsPath);

  validator
    .validate()
    .then((result) => {
      if (!result.success) {
        console.error(
          `\n❌ Validation failed with ${result.errors.length} errors`,
        );
        process.exit(1);
      } else {
        console.log('\n✅ Documentation structure validation passed!');
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    });
}

module.exports = DocumentationStructureValidator;
