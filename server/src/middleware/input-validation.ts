import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validateInput = (validations: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

// Common validation rules
export const commonValidations = {
  id: body('id')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('ID must be a non-empty string'),
  name: body('name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Name must be a non-empty string'),
  email: body('email').isEmail().withMessage('Invalid email address'),
  password: body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  limit: body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  offset: body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
};
