/**
 * Citizen AI Service
 *
 * Multi-lingual AI services for Estonian public services,
 * enabling seamless access for citizens, immigrants, and international partners.
 *
 * Features:
 * - Real-time translation (40+ languages)
 * - Natural Language Understanding (NLU)
 * - Conversational AI for public services
 * - Multi-lingual intent classification
 * - Entity extraction (Estonian ID, phone, email, etc.)
 */

// Core services
export * from './conversational-ai';
export * from './nlu-service';

// API
export { router, createApp, startServer } from './api';

// Infrastructure
export * from './cache';
export * from './metrics';
