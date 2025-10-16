import SemanticSearchService from '../services/SemanticSearchService';

describe('SemanticSearchService', () => {
  class MockEmbeddingService {
    async generateEmbedding({ text }: { text: string }): Promise<number[]> {
      return [text.includes('threat') ? 1 : 0];
    }
  }

  class MockWeaviateClient {
    docs: any[] = [];
    data = {
      creator: () => {
        const ctx = this;
        const record: any = {};
        return {
          withClassName(name: string) {
            record.className = name;
            return this;
          },
          withId(id: string) {
            record.id = id;
            return this;
          },
          withVector(vector: number[]) {
            record.vector = vector;
            return this;
          },
          withProperties(props: any) {
            record.props = props;
            return this;
          },
          async do() {
            ctx.docs.push(record);
          },
        };
      },
    };
    graphql = {
      get: () => {
        const ctx = this;
        const query: any = { limit: 10 };
        return {
          withClassName(name: string) {
            query.className = name;
            return this;
          },
          withFields(_f: string) {
            return this;
          },
          withNearVector(nv: any) {
            query.nearVector = nv;
            return this;
          },
          withWhere(where: any) {
            query.where = where;
            return this;
          },
          withLimit(limit: number) {
            query.limit = limit;
            return this;
          },
          async do() {
            let items = ctx.docs;
            if (query.where?.operands) {
              for (const op of query.where.operands) {
                const field = op.path[0];
                const val = op.valueString ?? op.valueInt ?? op.valueDate;
                if (op.operator === 'Equal') {
                  items = items.filter((d) => d.props[field] === val);
                } else if (op.operator === 'GreaterThanEqual') {
                  items = items.filter((d) => d.props[field] >= val);
                } else if (op.operator === 'LessThanEqual') {
                  items = items.filter((d) => d.props[field] <= val);
                }
              }
            }
            items = items
              .map((d) => ({
                ...d.props,
                _additional: {
                  distance: Math.abs(d.vector[0] - query.nearVector.vector[0]),
                },
              }))
              .sort((a, b) => a._additional.distance - b._additional.distance)
              .slice(0, query.limit);
            const data: any = {};
            data[query.className] = items;
            return { data: { Get: data } };
          },
        };
      },
    };
  }

  it('performs search with metadata filters', async () => {
    const client = new MockWeaviateClient();
    const service = new SemanticSearchService(
      client as any,
      new MockEmbeddingService() as any,
    );

    await service.indexDocument({
      id: '1',
      text: 'threat report one',
      source: 'OSINT',
      date: '2024-01-01',
      threatLevel: 3,
      graphId: 'e1',
    });
    await service.indexDocument({
      id: '2',
      text: 'benign report',
      source: 'OSINT',
      date: '2024-01-02',
      threatLevel: 1,
      graphId: 'e2',
    });

    const results = await service.search('threat', {
      source: 'OSINT',
      threatLevel: 3,
    });
    expect(results).toHaveLength(1);
    expect(results[0].metadata.graphId).toBe('e1');
  });
});
