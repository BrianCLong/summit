/**
 * Summit CLI Configuration Example
 *
 * Copy this file to summit.config.js and customize for your environment.
 * All settings are optional and will fall back to sensible defaults.
 *
 * @see docs/summit-cli-quickstart.md for detailed documentation
 */

module.exports = {
  /**
   * Development environment settings
   */
  dev: {
    // Docker compose file to use
    composeFile: './compose/docker-compose.yml',

    // Docker compose profiles to enable
    // Options: 'default', 'ai', 'gpu', 'observability', 'conductor'
    profiles: ['default'],

    // Automatically run migrations after starting services
    autoMigrate: true,

    // Automatically seed database after migrations
    autoSeed: false,

    // Service health check timeout (ms)
    healthCheckTimeout: 30000,

    // Service startup wait time (ms)
    startupWait: 10000,
  },

  /**
   * Testing configuration
   */
  test: {
    // Smoke test timeout (ms)
    smokeTimeout: 120000,

    // E2E test timeout (ms)
    e2eTimeout: 300000,

    // Unit test timeout (ms)
    unitTimeout: 5000,

    // Run tests in parallel
    parallel: true,

    // Maximum workers for parallel tests
    maxWorkers: '50%',
  },

  /**
   * Database settings
   */
  db: {
    // Default migration target: 'all', 'postgres', 'neo4j'
    defaultTarget: 'all',

    // Backup encryption
    encryptBackups: true,

    // Backup retention days
    backupRetention: 30,

    // S3 bucket for backups (optional)
    backupS3Bucket: process.env.BACKUP_S3_BUCKET || null,
  },

  /**
   * Deployment configuration
   */
  deploy: {
    // Default AWS region
    defaultRegion: 'us-west-2',

    // Verify container images before deployment
    verifyImages: true,

    // SLO verification window (ms)
    sloVerificationWindow: 3600000, // 1 hour

    // Deployment timeout (ms)
    deploymentTimeout: 600000, // 10 minutes

    // Rollback on failure
    autoRollback: true,
  },

  /**
   * Pipeline orchestration
   */
  pipelines: {
    // Default execution engine: 'maestro', 'chronos', 'argo'
    defaultEngine: 'maestro',

    // Workflow directory
    workflowDir: './workflows',

    // Max concurrent pipelines
    maxConcurrent: 5,

    // Pipeline timeout (ms)
    timeout: 3600000, // 1 hour
  },

  /**
   * AI Copilot settings
   */
  copilot: {
    // Model to use
    model: 'claude-3-5-sonnet-20241022',

    // Document retrieval server URL
    retriever: 'http://localhost:8765',

    // Max documents to retrieve
    maxDocuments: 5,

    // Enable telemetry
    telemetry: false,
  },

  /**
   * Data catalog configuration
   */
  catalog: {
    // Catalog backend: 'internal', 'datahub', 'amundsen'
    backend: 'internal',

    // Search index refresh interval (ms)
    indexRefresh: 300000, // 5 minutes
  },

  /**
   * Verification settings
   */
  verify: {
    // Image verification provider: 'cosign', 'notary'
    imageVerification: 'cosign',

    // Policy engine: 'opa', 'kyverno'
    policyEngine: 'opa',

    // Fail on policy violations
    failOnViolation: true,

    // SLO thresholds
    slo: {
      // P95 latency threshold (ms)
      p95Latency: 1000,

      // Error rate threshold (%)
      errorRate: 1,

      // Availability threshold (%)
      availability: 99.9,
    },
  },

  /**
   * Output and logging
   */
  output: {
    // Default format: 'human', 'json', 'ndjson'
    defaultFormat: 'human',

    // Enable colored output
    color: true,

    // Use emojis in output
    emoji: false,

    // Log level: 'error', 'warn', 'info', 'debug'
    logLevel: 'info',

    // Log file path (optional)
    logFile: null,
  },

  /**
   * Performance tuning
   */
  performance: {
    // Enable command caching
    enableCache: true,

    // Command timeout (ms)
    commandTimeout: 120000,

    // Max command timeout (ms)
    maxCommandTimeout: 600000,

    // Parallel execution
    parallel: true,
  },

  /**
   * Monitoring and observability
   */
  monitoring: {
    // Enable metrics collection
    enabled: false,

    // Metrics endpoint
    endpoint: 'http://localhost:9090/metrics',

    // Collect command durations
    collectDurations: true,

    // Collect error rates
    collectErrors: true,

    // Metrics push interval (ms)
    pushInterval: 60000,
  },

  /**
   * Security settings
   */
  security: {
    // Require confirmation for dangerous operations
    requireConfirmation: true,

    // Allowed compose profiles
    allowedProfiles: ['default', 'ai', 'gpu', 'observability', 'conductor'],

    // Blocked commands
    blockedCommands: [],

    // Environment variable whitelist (if empty, all allowed)
    envWhitelist: [],
  },

  /**
   * Experimental features
   */
  experimental: {
    // Enable experimental features
    enabled: false,

    // Features to enable
    features: [],
  },
};
