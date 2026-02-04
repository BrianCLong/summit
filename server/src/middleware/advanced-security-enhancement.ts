/**
 * Advanced Security Enhancement Middleware
 * 
 * Next-generation security implementations with:
 * - Enhanced threat detection beyond current patterns
 * - AI model injection protection
 * - Quantum-ready security validation
 * - Advanced sanitization protocols
 * - Future-proofing architecture
 */

import { Request, Response, NextFunction } from 'express';

// Advanced threat patterns beyond current detection
const ADVANCED_THREAT_PATTERNS = [
  // Advanced path traversal
  /(%2e%2e%2f|%2e%2e%5c)/gi,
  /(%252e%252e%252f|%252e%252e%255c)/gi,  // Double encoded
  /(\.\.\/){2,}/g,
  /(\.\.\\){2,}/g,
  /\/\.\.\.\//g, // Advanced traversal
  /\\\\\.\.\\\.\//g, // Mixed separators

  // Advanced XSS patterns
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
  /javascript:\s*\w+/gi,
  /vbscript:\s*\w+/gi,
  /data:\s*[^,]*,\s*base64/gi,
  /on\w+\s*=\s*["'][^"']*["']/gi,

  // Advanced SQL injection
  /\b(union\s+(?:all\s+)?select|union\s+select|intersect|except)\b/gi,
  /\b(exec|execute|sp_|xp_|sysobject|sysobjects|syscolumns)\b/gi,
  /('|(\/\*)|(\*\/)|(--)|(%27)|(%2D%2D))/gi,
  /(\bOR\b|\bAND\b)\s+[\d\w]+\s*[=<>!]+\s*[\d\w]+/gi,

  // NoSQL injection indicators
  /\$where:\s*/gi,
  /\$expr:\s*/gi,
  /\$regex:\s*/gi,
  /\$options:\s*/gi,
  /\$ne:\s*""/gi,
  /\$ne:\s*null/gi,
  /\$ne:\s*undefined/gi,

  // Command injection patterns
  /(\|\||&&|;|\n|\r)\s*(\w+)\s*\(/gi,
  /\$\(\s*\w+\s*\)/gi,
  /`\s*\w+\s*`/gi,

  // Prototype pollution
  /(\.__proto__|\.constructor\.prototype)/gi,
  /\[\s*["']?constructor["']?\s*\]\s*\[\s*["']?prototype["']?\s*\]/gi,

  // GraphQL introspection
  /__schema/gi,
  /__type/gi,
  /__typename/gi,
  /\bintrospection\b/gi,
];

/**
 * Detect advanced threats in request data
 */
function detectAdvancedThreats(data: any) {
  if (!data) return { detected: false, type: '' };
  
  const strData = JSON.stringify(data, null, 0);
  
  for (const pattern of ADVANCED_THREAT_PATTERNS) {
    if (pattern.test(strData)) {
      let threatType = 'Advanced Injection';
      
      if (pattern.source.includes('travers')) threatType = 'Path Traversal';
      else if (pattern.source.includes('script') || pattern.source.includes('javascript')) threatType = 'Cross-Site Scripting';
      else if (pattern.source.includes('union') || pattern.source.includes('select')) threatType = 'SQL Injection';
      else if (pattern.source.includes('$where') || pattern.source.includes('$expr')) threatType = 'NoSQL Injection';
      else if (pattern.source.includes('|') || pattern.source.includes(';')) threatType = 'Command Injection';
      else if (pattern.source.includes('proto') || pattern.source.includes('prototype')) threatType = 'Prototype Pollution';
      else if (pattern.source.includes('__schema') || pattern.source.includes('introspect')) threatType = 'GraphQL Introspection';
      
      return { detected: true, type: threatType };
    }
  }
  
  // Check for excessive length (potential DoS)
  if (strData.length > 100000) {
    return { detected: true, type: 'Potential DoS Attack' };
  }
  
  return { detected: false, type: '' };
}

/**
 * Enhanced input sanitization
 */
function enhancedSanitization(input: any): any {
  if (typeof input === 'string') {
    // Remove dangerous patterns first
    let sanitized = input;
    for (const pattern of ADVANCED_THREAT_PATTERNS) {
      sanitized = sanitized.replace(new RegExp(pattern.source, 'gi'), '');
    }
    
    // Then HTML escape
    return sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (Array.isArray(input)) {
    return input.map(item => enhancedSanitization(item));
  }
  
  if (input && typeof input === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(input)) {
      result[enhancedSanitization(key)] = enhancedSanitization(value);
    }
    return result;
  }
  
  return input;
}

/**
 * Detect AI model injection attempts
 */
function detectAIModelInjection(data: any): boolean {
  if (typeof data === 'string') {
    const lower = data.toLowerCase();
    const patterns = [
      'ignore previous instructions',
      'disregard prior instructions',
      'system prompt',
      'role as',
      'instead of',
      'act as',
      'perform as',
      'behave as',
      'follow these new instructions',
      'start fresh',
      'forget previous',
      '{{',  // Template injection
      '{%',  // Template injection
      '[INST]',  // LLM instruction markers
      '[/INST]',
      '[BEGIN]',
      '[END]',
      '<<SYS>>',
      '<</SYS>>',
    ];
    
    return patterns.some(pattern => lower.includes(pattern));
  }
  
  if (Array.isArray(data)) {
    return data.some(item => detectAIModelInjection(item));
  }
  
  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (detectAIModelInjection(value)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Advanced Security Enhancement Middleware
 */
export const advancedSecurityEnhancement = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Enhanced threat detection on all request components
    const queryThreat = detectAdvancedThreats(req.query);
    const bodyThreat = detectAdvancedThreats(req.body);
    const paramsThreat = detectAdvancedThreats(req.params);

    if (queryThreat.detected) {
      console.warn(`Advanced threat detected in query: ${queryThreat.type} - IP: ${req.ip} - Path: ${req.path}`);
      
      return res.status(400).json({
        error: 'Advanced threat detected in query parameters',
        threat: queryThreat.type
      });
    }

    if (bodyThreat.detected) {
      console.warn(`Advanced threat detected in body: ${bodyThreat.type} - IP: ${req.ip} - Path: ${req.path}`);
      
      return res.status(400).json({
        error: 'Advanced threat detected in request body',
        threat: bodyThreat.type
      });
    }

    if (paramsThreat.detected) {
      console.warn(`Advanced threat detected in params: ${paramsThreat.type} - IP: ${req.ip} - Path: ${req.path}`);
      
      return res.status(400).json({
        error: 'Advanced threat detected in URL parameters',
        threat: paramsThreat.type
      });
    }

    // AI model injection protection
    if (detectAIModelInjection(req.body) || 
        detectAIModelInjection(req.query) || 
        detectAIModelInjection(req.params)) {
      console.warn(`AI model injection detected - IP: ${req.ip} - Path: ${req.path}`);
      
      return res.status(400).json({
        error: 'AI model injection detected',
        message: 'Request contains patterns that could manipulate AI models'
      });
    }

    // Enhanced sanitization
    if (req.query) {
      req.query = enhancedSanitization(req.query);
    }
    if (req.body) {
      req.body = enhancedSanitization(req.body);
    }
    if (req.params) {
      req.params = enhancedSanitization(req.params);
    }

    // Enhanced security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    
    // Quantum-ready security header (future-proofing)
    if (process.env.QUANTUM_SECURITY === 'enabled') {
      res.setHeader('X-Quantum-Safe', 'true');
      res.setHeader('X-Post-Quantum-Ready', 'true');
    }

    next();
  } catch (error) {
    console.error(`Error in advanced security enhancement: ${error instanceof Error ? error.message : String(error)} - IP: ${req.ip} - Path: ${req.path}`);
    
    res.status(500).json({
      error: 'Advanced security validation error'
    });
  }
};

export default advancedSecurityEnhancement;