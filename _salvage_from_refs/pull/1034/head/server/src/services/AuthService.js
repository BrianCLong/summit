const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getPostgresPool } = require('../config/database');
const config = require('../config');
const logger = require('../utils/logger');

class AuthService {
  constructor() {
    this.pool = getPostgresPool();
  }

  async register(userData) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [userData.email, userData.username]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email or username already exists');
      }

      const passwordHash = await argon2.hash(userData.password);

      const userResult = await client.query(`
        INSERT INTO users (email, username, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, username, first_name, last_name, role, is_active, created_at
      `, [
        userData.email,
        userData.username,
        passwordHash,
        userData.firstName,
        userData.lastName,
        userData.role || 'ANALYST'
      ]);

      const user = userResult.rows[0];
      const { token, refreshToken } = await this.generateTokens(user, client);

      await client.query('COMMIT');

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error registering user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async login(email, password, ipAddress, userAgent) {
    const client = await this.pool.connect();
    
    try {
      const userResult = await client.query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = userResult.rows[0];
      const validPassword = await argon2.verify(user.password_hash, password);
      
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      const { token, refreshToken } = await this.generateTokens(user, client);

      return {
        user: this.formatUser(user),
        token,
        refreshToken,
        expiresIn: 24 * 60 * 60
      };
    } catch (error) {
      logger.error('Error logging in user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async generateTokens(user, client) {
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    const refreshToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await client.query(`
      INSERT INTO user_sessions (user_id, refresh_token, expires_at)
      VALUES ($1, $2, $3)
    `, [user.id, refreshToken, expiresAt]);

    return { token, refreshToken };
  }

  async verifyToken(token) {
    try {
      if (!token) return null;

      const decoded = jwt.verify(token, config.jwt.secret);
      
      const client = await this.pool.connect();
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );
      client.release();

      if (userResult.rows.length === 0) {
        return null;
      }

      return this.formatUser(userResult.rows[0]);
    } catch (error) {
      logger.warn('Invalid token:', error.message);
      return null;
    }
  }

  formatUser(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }
}

module.exports = AuthService;
