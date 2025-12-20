import { SearchIndex } from '../types';

/**
 * Elasticsearch index mappings with synonym support and optimized analyzers
 */

export const SYNONYMS = {
  // Entity type synonyms
  entityTypes: [
    'person, individual, human, people, personnel, actor, subject',
    'organization, company, corp, corporation, enterprise, business, org, firm',
    'location, place, address, geo, position, site, venue, area',
    'event, incident, occurrence, happening, activity, action',
    'threat, danger, risk, vulnerability, attack, exploit, malware, breach',
    'document, file, report, paper, record, publication, memo',
    'asset, resource, system, infrastructure, facility',
    'communication, message, email, correspondence, transmission',
  ],

  // Domain-specific synonyms
  intelligence: [
    'intel, intelligence, information, data, insights',
    'analysis, assessment, evaluation, investigation, research',
    'source, origin, provider, feed, channel',
    'target, subject, entity, actor, person of interest, poi',
    'network, group, organization, ring, cell',
    'operation, mission, activity, campaign, exercise',
  ],

  // Action synonyms
  actions: [
    'create, add, insert, establish, generate',
    'update, modify, change, edit, revise',
    'delete, remove, erase, eliminate',
    'link, connect, associate, relate, tie',
    'investigate, research, analyze, examine, study',
  ],
};

export const ENTITY_INDEX_MAPPING: SearchIndex = {
  name: 'summit-entities',
  mappings: {
    properties: {
      id: { type: 'keyword' },
      tenantId: { type: 'keyword' },
      kind: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
        analyzer: 'entity_analyzer',
      },
      labels: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      title: {
        type: 'text',
        analyzer: 'content_analyzer',
        search_analyzer: 'search_analyzer',
        fields: {
          exact: { type: 'keyword' },
          suggest: {
            type: 'completion',
            analyzer: 'simple',
          },
        },
      },
      content: {
        type: 'text',
        analyzer: 'content_analyzer',
        search_analyzer: 'search_analyzer',
      },
      description: {
        type: 'text',
        analyzer: 'content_analyzer',
        search_analyzer: 'search_analyzer',
      },
      props: { type: 'object', enabled: true },
      tags: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
        analyzer: 'tag_analyzer',
      },
      source: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      confidence: { type: 'float' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      createdBy: { type: 'keyword' },
      neighbors: {
        type: 'nested',
        properties: {
          id: { type: 'keyword' },
          type: { type: 'keyword' },
          relationship: { type: 'keyword' },
        },
      },
      graphScore: { type: 'float' },
      // Vector embedding for semantic search
      embedding_vector: {
        type: 'dense_vector',
        dims: 384,
        index: true,
        similarity: 'cosine',
      },
    },
  },
  settings: {
    number_of_shards: 3,
    number_of_replicas: 1,
    max_result_window: 10000,
    analysis: {
      filter: {
        english_stop: {
          type: 'stop',
          stopwords: '_english_',
        },
        english_stemmer: {
          type: 'stemmer',
          language: 'english',
        },
        synonym_filter: {
          type: 'synonym',
          synonyms: [
            ...SYNONYMS.entityTypes,
            ...SYNONYMS.intelligence,
            ...SYNONYMS.actions,
          ],
        },
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 15,
        },
      },
      analyzer: {
        content_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'english_stop',
            'synonym_filter',
            'english_stemmer',
          ],
        },
        search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'english_stop',
            'synonym_filter',
            'english_stemmer',
          ],
        },
        entity_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'synonym_filter'],
        },
        tag_analyzer: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['lowercase'],
        },
        autocomplete_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'edge_ngram_filter'],
        },
        autocomplete_search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase'],
        },
      },
    },
  },
  aliases: ['entities', 'search-entities'],
  documentCount: 0,
  sizeInBytes: 0,
  status: 'green',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const CASE_INDEX_MAPPING: SearchIndex = {
  name: 'summit-cases',
  mappings: {
    properties: {
      id: { type: 'keyword' },
      tenantId: { type: 'keyword' },
      caseNumber: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      title: {
        type: 'text',
        analyzer: 'content_analyzer',
        search_analyzer: 'search_analyzer',
        fields: {
          exact: { type: 'keyword' },
          suggest: {
            type: 'completion',
            analyzer: 'simple',
          },
        },
      },
      description: {
        type: 'text',
        analyzer: 'content_analyzer',
        search_analyzer: 'search_analyzer',
      },
      status: { type: 'keyword' },
      priority: { type: 'keyword' },
      classification: { type: 'keyword' },
      tags: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
        analyzer: 'tag_analyzer',
      },
      assignedTo: { type: 'keyword' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      closedAt: { type: 'date' },
      createdBy: { type: 'keyword' },
    },
  },
  settings: {
    number_of_shards: 2,
    number_of_replicas: 1,
    analysis: {
      filter: {
        english_stop: {
          type: 'stop',
          stopwords: '_english_',
        },
        english_stemmer: {
          type: 'stemmer',
          language: 'english',
        },
        synonym_filter: {
          type: 'synonym',
          synonyms: [...SYNONYMS.intelligence, ...SYNONYMS.actions],
        },
      },
      analyzer: {
        content_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'english_stop',
            'synonym_filter',
            'english_stemmer',
          ],
        },
        search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'english_stop',
            'synonym_filter',
            'english_stemmer',
          ],
        },
        tag_analyzer: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['lowercase'],
        },
      },
    },
  },
  aliases: ['cases', 'search-cases'],
  documentCount: 0,
  sizeInBytes: 0,
  status: 'green',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const DOCUMENT_INDEX_MAPPING: SearchIndex = {
  name: 'summit-documents',
  mappings: {
    properties: {
      id: { type: 'keyword' },
      tenantId: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'content_analyzer',
        search_analyzer: 'search_analyzer',
        fields: {
          exact: { type: 'keyword' },
          suggest: {
            type: 'completion',
            analyzer: 'simple',
          },
        },
      },
      content: {
        type: 'text',
        analyzer: 'content_analyzer',
        search_analyzer: 'search_analyzer',
      },
      fileType: { type: 'keyword' },
      fileSize: { type: 'long' },
      mimeType: { type: 'keyword' },
      classification: { type: 'keyword' },
      tags: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
        analyzer: 'tag_analyzer',
      },
      source: { type: 'keyword' },
      author: { type: 'keyword' },
      uploadedBy: { type: 'keyword' },
      caseId: { type: 'keyword' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      embedding_vector: {
        type: 'dense_vector',
        dims: 384,
        index: true,
        similarity: 'cosine',
      },
    },
  },
  settings: {
    number_of_shards: 3,
    number_of_replicas: 1,
    analysis: {
      filter: {
        english_stop: {
          type: 'stop',
          stopwords: '_english_',
        },
        english_stemmer: {
          type: 'stemmer',
          language: 'english',
        },
        synonym_filter: {
          type: 'synonym',
          synonyms: [...SYNONYMS.intelligence],
        },
      },
      analyzer: {
        content_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'english_stop',
            'synonym_filter',
            'english_stemmer',
          ],
        },
        search_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: [
            'lowercase',
            'english_stop',
            'synonym_filter',
            'english_stemmer',
          ],
        },
        tag_analyzer: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['lowercase'],
        },
      },
    },
  },
  aliases: ['documents', 'search-documents'],
  documentCount: 0,
  sizeInBytes: 0,
  status: 'green',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const ALL_INDEX_MAPPINGS = [
  ENTITY_INDEX_MAPPING,
  CASE_INDEX_MAPPING,
  DOCUMENT_INDEX_MAPPING,
];

/**
 * Get index mapping by name
 */
export function getIndexMapping(indexName: string): SearchIndex | undefined {
  return ALL_INDEX_MAPPINGS.find((mapping) => mapping.name === indexName);
}

/**
 * Get all index names
 */
export function getAllIndexNames(): string[] {
  return ALL_INDEX_MAPPINGS.map((mapping) => mapping.name);
}
