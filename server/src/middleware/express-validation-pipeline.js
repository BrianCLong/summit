"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expressValidationPipeline = void 0;
const express_validator_1 = require("express-validator");
const htmlSanitizer_js_1 = require("../utils/htmlSanitizer.js");
const sanitizeChains = [
    (0, express_validator_1.body)('*').optional({ nullable: true }).customSanitizer(htmlSanitizer_js_1.deepSanitize),
    (0, express_validator_1.query)('*').optional({ nullable: true }).customSanitizer(htmlSanitizer_js_1.deepSanitize),
    (0, express_validator_1.param)('*').optional({ nullable: true }).customSanitizer(htmlSanitizer_js_1.deepSanitize),
];
const expressValidationPipeline = async (req, res, next) => {
    await Promise.all(sanitizeChains.map((chain) => chain.run(req)));
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array({ onlyFirstError: true }),
        });
    }
    req.body = (0, htmlSanitizer_js_1.deepSanitize)(req.body);
    req.query = (0, htmlSanitizer_js_1.deepSanitize)(req.query);
    req.params = (0, htmlSanitizer_js_1.deepSanitize)(req.params);
    return next();
};
exports.expressValidationPipeline = expressValidationPipeline;
