/**
 * Security configuration for Summit application
 * Implements security best practices to prevent common vulnerabilities
 */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

// Security middleware configuration
const securityMiddleware = {
  // Helmet configuration for security headers
  helmet: helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", 'cdnjs.cloudflare.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.example.com'],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'DENY'
    },
    referrerPolicy: {
      policy: ['origin-when-cross-origin']
    }
  }),

  // Rate limiting to prevent DoS attacks
  rateLimit: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // MongoDB query sanitization
  mongoSanitize: mongoSanitize(),

  // XSS protection
  xss: xss(),

  // HTTP Parameter Pollution protection
  hpp: hpp(),

  // CORS configuration
  cors: cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  })
};

module.exports = securityMiddleware;
