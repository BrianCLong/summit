#!/usr/bin/env tsx
"use strict";
/**
 * Generate Golden Sample CSV Data (25-50 MB)
 * Creates realistic demo data for testing the Tenant Graph Slice v0
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
exports.generateGoldenSample = generateGoldenSample;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const sync_1 = require("csv-stringify/sync");
const crypto_1 = require("crypto");
const OUTPUT_DIR = './data/tenant-graph/golden-sample';
const TARGET_SIZE_MB = 30;
const RECORDS_PER_MB = 1200; // Approximate
// Sample data generators
const firstNames = [
    'Alice', 'Bob', 'Charlie', 'Diana', 'Edward', 'Fiona', 'George', 'Hannah',
    'Igor', 'Julia', 'Kevin', 'Laura', 'Michael', 'Nina', 'Oliver', 'Patricia',
    'Quinn', 'Rachel', 'Samuel', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zoe'
];
const lastNames = [
    'Anderson', 'Brown', 'Chen', 'Davis', 'Evans', 'Fisher', 'Garcia', 'Harris',
    'Ivanov', 'Johnson', 'Kumar', 'Lee', 'Martinez', 'Nguyen', 'O\'Brien', 'Patel',
    'Quinn', 'Rodriguez', 'Smith', 'Taylor', 'Upton', 'Vargas', 'Williams', 'Xu', 'Young', 'Zhang'
];
const companies = [
    'Tech Innovations Inc', 'Global Finance Corp', 'Advanced Systems Ltd',
    'Digital Solutions AG', 'Strategic Ventures LLC', 'Quantum Dynamics SA',
    'Nexus Technologies', 'Apex Industries', 'Zenith Enterprises', 'Horizon Group',
    'Velocity Partners', 'Summit Holdings', 'Prime Capital', 'Elite Systems',
    'Vanguard Corporation', 'Meridian Enterprises'
];
const industries = [
    'Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Energy',
    'Telecommunications', 'Retail', 'Transportation', 'Consulting', 'Real Estate'
];
const countries = [
    'US', 'UK', 'DE', 'FR', 'JP', 'CN', 'IN', 'BR', 'CA', 'AU',
    'SG', 'HK', 'CH', 'NL', 'SE', 'NO', 'DK', 'FI', 'BE', 'AT'
];
const jobTitles = [
    'Chief Executive Officer', 'Chief Technology Officer', 'Chief Financial Officer',
    'Director of Operations', 'Vice President Engineering', 'Senior Analyst',
    'Product Manager', 'Senior Developer', 'Research Scientist', 'Consultant',
    'Business Development Manager', 'Compliance Officer', 'Risk Analyst'
];
const assetTypes = [
    'Real Estate', 'Securities', 'Intellectual Property', 'Equipment',
    'Cash Reserves', 'Cryptocurrency', 'Bonds', 'Stocks', 'Commodities', 'Vehicles'
];
function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function randomDate(start, end) {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
}
function randomPhone() {
    const area = Math.floor(Math.random() * 900) + 100;
    const prefix = Math.floor(Math.random() * 900) + 100;
    const line = Math.floor(Math.random() * 9000) + 1000;
    return `+1-${area}-${prefix}-${line}`;
}
function randomEmail(name, company) {
    const cleanName = name.toLowerCase().replace(' ', '.');
    const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `${cleanName}@${cleanCompany}.com`;
}
async function generateGoldenSample() {
    console.log('🚀 Generating golden sample CSV data...');
    console.log(`Target size: ${TARGET_SIZE_MB} MB`);
    // Ensure output directory exists
    await (0, promises_1.mkdir)(OUTPUT_DIR, { recursive: true });
    const targetRecords = TARGET_SIZE_MB * RECORDS_PER_MB;
    const numOrgs = Math.floor(targetRecords * 0.1); // 10% organizations
    const numAssets = Math.floor(targetRecords * 0.15); // 15% assets
    const numPeople = targetRecords - numOrgs - numAssets; // Rest are people
    console.log(`Generating ${numPeople} people, ${numOrgs} organizations, ${numAssets} assets`);
    // Generate organizations first
    const orgIds = [];
    const orgRecords = [];
    for (let i = 0; i < numOrgs; i++) {
        const orgId = `org-${(0, crypto_1.randomUUID)()}`;
        orgIds.push(orgId);
        const assetId = i < numAssets ? `asset-${(0, crypto_1.randomUUID)()}` : '';
        orgRecords.push({
            entity_type: 'organization',
            org_id: orgId,
            org_name: `${random(companies)} ${i}`,
            org_labels: 'Organization,Enterprise',
            industry_sector: random(industries),
            jurisdiction: random(countries),
            registration_no: `REG-${Math.floor(Math.random() * 1000000)}`,
            website_url: `https://www.company${i}.com`,
            asset_id: assetId,
            acquisition_date: assetId ? randomDate(new Date('2015-01-01'), new Date('2024-01-01')) : '',
            ownership_pct: assetId ? (Math.random() * 100).toFixed(2) : '',
        });
    }
    // Generate assets
    const assetRecords = [];
    for (let i = 0; i < numAssets; i++) {
        const assetId = `asset-${(0, crypto_1.randomUUID)()}`;
        assetRecords.push({
            entity_type: 'asset',
            asset_id: assetId,
            asset_type: random(assetTypes),
            asset_description: `${random(assetTypes)} asset ${i}`,
            asset_value: (Math.random() * 10000000).toFixed(2),
            currency_code: random(['USD', 'EUR', 'GBP', 'JPY', 'CHF']),
            serial_number: `SN-${Math.random().toString(36).substring(2, 15).toUpperCase()}`,
        });
    }
    // Generate people
    const personRecords = [];
    for (let i = 0; i < numPeople; i++) {
        const personId = `person-${(0, crypto_1.randomUUID)()}`;
        const firstName = random(firstNames);
        const lastName = random(lastNames);
        const fullName = `${firstName} ${lastName}`;
        const orgId = random(orgIds);
        const orgName = orgRecords.find(o => o.org_id === orgId)?.org_name || 'Unknown';
        const employmentStart = randomDate(new Date('2010-01-01'), new Date('2023-01-01'));
        const employmentEnd = Math.random() > 0.8
            ? randomDate(new Date(employmentStart), new Date('2024-12-31'))
            : '';
        personRecords.push({
            person_id: personId,
            entity_type: 'person',
            full_name: fullName,
            email_address: randomEmail(fullName, orgName),
            phone_number: randomPhone(),
            dob: randomDate(new Date('1960-01-01'), new Date('2000-12-31')),
            country: random(countries),
            known_aliases: JSON.stringify([`${firstName} ${lastName[0]}.`]),
            org_id: orgId,
            job_title: random(jobTitles),
            employment_start: employmentStart,
            employment_end: employmentEnd,
            relationship_confidence: (0.7 + Math.random() * 0.3).toFixed(2),
        });
        if (i % 10000 === 0 && i > 0) {
            console.log(`  Generated ${i}/${numPeople} people...`);
        }
    }
    // Write entities CSV
    console.log('\n✍️  Writing entities.csv...');
    const entitiesPath = `${OUTPUT_DIR}/entities.csv`;
    const entitiesStream = (0, fs_1.createWriteStream)(entitiesPath);
    // Write header
    const headers = Object.keys(personRecords[0]);
    entitiesStream.write(headers.join(',') + '\n');
    // Write person records
    let written = 0;
    for (const record of personRecords) {
        entitiesStream.write((0, sync_1.stringify)([Object.values(record)]));
        written++;
    }
    // Write org records (convert to match person schema where needed)
    for (const record of orgRecords) {
        const row = {
            person_id: '',
            entity_type: record.entity_type,
            full_name: record.org_name,
            email_address: '',
            phone_number: '',
            dob: '',
            country: record.jurisdiction,
            known_aliases: '[]',
            org_id: record.org_id,
            job_title: '',
            employment_start: '',
            employment_end: '',
            relationship_confidence: '',
        };
        entitiesStream.write((0, sync_1.stringify)([Object.values(row)]));
        written++;
    }
    // Write asset records
    for (const record of assetRecords) {
        const row = {
            person_id: '',
            entity_type: record.entity_type,
            full_name: record.asset_description,
            email_address: '',
            phone_number: '',
            dob: '',
            country: '',
            known_aliases: '[]',
            org_id: '',
            job_title: '',
            employment_start: '',
            employment_end: '',
            relationship_confidence: '',
        };
        entitiesStream.write((0, sync_1.stringify)([Object.values(row)]));
        written++;
    }
    entitiesStream.end();
    // Wait for stream to finish
    await new Promise((resolve) => entitiesStream.on('finish', resolve));
    // Get file size
    const { stat } = await Promise.resolve().then(() => __importStar(require('fs/promises')));
    const stats = await stat(entitiesPath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`✅ Generated ${entitiesPath}`);
    console.log(`   Size: ${sizeMB} MB`);
    console.log(`   Records: ${written}`);
    console.log('\n🎉 Golden sample generation complete!');
    console.log(`\nTo ingest this data, run:`);
    console.log(`  pnpm tsx scripts/ingest-golden-sample.ts`);
}
// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateGoldenSample().catch((error) => {
        console.error('❌ Error:', error);
        process.exit(1);
    });
}
