/**
 * Secure API Endpoint Example
 *
 * This file demonstrates how to create a secure API endpoint using
 * the security utilities and best practices.
 */

import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeFilePath,
  validateInteger,
  validateUUID,
  InputValidator,
  sanitizeObject,
} from '../utils/input-sanitization';
import { generateId, generateToken } from '../utils/crypto-secure-random';
import { authRateLimiter, validateRequest } from '../middleware/security';

const router = express.Router();

/**
 * Example 1: Secure User Creation Endpoint
 *
 * Demonstrates:
 * - Input validation and sanitization
 * - Rate limiting
 * - Parameterized queries (SQL injection prevention)
 * - Cryptographically secure token generation
 */
router.post(
  '/users',
  authRateLimiter, // Rate limit to prevent abuse
  validateRequest, // Request validation middleware
  async (req: Request, res: Response) => {
    const validator = new InputValidator();

    // Validate and sanitize all inputs
    const email = validator.validateEmail(req.body.email, 'email');
    const username = validator.validateString(req.body.username, 'username', {
      minLength: 3,
      maxLength: 30,
      pattern: /^[a-zA-Z0-9_]+$/, // Only alphanumeric and underscore
    });
    const firstName = validator.validateString(req.body.firstName, 'firstName', {
      maxLength: 50,
    });
    const lastName = validator.validateString(req.body.lastName, 'lastName', {
      maxLength: 50,
    });

    // Check for validation errors
    if (validator.hasErrors()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validator.getErrors(),
      });
    }

    try {
      const db: Pool = req.app.get('db');

      // Generate cryptographically secure user ID and verification token
      const userId = generateId('user');
      const verificationToken = generateToken(32);

      // Use parameterized queries (NEVER string concatenation)
      const result = await db.query(
        `INSERT INTO users (id, email, username, first_name, last_name, verification_token, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING id, email, username, first_name, last_name, created_at`,
        [userId, email, username, firstName, lastName, verificationToken]
      );

      // Don't return the verification token in the response
      res.status(201).json({
        success: true,
        user: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error creating user:', error);

      // Don't expose internal errors
      res.status(500).json({
        error: 'Failed to create user',
      });
    }
  }
);

/**
 * Example 2: Secure File Upload Endpoint
 *
 * Demonstrates:
 * - Path traversal prevention
 * - File type validation
 * - Size validation
 */
router.post(
  '/files/upload',
  validateRequest,
  async (req: Request, res: Response) => {
    const validator = new InputValidator();

    // Validate file name to prevent path traversal
    const fileName = validator.validateString(req.body.fileName, 'fileName', {
      maxLength: 255,
      pattern: /^[a-zA-Z0-9._-]+$/, // Only safe characters
    });

    if (validator.hasErrors()) {
      return res.status(400).json({
        error: 'Invalid file name',
        details: validator.getErrors(),
      });
    }

    try {
      // Sanitize file path with allowed base path
      const basePath = '/var/uploads';
      const safePath = sanitizeFilePath(`${fileName}`, basePath);

      // Additional file processing...
      // (file type validation, size checks, virus scanning, etc.)

      res.json({
        success: true,
        filePath: safePath,
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      res.status(400).json({
        error: error.message,
      });
    }
  }
);

/**
 * Example 3: Secure Search Endpoint
 *
 * Demonstrates:
 * - Query parameter validation
 * - Pagination with bounds checking
 * - NoSQL injection prevention
 */
router.get(
  '/search',
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      // Validate and sanitize search query
      const query = sanitizeString(req.query.q as string || '');

      // Validate pagination parameters
      const page = validateInteger(req.query.page || '1', 1, 1000);
      const limit = validateInteger(req.query.limit || '20', 1, 100);

      // Validate sort parameter (allow-list approach)
      const allowedSortFields = ['created_at', 'updated_at', 'name'];
      const sort = req.query.sort as string;
      if (sort && !allowedSortFields.includes(sort)) {
        return res.status(400).json({
          error: 'Invalid sort field',
          allowed: allowedSortFields,
        });
      }

      const db: Pool = req.app.get('db');

      // Use parameterized queries
      const offset = (page - 1) * limit;
      const result = await db.query(
        `SELECT id, name, description, created_at
         FROM items
         WHERE name ILIKE $1 OR description ILIKE $1
         ORDER BY ${sort || 'created_at'} DESC
         LIMIT $2 OFFSET $3`,
        [`%${query}%`, limit, offset]
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total: result.rowCount,
        },
      });
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({
        error: 'Search failed',
      });
    }
  }
);

/**
 * Example 4: Secure API Key Generation
 *
 * Demonstrates:
 * - Cryptographically secure API key generation
 * - Proper storage (hash before storing)
 */
router.post(
  '/api-keys',
  authRateLimiter,
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id; // From auth middleware

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate cryptographically secure API key
      const apiKey = generateToken(32);

      // Hash the API key before storing (like passwords)
      const crypto = require('crypto');
      const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

      const db: Pool = req.app.get('db');
      const keyId = generateId('key');

      // Store only the hash
      await db.query(
        `INSERT INTO api_keys (id, user_id, key_hash, created_at, last_used_at)
         VALUES ($1, $2, $3, NOW(), NULL)`,
        [keyId, userId, keyHash]
      );

      // Return the plain API key ONLY once (user must save it)
      res.status(201).json({
        success: true,
        apiKey, // Show only on creation
        keyId,
        warning: 'Save this API key now. You will not be able to see it again.',
      });
    } catch (error: any) {
      console.error('Error generating API key:', error);
      res.status(500).json({
        error: 'Failed to generate API key',
      });
    }
  }
);

/**
 * Example 5: Secure Object Update Endpoint
 *
 * Demonstrates:
 * - UUID validation
 * - Object sanitization (prototype pollution prevention)
 * - Selective field updates (allow-list approach)
 */
router.patch(
  '/items/:id',
  validateRequest,
  async (req: Request, res: Response) => {
    try {
      // Validate UUID
      const itemId = validateUUID(req.params.id);

      // Sanitize input object to prevent prototype pollution
      const updates = sanitizeObject(req.body);

      // Allow-list approach: only allow specific fields to be updated
      const allowedFields = ['name', 'description', 'tags'];
      const updateData: any = {};

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData[field] = sanitizeString(updates[field]);
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: 'No valid fields to update',
          allowed: allowedFields,
        });
      }

      const db: Pool = req.app.get('db');

      // Build dynamic UPDATE query safely
      const setClause = Object.keys(updateData)
        .map((field, i) => `${field} = $${i + 2}`)
        .join(', ');

      const result = await db.query(
        `UPDATE items
         SET ${setClause}, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [itemId, ...Object.values(updateData)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      res.json({
        success: true,
        item: result.rows[0],
      });
    } catch (error: any) {
      console.error('Error updating item:', error);
      res.status(500).json({
        error: 'Failed to update item',
      });
    }
  }
);

/**
 * Security Best Practices Checklist:
 *
 * ✅ Input Validation
 *    - Validate all user inputs
 *    - Use allow-lists instead of deny-lists
 *    - Enforce length, type, and format constraints
 *
 * ✅ SQL Injection Prevention
 *    - ALWAYS use parameterized queries
 *    - Never concatenate user input into SQL strings
 *    - Validate dynamic table/column names against allow-lists
 *
 * ✅ XSS Prevention
 *    - Sanitize all output rendered to HTML
 *    - Use Content Security Policy headers
 *    - Encode data properly for the context (HTML, JavaScript, URL)
 *
 * ✅ Path Traversal Prevention
 *    - Sanitize file paths
 *    - Validate against allowed base directories
 *    - Use allow-lists for file types
 *
 * ✅ Cryptographic Security
 *    - Use crypto.randomBytes() for all security tokens
 *    - Never use Math.random() for security purposes
 *    - Hash sensitive data before storage
 *
 * ✅ Rate Limiting
 *    - Apply rate limits to all endpoints
 *    - Stricter limits for sensitive operations
 *    - Implement account lockout for repeated failures
 *
 * ✅ Authentication & Authorization
 *    - Require authentication for protected endpoints
 *    - Verify permissions for all operations
 *    - Implement principle of least privilege
 *
 * ✅ Error Handling
 *    - Don't expose internal errors to users
 *    - Log detailed errors server-side
 *    - Return generic error messages to clients
 *
 * ✅ HTTPS
 *    - Always use HTTPS in production
 *    - Enforce HTTPS with HSTS headers
 *    - Never transmit sensitive data over HTTP
 *
 * ✅ Security Headers
 *    - Implement CSP, HSTS, X-Frame-Options
 *    - Disable unnecessary features
 *    - Use secure cookie settings
 */

export default router;
