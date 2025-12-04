/**
 * Attribution Engine - Digital identity attribution and footprint analysis
 */

export * from './core/AttributionEngine.js';
export * from './analyzers/EmailAnalyzer.js';
export * from './analyzers/UsernameAnalyzer.js';
export * from './analyzers/PhoneAnalyzer.js';
export * from './analyzers/DomainAnalyzer.js';
export * from './analyzers/IPAnalyzer.js';
export * from './analyzers/CryptoAnalyzer.js';
export * from './types/index.js';

export interface DigitalFootprint {
  identifier: string;
  type: 'email' | 'username' | 'phone' | 'domain' | 'ip' | 'crypto';
  accounts: Array<{
    platform: string;
    username: string;
    url: string;
    found: boolean;
    metadata?: Record<string, any>;
  }>;
  breaches?: Array<{
    name: string;
    date: Date;
    description: string;
  }>;
  related: {
    emails?: string[];
    usernames?: string[];
    domains?: string[];
    ips?: string[];
    phones?: string[];
  };
  confidence: number;
}

export interface AttributionResult {
  primaryIdentity: string;
  identifiers: string[];
  accounts: Array<{ platform: string; username: string; url: string }>;
  confidence: number;
  evidence: string[];
  digitalFootprint: DigitalFootprint;
}
