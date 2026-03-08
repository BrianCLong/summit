#!/usr/bin/env node
"use strict";
/**
 * Helm Digest Policy Checker
 * Ensures all Helm charts use digest-only image references for security
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelmDigestChecker = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const yaml = __importStar(require("js-yaml"));
class HelmDigestChecker {
    errors = [];
    warnings = [];
    async checkAllCharts() {
        console.log('🔍 Checking Helm charts for digest-only policy compliance...');
        const chartDirs = ['charts'];
        const allPassed = true;
        for (const chartDir of chartDirs) {
            if (fs.existsSync(chartDir)) {
                await this.checkChartsInDirectory(chartDir);
            }
        }
        this.printResults();
        return this.errors.length === 0;
    }
    async checkChartsInDirectory(dirPath) {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of items) {
            if (item.isDirectory()) {
                const chartPath = path.join(dirPath, item.name);
                await this.checkChart(chartPath);
                // Recursively check subdirectories
                await this.checkChartsInDirectory(chartPath);
            }
            else if (item.name.match(/^values.*\.ya?ml$/)) {
                const valuesPath = path.join(dirPath, item.name);
                await this.checkValuesFile(valuesPath);
            }
        }
    }
    async checkChart(chartPath) {
        const valuesFiles = [
            'values.yaml',
            'values.yml',
            'values.prod.yaml',
            'values.staging.yaml',
            'values.dev.yaml',
        ];
        for (const valuesFile of valuesFiles) {
            const valuesPath = path.join(chartPath, valuesFile);
            if (fs.existsSync(valuesPath)) {
                await this.checkValuesFile(valuesPath);
            }
        }
    }
    async checkValuesFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const values = yaml.load(content);
            console.log(`📄 Checking: ${filePath}`);
            // Check single image configuration
            if (values.image) {
                this.validateImageConfig(values.image, filePath, 'image');
            }
            // Check multiple images configuration
            if (values.images && Array.isArray(values.images)) {
                values.images.forEach((image, index) => {
                    this.validateImageConfig(image, filePath, `images[${index}]`);
                });
            }
            // Check nested image configurations
            this.checkNestedImages(values, filePath, '');
        }
        catch (error) {
            this.errors.push(`❌ Failed to parse ${filePath}: ${error.message}`);
        }
    }
    checkNestedImages(obj, filePath, path) {
        if (typeof obj !== 'object' || obj === null)
            return;
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            if (key === 'image' && typeof value === 'object') {
                this.validateImageConfig(value, filePath, currentPath);
            }
            else if (typeof value === 'object') {
                this.checkNestedImages(value, filePath, currentPath);
            }
        }
    }
    validateImageConfig(image, filePath, path) {
        const location = `${filePath}:${path}`;
        // Check for mutable tags
        if (image.tag && image.tag.trim() !== '') {
            this.errors.push(`❌ ${location}: Found mutable tag "${image.tag}". Use digest instead.`);
        }
        // Check for missing or invalid digest
        if (!image.digest) {
            this.errors.push(`❌ ${location}: Missing digest. Images must be referenced by digest.`);
        }
        else if (!image.digest.startsWith('sha256:')) {
            if (image.digest === 'sha256:example123') {
                this.warnings.push(`⚠️  ${location}: Using example digest. Replace with actual digest from CI.`);
            }
            else {
                this.errors.push(`❌ ${location}: Invalid digest format. Must start with 'sha256:'.`);
            }
        }
        // Check repository format
        if (!image.repository) {
            this.errors.push(`❌ ${location}: Missing repository field.`);
        }
        // Validate pull policy
        if (image.pullPolicy &&
            !['Always', 'IfNotPresent', 'Never'].includes(image.pullPolicy)) {
            this.warnings.push(`⚠️  ${location}: Invalid pullPolicy "${image.pullPolicy}".`);
        }
    }
    printResults() {
        console.log('\n📊 Policy Check Results:');
        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.warnings.forEach((warning) => console.log(warning));
        }
        if (this.errors.length > 0) {
            console.log('\n❌ Policy Violations:');
            this.errors.forEach((error) => console.log(error));
            console.log(`\n❌ ${this.errors.length} policy violation(s) found.`);
            console.log('\n🔧 To fix:');
            console.log('  1. Remove or comment out all image.tag fields');
            console.log('  2. Set image.digest to actual sha256 hash from CI');
            console.log('  3. Ensure repository field is present');
        }
        else {
            console.log('\n✅ All Helm charts comply with digest-only policy!');
        }
        if (this.warnings.length > 0 && this.errors.length === 0) {
            console.log(`\n⚠️  ${this.warnings.length} warning(s) found, but policy compliance achieved.`);
        }
    }
}
exports.HelmDigestChecker = HelmDigestChecker;
// CLI execution
async function main() {
    const checker = new HelmDigestChecker();
    const success = await checker.checkAllCharts();
    process.exit(success ? 0 : 1);
}
if (require.main === module) {
    main().catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}
