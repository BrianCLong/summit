import { TopicModeler } from './index';

describe('TopicModeler', () => {
  let modeler: TopicModeler;

  beforeEach(() => {
    modeler = new TopicModeler();
  });

  const sampleDocuments = [
    'Machine learning is a subset of artificial intelligence that enables systems to learn.',
    'Deep learning uses neural networks with multiple layers to process data.',
    'Natural language processing enables computers to understand and generate text.',
    'Computer vision allows machines to interpret and understand visual information.',
    'Reinforcement learning is about training agents to make decisions.',
  ];

  describe('lda', () => {
    it('should return topics', () => {
      const topics = modeler.lda(sampleDocuments, 3);
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBe(3);
    });

    it('should return topics with keywords', () => {
      const topics = modeler.lda(sampleDocuments, 2);
      topics.forEach(topic => {
        expect(topic.keywords).toBeDefined();
        expect(Array.isArray(topic.keywords)).toBe(true);
        expect(topic.keywords.length).toBeGreaterThan(0);
      });
    });

    it('should include keyword weights', () => {
      const topics = modeler.lda(sampleDocuments, 2);
      topics.forEach(topic => {
        topic.keywords.forEach(keyword => {
          expect(typeof keyword.word).toBe('string');
          expect(typeof keyword.weight).toBe('number');
        });
      });
    });

    it('should include topic IDs', () => {
      const topics = modeler.lda(sampleDocuments, 3);
      topics.forEach(topic => {
        expect(topic.id).toBeDefined();
        expect(typeof topic.id).toBe('string');
      });
    });

    it('should include coherence scores', () => {
      const topics = modeler.lda(sampleDocuments, 2);
      topics.forEach(topic => {
        expect(typeof topic.coherence).toBe('number');
      });
    });
  });

  describe('nmf', () => {
    it('should return topics similar to LDA', () => {
      const topics = modeler.nmf(sampleDocuments, 3);
      expect(Array.isArray(topics)).toBe(true);
      expect(topics.length).toBe(3);
    });
  });

  describe('bertopic', () => {
    it('should return topics', async () => {
      const topics = await modeler.bertopic(sampleDocuments, 3);
      expect(Array.isArray(topics)).toBe(true);
    });
  });

  describe('hierarchical', () => {
    it('should return hierarchical topics', () => {
      const hierarchy = modeler.hierarchical(sampleDocuments, 2);
      expect(hierarchy instanceof Map).toBe(true);
      expect(hierarchy.size).toBe(2);
    });

    it('should have topics at each level', () => {
      const hierarchy = modeler.hierarchical(sampleDocuments, 2);
      hierarchy.forEach((topics, level) => {
        expect(Array.isArray(topics)).toBe(true);
        expect(topics.length).toBeGreaterThan(0);
      });
    });
  });

  describe('dynamic', () => {
    it('should return topics over time', () => {
      const documents = sampleDocuments.map((text, idx) => ({
        text,
        timestamp: new Date(2024, 0, idx + 1),
      }));

      const timeline = modeler.dynamic(documents, 2);
      expect(timeline instanceof Map).toBe(true);
    });
  });

  describe('assignDocuments', () => {
    it('should assign documents to topics', () => {
      const topics = modeler.lda(sampleDocuments, 2);
      const assignments = modeler.assignDocuments(sampleDocuments, topics);

      expect(assignments).toHaveLength(sampleDocuments.length);
      assignments.forEach(assignment => {
        expect(typeof assignment.documentId).toBe('number');
        expect(Array.isArray(assignment.topics)).toBe(true);
      });
    });

    it('should include topic probabilities', () => {
      const topics = modeler.lda(sampleDocuments, 2);
      const assignments = modeler.assignDocuments(sampleDocuments, topics);

      assignments.forEach(assignment => {
        assignment.topics.forEach(t => {
          expect(typeof t.topicId).toBe('string');
          expect(typeof t.probability).toBe('number');
        });
      });
    });
  });
});
