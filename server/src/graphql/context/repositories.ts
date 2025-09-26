import { getPostgresPool } from '../../db/postgres.js';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { EntityRepo } from '../../repos/EntityRepo.js';
import { RelationshipRepo } from '../../repos/RelationshipRepo.js';
import { InvestigationRepo } from '../../repos/InvestigationRepo.js';

const pg = getPostgresPool();
const neo4j = getNeo4jDriver();

export const entityRepo = new EntityRepo(pg, neo4j);
export const relationshipRepo = new RelationshipRepo(pg, neo4j);
export const investigationRepo = new InvestigationRepo(pg);

export type EntityRepository = typeof entityRepo;
export type RelationshipRepository = typeof relationshipRepo;
export type InvestigationRepository = typeof investigationRepo;
