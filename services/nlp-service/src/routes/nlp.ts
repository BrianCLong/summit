/**
 * NLP routes
 */

import { Router } from 'express';
import { TextPreprocessor, Tokenizer, LanguageDetector } from '@intelgraph/nlp';

export function createNLPRouter(): Router {
  const router = Router();

  const preprocessor = new TextPreprocessor();
  const tokenizer = new Tokenizer();
  const languageDetector = new LanguageDetector();

  /**
   * POST /api/nlp/preprocess
   * Preprocess text
   */
  router.post('/preprocess', async (req, res, next) => {
    try {
      const { text, options } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const processed = preprocessor.preprocess(text);

      res.json({ processed });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/nlp/tokenize
   * Tokenize text
   */
  router.post('/tokenize', async (req, res, next) => {
    try {
      const { text, type = 'words' } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = type === 'sentences'
        ? tokenizer.sentenceTokenize(text)
        : tokenizer.tokenize(text);

      res.json({ tokens: result });
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /api/nlp/detect-language
   * Detect language
   */
  router.post('/detect-language', async (req, res, next) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const result = languageDetector.detect(text, { detailed: true });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
