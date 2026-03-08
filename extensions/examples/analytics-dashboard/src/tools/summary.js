"use strict";
/**
 * Investigation summary tool
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummary = generateSummary;
/**
 * Generate a summary of investigation data
 */
async function generateSummary(params) {
    const { investigationId } = params;
    // In a real extension, this would query the investigations API
    // For this example, we'll return mock data
    const summary = {
        id: investigationId,
        title: 'Financial Network Investigation',
        entityCount: 156,
        relationshipCount: 423,
        keyFindings: [
            'Identified 12 shell companies in the network',
            'Traced $2.3M in suspicious transactions',
            'Found connections to 3 known entities of interest',
            'Detected circular ownership patterns',
        ],
        status: 'active',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
    };
    return summary;
}
