import { Router } from 'express';
import { db } from '../utils/db.js';
import { productService } from '../services/productService.js';

export const providerRoutes = Router();

// Get provider profile
providerRoutes.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM data_providers WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    res.json(mapRowToProvider(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

// Get provider's products
providerRoutes.get('/:id/products', async (req, res, next) => {
  try {
    const products = await productService.getByProvider(req.params.id);
    // Only return published products for public view
    const published = products.filter((p) => p.status === 'published');
    res.json(published);
  } catch (err) {
    next(err);
  }
});

// Get provider's reviews
providerRoutes.get('/:id/reviews', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.name as reviewer_name
       FROM reviews r
       LEFT JOIN users u ON r.reviewer_id = u.id
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

function mapRowToProvider(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    verified: row.verified,
    verificationDate: row.verification_date,
    rating: row.rating,
    totalTransactions: row.total_transactions,
    createdAt: row.created_at,
  };
}
