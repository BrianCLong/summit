/**
 * WebAuthn Enforcement Engine
 *
 * Implements step-up authentication with WebAuthn for high-risk operations,
 * session binding, and comprehensive security controls.
 */

import { Request, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { logger } from '../utils/logger';
import { Redis } from 'ioredis';
import { performance } from 'perf_hooks';

interface WebAuthnConfig {
  rpName: string;
  rpID: string;
  origin: string;
  timeout: number;
  userVerification: 'required' | 'preferred' | 'discouraged';
  attestationType: 'none' | 'indirect' | 'direct';
  requireResidentKey: boolean;
  algorithms: number[];
}

interface UserCredential {
  id: string;
  publicKey: Uint8Array;
  counter: number;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports?: AuthenticatorTransport[];
  aaguid?: string;
  createdAt: Date;
  lastUsed: Date;
  nickname?: string;
  riskScore: number;
}

interface StepUpSession {
  id: string;
  userId: string;
  tenantId: string;
  operation: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredAuthLevel: number;
  currentAuthLevel: number;
  expiresAt: Date;
  createdAt: Date;
  challenges: Challenge[];
  metadata: Record<string, any>;
}

interface Challenge {
  id: string;
  type: 'webauthn' | 'biometric' | 'hardware_key';
  challenge: string;
  createdAt: Date;
  expiresAt: Date;
  completed: boolean;
  verified: boolean;
  deviceInfo?: any;
}

interface RiskAssessment {
  score: number;
  factors: RiskFactor[];
  recommendation: 'allow' | 'step_up' | 'deny';
  requiredAuthLevel: number;
}

interface RiskFactor {
  type: 'device' | 'location' | 'behavior' | 'time' | 'operation';
  factor: string;
  score: number;
  weight: number;
  description: string;
}

export class WebAuthnEnforcer {
  private config: WebAuthnConfig;
  private redis: Redis;
  private credentialStore: Map<string, UserCredential[]>;
  private sessionStore: Map<string, StepUpSession>;

  constructor(config: WebAuthnConfig, redis: Redis) {
    this.config = {
      timeout: 60000,
      userVerification: 'preferred',
      attestationType: 'none',
      requireResidentKey: false,
      algorithms: [-7, -257], // ES256, RS256
      ...config
    };
    this.redis = redis;
    this.credentialStore = new Map();
    this.sessionStore = new Map();
  }

  // Assess risk and determine if step-up is required
  async assessRisk(request: {
    userId: string;
    tenantId: string;
    operation: string;
    context: Record<string, any>;
  }): Promise<RiskAssessment> {
    const startTime = performance.now();
    const factors: RiskFactor[] = [];

    try {
      // Device risk assessment
      const deviceRisk = await this.assessDeviceRisk(request.context);
      factors.push(...deviceRisk);

      // Location risk assessment
      const locationRisk = await this.assessLocationRisk(request.context);
      factors.push(...locationRisk);

      // Behavioral risk assessment
      const behaviorRisk = await this.assessBehaviorRisk(request);
      factors.push(...behaviorRisk);

      // Time-based risk assessment
      const timeRisk = this.assessTimeRisk(request.context);
      factors.push(...timeRisk);

      // Operation-specific risk assessment
      const operationRisk = this.assessOperationRisk(request.operation);
      factors.push(...operationRisk);

      // Calculate weighted risk score
      const totalScore = factors.reduce((sum, factor) => {
        return sum + (factor.score * factor.weight);
      }, 0);

      const normalizedScore = Math.min(100, Math.max(0, totalScore));

      // Determine recommendation and required auth level
      let recommendation: 'allow' | 'step_up' | 'deny';
      let requiredAuthLevel: number;

      if (normalizedScore >= 90) {
        recommendation = 'deny';
        requiredAuthLevel = 0;
      } else if (normalizedScore >= 70) {
        recommendation = 'step_up';
        requiredAuthLevel = 3; // High assurance required
      } else if (normalizedScore >= 40) {
        recommendation = 'step_up';
        requiredAuthLevel = 2; // Medium assurance required
      } else {
        recommendation = 'allow';
        requiredAuthLevel = 1; // Low assurance sufficient
      }

      const assessment: RiskAssessment = {
        score: normalizedScore,
        factors,
        recommendation,
        requiredAuthLevel
      };

      logger.info('Risk assessment completed', {
        userId: request.userId,
        operation: request.operation,
        score: normalizedScore,
        recommendation,
        requiredAuthLevel,
        factorCount: factors.length,
        duration: performance.now() - startTime
      });

      return assessment;

    } catch (error) {
      logger.error('Risk assessment failed', {
        error: error.message,
        userId: request.userId,
        operation: request.operation
      });

      // Fail secure - require high assurance on error
      return {
        score: 100,
        factors: [{
          type: 'operation',
          factor: 'assessment_error',
          score: 100,
          weight: 1,
          description: 'Risk assessment failed, requiring high assurance'
        }],
        recommendation: 'step_up',
        requiredAuthLevel: 3
      };
    }
  }

  // Create step-up authentication session
  async createStepUpSession(request: {
    userId: string;
    tenantId: string;
    operation: string;
    riskAssessment: RiskAssessment;
    context: Record<string, any>;
  }): Promise<StepUpSession> {
    const sessionId = this.generateId();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const session: StepUpSession = {
      id: sessionId,
      userId: request.userId,
      tenantId: request.tenantId,
      operation: request.operation,
      riskLevel: this.getRiskLevel(request.riskAssessment.score),
      requiredAuthLevel: request.riskAssessment.requiredAuthLevel,
      currentAuthLevel: 1, // Assume basic auth already completed
      expiresAt,
      createdAt: new Date(),
      challenges: [],
      metadata: {
        riskScore: request.riskAssessment.score,
        riskFactors: request.riskAssessment.factors,
        userAgent: request.context.userAgent,
        ip: request.context.ip
      }
    };

    this.sessionStore.set(sessionId, session);

    // Store in Redis for persistence and sharing across instances
    await this.redis.setex(
      `stepup:${sessionId}`,
      300, // 5 minutes
      JSON.stringify(session, this.dateReplacer)
    );

    logger.info('Step-up session created', {
      sessionId,
      userId: request.userId,
      operation: request.operation,
      requiredAuthLevel: request.riskAssessment.requiredAuthLevel,
      expiresAt
    });

    return session;
  }

  // Generate WebAuthn registration options
  async generateRegistrationOptions(request: {
    userId: string;
    username: string;
    displayName: string;
    excludeCredentials?: string[];
  }): Promise<any> {
    try {
      // Get existing credentials to exclude
      const existingCredentials = await this.getUserCredentials(request.userId);
      const excludeCredentials = existingCredentials.map(cred => ({
        id: cred.id,
        type: 'public-key' as const,
        transports: cred.transports
      }));

      const options = await generateRegistrationOptions({
        rpName: this.config.rpName,
        rpID: this.config.rpID,
        userID: request.userId,
        userName: request.username,
        userDisplayName: request.displayName,
        timeout: this.config.timeout,
        attestationType: this.config.attestationType,
        excludeCredentials,
        authenticatorSelection: {
          userVerification: this.config.userVerification,
          requireResidentKey: this.config.requireResidentKey,
          residentKey: this.config.requireResidentKey ? 'required' : 'preferred'
        },
        supportedAlgorithmIDs: this.config.algorithms
      });

      // Store challenge for verification
      await this.redis.setex(
        `webauthn:reg:${request.userId}`,
        300, // 5 minutes
        options.challenge
      );

      logger.info('WebAuthn registration options generated', {
        userId: request.userId,
        challengeLength: options.challenge.length,
        excludedCredentials: excludeCredentials.length
      });

      return options;

    } catch (error) {
      logger.error('Failed to generate registration options', {
        error: error.message,
        userId: request.userId
      });
      throw error;
    }
  }

  // Verify WebAuthn registration response
  async verifyRegistrationResponse(request: {
    userId: string;
    response: RegistrationResponseJSON;
    nickname?: string;
  }): Promise<{ verified: boolean; credential?: UserCredential }> {
    try {
      // Get stored challenge
      const expectedChallenge = await this.redis.get(`webauthn:reg:${request.userId}`);
      if (!expectedChallenge) {
        throw new Error('No registration challenge found');
      }

      const verification = await verifyRegistrationResponse({
        response: request.response,
        expectedChallenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpID,
        requireUserVerification: this.config.userVerification === 'required'
      });

      if (!verification.verified || !verification.registrationInfo) {
        logger.warn('WebAuthn registration verification failed', {
          userId: request.userId,
          verified: verification.verified
        });
        return { verified: false };
      }

      // Create credential record
      const credential: UserCredential = {
        id: verification.registrationInfo.credentialID,
        publicKey: verification.registrationInfo.credentialPublicKey,
        counter: verification.registrationInfo.counter,
        deviceType: verification.registrationInfo.credentialDeviceType,
        backedUp: verification.registrationInfo.credentialBackedUp,
        transports: request.response.response.transports,
        aaguid: verification.registrationInfo.aaguid,
        createdAt: new Date(),
        lastUsed: new Date(),
        nickname: request.nickname,
        riskScore: this.calculateCredentialRiskScore(verification.registrationInfo)
      };

      // Store credential
      await this.storeUserCredential(request.userId, credential);

      // Clean up challenge
      await this.redis.del(`webauthn:reg:${request.userId}`);

      logger.info('WebAuthn registration completed', {
        userId: request.userId,
        credentialId: credential.id,
        deviceType: credential.deviceType,
        riskScore: credential.riskScore
      });

      return { verified: true, credential };

    } catch (error) {
      logger.error('WebAuthn registration verification failed', {
        error: error.message,
        userId: request.userId
      });
      return { verified: false };
    }
  }

  // Generate WebAuthn authentication options for step-up
  async generateStepUpAuthenticationOptions(sessionId: string): Promise<any> {
    try {
      const session = await this.getStepUpSession(sessionId);
      if (!session) {
        throw new Error('Step-up session not found');
      }

      if (session.expiresAt < new Date()) {
        throw new Error('Step-up session expired');
      }

      // Get user credentials
      const credentials = await this.getUserCredentials(session.userId);
      if (credentials.length === 0) {
        throw new Error('No registered credentials found');
      }

      const allowCredentials = credentials
        .filter(cred => cred.riskScore < 70) // Only use low-risk credentials
        .map(cred => ({
          id: cred.id,
          type: 'public-key' as const,
          transports: cred.transports
        }));

      const options = await generateAuthenticationOptions({
        timeout: this.config.timeout,
        allowCredentials,
        userVerification: this.config.userVerification,
        rpID: this.config.rpID
      });

      // Create challenge record
      const challenge: Challenge = {
        id: this.generateId(),
        type: 'webauthn',
        challenge: options.challenge,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.timeout),
        completed: false,
        verified: false
      };

      // Add challenge to session
      session.challenges.push(challenge);
      await this.updateStepUpSession(session);

      logger.info('Step-up authentication options generated', {
        sessionId,
        userId: session.userId,
        allowedCredentials: allowCredentials.length,
        challengeId: challenge.id
      });

      return { options, challengeId: challenge.id };

    } catch (error) {
      logger.error('Failed to generate step-up authentication options', {
        error: error.message,
        sessionId
      });
      throw error;
    }
  }

  // Verify WebAuthn authentication response for step-up
  async verifyStepUpAuthenticationResponse(request: {
    sessionId: string;
    challengeId: string;
    response: AuthenticationResponseJSON;
  }): Promise<{ verified: boolean; authLevel?: number }> {
    try {
      const session = await this.getStepUpSession(request.sessionId);
      if (!session) {
        throw new Error('Step-up session not found');
      }

      const challenge = session.challenges.find(c => c.id === request.challengeId);
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.expiresAt < new Date()) {
        throw new Error('Challenge expired');
      }

      // Get credential
      const credentials = await this.getUserCredentials(session.userId);
      const credential = credentials.find(c => c.id === request.response.id);
      if (!credential) {
        throw new Error('Credential not found');
      }

      const verification = await verifyAuthenticationResponse({
        response: request.response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: this.config.origin,
        expectedRPID: this.config.rpID,
        authenticator: {
          credentialID: credential.id,
          credentialPublicKey: credential.publicKey,
          counter: credential.counter,
          transports: credential.transports
        },
        requireUserVerification: this.config.userVerification === 'required'
      });

      if (!verification.verified) {
        logger.warn('Step-up authentication verification failed', {
          sessionId: request.sessionId,
          challengeId: request.challengeId,
          userId: session.userId
        });
        return { verified: false };
      }

      // Update challenge
      challenge.completed = true;
      challenge.verified = true;

      // Update credential counter and last used
      credential.counter = verification.authenticationInfo.newCounter;
      credential.lastUsed = new Date();
      await this.updateUserCredential(session.userId, credential);

      // Calculate achieved auth level based on credential properties
      const authLevel = this.calculateAuthLevel(credential, verification.authenticationInfo);
      session.currentAuthLevel = Math.max(session.currentAuthLevel, authLevel);

      await this.updateStepUpSession(session);

      logger.info('Step-up authentication completed', {
        sessionId: request.sessionId,
        userId: session.userId,
        achievedAuthLevel: authLevel,
        requiredAuthLevel: session.requiredAuthLevel,
        sufficient: authLevel >= session.requiredAuthLevel
      });

      return { verified: true, authLevel };

    } catch (error) {
      logger.error('Step-up authentication verification failed', {
        error: error.message,
        sessionId: request.sessionId,
        challengeId: request.challengeId
      });
      return { verified: false };
    }
  }

  // Check if step-up session is satisfied
  async isStepUpSatisfied(sessionId: string): Promise<boolean> {
    try {
      const session = await this.getStepUpSession(sessionId);
      if (!session) {
        return false;
      }

      if (session.expiresAt < new Date()) {
        return false;
      }

      return session.currentAuthLevel >= session.requiredAuthLevel;

    } catch (error) {
      logger.error('Failed to check step-up satisfaction', {
        error: error.message,
        sessionId
      });
      return false;
    }
  }

  // Private helper methods
  private async assessDeviceRisk(context: Record<string, any>): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Check if device is known/trusted
    const deviceFingerprint = context.deviceFingerprint;
    if (deviceFingerprint) {
      const knownDevice = await this.redis.get(`device:${deviceFingerprint}`);
      if (!knownDevice) {
        factors.push({
          type: 'device',
          factor: 'unknown_device',
          score: 30,
          weight: 0.8,
          description: 'Device not previously seen'
        });
      }
    }

    // Check user agent anomalies
    if (context.userAgent) {
      const suspiciousPatterns = ['bot', 'crawler', 'automated', 'headless'];
      if (suspiciousPatterns.some(pattern => context.userAgent.toLowerCase().includes(pattern))) {
        factors.push({
          type: 'device',
          factor: 'suspicious_user_agent',
          score: 50,
          weight: 1.0,
          description: 'Suspicious user agent detected'
        });
      }
    }

    return factors;
  }

  private async assessLocationRisk(context: Record<string, any>): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Check IP geolocation
    if (context.ip && context.country) {
      // Check against high-risk countries
      const highRiskCountries = ['XX', 'YY']; // Add actual country codes
      if (highRiskCountries.includes(context.country)) {
        factors.push({
          type: 'location',
          factor: 'high_risk_country',
          score: 40,
          weight: 0.7,
          description: 'Request from high-risk country'
        });
      }

      // Check for VPN/proxy usage
      if (context.isVPN || context.isProxy) {
        factors.push({
          type: 'location',
          factor: 'vpn_proxy',
          score: 25,
          weight: 0.6,
          description: 'VPN or proxy usage detected'
        });
      }
    }

    return factors;
  }

  private async assessBehaviorRisk(request: any): Promise<RiskFactor[]> {
    const factors: RiskFactor[] = [];

    // Check request frequency
    const recentRequests = await this.redis.get(`behavior:${request.userId}:requests`);
    if (recentRequests && parseInt(recentRequests) > 100) {
      factors.push({
        type: 'behavior',
        factor: 'high_request_frequency',
        score: 35,
        weight: 0.8,
        description: 'Unusually high request frequency'
      });
    }

    // Check failed authentication attempts
    const failedAttempts = await this.redis.get(`behavior:${request.userId}:failed_auth`);
    if (failedAttempts && parseInt(failedAttempts) > 3) {
      factors.push({
        type: 'behavior',
        factor: 'multiple_failed_auth',
        score: 60,
        weight: 1.0,
        description: 'Multiple failed authentication attempts'
      });
    }

    return factors;
  }

  private assessTimeRisk(context: Record<string, any>): RiskFactor[] {
    const factors: RiskFactor[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Check for unusual access times
    if (hour < 6 || hour > 22) {
      factors.push({
        type: 'time',
        factor: 'unusual_time',
        score: 20,
        weight: 0.5,
        description: 'Access during unusual hours'
      });
    }

    return factors;
  }

  private assessOperationRisk(operation: string): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Define high-risk operations
    const highRiskOperations = [
      'delete_tenant',
      'export_all_data',
      'modify_permissions',
      'access_admin_panel',
      'bulk_delete'
    ];

    const mediumRiskOperations = [
      'create_user',
      'modify_user',
      'export_data',
      'access_sensitive_data'
    ];

    if (highRiskOperations.includes(operation)) {
      factors.push({
        type: 'operation',
        factor: 'high_risk_operation',
        score: 50,
        weight: 1.2,
        description: 'High-risk operation requested'
      });
    } else if (mediumRiskOperations.includes(operation)) {
      factors.push({
        type: 'operation',
        factor: 'medium_risk_operation',
        score: 25,
        weight: 1.0,
        description: 'Medium-risk operation requested'
      });
    }

    return factors;
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 90) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private calculateCredentialRiskScore(registrationInfo: any): number {
    let score = 0;

    // Device type risk
    if (registrationInfo.credentialDeviceType === 'multiDevice') {
      score += 10; // Multi-device credentials are slightly riskier
    }

    // Backup status
    if (!registrationInfo.credentialBackedUp) {
      score += 5; // Non-backed up credentials are slightly riskier
    }

    // AAGUID check (if we have a database of known good/bad authenticators)
    // This would be implemented with actual AAGUID risk data

    return Math.min(100, score);
  }

  private calculateAuthLevel(credential: UserCredential, authInfo: any): number {
    let level = 1; // Base level for any authentication

    // User verification adds security
    if (authInfo.userVerified) {
      level += 1;
    }

    // Hardware-backed credentials are more secure
    if (credential.deviceType === 'singleDevice') {
      level += 1;
    }

    // Low-risk credentials add security
    if (credential.riskScore < 30) {
      level += 1;
    }

    return Math.min(3, level); // Cap at level 3
  }

  private async getUserCredentials(userId: string): Promise<UserCredential[]> {
    // In production, this would query the database
    return this.credentialStore.get(userId) || [];
  }

  private async storeUserCredential(userId: string, credential: UserCredential): Promise<void> {
    const credentials = this.credentialStore.get(userId) || [];
    credentials.push(credential);
    this.credentialStore.set(userId, credentials);

    // Store in Redis for persistence
    await this.redis.setex(
      `credentials:${userId}`,
      86400, // 24 hours
      JSON.stringify(credentials, this.dateReplacer)
    );
  }

  private async updateUserCredential(userId: string, updatedCredential: UserCredential): Promise<void> {
    const credentials = this.credentialStore.get(userId) || [];
    const index = credentials.findIndex(c => c.id === updatedCredential.id);
    if (index >= 0) {
      credentials[index] = updatedCredential;
      this.credentialStore.set(userId, credentials);

      await this.redis.setex(
        `credentials:${userId}`,
        86400,
        JSON.stringify(credentials, this.dateReplacer)
      );
    }
  }

  private async getStepUpSession(sessionId: string): Promise<StepUpSession | null> {
    // Check memory cache first
    let session = this.sessionStore.get(sessionId);
    if (session) {
      return session;
    }

    // Check Redis
    const sessionData = await this.redis.get(`stepup:${sessionId}`);
    if (sessionData) {
      session = JSON.parse(sessionData, this.dateReviver);
      this.sessionStore.set(sessionId, session);
      return session;
    }

    return null;
  }

  private async updateStepUpSession(session: StepUpSession): Promise<void> {
    this.sessionStore.set(session.id, session);
    await this.redis.setex(
      `stepup:${session.id}`,
      300,
      JSON.stringify(session, this.dateReplacer)
    );
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    if (value instanceof Uint8Array) {
      return { __type: 'Uint8Array', value: Array.from(value) };
    }
    return value;
  }

  private dateReviver(key: string, value: any): any {
    if (value && value.__type === 'Date') {
      return new Date(value.value);
    }
    if (value && value.__type === 'Uint8Array') {
      return new Uint8Array(value.value);
    }
    return value;
  }
}