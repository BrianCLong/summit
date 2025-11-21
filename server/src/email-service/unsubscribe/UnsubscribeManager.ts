/**
 * Unsubscribe Manager
 *
 * Manages email unsubscribe preferences and frequency limits
 */

import crypto from 'crypto';
import { UnsubscribePreferences, EmailTemplateCategory } from '../types.js';

export class UnsubscribeManager {
  private preferences: Map<string, UnsubscribePreferences> = new Map();
  private emailSendHistory: Map<string, Date[]> = new Map();
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.APP_URL || 'https://app.example.com';
  }

  async initialize(): Promise<void> {
    // Load preferences from database (placeholder)
  }

  /**
   * Get preferences for an email
   */
  async getPreferences(email: string): Promise<UnsubscribePreferences | null> {
    return this.preferences.get(email) || null;
  }

  /**
   * Update preferences
   */
  async updatePreferences(
    email: string,
    updates: Partial<UnsubscribePreferences>,
  ): Promise<UnsubscribePreferences> {
    const existing = this.preferences.get(email) || this.createDefaultPreferences(email);

    const updated: UnsubscribePreferences = {
      ...existing,
      ...updates,
      email, // Ensure email doesn't change
    };

    this.preferences.set(email, updated);
    return updated;
  }

  /**
   * Unsubscribe from all emails
   */
  async unsubscribeAll(email: string): Promise<void> {
    await this.updatePreferences(email, {
      unsubscribedFromAll: true,
      unsubscribedAt: new Date(),
    });
  }

  /**
   * Unsubscribe from specific category
   */
  async unsubscribeCategory(
    email: string,
    category: EmailTemplateCategory,
  ): Promise<void> {
    const prefs = await this.getPreferences(email) || this.createDefaultPreferences(email);

    prefs.categories[category] = {
      subscribed: false,
      updatedAt: new Date(),
    };

    this.preferences.set(email, prefs);
  }

  /**
   * Subscribe to category
   */
  async subscribeCategory(
    email: string,
    category: EmailTemplateCategory,
  ): Promise<void> {
    const prefs = await this.getPreferences(email) || this.createDefaultPreferences(email);

    prefs.categories[category] = {
      subscribed: true,
      updatedAt: new Date(),
    };

    this.preferences.set(email, prefs);
  }

  /**
   * Check if frequency limit allows sending
   */
  async checkFrequencyLimit(
    email: string,
    frequency: UnsubscribePreferences['frequency'],
  ): Promise<boolean> {
    if (!frequency) {
      return true;
    }

    const history = this.emailSendHistory.get(email) || [];
    const now = new Date();

    // Check daily limit
    if (frequency.maxEmailsPerDay) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayCount = history.filter((date) => date >= today).length;
      if (todayCount >= frequency.maxEmailsPerDay) {
        return false;
      }
    }

    // Check weekly limit
    if (frequency.maxEmailsPerWeek) {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekCount = history.filter((date) => date >= weekAgo).length;
      if (weekCount >= frequency.maxEmailsPerWeek) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record email sent for frequency tracking
   */
  async recordEmailSent(email: string): Promise<void> {
    const history = this.emailSendHistory.get(email) || [];
    history.push(new Date());

    // Keep only last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filtered = history.filter((date) => date >= thirtyDaysAgo);

    this.emailSendHistory.set(email, filtered);
  }

  /**
   * Generate unsubscribe URL
   */
  async generateUnsubscribeUrl(email: string, userId?: string): Promise<string> {
    const token = this.generateUnsubscribeToken(email, userId);
    return `${this.baseUrl}/email/unsubscribe?token=${token}`;
  }

  /**
   * Verify and parse unsubscribe token
   */
  async verifyUnsubscribeToken(token: string): Promise<{ email: string; userId?: string } | null> {
    try {
      // In production, use proper encryption/signing
      // This is a simplified implementation
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [email, userId, timestamp] = decoded.split('|');

      // Check if token is expired (30 days)
      const tokenDate = new Date(parseInt(timestamp));
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (tokenDate < thirtyDaysAgo) {
        return null; // Token expired
      }

      return { email, userId: userId || undefined };
    } catch {
      return null;
    }
  }

  /**
   * Generate preference center URL
   */
  async generatePreferenceCenterUrl(email: string, userId?: string): Promise<string> {
    const token = this.generateUnsubscribeToken(email, userId);
    return `${this.baseUrl}/email/preferences?token=${token}`;
  }

  private createDefaultPreferences(email: string): UnsubscribePreferences {
    return {
      userId: '',
      email,
      unsubscribedFromAll: false,
      categories: {},
      frequency: {
        maxEmailsPerDay: 10,
        maxEmailsPerWeek: 50,
      },
    };
  }

  private generateUnsubscribeToken(email: string, userId?: string): string {
    const data = `${email}|${userId || ''}|${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }
}
