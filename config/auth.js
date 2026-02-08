/**
 * Authentication security configuration for Summit application
 * Implements secure authentication practices
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Password security configuration
const passwordConfig = {
  // Minimum password strength requirements
  minLength: 12,
  requireNumbers: true,
  requireSpecialChars: true,
  requireUppercase: true,
  requireLowercase: true,
  
  // Bcrypt salt rounds (higher = more secure but slower)
  saltRounds: 12,
  
  // Password validation function
  validatePassword: (password) => {
    if (password.length < passwordConfig.minLength) {
      return { valid: false, message: `Password must be at least ${passwordConfig.minLength} characters long` };
    }
    
    if (passwordConfig.requireNumbers && !/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' };
    }
    
    if (passwordConfig.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    
    if (passwordConfig.requireUppercase && !/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' };
    }
    
    if (passwordConfig.requireLowercase && !/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' };
    }
    
    // Check against common passwords
    const commonPasswords = [
      'password', '12345678', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon'
    ];
    
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      return { valid: false, message: 'Password is too common' };
    }
    
    return { valid: true, message: 'Password meets security requirements' };
  }
};

// JWT security configuration
const jwtConfig = {
  // Use strong secrets
  secret: process.env.JWT_SECRET || 'STRONG_SECRET_SHOULD_BE_SET_IN_ENVIRONMENT',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'STRONG_REFRESH_SECRET_SHOULD_BE_SET_IN_ENVIRONMENT',
  
  // Token expiration times (more secure, shorter lifetimes)
  accessTokenExpiry: '15m',  // 15 minutes
  refreshTokenExpiry: '7d',   // 7 days
  
  // JWT signing options
  signOptions: {
    algorithm: 'HS256',
    expiresIn: '15m'
  }
};

// Authentication rate limiting
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error: 'Too many login attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  passwordConfig,
  jwtConfig,
  authRateLimit
};
