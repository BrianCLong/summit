import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino();

// Load API keys from environment variable (comma separated)
// In a real scenario, this might come from a database or secret manager
let API_KEYS = new Set(
  (process.env.API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean)
);

// Refresh keys (useful if env vars change or for rotation logic hooks)
export const refreshApiKeys = () => {
  API_KEYS = new Set(
    (process.env.API_KEYS || '').split(',').map((k) => k.trim()).filter(Boolean)
  );
};

export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  // If an API key is provided, validate it
  if (apiKey) {
    if (API_KEYS.has(apiKey)) {
      (req as any).user = { type: 'api-key', key: apiKey }; // Mark as API key user
      return next();
    } else {
      logger.warn(`Invalid API Key attempt from ${req.ip}`);
      return res.status(401).json({ error: 'Invalid API Key' });
    }
  }

  // If no API key, continue to next middleware (which might be JWT auth)
  next();
};

// Strict version that requires API key OR valid JWT (used in composition)
export const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'API Key required' });
  }

  validateApiKey(req, res, next);
};
