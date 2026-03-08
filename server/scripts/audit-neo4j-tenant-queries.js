"use strict";
/**
 * Neo4j Tenant Query Auditor
 *
 * Scans the codebase for Neo4j queries and identifies those missing tenant_id filtering.
 * Generates a report of:
 * 1. Queries that need tenant_id added
 * 2. Queries that already have tenant_id
 * 3. System queries that don't need tenant_id
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
exports.Neo4jTenantAuditor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
const CYPHER_PATTERNS = [
    /session\.run\s*\(\s*`([^`]+)`/g,
    /session\.run\s*\(\s*'([^']+)'/g,
    /session\.run\s*\(\s*"([^"]+)"/g,
    /executeQuery\s*\(\s*`([^`]+)`/g,
    /executeQuery\s*\(\s*'([^']+)'/g,
    /executeQuery\s*\(\s*"([^"]+)"/g,
    /tx\.run\s*\(\s*`([^`]+)`/g,
    /tx\.run\s*\(\s*'([^']+)'/g,
    /tx\.run\s*\(\s*"([^"]+)"/g,
];
const SYSTEM_QUERY_PREFIXES = [
    'CALL db.',
    'CREATE CONSTRAINT',
    'CREATE INDEX',
    'DROP CONSTRAINT',
    'DROP INDEX',
    'CALL apoc.',
    'SHOW CONSTRAINTS',
    'SHOW INDEXES',
];
const TENANT_PATTERNS = [
    'tenant_id: $tenantId',
    'tenant_id:$tenantId',
    '{tenant_id: $tenantId}',
    'tenantId: $tenantId',
    't:Tenant',
];
class Neo4jTenantAuditor {
    results = [];
    filesScanned = 0;
    queriesFound = 0;
    async run(rootDir) {
        console.log('🔍 Scanning for Neo4j queries...\n');
        const files = await (0, glob_1.glob)(`${rootDir}/**/*.ts`, {
            ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.test.ts', '**/*.spec.ts'],
        });
        for (const file of files) {
            await this.scanFile(file);
        }
        this.generateReport();
    }
    async scanFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        this.filesScanned++;
        for (const pattern of CYPHER_PATTERNS) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const query = match[1];
                const lineNumber = this.getLineNumber(content, match.index);
                this.queriesFound++;
                this.results.push(this.analyzeQuery(filePath, lineNumber, query));
            }
            // Reset regex lastIndex for next file
            pattern.lastIndex = 0;
        }
    }
    analyzeQuery(file, line, query) {
        const normalizedQuery = query.toUpperCase().replace(/\s+/g, ' ').trim();
        const isSystemQuery = SYSTEM_QUERY_PREFIXES.some(prefix => normalizedQuery.startsWith(prefix.toUpperCase()));
        const hasTenantId = TENANT_PATTERNS.some(pattern => query.toLowerCase().includes(pattern.toLowerCase()));
        let severity;
        let recommendation;
        if (isSystemQuery) {
            severity = 'safe';
            recommendation = 'System query - no tenant filtering needed';
        }
        else if (hasTenantId) {
            severity = 'safe';
            recommendation = 'Already has tenant_id filtering';
        }
        else {
            // Determine severity based on query type
            if (normalizedQuery.includes('DELETE') || normalizedQuery.includes('REMOVE')) {
                severity = 'critical';
                recommendation = 'CRITICAL: Add tenant_id filter immediately - risk of cross-tenant deletion';
            }
            else if (normalizedQuery.includes('CREATE') || normalizedQuery.includes('MERGE') || normalizedQuery.includes('SET')) {
                severity = 'high';
                recommendation = 'HIGH: Add tenant_id property to created/updated nodes';
            }
            else if (normalizedQuery.includes('MATCH')) {
                severity = 'high';
                recommendation = 'HIGH: Add tenant_id filter to MATCH clause to prevent cross-tenant reads';
            }
            else {
                severity = 'medium';
                recommendation = 'MEDIUM: Review query and add tenant_id filtering if applicable';
            }
        }
        return {
            file: path.relative(process.cwd(), file),
            line,
            query: query.substring(0, 150) + (query.length > 150 ? '...' : ''),
            hasTenantId,
            isSystemQuery,
            severity,
            recommendation,
        };
    }
    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }
    generateReport() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('   NEO4J TENANT ISOLATION AUDIT REPORT');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log(`📊 Scan Summary:`);
        console.log(`   Files scanned: ${this.filesScanned}`);
        console.log(`   Queries found: ${this.queriesFound}\n`);
        const bySeverity = this.groupBySeverity();
        console.log(`🚨 Critical Issues: ${bySeverity.critical.length}`);
        console.log(`⚠️  High Priority: ${bySeverity.high.length}`);
        console.log(`📋 Medium Priority: ${bySeverity.medium.length}`);
        console.log(`✅ Safe Queries: ${bySeverity.safe.length}\n`);
        // Critical issues first
        if (bySeverity.critical.length > 0) {
            console.log('═════════════════════════════════════════════════════════════');
            console.log('🚨 CRITICAL ISSUES (Immediate Action Required)');
            console.log('═════════════════════════════════════════════════════════════\n');
            bySeverity.critical.forEach(this.printQueryMatch.bind(this));
        }
        // High priority
        if (bySeverity.high.length > 0) {
            console.log('═════════════════════════════════════════════════════════════');
            console.log('⚠️  HIGH PRIORITY ISSUES');
            console.log('═════════════════════════════════════════════════════════════\n');
            bySeverity.high.forEach(this.printQueryMatch.bind(this));
        }
        // Medium priority
        if (bySeverity.medium.length > 0) {
            console.log('═════════════════════════════════════════════════════════════');
            console.log('📋 MEDIUM PRIORITY ISSUES');
            console.log('═════════════════════════════════════════════════════════════\n');
            bySeverity.medium.forEach(this.printQueryMatch.bind(this));
        }
        // Summary of safe queries
        console.log('═════════════════════════════════════════════════════════════');
        console.log('✅ SAFE QUERIES (Already Tenant-Aware or System Queries)');
        console.log('═════════════════════════════════════════════════════════════\n');
        console.log(`Total: ${bySeverity.safe.length} queries are already tenant-safe\n`);
        // Export to JSON
        this.exportToJSON();
        console.log('═════════════════════════════════════════════════════════════');
        console.log('📄 Full report exported to: neo4j-tenant-audit-report.json');
        console.log('═════════════════════════════════════════════════════════════\n');
        // Action items
        console.log('📝 RECOMMENDED ACTIONS:\n');
        console.log('1. Fix all CRITICAL issues immediately (risk of data loss)');
        console.log('2. Address HIGH priority issues in current sprint');
        console.log('3. Plan MEDIUM priority fixes for next sprint');
        console.log('4. Update queries to use TenantNeo4jSession wrapper');
        console.log('5. Add integration tests for cross-tenant isolation\n');
    }
    printQueryMatch(match) {
        const icon = match.severity === 'critical' ? '🚨' :
            match.severity === 'high' ? '⚠️' :
                match.severity === 'medium' ? '📋' : '✅';
        console.log(`${icon} ${match.file}:${match.line}`);
        console.log(`   ${match.recommendation}`);
        console.log(`   Query: ${match.query}`);
        console.log('');
    }
    groupBySeverity() {
        return {
            critical: this.results.filter(r => r.severity === 'critical'),
            high: this.results.filter(r => r.severity === 'high'),
            medium: this.results.filter(r => r.severity === 'medium'),
            low: this.results.filter(r => r.severity === 'low'),
            safe: this.results.filter(r => r.severity === 'safe'),
        };
    }
    exportToJSON() {
        const report = {
            metadata: {
                scanDate: new Date().toISOString(),
                filesScanned: this.filesScanned,
                queriesFound: this.queriesFound,
            },
            summary: this.groupBySeverity(),
            allResults: this.results,
        };
        fs.writeFileSync('neo4j-tenant-audit-report.json', JSON.stringify(report, null, 2));
    }
}
exports.Neo4jTenantAuditor = Neo4jTenantAuditor;
// Run the auditor
if (require.main === module) {
    const rootDir = process.argv[2] || './server/src';
    const auditor = new Neo4jTenantAuditor();
    auditor.run(rootDir)
        .then(() => {
        console.log('✅ Audit complete!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Audit failed:', error);
        process.exit(1);
    });
}
