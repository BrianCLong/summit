/**
 * Security middleware for IntelGraph API
 */
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { trackError } = require('../monitoring/middleware');
const logger = require('../utils/logger');

/**
 * General API rate limiter
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message, retryAfter: Math.ceil(windowMs / 1000) },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      trackError('rate_limiting', 'RateLimitExceeded');
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method
      });
      
      res.status(429).json({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    }
  });
};

/**
 * Strict rate limiter for sensitive endpoints
 */
const strictRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests max
  'Too many requests to sensitive endpoint'
);

/**
 * Auth rate limiter for login attempts
 */
const authRateLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts max
  'Too many authentication attempts'
);

/**
 * AI/ML processing rate limiter
 */
const aiRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 requests max
  'Too many AI processing requests'
);

/**
 * GraphQL rate limiter
 */
const graphqlRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  50, // 50 queries max
  'Too many GraphQL requests'
);

/**
 * Request size limiter middleware
 */
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const maxBytes = typeof maxSize === 'string' 
      ? parseInt(maxSize.replace(/\D/g, '')) * (maxSize.includes('mb') ? 1024 * 1024 : 1024)
      : maxSize;
    
    if (contentLength > maxBytes) {
      trackError('security', 'RequestTooLarge');
      logger.warn('Request size exceeded limit', {
        ip: req.ip,
        contentLength,
        maxBytes,
        path: req.path
      });
      
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSize,
        received: contentLength
      });
    }
    
    next();
  };
};

/**
 * IP whitelist middleware for admin endpoints
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Allow localhost in development
    const devIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
    const allAllowedIPs = [...allowedIPs, ...devIPs];
    
    if (!allAllowedIPs.includes(clientIP)) {
      trackError('security', 'UnauthorizedIP');
      logger.warn('Unauthorized IP access attempt', {
        ip: clientIP,
        path: req.path,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({
        error: 'Access denied',
        message: 'IP not authorized'
      });
    }
    
    next();
  };
};

/**
 * API key validation middleware
 */
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!apiKey) {
    trackError('security', 'MissingAPIKey');
    return res.status(401).json({
      error: 'API key required',
      message: 'Include X-API-Key header or api_key query parameter'
    });
  }
  
  if (!validKeys.includes(apiKey)) {
    trackError('security', 'InvalidAPIKey');
    logger.warn('Invalid API key used', {
      ip: req.ip,
      path: req.path,
      keyPrefix: apiKey.substring(0, 8) + '...'
    });
    
    return res.status(401).json({
      error: 'Invalid API key'
    });
  }
  
  req.apiKey = apiKey;
  next();
};

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.\//g, // Path traversal
    /<script/gi, // XSS
    /union.*select/gi, // SQL injection
    /javascript:/gi, // XSS
    /eval\(/gi, // Code injection
  ];
  
  const requestStr = JSON.stringify({
    url: req.url,
    query: req.query,
    body: req.body
  });
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestStr)) {
      trackError('security', 'SuspiciousRequest');
      logger.warn('Suspicious request pattern detected', {
        ip: req.ip,
        path: req.path,
        pattern: pattern.toString(),
        userAgent: req.get('User-Agent')
      });
      
      return res.status(400).json({
        error: 'Invalid request format'
      });
    }
  }
  
  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS configuration for specific origins
 */
const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://intelgraph.app'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      trackError('security', 'UnauthorizedOrigin');
      logger.warn('Unauthorized CORS origin', { origin });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Requested-With']
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length')
    });
  });
  
  next();
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  trackError('middleware', err.name || 'UnknownError');
  
  logger.error('Middleware error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack })
  });
};

module.exports = {
  // Rate limiters
  createRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  aiRateLimiter,
  graphqlRateLimiter,
  
  // Security middleware
  requestSizeLimiter,
  ipWhitelist,
  apiKeyAuth,
  validateRequest,
  securityHeaders,
  corsConfig,
  requestLogger,
  errorHandler
};