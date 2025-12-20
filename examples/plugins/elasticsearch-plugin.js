/**
 * Example Elasticsearch Plugin for Summit
 *
 * This plugin listens for entity creation events and indexes them into Elasticsearch.
 */

const { registerPlugin } = require('@summit/core');
const { Client } = require('@elastic/elasticsearch');

const client = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });

module.exports = registerPlugin({
  name: 'elasticsearch-indexer',
  version: '1.0.0',

  async onInit(context) {
    context.logger.info('Elasticsearch Indexer Plugin Initialized');

    // Create index if not exists
    const indexExists = await client.indices.exists({ index: 'summit-entities' });
    if (!indexExists) {
      await client.indices.create({ index: 'summit-entities' });
    }
  },

  hooks: {
    'entity:created': async (entity, context) => {
      try {
        await client.index({
          index: 'summit-entities',
          document: {
            id: entity.id,
            type: entity.type,
            properties: entity.props,
            createdAt: entity.createdAt,
            indexedAt: new Date()
          }
        });
        context.logger.info(`Indexed entity ${entity.id} to Elasticsearch`);
      } catch (err) {
        context.logger.error('Failed to index entity', err);
      }
    }
  }
});
