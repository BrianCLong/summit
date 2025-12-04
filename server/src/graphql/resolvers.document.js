import { neo } from '../db/neo4j.js';
import { randomUUID } from 'node:crypto';

export const documentResolvers = {
  Document: {
    relationships: async (parent, _) => {
      const result = await neo.run(
        `
        MATCH (d:Document {id: $id})-[r:RELATED]->(other:Document)
        RETURN r, other
      `,
        { id: parent.id }
      );

      return result.records.map((record) => {
        const rel = record.get('r').properties;
        const otherDoc = record.get('other').properties;
        return {
          type: rel.type,
          document: {
            id: otherDoc.id,
            tenantId: otherDoc.tenantId,
            subType: otherDoc.props.subType,
            variants: otherDoc.props.variants,
            entity: otherDoc,
          },
        };
      });
    },
    category: async (parent, _) => {
      const result = await neo.run(
        `
        MATCH (c:DocumentCategory)-[:HAS_DOCUMENT]->(d:Document {id: $id})
        RETURN c.name as categoryName
      `,
        { id: parent.id }
      );
      return result.records[0]?.get('categoryName') || null;
    },
  },
  Query: {
    document: async (_, { id, tenantId }) => {
      const result = await neo.run(
        'MATCH (d:Document {id: $id, tenantId: $tenantId}) RETURN d',
        { id, tenantId }
      );
      if (result.records.length === 0) {
        return null;
      }
      const doc = result.records[0].get('d').properties;
      return {
        id: doc.id,
        tenantId: doc.tenantId,
        subType: doc.props.subType,
        variants: doc.props.variants,
        entity: doc,
      };
    },
    documents: async (_, { tenantId, category, subType, name }) => {
      const conditions = [];
      const params = { tenantId };

      let query = `MATCH (d:Document {tenantId: $tenantId})`;

      if (category) {
        query += `
          MATCH (c:DocumentCategory {name: $category})-[:HAS_DOCUMENT]->(d)
        `;
        params.category = category;
      }

      if (subType) {
        conditions.push('d.props.subType = $subType');
        params.subType = subType;
      }

      if (name) {
        conditions.push('d.name = $name');
        params.name = name;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      query += ' RETURN d';

      const result = await neo.run(query, params);

      return result.records.map((record) => {
        const doc = record.get('d').properties;
        return {
          id: doc.id,
          tenantId: doc.tenantId,
          subType: doc.props.subType,
          variants: doc.props.variants,
          entity: doc,
        };
      });
    },
  },
  Mutation: {
    createDocument: async (_, { input }) => {
      const { tenantId, name, category, props } = input;
      const variants = name.split(' / ').map(v => v.trim());
      const subType = variants[0];
      const result = await neo.run(
        `
        MERGE (c:Entity:DocumentCategory { name: $category, tenantId: $tenantId })
        ON CREATE SET c.id = randomUUID(), c.createdAt = datetime(), c.kind = 'DocumentCategory', c.props = { name: $category }

        MERGE (d:Entity:Document { name: $name, tenantId: $tenantId })
        ON CREATE SET
          d.id = randomUUID(),
          d.kind = 'Document',
          d.props = $props,
          d.createdAt = datetime()
        ON MATCH SET
          d.props = $props

        MERGE (c)-[:HAS_DOCUMENT]->(d)

        RETURN d
      `,
        {
          name,
          tenantId,
          category,
          props: {
            ...props,
            name,
            subType,
            variants,
          },
        }
      );
      const newDoc = result.records[0].get('d').properties;
      return {
        id: newDoc.id,
        tenantId: newDoc.tenantId,
        subType: newDoc.props.subType,
        variants: newDoc.props.variants,
        entity: newDoc,
      };
    },
  },
};
