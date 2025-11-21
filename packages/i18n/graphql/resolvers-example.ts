/**
 * Example GraphQL Resolvers for i18n User Preferences
 *
 * Add these resolvers to your GraphQL server to support language preferences.
 *
 * This file is a reference implementation - adapt to your database and schema.
 */

import { LOCALE_CONFIGS, getAvailableLocales } from '@intelgraph/i18n';
import type { Locale } from '@intelgraph/i18n';

// Example user preferences type
interface UserPreferences {
  locale: string;
  theme?: string;
  timezone?: string;
  dateFormat?: string;
  numberFormat?: string;
  currency?: string;
}

// Convert GraphQL enum (EN_US) to locale code (en-US)
function gqlToLocaleCode(gqlLocale: string): Locale {
  return gqlLocale.replace('_', '-') as Locale;
}

// Convert locale code (en-US) to GraphQL enum (EN_US)
function localeToGqlEnum(locale: Locale): string {
  return locale.replace('-', '_');
}

/**
 * GraphQL Resolvers
 */
export const resolvers = {
  Query: {
    /**
     * Get user preferences including locale
     */
    userPreferences: async (
      _parent: any,
      { userId }: { userId: string },
      context: any
    ) => {
      // Check authorization
      await context.authorize('user:read', { userId });

      // Fetch from database
      const user = await context.db.user.findUnique({
        where: { id: userId },
        select: { preferences: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return user.preferences;
    },

    /**
     * Get all supported locales with metadata
     */
    supportedLocales: async () => {
      const locales = getAvailableLocales();

      // You could enhance this with actual translation coverage from DB
      return locales.map((locale) => ({
        code: locale.code,
        name: locale.name,
        englishName: locale.englishName,
        flag: locale.flag,
        direction: locale.direction.toUpperCase(),
        fullyTranslated: locale.code === 'en-US' || locale.code === 'es-ES',
        coverage: locale.code === 'en-US' ? 100 : locale.code === 'es-ES' ? 100 : 70,
      }));
    },
  },

  Mutation: {
    /**
     * Update user preferences including locale
     */
    updateUserPreferences: async (
      _parent: any,
      {
        userId,
        preferences,
      }: { userId: string; preferences: Partial<UserPreferences> },
      context: any
    ) => {
      // Check authorization
      await context.authorize('user:update', { userId });

      // Convert GraphQL enum to locale code if locale is provided
      if (preferences.locale) {
        preferences.locale = gqlToLocaleCode(preferences.locale);
      }

      // Update in database
      const user = await context.db.user.update({
        where: { id: userId },
        data: {
          preferences: {
            update: preferences,
          },
        },
        include: {
          preferences: true,
        },
      });

      // Log audit event
      await context.audit.log({
        action: 'user.preferences.update',
        userId,
        metadata: { preferences },
      });

      return user;
    },

    /**
     * Update just the user's locale (shorthand)
     */
    updateUserLocale: async (
      _parent: any,
      { userId, locale }: { userId: string; locale: string },
      context: any
    ) => {
      // Check authorization
      await context.authorize('user:update', { userId });

      const localeCode = gqlToLocaleCode(locale);

      // Validate locale
      if (!(localeCode in LOCALE_CONFIGS)) {
        throw new Error(`Invalid locale: ${localeCode}`);
      }

      // Update in database
      const user = await context.db.user.update({
        where: { id: userId },
        data: {
          preferences: {
            update: {
              locale: localeCode,
            },
          },
        },
        include: {
          preferences: true,
        },
      });

      // Log audit event
      await context.audit.log({
        action: 'user.locale.update',
        userId,
        metadata: { locale: localeCode },
      });

      return user;
    },
  },

  User: {
    /**
     * Resolve user preferences
     */
    preferences: async (user: any, _args: any, context: any) => {
      if (user.preferences) {
        return user.preferences;
      }

      // Fetch preferences if not included
      const userData = await context.db.user.findUnique({
        where: { id: user.id },
        select: { preferences: true },
      });

      return userData?.preferences || {
        locale: 'en-US',
        theme: 'light',
        timezone: 'UTC',
      };
    },
  },

  UserPreferences: {
    /**
     * Convert locale code to GraphQL enum for response
     */
    locale: (preferences: UserPreferences) => {
      return localeToGqlEnum(preferences.locale as Locale);
    },
  },
};

/**
 * Database Schema (Prisma example)
 *
 * Add this to your schema.prisma:
 *
 * ```prisma
 * model User {
 *   id           String           @id @default(uuid())
 *   email        String           @unique
 *   name         String?
 *   preferences  UserPreferences?
 *   createdAt    DateTime         @default(now())
 *   updatedAt    DateTime         @updatedAt
 * }
 *
 * model UserPreferences {
 *   id           String   @id @default(uuid())
 *   userId       String   @unique
 *   user         User     @relation(fields: [userId], references: [id])
 *   locale       String   @default("en-US")
 *   theme        String   @default("light")
 *   timezone     String   @default("UTC")
 *   dateFormat   String?
 *   numberFormat String?
 *   currency     String?
 *   createdAt    DateTime @default(now())
 *   updatedAt    DateTime @updatedAt
 * }
 * ```
 */

/**
 * Migration SQL (PostgreSQL example)
 *
 * ```sql
 * CREATE TABLE user_preferences (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
 *   locale VARCHAR(10) NOT NULL DEFAULT 'en-US',
 *   theme VARCHAR(20) DEFAULT 'light',
 *   timezone VARCHAR(50) DEFAULT 'UTC',
 *   date_format VARCHAR(50),
 *   number_format VARCHAR(50),
 *   currency VARCHAR(3),
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 * );
 *
 * CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
 * CREATE INDEX idx_user_preferences_locale ON user_preferences(locale);
 * ```
 */

export default resolvers;
