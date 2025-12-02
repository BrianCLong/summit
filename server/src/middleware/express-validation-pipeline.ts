import type { RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { deepSanitize } from '../utils/htmlSanitizer.js';

const sanitizeChains = [
  body('*').optional({ nullable: true }).customSanitizer(deepSanitize),
  query('*').optional({ nullable: true }).customSanitizer(deepSanitize),
  param('*').optional({ nullable: true }).customSanitizer(deepSanitize),
];

export const expressValidationPipeline: RequestHandler = async (req, res, next) => {
  await Promise.all(sanitizeChains.map((chain) => chain.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array({ onlyFirstError: true }),
    });
  }

  req.body = deepSanitize(req.body);
  req.query = deepSanitize(req.query);
  req.params = deepSanitize(req.params);

  return next();
};
