import { z } from 'zod';
import Joi from 'joi';

export const EvidenceSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Query parameter 'q' is required")
    .max(300, 'Query must be 300 characters or fewer'),
  skip: z.coerce.number().int().min(0).max(1000).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const EvidenceSearchQueryJoi = Joi.object({
  q: Joi.string().trim().min(1).max(300).required(),
  skip: Joi.number().integer().min(0).max(1000).default(0),
  limit: Joi.number().integer().min(1).max(100).default(10),
});
