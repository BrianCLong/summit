
export const AURELIUS_SCHEMA = `
  # Nodes
  (:Patent {patentNumber, title, abstract, claims, filingDate, publicationDate, inventors, assignees, classification, source, tenantId})
  (:ResearchPaper {doi, title, abstract, authors, publicationDate, venue, source, tenantId})
  (:Concept {name, description, domain, noveltyScore, tenantId})
  (:PriorArtCluster {name, density, keywords, tenantId})
  (:InventionDraft {title, problemStatement, noveltyArgument, claims, status, noveltyScore, generatedAt, tenantId})
  (:CompetitiveEntity {name, type, domain, riskScore, tenantId})
  (:Opportunity {title, description, type, impactScore, timeSensitivity, status, tenantId})
  (:ForesightScenario {name, description, timeline, probability, riskLevel, parameters, tenantId})

  # Relationships
  (:Patent)-[:CITES]->(:Patent)
  (:ResearchPaper)-[:CITES]->(:ResearchPaper)
  (:Patent)-[:CITES]->(:ResearchPaper)
  (:Concept)-[:EXTRACTED_FROM]->(:Patent)
  (:Concept)-[:EXTRACTED_FROM]->(:ResearchPaper)
  (:Concept)-[:BELONGS_TO]->(:PriorArtCluster)
  (:InventionDraft)-[:USES_CONCEPT]->(:Concept)
  (:InventionDraft)-[:SIMILAR_TO {score}]->(:Patent)
  (:CompetitiveEntity)-[:OWNS]->(:Patent)
  (:CompetitiveEntity)-[:PUBLISHED]->(:ResearchPaper)
  (:Opportunity)-[:ADDRESSES]->(:ForesightScenario)
  (:Opportunity)-[:LEVERAGES]->(:Concept)
  (:Opportunity)-[:TARGETS]->(:CompetitiveEntity)
`;

export const INDEX_DEFINITIONS = [
  'CREATE INDEX patent_number_index IF NOT EXISTS FOR (n:Patent) ON (n.patentNumber)',
  'CREATE INDEX paper_doi_index IF NOT EXISTS FOR (n:ResearchPaper) ON (n.doi)',
  'CREATE INDEX concept_name_index IF NOT EXISTS FOR (n:Concept) ON (n.name)',
  'CREATE INDEX entity_name_index IF NOT EXISTS FOR (n:CompetitiveEntity) ON (n.name)',
  'CREATE VECTOR INDEX patent_embedding_index IF NOT EXISTS FOR (n:Patent) ON (n.embedding) OPTIONS {indexConfig: {`vector.dimensions`: 3072, `vector.similarity_function`: `cosine`}}',
  'CREATE VECTOR INDEX concept_embedding_index IF NOT EXISTS FOR (n:Concept) ON (n.embedding) OPTIONS {indexConfig: {`vector.dimensions`: 3072, `vector.similarity_function`: `cosine`}}'
];
