// tools/generate-soc-tests.js
import fs from 'fs/promises';
import path from 'path';

/**
 * Generator for SOC Control Unit Tests
 * Creates unit tests mapped to specific SOC 2 controls
 */
export class SocTestGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './server/__tests__/soc-controls';
    this.templateDir = options.templateDir || './templates/soc-tests';
    this.defaultTemplate = options.defaultTemplate || this.getDefaultTemplate();
    this.controls = options.controls || this.getDefaultControls();
  }

  /**
   * Get default SOC controls mapping
   */
  getDefaultControls() {
    return [
      {
        id: 'CC6.1',
        category: 'Communication and Information',
        description: 'Logical access security is performed in accordance with entity-defined procedures to meet the entity\'s objectives',
        tests: [
          {
            name: 'AuthenticationValidation',
            file: 'auth/auth-validation.test.ts',
            description: 'Validates user authentication against access controls'
          },
          {
            name: 'AuthorizationValidation', 
            file: 'auth/authz-validation.test.ts',
            description: 'Validates user authorization against permissions'
          }
        ]
      },
      {
        id: 'SC1.1',
        category: 'System Operations',
        description: 'Security operations are monitored and maintained',
        tests: [
          {
            name: 'SecurityEventMonitoring',
            file: 'security/event-monitoring.test.ts',
            description: 'Tests security event monitoring capabilities'
          }
        ]
      },
      {
        id: 'DC1.1',
        category: 'Data Processing and Storage',
        description: 'Data is protected in accordance with entity-defined procedures',
        tests: [
          {
            name: 'DataEncryption',
            file: 'crypto/encryption.test.ts',
            description: 'Tests data encryption at rest and in transit'
          },
          {
            name: 'DataAccessControl',
            file: 'data/access-control.test.ts',
            description: 'Tests data access controls and permissions'
          }
        ]
      },
      {
        id: 'CM2.1',
        category: 'Change Management',
        description: 'Changes to infrastructure, data, software, and procedures are authorized, designed, developed or acquired, configured, documented, tested, and approved to meet the entity\'s objectives',
        tests: [
          {
            name: 'CodeChangeValidation',
            file: 'change-management/validation.test.ts',
            description: 'Tests validation of code changes'
          },
          {
            name: 'DeploymentApproval',
            file: 'change-management/approval.test.ts',
            description: 'Tests approval workflow for deployments'
          }
        ]
      },
      {
        id: 'SC4.1',
        category: 'System Operations',
        description: 'Malware protection is implemented to meet the entity\'s objectives',
        tests: [
          {
            name: 'MalwareDetection',
            file: 'security/malware-detection.test.ts',
            description: 'Tests malware detection in file uploads'
          }
        ]
      }
    ];
  }

  /**
   * Get default test template
   */
  getDefaultTemplate() {
    return `// {{file}}
import { {{functionNames}} } from '{{importPath}}';

describe('{{controlId}} - {{description}}', () => {
  test('{{testName}}', async () => {
    // Verify control requirement: {{requirementDescription}}
    
    // TODO: Implement specific test logic
    const result = await {{primaryFunction}}();
    
    // Expected result validation
    expect(result).toBe(/* expected value */);
    
    // Add additional assertions as needed
    // expect(someMetric).toBeLessThan(threshold);
  });
  
  // Add additional test cases as needed
  test('should handle edge cases', async () => {
    // Test edge cases for control compliance
  });
});

// Evidence collection for audit trail
describe('{{controlId}} - Audit Compliance', () => {
  test('should generate appropriate audit logs', () => {
    // Verify that control operations are properly logged for audit
    // expect(auditLog).toContain('{{controlId}}');
  });
});
`;
  }

  /**
   * Generate tests for all mapped controls
   */
  async generateAllTests() {
    console.log('🚀 Starting SOC Control Test Generation...');
    
    // Create output directory
    await this.ensureDirectory(this.outputDir);
    
    let totalTests = 0;
    
    for (const control of this.controls) {
      console.log(\`\\n📋 Processing control: \${control.id}\`);
      
      for (const test of control.tests) {
        try {
          const testPath = path.join(this.outputDir, test.file);
          await this.ensureDirectory(path.dirname(testPath));
          
          const testContent = this.generateTestContent(control, test);
          await fs.writeFile(testPath, testContent);
          
          console.log(\`   ✅ Generated: \${test.file}\`);
          totalTests++;
        } catch (error) {
          console.error(\`   ❌ Failed to generate \${test.file}: \${error.message}\`);
        }
      }
    }
    
    console.log(\`\\n✅ Successfully generated \${totalTests} SOC control test files\`);
    console.log(\`📁 Tests created in: \${this.outputDir}\`);
    
    return totalTests;
  }

  /**
   * Generate content for a single test file
   */
  generateTestContent(control, test) {
    // Replace template variables
    const content = this.defaultTemplate
      .replace(/\{\{controlId\}\}/g, control.id)
      .replace(/\{\{category\}\}/g, control.category)
      .replace(/\{\{description\}\}/g, control.description)
      .replace(/\{\{testName\}\}/g, test.name)
      .replace(/\{\{file\}\}/g, test.file)
      .replace(/\{\{requirementDescription\}\}/g, test.description)
      .replace(/\{\{functionNames\}\}/g, 'functionPlaceholder')
      .replace(/\{\{importPath\}\}/g, '../src/placeholder')  
      .replace(/\{\{primaryFunction\}\}/g, 'placeholderFunction')
      .replace(/\{\{testPath\}\}/g, test.file);
    
    return content;
  }

  /**
   * Generate tests for a specific control ID
   */
  async generateTestsForControl(controlId) {
    const control = this.controls.find(c => c.id === controlId);
    
    if (!control) {
      throw new Error(\`Control \${controlId} not found in mapping\`);
    }
    
    console.log(\`📋 Generating tests for control: \${controlId}\`);
    
    for (const test of control.tests) {
      const testPath = path.join(this.outputDir, test.file);
      await this.ensureDirectory(path.dirname(testPath));
      
      const testContent = this.generateTestContent(control, test);
      await fs.writeFile(testPath, testContent);
      
      console.log(\`   ✅ Generated: \${test.file}\`);
    }
    
    return control.tests.length;
  }

  /**
   * Ensure directory exists, create if needed
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Validate control mapping structure
   */
  validateControls(controls = this.controls) {
    const errors = [];
    
    controls.forEach((control, idx) => {
      if (!control.id) errors.push(\`Control at index \${idx} missing ID\`);
      if (!control.category) errors.push(\`Control \${control.id} missing category\`);
      if (!control.description) errors.push(\`Control \${control.id} missing description\`);
      if (!Array.isArray(control.tests)) errors.push(\`Control \${control.id} tests not an array\`);
      else {
        control.tests.forEach((test, testIdx) => {
          if (!test.name) errors.push(\`Test at index \${testIdx} for control \${control.id} missing name\`);
          if (!test.file) errors.push(\`Test \${test.name} for control \${control.id} missing file\`);
          if (!test.description) errors.push(\`Test \${test.name} for control \${control.id} missing description\`);
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate a summary report of controls and tests
   */
  generateSummaryReport() {
    const summary = {
      totalControls: this.controls.length,
      totalTests: 0,
      controls: []
    };
    
    this.controls.forEach(control => {
      summary.totalTests += control.tests.length;
      summary.controls.push({
        id: control.id,
        category: control.category,
        description: control.description,
        testCount: control.tests.length,
        tests: control.tests.map(test => ({
          name: test.name,
          file: test.file,
          description: test.description
        }))
      });
    });
    
    return summary;
  }

  /**
   * Export mapping in JSON format
   */
  exportMapping(outputFile) {
    const mapping = this.generateSummaryReport();
    fs.writeFileSync(outputFile, JSON.stringify(mapping, null, 2));
    console.log(\`📋 Control mapping exported to: \${outputFile}\`);
  }

  /**
   * Update internal controls mapping
   */
  setControls(controls) {
    this.controls = controls;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const outputDir = args[0] || './server/__tests__/soc-controls';
  const exportMapping = args.includes('--export-mapping');
  const mappingFile = args.find(arg => arg.startsWith('--mapping='))?.split('=')[1] || './soc-control-mapping.json';

  console.log('🚀 Starting SOC Control Test Generator...');
  console.log(\`📋 Output directory: \${outputDir}\`);
  
  const generator = new SocTestGenerator({ outputDir });
  
  // Validate controls before generation
  const validation = generator.validateControls();
  if (!validation.isValid) {
    console.error('❌ Control mapping validation failed:');
    validation.errors.forEach(error => console.error(\`   - \${error}\`));
    process.exit(1);
  }
  
  generator.generateAllTests()
    .then(async (totalCount) => {
      if (exportMapping) {
        generator.exportMapping(mappingFile);
      }
      
      const summary = generator.generateSummaryReport();
      console.log('\\n📊 Generation Summary:');
      console.log(\`   Total Controls: \${summary.totalControls}\`);
      console.log(\`   Total Tests: \${summary.totalTests}\`);
      console.log(\`   Files Created: \${totalCount}\`);
      
      console.log('\\n✅ SOC Control Test Generation Completed!');
    })
    .catch(error => {
      console.error('❌ SOC Control Test Generation Failed:', error);
      process.exit(1);
    });
}