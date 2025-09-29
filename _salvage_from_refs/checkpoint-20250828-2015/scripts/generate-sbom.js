#!/usr/bin/env node

/**
 * SBOM (Software Bill of Materials) Generator
 * Generates CycloneDX format SBOM for supply chain security
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class SBOMGenerator {
  constructor() {
    this.packageJson = this.loadPackageJson();
    this.sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      serialNumber: `urn:uuid:${this.generateUUID()}`,
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [{
          vendor: 'IntelGraph',
          name: 'SBOM Generator',
          version: '1.0.0'
        }],
        component: {
          type: 'application',
          'bom-ref': 'intelgraph-platform',
          name: 'IntelGraph Intelligence Platform',
          version: this.packageJson.version || '1.0.0',
          description: 'AI-powered intelligence analysis platform',
          hashes: [],
          licenses: [],
          supplier: {
            name: 'IntelGraph Inc.',
            url: ['https://intelgraph.com']
          }
        }
      },
      components: [],
      dependencies: [],
      vulnerabilities: [],
      compositions: []
    };
  }

  /**
   * Generate complete SBOM
   */
  async generateSBOM() {
    console.log('🔍 Analyzing dependencies...');
    
    // Add npm dependencies
    await this.addNpmDependencies();
    
    // Add system dependencies
    await this.addSystemDependencies();
    
    // Add container base image info if applicable
    await this.addContainerInfo();
    
    // Generate dependency relationships
    this.generateDependencyGraph();
    
    // Add vulnerability scan results
    await this.addVulnerabilities();
    
    // Add build metadata
    this.addBuildMetadata();
    
    // Calculate component hashes
    await this.calculateHashes();
    
    console.log(`📦 Generated SBOM with ${this.sbom.components.length} components`);
    return this.sbom;
  }

  /**
   * Add npm dependencies
   */
  async addNpmDependencies() {
    const packageJson = this.packageJson;
    const packageLock = this.loadPackageLock();
    
    // Process production dependencies
    if (packageJson.dependencies) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        const component = await this.createNpmComponent(name, version, packageLock, false);
        if (component) this.sbom.components.push(component);
      }
    }
    
    // Process dev dependencies (mark as optional)
    if (packageJson.devDependencies) {
      for (const [name, version] of Object.entries(packageJson.devDependencies)) {
        const component = await this.createNpmComponent(name, version, packageLock, true);
        if (component) this.sbom.components.push(component);
      }
    }
  }

  /**
   * Create npm component entry
   */
  async createNpmComponent(name, version, packageLock, isDev = false) {
    try {
      const lockEntry = packageLock?.dependencies?.[name];
      const resolvedVersion = lockEntry?.version || version;
      
      // Get package info
      let packageInfo = {};
      try {
        const packagePath = path.join('node_modules', name, 'package.json');
        if (fs.existsSync(packagePath)) {
          packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        }
      } catch (error) {
        console.warn(`⚠️  Could not read package info for ${name}`);
      }

      const component = {
        type: 'library',
        'bom-ref': `npm:${name}@${resolvedVersion}`,
        name: name,
        version: resolvedVersion,
        scope: isDev ? 'optional' : 'required',
        description: packageInfo.description || '',
        hashes: [],
        licenses: this.extractLicenses(packageInfo),
        purl: `pkg:npm/${name}@${resolvedVersion}`,
        externalReferences: []
      };

      // Add repository info
      if (packageInfo.repository) {
        component.externalReferences.push({
          type: 'vcs',
          url: this.normalizeRepoUrl(packageInfo.repository)
        });
      }

      // Add homepage
      if (packageInfo.homepage) {
        component.externalReferences.push({
          type: 'website',
          url: packageInfo.homepage
        });
      }

      // Add npm registry reference
      component.externalReferences.push({
        type: 'distribution',
        url: `https://registry.npmjs.org/${name}/-/${name}-${resolvedVersion}.tgz`
      });

      return component;
    } catch (error) {
      console.error(`❌ Error processing ${name}:`, error.message);
      return null;
    }
  }

  /**
   * Add system dependencies
   */
  async addSystemDependencies() {
    const systemDeps = [
      { name: 'nodejs', version: process.version, type: 'runtime' },
      { name: 'npm', version: this.getNpmVersion(), type: 'build-tool' }
    ];

    // Check for additional system tools
    const tools = ['docker', 'git', 'kubectl'];
    for (const tool of tools) {
      try {
        const version = execSync(`${tool} --version`, { encoding: 'utf8', timeout: 5000 }).trim();
        systemDeps.push({ name: tool, version, type: 'build-tool' });
      } catch (error) {
        // Tool not available, skip
      }
    }

    systemDeps.forEach(dep => {
      this.sbom.components.push({
        type: 'application',
        'bom-ref': `system:${dep.name}@${dep.version}`,
        name: dep.name,
        version: dep.version,
        scope: 'required',
        description: `System ${dep.type}`,
        licenses: [],
        externalReferences: []
      });
    });
  }

  /**
   * Add container information
   */
  async addContainerInfo() {
    try {
      // Check if we're in a container or have a Dockerfile
      if (fs.existsSync('Dockerfile')) {
        const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
        
        // Extract FROM statements
        const fromMatches = dockerfile.match(/FROM\s+([^\s\n]+)/g);
        if (fromMatches) {
          fromMatches.forEach(fromLine => {
            const image = fromLine.replace('FROM ', '').trim();
            const [imageName, tag] = image.split(':');
            
            this.sbom.components.push({
              type: 'container',
              'bom-ref': `container:${image}`,
              name: imageName,
              version: tag || 'latest',
              scope: 'required',
              description: 'Container base image',
              licenses: [],
              purl: `pkg:docker/${imageName}@${tag || 'latest'}`,
              externalReferences: [{
                type: 'distribution',
                url: `https://hub.docker.com/_/${imageName}`
              }]
            });
          });
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not analyze container information:', error.message);
    }
  }

  /**
   * Generate dependency relationships
   */
  generateDependencyGraph() {
    const packageLock = this.loadPackageLock();
    
    if (packageLock?.dependencies) {
      for (const [name, info] of Object.entries(packageLock.dependencies)) {
        const dependsOn = [];
        
        if (info.requires) {
          for (const depName of Object.keys(info.requires)) {
            const depVersion = packageLock.dependencies[depName]?.version || 'unknown';
            dependsOn.push(`npm:${depName}@${depVersion}`);
          }
        }

        if (dependsOn.length > 0) {
          this.sbom.dependencies.push({
            ref: `npm:${name}@${info.version}`,
            dependsOn
          });
        }
      }
    }

    // Add main application dependencies
    const mainAppDeps = this.sbom.components
      .filter(c => c.scope === 'required' && c.type === 'library')
      .map(c => c['bom-ref']);

    if (mainAppDeps.length > 0) {
      this.sbom.dependencies.push({
        ref: 'intelgraph-platform',
        dependsOn: mainAppDeps
      });
    }
  }

  /**
   * Add vulnerability information
   */
  async addVulnerabilities() {
    try {
      // Run npm audit if available
      const auditResult = execSync('npm audit --json', { encoding: 'utf8', timeout: 30000 });
      const audit = JSON.parse(auditResult);
      
      if (audit.vulnerabilities) {
        for (const [packageName, vulnInfo] of Object.entries(audit.vulnerabilities)) {
          const component = this.sbom.components.find(c => c.name === packageName);
          if (component && vulnInfo.severity) {
            this.sbom.vulnerabilities.push({
              'bom-ref': `vuln:${packageName}:${vulnInfo.name || 'unknown'}`,
              id: vulnInfo.name || `CVE-${Date.now()}`,
              source: {
                name: 'NPM Audit',
                url: vulnInfo.url || 'https://npmjs.com'
              },
              ratings: [{
                source: { name: 'NPM' },
                severity: vulnInfo.severity.toUpperCase(),
                method: 'CVSSv3'
              }],
              description: vulnInfo.title || 'Security vulnerability detected',
              affects: [{
                ref: component['bom-ref'],
                versions: [{
                  version: component.version,
                  status: 'affected'
                }]
              }],
              published: new Date().toISOString(),
              updated: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Could not run vulnerability scan:', error.message);
    }
  }

  /**
   * Add build metadata
   */
  addBuildMetadata() {
    const buildInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Add git information if available
    try {
      buildInfo.gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8', timeout: 5000 }).trim();
      buildInfo.gitBranch = execSync('git branch --show-current', { encoding: 'utf8', timeout: 5000 }).trim();
      buildInfo.gitRemote = execSync('git config --get remote.origin.url', { encoding: 'utf8', timeout: 5000 }).trim();
    } catch (error) {
      // Git info not available
    }

    // Add CI/CD information
    if (process.env.CI) {
      buildInfo.ci = true;
      buildInfo.buildNumber = process.env.BUILD_NUMBER || process.env.GITHUB_RUN_NUMBER;
      buildInfo.buildUrl = process.env.BUILD_URL || process.env.GITHUB_SERVER_URL;
    }

    this.sbom.metadata.properties = Object.entries(buildInfo).map(([key, value]) => ({
      name: `build:${key}`,
      value: String(value)
    }));
  }

  /**
   * Calculate hashes for components
   */
  async calculateHashes() {
    // Calculate hash for main application
    try {
      const appFiles = this.getAppFiles();
      const appContent = appFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');
      const appHash = crypto.createHash('sha256').update(appContent).digest('hex');
      
      this.sbom.metadata.component.hashes = [{
        alg: 'SHA-256',
        content: appHash
      }];
    } catch (error) {
      console.warn('⚠️  Could not calculate application hash:', error.message);
    }

    // Calculate hashes for package-lock.json
    if (fs.existsSync('package-lock.json')) {
      const lockContent = fs.readFileSync('package-lock.json', 'utf8');
      const lockHash = crypto.createHash('sha256').update(lockContent).digest('hex');
      
      this.sbom.metadata.component.hashes.push({
        alg: 'SHA-256',
        content: lockHash,
        description: 'package-lock.json integrity hash'
      });
    }
  }

  /**
   * Get application files for hashing
   */
  getAppFiles() {
    const files = [];
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json'];
    
    const scanDir = (dir) => {
      if (!fs.existsSync(dir) || dir.includes('node_modules')) return;
      
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          scanDir(fullPath);
        } else if (extensions.some(ext => item.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    };

    ['src', 'server/src', 'client/src'].forEach(dir => scanDir(dir));
    
    // Add important config files
    ['package.json', 'tsconfig.json', '.eslintrc.js', 'jest.config.js'].forEach(file => {
      if (fs.existsSync(file)) files.push(file);
    });

    return files;
  }

  /**
   * Utility methods
   */
  loadPackageJson() {
    try {
      return JSON.parse(fs.readFileSync('package.json', 'utf8'));
    } catch (error) {
      console.error('❌ Could not load package.json');
      process.exit(1);
    }
  }

  loadPackageLock() {
    try {
      if (fs.existsSync('package-lock.json')) {
        return JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
      }
    } catch (error) {
      console.warn('⚠️  Could not load package-lock.json');
    }
    return null;
  }

  extractLicenses(packageInfo) {
    const licenses = [];
    
    if (packageInfo.license) {
      licenses.push({
        license: {
          id: typeof packageInfo.license === 'string' ? packageInfo.license : packageInfo.license.type,
          name: typeof packageInfo.license === 'string' ? packageInfo.license : packageInfo.license.type
        }
      });
    }

    if (packageInfo.licenses && Array.isArray(packageInfo.licenses)) {
      packageInfo.licenses.forEach(license => {
        licenses.push({
          license: {
            id: license.type || license,
            name: license.type || license
          }
        });
      });
    }

    return licenses;
  }

  normalizeRepoUrl(repository) {
    if (typeof repository === 'string') {
      return repository;
    }
    return repository.url || repository;
  }

  getNpmVersion() {
    try {
      return execSync('npm --version', { encoding: 'utf8', timeout: 5000 }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Save SBOM to file
   */
  async saveSBOM(sbom, filename = 'sbom.json') {
    const sbomContent = JSON.stringify(sbom, null, 2);
    
    // Save main SBOM
    fs.writeFileSync(filename, sbomContent);
    
    // Also save in CycloneDX XML format if possible
    try {
      const xmlFilename = filename.replace('.json', '.xml');
      const xmlContent = this.convertToXML(sbom);
      fs.writeFileSync(xmlFilename, xmlContent);
      console.log(`💾 Saved SBOM: ${filename} and ${xmlFilename}`);
    } catch (error) {
      console.log(`💾 Saved SBOM: ${filename}`);
    }

    return sbomContent;
  }

  /**
   * Convert SBOM to XML format (simplified)
   */
  convertToXML(sbom) {
    const escapeXML = (str) => String(str).replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bom xmlns="http://cyclonedx.org/schema/bom/1.4" version="${sbom.version}" serialNumber="${sbom.serialNumber}">
  <metadata>
    <timestamp>${sbom.metadata.timestamp}</timestamp>
    <tools>`;

    sbom.metadata.tools?.forEach(tool => {
      xml += `
      <tool>
        <vendor>${escapeXML(tool.vendor)}</vendor>
        <name>${escapeXML(tool.name)}</name>
        <version>${escapeXML(tool.version)}</version>
      </tool>`;
    });

    xml += `
    </tools>
    <component type="${sbom.metadata.component.type}" bom-ref="${sbom.metadata.component['bom-ref']}">
      <name>${escapeXML(sbom.metadata.component.name)}</name>
      <version>${escapeXML(sbom.metadata.component.version)}</version>
      <description>${escapeXML(sbom.metadata.component.description)}</description>
    </component>
  </metadata>
  <components>`;

    sbom.components?.forEach(component => {
      xml += `
    <component type="${component.type}" bom-ref="${component['bom-ref']}">
      <name>${escapeXML(component.name)}</name>
      <version>${escapeXML(component.version)}</version>
      <scope>${component.scope || 'required'}</scope>`;
      
      if (component.description) {
        xml += `
      <description>${escapeXML(component.description)}</description>`;
      }
      
      if (component.purl) {
        xml += `
      <purl>${escapeXML(component.purl)}</purl>`;
      }

      xml += `
    </component>`;
    });

    xml += `
  </components>
</bom>`;

    return xml;
  }

  /**
   * Validate SBOM against CycloneDX schema
   */
  validateSBOM(sbom) {
    const requiredFields = ['bomFormat', 'specVersion', 'version', 'metadata'];
    const missingFields = requiredFields.filter(field => !sbom[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (sbom.bomFormat !== 'CycloneDX') {
      throw new Error('Invalid bomFormat. Must be "CycloneDX"');
    }

    if (!sbom.metadata?.component) {
      throw new Error('Missing metadata.component');
    }

    console.log('✅ SBOM validation passed');
    return true;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const outputFile = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'sbom.json';
  const validate = args.includes('--validate');

  console.log('🚀 IntelGraph SBOM Generator');
  console.log('=============================');

  try {
    const generator = new SBOMGenerator();
    const sbom = await generator.generateSBOM();
    
    if (validate) {
      generator.validateSBOM(sbom);
    }
    
    await generator.saveSBOM(sbom, outputFile);
    
    console.log('✅ SBOM generation completed successfully');
    console.log(`📊 Summary: ${sbom.components.length} components, ${sbom.vulnerabilities?.length || 0} vulnerabilities`);
    
  } catch (error) {
    console.error('❌ SBOM generation failed:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { SBOMGenerator };

// Run if called directly
if (require.main === module) {
  main();
}