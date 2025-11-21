import { createNLPRouter } from './nlp';
import express, { Express } from 'express';
import request from 'supertest';

describe('NLP Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/nlp', createNLPRouter());
  });

  describe('POST /api/nlp/preprocess', () => {
    it('should preprocess text', async () => {
      const response = await request(app)
        .post('/api/nlp/preprocess')
        .send({ text: 'Hello WORLD' });

      expect(response.status).toBe(200);
      expect(response.body.processed).toBeDefined();
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/nlp/preprocess')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/nlp/tokenize', () => {
    it('should tokenize text into words', async () => {
      const response = await request(app)
        .post('/api/nlp/tokenize')
        .send({ text: 'Hello world test', type: 'words' });

      expect(response.status).toBe(200);
      expect(response.body.tokens).toBeDefined();
      expect(Array.isArray(response.body.tokens)).toBe(true);
    });

    it('should tokenize text into sentences', async () => {
      const response = await request(app)
        .post('/api/nlp/tokenize')
        .send({ text: 'Hello world. How are you?', type: 'sentences' });

      expect(response.status).toBe(200);
      expect(response.body.tokens).toBeDefined();
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/nlp/tokenize')
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/nlp/detect-language', () => {
    it('should detect language', async () => {
      const response = await request(app)
        .post('/api/nlp/detect-language')
        .send({ text: 'Hello world' });

      expect(response.status).toBe(200);
      expect(response.body.language).toBeDefined();
      expect(response.body.confidence).toBeDefined();
    });

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/nlp/detect-language')
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
