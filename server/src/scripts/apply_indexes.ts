// @ts-nocheck

import { createIndexManager, IndexDefinition } from '../db/indexManager.js';
import GraphIndexAdvisorService from '../services/GraphIndexAdvisorService.js';
import pino from 'pino';

const logger = pino({ name: 'apply-indexes' });

async function applyRecommendedIndexes() {
  const tenantId = 'default'; // Default tenant for now
  const indexManager = createIndexManager(tenantId);
  const advisor = GraphIndexAdvisorService.getInstance();

  try {
    logger.info('Fetching index recommendations...');
    const recommendations = await advisor.getRecommendations();

    if (recommendations.length === 0) {
      logger.info('No new index recommendations found.');
      return;
    }

    logger.info(`Found ${recommendations.length} recommendations. Applying...`);

    for (const rec of recommendations) {
      const def: IndexDefinition = {
        name: `${rec.label.toLowerCase()}_${rec.property.toLowerCase()}_idx`,
        database: 'neo4j',
        type: 'btree',
        label: rec.label,
        properties: [rec.property],
        priority: rec.priority === 'HIGH' ? 'high' : 'medium',
        tenantScoped: false // Global for now as GraphIndexAdvisorService doesn't seem tenant-aware
      };

      try {
        await indexManager.createIndex(def);
        logger.info(`Applied index: ${def.name}`);
      } catch (err) {
        logger.error({ err, def }, 'Failed to apply index');
      }
    }

    // Hardcoded indexes based on analysis (if any from previous steps, here we add common ones)
    // Common indexes for Entity, Person, Organization, Investigation
    const commonIndexes: IndexDefinition[] = [
      { name: 'entity_id_idx', database: 'neo4j', type: 'btree', label: 'Entity', properties: ['id'], priority: 'critical', tenantScoped: false, unique: true },
      { name: 'entity_tenant_idx', database: 'neo4j', type: 'btree', label: 'Entity', properties: ['tenantId'], priority: 'high', tenantScoped: false },
      { name: 'investigation_id_idx', database: 'neo4j', type: 'btree', label: 'Investigation', properties: ['id'], priority: 'critical', tenantScoped: false, unique: true },
      { name: 'person_email_idx', database: 'neo4j', type: 'btree', label: 'Person', properties: ['email'], priority: 'high', tenantScoped: false },
      { name: 'mediasource_id_idx', database: 'neo4j', type: 'btree', label: 'MediaSource', properties: ['id'], priority: 'high', tenantScoped: false },
    ];

    for (const def of commonIndexes) {
       try {
        // We use createIndex from indexManager which handles "IF NOT EXISTS" logic via error catching usually,
        // but let's assume indexManager's `createNeo4jIndex` might fail if it exists.
        // The `createNeo4jIndex` implementation does `CREATE INDEX ...`.
        // We should check if it exists first or suppress error.
        await indexManager.createIndex(def);
        logger.info(`Applied common index: ${def.name}`);
      } catch (err: any) {
        if (err.message && err.message.includes('already exists')) {
             logger.info(`Index ${def.name} already exists.`);
        } else {
             logger.error({ err, def }, 'Failed to apply common index');
        }
      }
    }

    logger.info('Index application complete.');

  } catch (error) {
    logger.error('Error applying indexes', error);
  } finally {
    indexManager.cleanup();
  }
}

// applyRecommendedIndexes();
export { applyRecommendedIndexes };
