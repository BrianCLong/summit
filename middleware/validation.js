/**
 * Input validation middleware for Summit application
 * Validates and sanitizes all incoming requests
 */
const validator = require('validator');
const rateLimit = require('express-rate-limit');

// Input validation middleware
const validateInput = (req, res, next) => {
  // Sanitize query parameters
  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = validator.escape(value.trim());
      }
    }
  }

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = validator.escape(value.trim());
      }
    }
  }

  // Validate request headers
  const userAgent = req.get('User-Agent');
  if (userAgent && typeof userAgent === 'string') {
    // Block common malicious patterns in User-Agent
    if (/sqlmap|nikto|nessus|nmap|masscan|zmap|zgrab|gobuster|dirbuster/i.test(userAgent)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  next();
};

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  validateInput,
  apiLimiter,
  authLimiter
};
