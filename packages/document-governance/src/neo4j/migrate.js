"use strict";
/**
 * Neo4j Migration Script
 *
 * Creates constraints, indexes, and seeds document type ontology.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigration = runMigration;
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path.dirname(__filename);
async function createConstraints(driver) {
    const session = driver.session();
    try {
        console.log('Creating constraints...');
        const constraints = [
            'CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE',
            'CREATE CONSTRAINT document_type_id IF NOT EXISTS FOR (dt:DocumentType) REQUIRE dt.id IS UNIQUE',
            'CREATE CONSTRAINT relationship_type_id IF NOT EXISTS FOR (rt:RelationshipType) REQUIRE rt.id IS UNIQUE',
            'CREATE CONSTRAINT compliance_standard_id IF NOT EXISTS FOR (cs:ComplianceStandard) REQUIRE cs.id IS UNIQUE',
            'CREATE CONSTRAINT classification_level_id IF NOT EXISTS FOR (cl:ClassificationLevel) REQUIRE cl.id IS UNIQUE',
            'CREATE CONSTRAINT lifecycle_history_id IF NOT EXISTS FOR (h:LifecycleHistory) REQUIRE h.id IS UNIQUE',
            'CREATE CONSTRAINT approval_request_id IF NOT EXISTS FOR (ar:ApprovalRequest) REQUIRE ar.id IS UNIQUE',
            'CREATE CONSTRAINT provenance_id IF NOT EXISTS FOR (p:Provenance) REQUIRE p.id IS UNIQUE',
            'CREATE CONSTRAINT risk_score_doc IF NOT EXISTS FOR (rs:RiskScore) REQUIRE rs.document_id IS UNIQUE',
            'CREATE CONSTRAINT audit_finding_id IF NOT EXISTS FOR (f:AuditFinding) REQUIRE f.id IS UNIQUE',
        ];
        for (const constraint of constraints) {
            try {
                await session.run(constraint);
                console.log(`  Created: ${constraint.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists')) {
                    throw error;
                }
                console.log(`  Exists: ${constraint.split(' ')[2]}`);
            }
        }
    }
    finally {
        await session.close();
    }
}
async function createIndexes(driver) {
    const session = driver.session();
    try {
        console.log('Creating indexes...');
        const indexes = [
            'CREATE INDEX document_type_idx IF NOT EXISTS FOR (d:Document) ON (d.document_type_id)',
            'CREATE INDEX document_status_idx IF NOT EXISTS FOR (d:Document) ON (d.status)',
            'CREATE INDEX document_classification_idx IF NOT EXISTS FOR (d:Document) ON (d.classification)',
            'CREATE INDEX document_owner_idx IF NOT EXISTS FOR (d:Document) ON (d.owner_id)',
            'CREATE INDEX document_department_idx IF NOT EXISTS FOR (d:Document) ON (d.owner_department)',
            'CREATE INDEX document_created_idx IF NOT EXISTS FOR (d:Document) ON (d.created_at)',
            'CREATE INDEX document_updated_idx IF NOT EXISTS FOR (d:Document) ON (d.updated_at)',
            'CREATE INDEX lifecycle_history_doc_idx IF NOT EXISTS FOR (h:LifecycleHistory) ON (h.document_id)',
            'CREATE INDEX provenance_doc_idx IF NOT EXISTS FOR (p:Provenance) ON (p.document_id)',
            'CREATE INDEX audit_finding_doc_idx IF NOT EXISTS FOR (f:AuditFinding) ON (f.document_id)',
            'CREATE INDEX audit_finding_status_idx IF NOT EXISTS FOR (f:AuditFinding) ON (f.status)',
        ];
        for (const index of indexes) {
            try {
                await session.run(index);
                console.log(`  Created: ${index.split(' ')[2]}`);
            }
            catch (error) {
                if (!error.message.includes('already exists')) {
                    throw error;
                }
                console.log(`  Exists: ${index.split(' ')[2]}`);
            }
        }
    }
    finally {
        await session.close();
    }
}
async function seedDocumentTypes(driver) {
    const session = driver.session();
    try {
        console.log('Seeding document types...');
        // Load ontology from JSON file
        const ontologyPath = path.resolve(__dirname, '../../ontology/document-ontology.json');
        const ontology = JSON.parse(fs.readFileSync(ontologyPath, 'utf-8'));
        // Create document types
        for (const docType of ontology.document_types) {
            await session.run(`
        MERGE (dt:DocumentType {id: $id})
        SET dt.name = $name,
            dt.category = $category,
            dt.subcategory = $subcategory,
            dt.description = $description,
            dt.confidentiality = $confidentiality,
            dt.lifecycle = $lifecycle,
            dt.retention_period = $retentionPeriod,
            dt.owner_department = $ownerDepartment,
            dt.requires_signatures = $requiresSignatures,
            dt.legal_basis = $legalBasis,
            dt.risk_level = $riskLevel
        `, {
                id: docType.id,
                name: docType.name,
                category: docType.category,
                subcategory: docType.subcategory || null,
                description: docType.description,
                confidentiality: docType.confidentiality,
                lifecycle: docType.lifecycle,
                retentionPeriod: docType.retention_period,
                ownerDepartment: docType.owner_department,
                requiresSignatures: JSON.stringify(docType.requires_signatures),
                legalBasis: JSON.stringify(docType.legal_basis),
                riskLevel: docType.risk_level,
            });
        }
        console.log(`  Created ${ontology.document_types.length} document types`);
        // Create relationship types
        for (const relType of ontology.relationship_types) {
            await session.run(`
        MERGE (rt:RelationshipType {id: $id})
        SET rt.name = $name,
            rt.description = $description,
            rt.symmetric = $symmetric,
            rt.transitive = $transitive
        `, {
                id: relType.id,
                name: relType.name,
                description: relType.description,
                symmetric: relType.symmetric || false,
                transitive: relType.transitive || false,
            });
        }
        console.log(`  Created ${ontology.relationship_types.length} relationship types`);
        // Create classification levels
        for (const level of ontology.classification_levels) {
            await session.run(`
        MERGE (cl:ClassificationLevel {id: $id})
        SET cl.level = $level,
            cl.description = $description,
            cl.handling_requirements = $handlingRequirements
        `, {
                id: level.id,
                level: level.level,
                description: level.description,
                handlingRequirements: level.handling_requirements,
            });
        }
        console.log(`  Created ${ontology.classification_levels.length} classification levels`);
        // Create compliance standards
        for (const standard of ontology.compliance_standards) {
            await session.run(`
        MERGE (cs:ComplianceStandard {id: $id})
        SET cs.name = $name,
            cs.authority = $authority,
            cs.description = $description
        `, {
                id: standard.id,
                name: standard.name,
                authority: standard.authority,
                description: standard.description || null,
            });
        }
        console.log(`  Created ${ontology.compliance_standards.length} compliance standards`);
    }
    finally {
        await session.close();
    }
}
async function runMigration(config) {
    const driver = neo4j_driver_1.default.driver(config.neo4jUri, neo4j_driver_1.default.auth.basic(config.neo4jUser, config.neo4jPassword));
    try {
        console.log('Starting document governance migration...');
        console.log(`Connecting to ${config.neo4jUri}...`);
        await driver.verifyConnectivity();
        console.log('Connected to Neo4j');
        await createConstraints(driver);
        await createIndexes(driver);
        await seedDocumentTypes(driver);
        console.log('Migration completed successfully!');
    }
    finally {
        await driver.close();
    }
}
// Run migration if executed directly
if (process.argv[1] === __filename) {
    const config = {
        neo4jUri: process.env.NEO4J_URI || 'bolt://localhost:7687',
        neo4jUser: process.env.NEO4J_USER || 'neo4j',
        neo4jPassword: process.env.NEO4J_PASSWORD || 'password',
    };
    runMigration(config).catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}
