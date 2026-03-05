import { Request, Response, NextFunction } from 'express';
import { SanitizationUtils } from '../validation/index.js';

const sanitizeRequest = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body) {
    req.body = SanitizationUtils.sanitizeUserInput(req.body);
  }

  if (req.query) {
    req.query = SanitizationUtils.sanitizeUserInput(req.query);
  }

  if (req.params) {
    req.params = SanitizationUtils.sanitizeUserInput(req.params);
  }

  next();
};

export default sanitizeRequest;
