/**
 * @fileoverview WebAuthn Step-up Authentication Manager
 * Comprehensive WebAuthn implementation with risk-based authentication,
 * biometric and hardware key support, session elevation, and timeout management.
 */

import { EventEmitter } from 'events';
import { createHash, randomBytes, createHmac } from 'crypto';

/**
 * WebAuthn credential types
 */
export type CredentialType = 'public-key';

/**
 * Authenticator attachment types
 */
export type AuthenticatorAttachment = 'platform' | 'cross-platform';

/**
 * User verification requirement
 */
export type UserVerificationRequirement =
  | 'required'
  | 'preferred'
  | 'discouraged';

/**
 * Attestation conveyance preference
 */
export type AttestationConveyancePreference =
  | 'none'
  | 'indirect'
  | 'direct'
  | 'enterprise';

/**
 * Transport methods
 */
export type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal';

/**
 * Risk assessment levels
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Step-up authentication reasons
 */
export type StepUpReason =
  | 'high_value_operation'
  | 'sensitive_data_access'
  | 'admin_action'
  | 'unusual_activity'
  | 'location_change'
  | 'device_change'
  | 'time_based'
  | 'manual_request';

/**
 * WebAuthn credential for registration
 */
export interface WebAuthnCredential {
  id: string;
  rawId: ArrayBuffer;
  response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  type: CredentialType;
  authenticatorAttachment?: AuthenticatorAttachment;
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
}

/**
 * PublicKeyCredentialCreationOptions for registration
 */
export interface CredentialCreationOptions {
  rp: {
    id: string;
    name: string;
  };
  user: {
    id: ArrayBuffer;
    name: string;
    displayName: string;
  };
  challenge: ArrayBuffer;
  pubKeyCredParams: PublicKeyCredentialParameters[];
  timeout?: number;
  excludeCredentials?: PublicKeyCredentialDescriptor[];
  authenticatorSelection?: {
    authenticatorAttachment?: AuthenticatorAttachment;
    residentKey?: 'discouraged' | 'preferred' | 'required';
    requireResidentKey?: boolean;
    userVerification?: UserVerificationRequirement;
  };
  attestation?: AttestationConveyancePreference;
  extensions?: AuthenticationExtensionsClientInputs;
}

/**
 * PublicKeyCredentialRequestOptions for authentication
 */
export interface CredentialRequestOptions {
  challenge: ArrayBuffer;
  timeout?: number;
  rpId?: string;
  allowCredentials?: PublicKeyCredentialDescriptor[];
  userVerification?: UserVerificationRequirement;
  extensions?: AuthenticationExtensionsClientInputs;
}

/**
 * Public key credential parameters
 */
export interface PublicKeyCredentialParameters {
  type: CredentialType;
  alg: number; // COSE algorithm identifier
}

/**
 * Public key credential descriptor
 */
export interface PublicKeyCredentialDescriptor {
  type: CredentialType;
  id: ArrayBuffer;
  transports?: AuthenticatorTransport[];
}

/**
 * Stored WebAuthn credential information
 */
export interface StoredCredential {
  id: string;
  userId: string;
  tenantId?: string;
  credentialId: ArrayBuffer;
  publicKey: ArrayBuffer;
  algorithm: number;
  counter: number;
  aaguid: ArrayBuffer;
  credentialBackedUp: boolean;
  credentialDeviceType: 'singleDevice' | 'multiDevice';
  transports: AuthenticatorTransport[];
  attestationFormat: string;
  createdAt: Date;
  lastUsed?: Date;
  nickname?: string;
  metadata: {
    authenticatorModel?: string;
    authenticatorVersion?: string;
    userAgent: string;
    ipAddress: string;
  };
}

/**
 * Authentication session information
 */
export interface AuthSession {
  sessionId: string;
  userId: string;
  tenantId?: string;
  isElevated: boolean;
  elevationLevel: 'standard' | 'high' | 'critical';
  elevatedAt?: Date;
  elevationExpiry?: Date;
  riskScore: number;
  riskFactors: RiskFactor[];
  authMethods: AuthMethod[];
  ipAddress: string;
  userAgent: string;
  location?: GeolocationData;
  deviceFingerprint: string;
  createdAt: Date;
  lastActivity: Date;
  metadata: Record<string, any>;
}

/**
 * Risk factor for authentication
 */
export interface RiskFactor {
  type: 'location' | 'device' | 'time' | 'behavior' | 'network' | 'velocity';
  score: number; // 0-100
  description: string;
  data: Record<string, any>;
}

/**
 * Authentication method used
 */
export interface AuthMethod {
  type: 'password' | 'webauthn' | 'totp' | 'sms' | 'email';
  timestamp: Date;
  credentialId?: string;
  success: boolean;
  metadata: Record<string, any>;
}

/**
 * Geolocation data
 */
export interface GeolocationData {
  country: string;
  region: string;
  city: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  source: 'gps' | 'network' | 'ip' | 'user_provided';
}

/**
 * Step-up authentication request
 */
export interface StepUpAuthRequest {
  sessionId: string;
  reason: StepUpReason;
  requiredLevel: 'high' | 'critical';
  operation: string;
  resourceId?: string;
  expiryMinutes?: number;
  allowFallback: boolean;
  metadata: Record<string, any>;
}

/**
 * Registration challenge data
 */
export interface RegistrationChallenge {
  challengeId: string;
  userId: string;
  challenge: ArrayBuffer;
  options: CredentialCreationOptions;
  createdAt: Date;
  expiryAt: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * Authentication challenge data
 */
export interface AuthenticationChallenge {
  challengeId: string;
  sessionId?: string;
  challenge: ArrayBuffer;
  options: CredentialRequestOptions;
  isStepUp: boolean;
  stepUpRequest?: StepUpAuthRequest;
  createdAt: Date;
  expiryAt: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * Comprehensive WebAuthn step-up authentication manager
 */
export class WebAuthnManager extends EventEmitter {
  private credentials: Map<string, StoredCredential[]> = new Map();
  private sessions: Map<string, AuthSession> = new Map();
  private registrationChallenges: Map<string, RegistrationChallenge> =
    new Map();
  private authenticationChallenges: Map<string, AuthenticationChallenge> =
    new Map();
  private riskEngine: RiskAssessmentEngine;

  constructor(
    private config: {
      rpId: string;
      rpName: string;
      origin: string;
      challengeTimeout: number; // minutes
      sessionTimeout: number; // minutes
      elevationTimeout: number; // minutes
      enableRiskAssessment: boolean;
      allowPlatformAuthenticators: boolean;
      allowCrossPlatformAuthenticators: boolean;
      requireUserVerification: boolean;
      supportedAlgorithms: number[];
      maxCredentialsPerUser: number;
      attestationFormats: string[];
    },
  ) {
    super();
    this.riskEngine = new RiskAssessmentEngine();
    this.startBackgroundTasks();
  }

  /**
   * Initiate WebAuthn registration
   */
  async initiateRegistration(
    userId: string,
    userInfo: {
      name: string;
      displayName: string;
      email: string;
    },
    options: {
      tenantId?: string;
      authenticatorType?: 'platform' | 'cross-platform' | 'both';
      userVerification?: UserVerificationRequirement;
      attestation?: AttestationConveyancePreference;
      ipAddress: string;
      userAgent: string;
    },
  ): Promise<{
    challengeId: string;
    options: CredentialCreationOptions;
  }> {
    // Generate challenge
    const challenge = randomBytes(32);
    const challengeId = this.generateChallengeId();

    // Get existing credentials to exclude
    const existingCredentials = this.credentials.get(userId) || [];
    const excludeCredentials = existingCredentials.map((cred) => ({
      type: 'public-key' as CredentialType,
      id: cred.credentialId,
      transports: cred.transports,
    }));

    // Build creation options
    const creationOptions: CredentialCreationOptions = {
      rp: {
        id: this.config.rpId,
        name: this.config.rpName,
      },
      user: {
        id: this.stringToArrayBuffer(userId),
        name: userInfo.name,
        displayName: userInfo.displayName,
      },
      challenge,
      pubKeyCredParams: this.config.supportedAlgorithms.map((alg) => ({
        type: 'public-key',
        alg,
      })),
      timeout: this.config.challengeTimeout * 60 * 1000,
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment:
          options.authenticatorType === 'both'
            ? undefined
            : options.authenticatorType,
        residentKey: 'preferred',
        requireResidentKey: false,
        userVerification:
          options.userVerification ||
          (this.config.requireUserVerification ? 'required' : 'preferred'),
      },
      attestation: options.attestation || 'none',
      extensions: {},
    };

    // Store challenge
    const challengeData: RegistrationChallenge = {
      challengeId,
      userId,
      challenge,
      options: creationOptions,
      createdAt: new Date(),
      expiryAt: new Date(Date.now() + this.config.challengeTimeout * 60 * 1000),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    this.registrationChallenges.set(challengeId, challengeData);

    // Emit registration initiated event
    this.emit('registration:initiated', {
      userId,
      challengeId,
      tenantId: options.tenantId,
    });

    return {
      challengeId,
      options: creationOptions,
    };
  }

  /**
   * Complete WebAuthn registration
   */
  async completeRegistration(
    challengeId: string,
    credential: WebAuthnCredential,
    options: {
      nickname?: string;
      ipAddress: string;
      userAgent: string;
    },
  ): Promise<{
    credentialId: string;
    success: boolean;
    errors?: string[];
  }> {
    const challengeData = this.registrationChallenges.get(challengeId);
    if (!challengeData) {
      throw new Error('Registration challenge not found or expired');
    }

    // Check challenge expiry
    if (challengeData.expiryAt < new Date()) {
      this.registrationChallenges.delete(challengeId);
      throw new Error('Registration challenge has expired');
    }

    try {
      // Verify the credential
      const verification = await this.verifyRegistrationCredential(
        credential,
        challengeData,
      );

      if (!verification.verified) {
        return {
          credentialId: '',
          success: false,
          errors: verification.errors,
        };
      }

      // Check credential limit
      const existingCredentials =
        this.credentials.get(challengeData.userId) || [];
      if (existingCredentials.length >= this.config.maxCredentialsPerUser) {
        return {
          credentialId: '',
          success: false,
          errors: ['Maximum number of credentials reached'],
        };
      }

      // Store the credential
      const storedCredential: StoredCredential = {
        id: this.generateCredentialId(),
        userId: challengeData.userId,
        credentialId: credential.rawId,
        publicKey: verification.publicKey!,
        algorithm: verification.algorithm!,
        counter: verification.counter!,
        aaguid: verification.aaguid!,
        credentialBackedUp: verification.credentialBackedUp!,
        credentialDeviceType: verification.credentialDeviceType!,
        transports: this.extractTransports(credential),
        attestationFormat: verification.attestationFormat!,
        createdAt: new Date(),
        nickname: options.nickname,
        metadata: {
          authenticatorModel: verification.authenticatorModel,
          authenticatorVersion: verification.authenticatorVersion,
          userAgent: options.userAgent,
          ipAddress: options.ipAddress,
        },
      };

      // Add to stored credentials
      existingCredentials.push(storedCredential);
      this.credentials.set(challengeData.userId, existingCredentials);

      // Clean up challenge
      this.registrationChallenges.delete(challengeId);

      // Emit registration completed event
      this.emit('registration:completed', {
        userId: challengeData.userId,
        credentialId: storedCredential.id,
        credentialType: credential.authenticatorAttachment,
      });

      return {
        credentialId: storedCredential.id,
        success: true,
      };
    } catch (error) {
      // Clean up challenge on error
      this.registrationChallenges.delete(challengeId);

      this.emit('registration:failed', {
        userId: challengeData.userId,
        challengeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Initiate WebAuthn authentication
   */
  async initiateAuthentication(options: {
    userId?: string;
    sessionId?: string;
    stepUpRequest?: StepUpAuthRequest;
    userVerification?: UserVerificationRequirement;
    ipAddress: string;
    userAgent: string;
  }): Promise<{
    challengeId: string;
    options: CredentialRequestOptions;
  }> {
    // Generate challenge
    const challenge = randomBytes(32);
    const challengeId = this.generateChallengeId();

    // Get allowed credentials
    let allowCredentials: PublicKeyCredentialDescriptor[] = [];

    if (options.userId) {
      const userCredentials = this.credentials.get(options.userId) || [];
      allowCredentials = userCredentials.map((cred) => ({
        type: 'public-key' as CredentialType,
        id: cred.credentialId,
        transports: cred.transports,
      }));
    }

    // Build request options
    const requestOptions: CredentialRequestOptions = {
      challenge,
      timeout: this.config.challengeTimeout * 60 * 1000,
      rpId: this.config.rpId,
      allowCredentials:
        allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification:
        options.userVerification ||
        (this.config.requireUserVerification ? 'required' : 'preferred'),
      extensions: {},
    };

    // Store challenge
    const challengeData: AuthenticationChallenge = {
      challengeId,
      sessionId: options.sessionId,
      challenge,
      options: requestOptions,
      isStepUp: !!options.stepUpRequest,
      stepUpRequest: options.stepUpRequest,
      createdAt: new Date(),
      expiryAt: new Date(Date.now() + this.config.challengeTimeout * 60 * 1000),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    };

    this.authenticationChallenges.set(challengeId, challengeData);

    // Emit authentication initiated event
    this.emit('authentication:initiated', {
      challengeId,
      userId: options.userId,
      sessionId: options.sessionId,
      isStepUp: challengeData.isStepUp,
    });

    return {
      challengeId,
      options: requestOptions,
    };
  }

  /**
   * Complete WebAuthn authentication
   */
  async completeAuthentication(
    challengeId: string,
    credential: WebAuthnCredential,
    options: {
      ipAddress: string;
      userAgent: string;
      location?: GeolocationData;
    },
  ): Promise<{
    success: boolean;
    sessionId?: string;
    elevated?: boolean;
    userId?: string;
    errors?: string[];
  }> {
    const challengeData = this.authenticationChallenges.get(challengeId);
    if (!challengeData) {
      throw new Error('Authentication challenge not found or expired');
    }

    // Check challenge expiry
    if (challengeData.expiryAt < new Date()) {
      this.authenticationChallenges.delete(challengeId);
      throw new Error('Authentication challenge has expired');
    }

    try {
      // Find the credential
      const credentialId = this.arrayBufferToString(credential.rawId);
      const storedCredential = this.findCredentialById(credentialId);

      if (!storedCredential) {
        return {
          success: false,
          errors: ['Credential not found'],
        };
      }

      // Verify the authentication
      const verification = await this.verifyAuthenticationCredential(
        credential,
        storedCredential,
        challengeData,
      );

      if (!verification.verified) {
        // Record failed authentication attempt
        this.recordFailedAuthentication(
          storedCredential.userId,
          credentialId,
          options,
        );

        return {
          success: false,
          errors: verification.errors,
        };
      }

      // Update credential counter and last used
      storedCredential.counter = verification.newCounter!;
      storedCredential.lastUsed = new Date();

      // Handle step-up authentication
      if (challengeData.isStepUp && challengeData.stepUpRequest) {
        const result = await this.handleStepUpAuthentication(
          challengeData.stepUpRequest,
          storedCredential,
          options,
        );

        // Clean up challenge
        this.authenticationChallenges.delete(challengeId);

        return result;
      }

      // Regular authentication - create or update session
      const session = await this.createOrUpdateSession(
        storedCredential.userId,
        challengeData.sessionId,
        storedCredential,
        options,
      );

      // Clean up challenge
      this.authenticationChallenges.delete(challengeId);

      // Emit authentication completed event
      this.emit('authentication:completed', {
        userId: storedCredential.userId,
        sessionId: session.sessionId,
        credentialId: storedCredential.id,
        isStepUp: challengeData.isStepUp,
      });

      return {
        success: true,
        sessionId: session.sessionId,
        elevated: session.isElevated,
        userId: storedCredential.userId,
      };
    } catch (error) {
      // Clean up challenge on error
      this.authenticationChallenges.delete(challengeId);

      this.emit('authentication:failed', {
        challengeId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Request step-up authentication
   */
  async requestStepUpAuthentication(
    sessionId: string,
    request: StepUpAuthRequest,
  ): Promise<{
    required: boolean;
    challengeId?: string;
    options?: CredentialRequestOptions;
    reason?: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check if step-up is required based on risk assessment
    const riskAssessment = await this.assessStepUpRisk(session, request);

    if (!riskAssessment.required) {
      return {
        required: false,
        reason: 'Current authentication level sufficient',
      };
    }

    // Initiate step-up authentication
    const auth = await this.initiateAuthentication({
      userId: session.userId,
      sessionId,
      stepUpRequest: request,
      userVerification: 'required',
      ipAddress: request.metadata.ipAddress || session.ipAddress,
      userAgent: request.metadata.userAgent || session.userAgent,
    });

    return {
      required: true,
      challengeId: auth.challengeId,
      options: auth.options,
    };
  }

  /**
   * Check if session requires step-up for operation
   */
  async requiresStepUp(
    sessionId: string,
    operation: {
      type: string;
      riskLevel: RiskLevel;
      resourceId?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<{
    required: boolean;
    reason?: StepUpReason;
    currentLevel: string;
    requiredLevel: string;
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Check current elevation status
    if (
      session.isElevated &&
      session.elevationExpiry &&
      session.elevationExpiry > new Date()
    ) {
      const currentElevationSufficient = this.isElevationSufficient(
        session.elevationLevel,
        operation.riskLevel,
      );

      if (currentElevationSufficient) {
        return {
          required: false,
          currentLevel: session.elevationLevel,
          requiredLevel: this.mapRiskToElevationLevel(operation.riskLevel),
        };
      }
    }

    // Determine step-up reason
    const reason = this.determineStepUpReason(session, operation);

    return {
      required: true,
      reason,
      currentLevel: session.isElevated ? session.elevationLevel : 'standard',
      requiredLevel: this.mapRiskToElevationLevel(operation.riskLevel),
    };
  }

  /**
   * Get user credentials
   */
  getUserCredentials(userId: string): StoredCredential[] {
    return this.credentials.get(userId) || [];
  }

  /**
   * Remove credential
   */
  async removeCredential(
    userId: string,
    credentialId: string,
  ): Promise<boolean> {
    const userCredentials = this.credentials.get(userId) || [];
    const index = userCredentials.findIndex((cred) => cred.id === credentialId);

    if (index === -1) {
      return false;
    }

    userCredentials.splice(index, 1);
    this.credentials.set(userId, userCredentials);

    this.emit('credential:removed', { userId, credentialId });

    return true;
  }

  /**
   * Update credential nickname
   */
  async updateCredentialNickname(
    userId: string,
    credentialId: string,
    nickname: string,
  ): Promise<boolean> {
    const userCredentials = this.credentials.get(userId) || [];
    const credential = userCredentials.find((cred) => cred.id === credentialId);

    if (!credential) {
      return false;
    }

    credential.nickname = nickname;
    this.credentials.set(userId, userCredentials);

    return true;
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): AuthSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);

    this.emit('session:invalidated', { sessionId, userId: session.userId });

    return true;
  }

  /**
   * Extend session elevation
   */
  async extendSessionElevation(
    sessionId: string,
    durationMinutes: number = 15,
  ): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isElevated) {
      return false;
    }

    const newExpiry = new Date(Date.now() + durationMinutes * 60 * 1000);
    session.elevationExpiry = newExpiry;

    this.emit('session:elevation_extended', { sessionId, newExpiry });

    return true;
  }

  /**
   * Private helper methods
   */

  private async verifyRegistrationCredential(
    credential: WebAuthnCredential,
    challengeData: RegistrationChallenge,
  ): Promise<{
    verified: boolean;
    errors?: string[];
    publicKey?: ArrayBuffer;
    algorithm?: number;
    counter?: number;
    aaguid?: ArrayBuffer;
    credentialBackedUp?: boolean;
    credentialDeviceType?: 'singleDevice' | 'multiDevice';
    attestationFormat?: string;
    authenticatorModel?: string;
    authenticatorVersion?: string;
  }> {
    try {
      // This is a simplified verification - in production would use
      // libraries like @simplewebauthn/server or fido2-lib

      const response = credential.response as AuthenticatorAttestationResponse;

      // Verify challenge matches
      const clientDataJSON = JSON.parse(
        this.arrayBufferToString(response.clientDataJSON),
      );

      if (
        clientDataJSON.challenge !==
        this.arrayBufferToBase64(challengeData.challenge)
      ) {
        return { verified: false, errors: ['Challenge mismatch'] };
      }

      // Verify origin
      if (clientDataJSON.origin !== this.config.origin) {
        return { verified: false, errors: ['Origin mismatch'] };
      }

      // Extract public key and other data from attestation
      const attestationObject = this.parseAttestationObject(
        response.attestationObject,
      );

      return {
        verified: true,
        publicKey: attestationObject.publicKey,
        algorithm: attestationObject.algorithm,
        counter: attestationObject.counter,
        aaguid: attestationObject.aaguid,
        credentialBackedUp: attestationObject.credentialBackedUp,
        credentialDeviceType: attestationObject.credentialDeviceType,
        attestationFormat: attestationObject.fmt,
      };
    } catch (error) {
      return {
        verified: false,
        errors: [`Verification failed: ${error.message}`],
      };
    }
  }

  private async verifyAuthenticationCredential(
    credential: WebAuthnCredential,
    storedCredential: StoredCredential,
    challengeData: AuthenticationChallenge,
  ): Promise<{
    verified: boolean;
    errors?: string[];
    newCounter?: number;
  }> {
    try {
      const response = credential.response as AuthenticatorAssertionResponse;

      // Verify challenge
      const clientDataJSON = JSON.parse(
        this.arrayBufferToString(response.clientDataJSON),
      );

      if (
        clientDataJSON.challenge !==
        this.arrayBufferToBase64(challengeData.challenge)
      ) {
        return { verified: false, errors: ['Challenge mismatch'] };
      }

      // Verify origin
      if (clientDataJSON.origin !== this.config.origin) {
        return { verified: false, errors: ['Origin mismatch'] };
      }

      // Verify signature (simplified)
      const authData = this.parseAuthenticatorData(response.authenticatorData);

      // Check counter
      if (authData.counter <= storedCredential.counter) {
        return { verified: false, errors: ['Invalid counter'] };
      }

      // In production, would verify the signature using the stored public key
      // const signatureValid = await this.verifySignature(
      //   storedCredential.publicKey,
      //   response.signature,
      //   authData,
      //   clientDataJSON
      // );

      return {
        verified: true,
        newCounter: authData.counter,
      };
    } catch (error) {
      return {
        verified: false,
        errors: [`Authentication verification failed: ${error.message}`],
      };
    }
  }

  private async handleStepUpAuthentication(
    request: StepUpAuthRequest,
    credential: StoredCredential,
    options: any,
  ): Promise<{
    success: boolean;
    sessionId?: string;
    elevated?: boolean;
    userId?: string;
    errors?: string[];
  }> {
    const session = this.sessions.get(request.sessionId);
    if (!session) {
      return {
        success: false,
        errors: ['Session not found'],
      };
    }

    // Elevate the session
    session.isElevated = true;
    session.elevationLevel = request.requiredLevel;
    session.elevatedAt = new Date();
    session.elevationExpiry = new Date(
      Date.now() +
        (request.expiryMinutes || this.config.elevationTimeout) * 60 * 1000,
    );

    // Add authentication method to session
    session.authMethods.push({
      type: 'webauthn',
      timestamp: new Date(),
      credentialId: credential.id,
      success: true,
      metadata: {
        stepUp: true,
        operation: request.operation,
        reason: request.reason,
      },
    });

    this.emit('session:elevated', {
      sessionId: session.sessionId,
      userId: session.userId,
      level: session.elevationLevel,
      reason: request.reason,
    });

    return {
      success: true,
      sessionId: session.sessionId,
      elevated: true,
      userId: session.userId,
    };
  }

  private async createOrUpdateSession(
    userId: string,
    existingSessionId: string | undefined,
    credential: StoredCredential,
    options: any,
  ): Promise<AuthSession> {
    let session: AuthSession;

    if (existingSessionId && this.sessions.has(existingSessionId)) {
      // Update existing session
      session = this.sessions.get(existingSessionId)!;
      session.lastActivity = new Date();

      // Add authentication method
      session.authMethods.push({
        type: 'webauthn',
        timestamp: new Date(),
        credentialId: credential.id,
        success: true,
        metadata: {},
      });
    } else {
      // Create new session
      const sessionId = this.generateSessionId();
      const riskAssessment = await this.riskEngine.assessRisk(userId, options);

      session = {
        sessionId,
        userId,
        tenantId: credential.tenantId,
        isElevated: false,
        elevationLevel: 'standard',
        riskScore: riskAssessment.score,
        riskFactors: riskAssessment.factors,
        authMethods: [
          {
            type: 'webauthn',
            timestamp: new Date(),
            credentialId: credential.id,
            success: true,
            metadata: {},
          },
        ],
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        location: options.location,
        deviceFingerprint: this.generateDeviceFingerprint(options),
        createdAt: new Date(),
        lastActivity: new Date(),
        metadata: {},
      };

      this.sessions.set(sessionId, session);
    }

    return session;
  }

  private async assessStepUpRisk(
    session: AuthSession,
    request: StepUpAuthRequest,
  ): Promise<{ required: boolean; score: number; factors: RiskFactor[] }> {
    return this.riskEngine.assessStepUpRisk(session, request);
  }

  private isElevationSufficient(
    currentLevel: string,
    operationRisk: RiskLevel,
  ): boolean {
    const levelMapping = {
      standard: 1,
      high: 2,
      critical: 3,
    };

    const riskMapping = {
      low: 1,
      medium: 1,
      high: 2,
      critical: 3,
    };

    return (
      levelMapping[currentLevel as keyof typeof levelMapping] >=
      riskMapping[operationRisk]
    );
  }

  private mapRiskToElevationLevel(riskLevel: RiskLevel): string {
    switch (riskLevel) {
      case 'critical':
        return 'critical';
      case 'high':
        return 'high';
      default:
        return 'standard';
    }
  }

  private determineStepUpReason(
    session: AuthSession,
    operation: any,
  ): StepUpReason {
    if (operation.riskLevel === 'critical') return 'high_value_operation';
    if (operation.type.includes('admin')) return 'admin_action';
    if (operation.type.includes('sensitive')) return 'sensitive_data_access';

    // Check for unusual activity
    if (session.riskScore > 70) return 'unusual_activity';

    return 'high_value_operation';
  }

  private recordFailedAuthentication(
    userId: string,
    credentialId: string,
    options: any,
  ): void {
    this.emit('authentication:failed_attempt', {
      userId,
      credentialId,
      timestamp: new Date(),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
    });
  }

  private findCredentialById(credentialId: string): StoredCredential | null {
    for (const userCredentials of this.credentials.values()) {
      const credential = userCredentials.find(
        (cred) => this.arrayBufferToString(cred.credentialId) === credentialId,
      );
      if (credential) return credential;
    }
    return null;
  }

  private extractTransports(
    credential: WebAuthnCredential,
  ): AuthenticatorTransport[] {
    // Extract transport methods from credential
    const transports: AuthenticatorTransport[] = [];

    if (credential.authenticatorAttachment === 'platform') {
      transports.push('internal');
    } else {
      transports.push('usb');
    }

    return transports;
  }

  private parseAttestationObject(attestationObject: ArrayBuffer): any {
    // Simplified parsing - in production would use proper CBOR library
    return {
      publicKey: new ArrayBuffer(32),
      algorithm: -7, // ES256
      counter: 0,
      aaguid: new ArrayBuffer(16),
      credentialBackedUp: false,
      credentialDeviceType: 'singleDevice',
      fmt: 'none',
    };
  }

  private parseAuthenticatorData(authData: ArrayBuffer): any {
    // Simplified parsing - in production would properly parse
    return {
      counter: Math.floor(Math.random() * 1000000),
    };
  }

  private generateDeviceFingerprint(options: any): string {
    return createHash('sha256')
      .update(options.userAgent + options.ipAddress)
      .digest('hex')
      .substring(0, 16);
  }

  private generateChallengeId(): string {
    return 'ch_' + randomBytes(16).toString('hex');
  }

  private generateCredentialId(): string {
    return 'cred_' + randomBytes(16).toString('hex');
  }

  private generateSessionId(): string {
    return 'sess_' + randomBytes(20).toString('hex');
  }

  private stringToArrayBuffer(str: string): ArrayBuffer {
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++) {
      view[i] = str.charCodeAt(i);
    }
    return buffer;
  }

  private arrayBufferToString(buffer: ArrayBuffer): string {
    return String.fromCharCode(...new Uint8Array(buffer));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private startBackgroundTasks(): void {
    // Clean up expired challenges and sessions
    setInterval(() => {
      this.cleanupExpiredData();
    }, 60 * 1000); // Every minute

    // Update session activity
    setInterval(
      () => {
        this.updateSessionActivity();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  private cleanupExpiredData(): void {
    const now = new Date();

    // Clean up expired registration challenges
    for (const [id, challenge] of this.registrationChallenges.entries()) {
      if (challenge.expiryAt < now) {
        this.registrationChallenges.delete(id);
      }
    }

    // Clean up expired authentication challenges
    for (const [id, challenge] of this.authenticationChallenges.entries()) {
      if (challenge.expiryAt < now) {
        this.authenticationChallenges.delete(id);
      }
    }

    // Clean up expired sessions
    const sessionTimeout = this.config.sessionTimeout * 60 * 1000;
    for (const [id, session] of this.sessions.entries()) {
      const inactive =
        now.getTime() - session.lastActivity.getTime() > sessionTimeout;
      const elevationExpired =
        session.elevationExpiry && session.elevationExpiry < now;

      if (inactive) {
        this.sessions.delete(id);
        this.emit('session:expired', { sessionId: id, userId: session.userId });
      } else if (elevationExpired && session.isElevated) {
        session.isElevated = false;
        session.elevationLevel = 'standard';
        session.elevatedAt = undefined;
        session.elevationExpiry = undefined;
        this.emit('session:elevation_expired', { sessionId: id });
      }
    }
  }

  private updateSessionActivity(): void {
    // Update last activity for active sessions
    const now = new Date();
    for (const session of this.sessions.values()) {
      // In a real implementation, would check for actual user activity
      session.lastActivity = now;
    }
  }
}

/**
 * Risk assessment engine for WebAuthn authentication
 */
class RiskAssessmentEngine {
  async assessRisk(
    userId: string,
    context: {
      ipAddress: string;
      userAgent: string;
      location?: GeolocationData;
    },
  ): Promise<{ score: number; factors: RiskFactor[] }> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;

    // IP address risk assessment
    const ipRisk = await this.assessIPRisk(context.ipAddress);
    factors.push(ipRisk);
    totalScore += ipRisk.score * 0.3;

    // Location risk assessment
    if (context.location) {
      const locationRisk = await this.assessLocationRisk(
        userId,
        context.location,
      );
      factors.push(locationRisk);
      totalScore += locationRisk.score * 0.2;
    }

    // Device/User Agent risk assessment
    const deviceRisk = await this.assessDeviceRisk(userId, context.userAgent);
    factors.push(deviceRisk);
    totalScore += deviceRisk.score * 0.2;

    // Time-based risk assessment
    const timeRisk = this.assessTimeRisk();
    factors.push(timeRisk);
    totalScore += timeRisk.score * 0.1;

    // Behavioral risk assessment
    const behaviorRisk = await this.assessBehavioralRisk(userId);
    factors.push(behaviorRisk);
    totalScore += behaviorRisk.score * 0.2;

    return {
      score: Math.min(100, Math.max(0, totalScore)),
      factors,
    };
  }

  async assessStepUpRisk(
    session: AuthSession,
    request: StepUpAuthRequest,
  ): Promise<{ required: boolean; score: number; factors: RiskFactor[] }> {
    const factors: RiskFactor[] = [];
    let riskScore = session.riskScore;

    // Operation-specific risk
    const operationRisk = this.assessOperationRisk(request);
    factors.push(operationRisk);
    riskScore += operationRisk.score * 0.4;

    // Time since last authentication
    const lastAuth = session.authMethods[session.authMethods.length - 1];
    const timeSinceAuth = Date.now() - lastAuth.timestamp.getTime();

    if (timeSinceAuth > 30 * 60 * 1000) {
      // 30 minutes
      const timeRisk: RiskFactor = {
        type: 'time',
        score: 30,
        description: 'Long time since last authentication',
        data: { timeSinceAuthMinutes: timeSinceAuth / (60 * 1000) },
      };
      factors.push(timeRisk);
      riskScore += 30;
    }

    const required =
      riskScore > 50 ||
      request.requiredLevel === 'critical' ||
      ['high_value_operation', 'admin_action'].includes(request.reason);

    return {
      required,
      score: Math.min(100, riskScore),
      factors,
    };
  }

  private async assessIPRisk(ipAddress: string): Promise<RiskFactor> {
    // Mock IP risk assessment
    // In production would check against threat intelligence databases
    return {
      type: 'network',
      score: 10,
      description: 'IP address risk assessment',
      data: { ipAddress, category: 'residential' },
    };
  }

  private async assessLocationRisk(
    userId: string,
    location: GeolocationData,
  ): Promise<RiskFactor> {
    // Mock location risk assessment
    return {
      type: 'location',
      score: 15,
      description: 'Location-based risk assessment',
      data: {
        country: location.country,
        newLocation: false,
        travelVelocity: 0,
      },
    };
  }

  private async assessDeviceRisk(
    userId: string,
    userAgent: string,
  ): Promise<RiskFactor> {
    // Mock device risk assessment
    return {
      type: 'device',
      score: 5,
      description: 'Device fingerprint risk assessment',
      data: {
        userAgent,
        knownDevice: true,
        deviceAge: 30,
      },
    };
  }

  private assessTimeRisk(): RiskFactor {
    const hour = new Date().getHours();
    const isOffHours = hour < 6 || hour > 22;

    return {
      type: 'time',
      score: isOffHours ? 20 : 5,
      description: 'Time-based risk assessment',
      data: {
        hour,
        isOffHours,
        timezone: 'UTC',
      },
    };
  }

  private async assessBehavioralRisk(userId: string): Promise<RiskFactor> {
    // Mock behavioral risk assessment
    return {
      type: 'behavior',
      score: 10,
      description: 'Behavioral pattern analysis',
      data: {
        typingPattern: 'normal',
        navigationPattern: 'normal',
        velocityAnomaly: false,
      },
    };
  }

  private assessOperationRisk(request: StepUpAuthRequest): RiskFactor {
    const riskScores = {
      high_value_operation: 60,
      sensitive_data_access: 50,
      admin_action: 70,
      unusual_activity: 80,
      location_change: 40,
      device_change: 35,
      time_based: 25,
      manual_request: 20,
    };

    const score = riskScores[request.reason] || 30;

    return {
      type: 'behavior',
      score,
      description: `Operation risk: ${request.reason}`,
      data: {
        operation: request.operation,
        reason: request.reason,
        requiredLevel: request.requiredLevel,
      },
    };
  }
}
