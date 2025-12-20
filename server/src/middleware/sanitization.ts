import mongoSanitize from 'express-mongo-sanitize';

// This middleware removes any keys that start with '$' or '.',
// which could be used to execute malicious queries.
export const sanitizeInput = mongoSanitize();
