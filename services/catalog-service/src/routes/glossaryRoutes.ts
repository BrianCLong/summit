/**
 * Glossary API Routes
 * Endpoints for business glossary management
 */

import { Router } from 'express';

export const glossaryRouter = Router();

// Placeholder routes - implement controllers as needed
glossaryRouter.get('/terms', (req, res) => {
  res.json({ message: 'Get all terms' });
});

glossaryRouter.post('/terms', (req, res) => {
  res.json({ message: 'Create term' });
});

glossaryRouter.get('/categories', (req, res) => {
  res.json({ message: 'Get all categories' });
});
