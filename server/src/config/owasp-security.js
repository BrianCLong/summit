"use strict";
/**
 * OWASP Security Configuration
 *
 * Comprehensive security configuration based on OWASP Top 10 2021
 * https://owasp.org/www-project-top-ten/
 *
 * This configuration implements:
 * - A01:2021 – Broken Access Control
 * - A02:2021 – Cryptographic Failures
 * - A03:2021 – Injection
 * - A04:2021 – Insecure Design
 * - A05:2021 – Security Misconfiguration
 * - A06:2021 – Vulnerable and Outdated Components
 * - A07:2021 – Identification and Authentication Failures
 * - A08:2021 – Software and Data Integrity Failures
 * - A09:2021 – Security Logging and Monitoring Failures
 * - A10:2021 – Server-Side Request Forgery (SSRF)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOWASPSecurityConfig = getOWASPSecurityConfig;
exports.validateOWASPCompliance = validateOWASPCompliance;
/**
 * Get OWASP-compliant security configuration based on environment
 */
function getOWASPSecurityConfig(env = process.env.NODE_ENV || 'development') {
    const isProd = env === 'production';
    const isStaging = env === 'staging';
    return {
        environment: env,
        accessControl: {
            enableRBAC: true,
            enableABAC: isProd || isStaging,
            defaultDenyPolicy: isProd,
            sessionTimeout: isProd ? 15 : 60, // 15 min in prod, 60 in dev
            maxSessionsPerUser: isProd ? 3 : 10,
        },
        cryptography: {
            algorithms: {
                hashing: 'argon2id', // OWASP recommended
                encryption: 'aes-256-gcm',
                jwt: 'RS256', // Asymmetric for production
            },
            saltRounds: 12,
            keyRotationDays: 90,
            tlsMinVersion: 'TLSv1.3',
            enforceHTTPS: isProd || isStaging,
        },
        injection: {
            enableSQLInjectionProtection: true,
            enableXSSProtection: true,
            enableCommandInjectionProtection: true,
            enableLDAPInjectionProtection: true,
            enableNoSQLInjectionProtection: true,
            sanitizeInputs: true,
            validateOutputEncoding: true,
            useParameterizedQueries: true,
        },
        secureDesign: {
            enableThreatModeling: isProd,
            enableSecureSDLC: true,
            enableDesignReview: isProd,
            limitResourceConsumption: true,
            enableBusinessLogicValidation: true,
        },
        configuration: {
            disableDefaultAccounts: isProd,
            disableUnnecessaryFeatures: isProd,
            enableSecurityHeaders: true,
            enableErrorHandling: true,
            hideServerVersion: isProd,
            disableDirectoryListing: true,
            enableCORS: true,
            allowedOrigins: isProd
                ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
                : ['http://localhost:3000', 'http://localhost:5173'],
        },
        dependencies: {
            enableAutomatedScanning: true,
            enableDependencyReview: true,
            enableSBOM: isProd,
            patchManagementEnabled: true,
            maxVulnerabilityAge: isProd ? 7 : 30, // days
            allowedLicenses: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'],
        },
        authentication: {
            jwt: {
                accessTokenExpiry: isProd ? '15m' : '24h', // OWASP: short-lived
                refreshTokenExpiry: isProd ? '7d' : '30d',
                rotateOnRefresh: true, // OWASP: token rotation
                algorithm: 'RS256',
                issuer: process.env.JWT_ISSUER || 'intelgraph',
                audience: process.env.JWT_AUDIENCE || 'intelgraph-api',
            },
            password: {
                minLength: 12, // OWASP minimum
                requireUppercase: true,
                requireLowercase: true,
                requireNumbers: true,
                requireSpecialChars: true,
                preventReuse: 5, // last 5 passwords
                maxAge: isProd ? 90 : 365, // days
            },
            mfa: {
                enabled: isProd,
                methods: ['totp', 'webauthn'],
                gracePeriod: 7,
            },
            rateLimiting: {
                login: { window: 60 * 1000, max: 5 }, // 5 req/min OWASP
                registration: { window: 60 * 60 * 1000, max: 10 }, // 10 req/hour
                passwordReset: { window: 60 * 60 * 1000, max: 3 }, // 3 req/hour
            },
            session: {
                enableTokenBlacklist: true, // OWASP: token revocation
                enableSessionRevocation: true,
                enableDeviceTracking: isProd,
                enableGeoFencing: isProd,
            },
        },
        integrity: {
            enableCodeSigning: isProd,
            enableSubresourceIntegrity: isProd,
            enableCSP: true,
            enableIntegrityChecks: isProd,
            trustedRepositories: ['https://registry.npmjs.org'],
            verifyDependencies: isProd,
        },
        logging: {
            enableSecurityLogs: true,
            enableAuditLogs: true,
            enableAccessLogs: true,
            logLevel: isProd ? 'warn' : 'debug',
            logRetentionDays: isProd ? 90 : 30,
            enableSIEMIntegration: isProd,
            alerting: {
                enabled: isProd,
                channels: ['email', 'slack'],
                criticalEvents: [
                    'failed_login_attempts',
                    'privilege_escalation',
                    'data_breach',
                    'unauthorized_access',
                    'sql_injection_attempt',
                    'xss_attempt',
                ],
            },
            sensitiveDataRedaction: true,
            logFailedLoginAttempts: true,
            logPrivilegedActions: true,
        },
        ssrf: {
            enableURLValidation: true,
            allowedProtocols: ['http', 'https'],
            allowedDomains: [],
            blockPrivateNetworks: isProd,
            enableDNSRebindingProtection: isProd,
        },
        rateLimiting: {
            authentication: { windowMs: 60 * 1000, max: 5 }, // OWASP: 5 req/min
            graphql: { windowMs: 60 * 1000, max: 100 }, // OWASP: 100 req/min
            restApi: { windowMs: 60 * 60 * 1000, max: 1000 }, // OWASP: 1000 req/hour
            websocket: { windowMs: 60 * 1000, max: 50 },
            uploads: { windowMs: 60 * 60 * 1000, max: 10 },
        },
        validation: {
            enableSchemaValidation: true,
            enableTypeChecking: true,
            maxRequestSize: '10mb',
            maxUploadSize: '50mb',
            allowedFileTypes: [
                'image/jpeg',
                'image/png',
                'image/gif',
                'application/pdf',
                'text/csv',
                'application/json',
            ],
            graphql: {
                maxDepth: isProd ? 6 : 10,
                maxComplexity: isProd ? 1000 : 5000,
                disableIntrospection: isProd, // OWASP: disable in production
                enablePersistedQueries: isProd,
            },
        },
    };
}
/**
 * Validate current configuration against OWASP standards
 */
function validateOWASPCompliance(config) {
    const issues = [];
    // Check critical security requirements
    if (!config.injection.enableSQLInjectionProtection) {
        issues.push('SQL Injection protection is disabled');
    }
    if (!config.injection.enableXSSProtection) {
        issues.push('XSS protection is disabled');
    }
    if (config.authentication.jwt.accessTokenExpiry === '24h') {
        issues.push('Access token expiry too long. OWASP recommends 15 minutes or less.');
    }
    if (!config.authentication.session.enableTokenBlacklist) {
        issues.push('Token blacklist/revocation is disabled');
    }
    if (!config.logging.enableAuditLogs) {
        issues.push('Audit logging is disabled');
    }
    if (config.validation.graphql.maxDepth > 10) {
        issues.push('GraphQL depth limit too high (should be <= 10)');
    }
    if (!config.cryptography.enforceHTTPS && config.environment === 'production') {
        issues.push('HTTPS enforcement is disabled in production');
    }
    return {
        compliant: issues.length === 0,
        issues,
    };
}
exports.default = getOWASPSecurityConfig;
