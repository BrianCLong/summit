"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonValidations = exports.validateInput = void 0;
const express_validator_1 = require("express-validator");
const validateInput = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (errors.isEmpty()) {
            return next();
        }
        res.status(400).json({ errors: errors.array() });
    };
};
exports.validateInput = validateInput;
// Common validation rules
exports.commonValidations = {
    id: (0, express_validator_1.body)('id')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('ID must be a non-empty string'),
    name: (0, express_validator_1.body)('name')
        .isString()
        .trim()
        .notEmpty()
        .withMessage('Name must be a non-empty string'),
    email: (0, express_validator_1.body)('email').isEmail().withMessage('Invalid email address'),
    password: (0, express_validator_1.body)('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),
    limit: (0, express_validator_1.body)('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be an integer between 1 and 100'),
    offset: (0, express_validator_1.body)('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
};
