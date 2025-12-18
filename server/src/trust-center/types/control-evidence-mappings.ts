/**
 * Control-to-Evidence Mappings
 *
 * Pre-configured mappings for key controls across compliance frameworks.
 * These mappings define how evidence is collected and validated for each control.
 *
 * @module trust-center/types/control-evidence-mappings
 */

import type {
  ControlDefinition,
  EvidenceSource,
  ControlTest,
  FrameworkMapping,
} from './assurance-artifacts.js';

// =============================================================================
// ACCESS CONTROL (CC6.1 / A.9.4.1 / AC-3)
// =============================================================================

export const ACCESS_CONTROL_MAPPING: ControlDefinition = {
  id: 'ACCESS-001',
  title: 'Logical Access Control',
  description: `Access to information systems and data is restricted based on
business need and granted through a formal authorization process. Access rights
are enforced through technical controls including authentication, authorization,
and audit logging.`,
  category: 'Access Control',

  frameworkMappings: [
    {
      framework: 'SOC2_TYPE_II',
      controlId: 'CC6.1',
      requirement: 'Logical access security software, infrastructure, and architectures',
      mappingConfidence: 'exact',
    },
    {
      framework: 'ISO_27001',
      controlId: 'A.9.4.1',
      requirement: 'Information access restriction',
      mappingConfidence: 'exact',
    },
    {
      framework: 'NIST_800_53',
      controlId: 'AC-3',
      requirement: 'Access Enforcement',
      mappingConfidence: 'exact',
    },
    {
      framework: 'HIPAA',
      controlId: '164.312(d)',
      requirement: 'Person or entity authentication',
      mappingConfidence: 'exact',
    },
    {
      framework: 'FEDRAMP_MODERATE',
      controlId: 'AC-3',
      requirement: 'Access Enforcement',
      mappingConfidence: 'exact',
    },
    {
      framework: 'PCI_DSS_4',
      controlId: '7.2',
      requirement: 'Restrict access based on need to know',
      mappingConfidence: 'exact',
    },
    {
      framework: 'GDPR',
      controlId: 'Art.32(1)(b)',
      requirement: 'Ability to ensure confidentiality of processing systems',
      mappingConfidence: 'partial',
    },
  ],

  implementation: {
    description: `CompanyOS implements a defense-in-depth access control strategy
combining multiple layers of authentication and authorization:

1. **Authentication Layer**: OIDC/OAuth 2.0 with PKCE flow, supporting SSO via
   SAML 2.0 and OpenID Connect. MFA is enforced for all privileged access.

2. **Authorization Layer**: Hybrid RBAC+ABAC model using Open Policy Agent (OPA)
   for fine-grained, context-aware access decisions.

3. **Tenant Isolation**: Row-level security (RLS) at the database layer ensures
   complete data isolation between tenants.

4. **Audit Trail**: All authentication and authorization events are logged to an
   immutable audit system with cryptographic integrity verification.`,
    components: [
      {
        name: 'Identity Provider Integration',
        type: 'authentication',
        location: '/server/src/auth/',
        description: 'OIDC/SAML authentication handlers',
      },
      {
        name: 'OPA Policy Engine',
        type: 'authorization',
        location: '/SECURITY/policy/opa/',
        description: 'ABAC policies in Rego language',
      },
      {
        name: 'Session Manager',
        type: 'authentication',
        location: '/server/src/middleware/session.ts',
        description: 'Secure session handling with rotation',
      },
      {
        name: 'Audit Logger',
        type: 'audit',
        location: '/server/src/audit/',
        description: 'Immutable audit event capture',
      },
    ],
    documentation: [
      '/docs/enterprise/sso-integration.md',
      '/SECURITY/CONTROLS.md',
      '/docs/compliance/soc2_control_matrix.md',
    ],
  },

  evidenceSources: [
    {
      id: 'access-audit-logs',
      type: 'audit_log',
      name: 'Authentication Audit Logs',
      description: 'Complete audit trail of authentication events',
      config: {
        table: 'audit_events',
        query: `
          SELECT
            event_id,
            event_type,
            actor_id,
            actor_type,
            outcome,
            ip_address,
            user_agent,
            session_id,
            timestamp,
            metadata
          FROM audit_events
          WHERE event_category = 'authentication'
            AND tenant_id = $1
            AND timestamp BETWEEN $2 AND $3
          ORDER BY timestamp DESC
        `,
        fields: [
          'event_type',
          'actor_id',
          'outcome',
          'timestamp',
          'ip_address',
          'user_agent',
        ],
      },
      retentionPeriod: '7y',
      refreshFrequency: 'continuous',
      stalenessThreshold: '1h',
    },
    {
      id: 'access-opa-policies',
      type: 'policy',
      name: 'OPA Access Control Policies',
      description: 'Current ABAC policy definitions',
      config: {
        policyPath: '/SECURITY/policy/opa/abac.rego',
        verification: `
          Verify the following policy elements:
          1. Default deny rule is active
          2. Role-based access rules are defined
          3. Tenant isolation rules are enforced
          4. Privileged operation restrictions exist
          5. Time-based access controls are configured
        `,
      },
      retentionPeriod: 'indefinite',
      refreshFrequency: 'daily',
      stalenessThreshold: '24h',
    },
    {
      id: 'access-idp-config',
      type: 'configuration',
      name: 'Identity Provider Configuration',
      description: 'SSO and authentication configuration',
      config: {
        systems: [
          {
            name: 'OIDC Configuration',
            config: '/infra/terraform/modules/auth/oidc.tf',
          },
          {
            name: 'SAML Configuration',
            config: '/infra/terraform/modules/auth/saml.tf',
          },
          {
            name: 'MFA Settings',
            config: '/server/src/config/mfa.ts',
          },
        ],
      },
      retentionPeriod: '3y',
      refreshFrequency: 'daily',
      stalenessThreshold: '24h',
    },
    {
      id: 'access-metrics',
      type: 'metric',
      name: 'Access Control Metrics',
      description: 'Real-time authentication and authorization metrics',
      config: {
        prometheusQuery: `
          # Authentication success rate
          sum(rate(auth_attempts_total{outcome="success"}[24h])) /
          sum(rate(auth_attempts_total[24h]))

          # MFA enforcement rate
          sum(auth_mfa_challenges_total{result="passed"}) /
          sum(auth_mfa_challenges_total)

          # Authorization denial rate
          sum(rate(authz_decisions_total{decision="deny"}[24h])) /
          sum(rate(authz_decisions_total[24h]))
        `,
        threshold: 0.95,
      },
      retentionPeriod: '1y',
      refreshFrequency: 'continuous',
      stalenessThreshold: '5m',
    },
  ],

  tests: [
    {
      id: 'ACCESS-001-T01',
      name: 'Authentication Required for Protected Endpoints',
      description: 'Verify all protected API endpoints require valid authentication',
      type: 'automated',
      frequency: 'continuous',
      procedure: `
        1. Enumerate all API endpoints from OpenAPI spec
        2. Filter to protected endpoints (exclude /health, /public/*)
        3. Send unauthenticated requests to each endpoint
        4. Verify 401 Unauthorized response
        5. Send requests with invalid tokens
        6. Verify 401 Unauthorized response
      `,
      expectedResult: 'All protected endpoints return 401 without valid authentication',
      automation: {
        script: 'tests/compliance/access-auth-required.test.ts',
        schedule: '0 */4 * * *',
        timeout: 300000,
        retries: 2,
      },
    },
    {
      id: 'ACCESS-001-T02',
      name: 'RBAC Enforcement',
      description: 'Verify role-based access controls are properly enforced',
      type: 'automated',
      frequency: 'daily',
      procedure: `
        1. Create test users with different roles (admin, user, viewer)
        2. Attempt privileged operations with each role
        3. Verify admin can perform admin operations
        4. Verify user cannot perform admin operations
        5. Verify viewer has read-only access
      `,
      expectedResult: 'Role-based access restrictions are enforced correctly',
      automation: {
        script: 'tests/compliance/access-rbac.test.ts',
        schedule: '0 2 * * *',
        timeout: 600000,
        retries: 1,
      },
    },
    {
      id: 'ACCESS-001-T03',
      name: 'Tenant Isolation',
      description: 'Verify cross-tenant data access is prevented',
      type: 'automated',
      frequency: 'daily',
      procedure: `
        1. Create resources in Tenant A
        2. Authenticate as user from Tenant B
        3. Attempt to access Tenant A resources
        4. Verify 403 Forbidden response
        5. Verify no data leakage in error messages
      `,
      expectedResult: 'Cross-tenant data access is completely prevented',
      automation: {
        script: 'tests/compliance/access-tenant-isolation.test.ts',
        schedule: '0 3 * * *',
        timeout: 600000,
        retries: 1,
      },
    },
    {
      id: 'ACCESS-001-T04',
      name: 'MFA Enforcement for Privileged Access',
      description: 'Verify MFA is required for privileged operations',
      type: 'automated',
      frequency: 'daily',
      procedure: `
        1. Authenticate without MFA
        2. Attempt privileged operation
        3. Verify MFA challenge is triggered
        4. Complete MFA challenge
        5. Verify operation succeeds after MFA
      `,
      expectedResult: 'MFA is required for all privileged operations',
      automation: {
        script: 'tests/compliance/access-mfa.test.ts',
        schedule: '0 4 * * *',
        timeout: 300000,
        retries: 2,
      },
    },
    {
      id: 'ACCESS-001-T05',
      name: 'Quarterly Access Review',
      description: 'Manual review of user access rights',
      type: 'manual',
      frequency: 'quarterly',
      procedure: `
        1. Export current user access matrix
        2. Review access rights against job functions
        3. Identify and remove excessive privileges
        4. Document review findings
        5. Obtain management sign-off
      `,
      expectedResult: 'All access rights are appropriate and documented',
      manual: {
        instructions: 'docs/compliance/quarterly_access_review.md',
      },
    },
  ],

  status: 'effective',
  lastTestedAt: new Date().toISOString(),
  nextTestDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),

  owner: {
    type: 'user',
    id: 'security-team',
    name: 'Security Team',
    email: 'security@company.io',
  },
  reviewers: [
    {
      type: 'user',
      id: 'compliance-officer',
      name: 'Compliance Officer',
      email: 'compliance@company.io',
    },
  ],
};

// =============================================================================
// BACKUP & RECOVERY (A1.2 / A.12.3.1 / CP-9)
// =============================================================================

export const BACKUP_RECOVERY_MAPPING: ControlDefinition = {
  id: 'BACKUP-001',
  title: 'Backup and Recovery',
  description: `Critical data and systems are backed up according to defined
schedules, and recovery procedures are tested regularly to ensure business
continuity objectives can be met.`,
  category: 'Availability',

  frameworkMappings: [
    {
      framework: 'SOC2_TYPE_II',
      controlId: 'A1.2',
      requirement: 'Recovery of infrastructure and data',
      mappingConfidence: 'exact',
    },
    {
      framework: 'ISO_27001',
      controlId: 'A.12.3.1',
      requirement: 'Information backup',
      mappingConfidence: 'exact',
    },
    {
      framework: 'NIST_800_53',
      controlId: 'CP-9',
      requirement: 'System Backup',
      mappingConfidence: 'exact',
    },
    {
      framework: 'HIPAA',
      controlId: '164.308(a)(7)(ii)(A)',
      requirement: 'Data backup plan',
      mappingConfidence: 'exact',
    },
    {
      framework: 'FEDRAMP_MODERATE',
      controlId: 'CP-9',
      requirement: 'Information System Backup',
      mappingConfidence: 'exact',
    },
    {
      framework: 'PCI_DSS_4',
      controlId: '9.5.1',
      requirement: 'Backup media storage security',
      mappingConfidence: 'partial',
    },
  ],

  implementation: {
    description: `CompanyOS implements a comprehensive backup strategy ensuring
data durability and rapid recovery:

1. **Database Backups**:
   - PostgreSQL: Continuous WAL archiving + daily full snapshots
   - Neo4j: Online backups with point-in-time recovery
   - Redis: RDB snapshots every 15 minutes + AOF persistence

2. **Object Storage**: Cross-region replication with versioning enabled

3. **Retention Policy**:
   - Daily backups: 30 days
   - Weekly backups: 90 days
   - Monthly backups: 1 year
   - Compliance archives: 7 years

4. **Recovery Objectives**:
   - RPO: 1 hour (production data)
   - RTO: 4 hours (critical services)`,
    components: [
      {
        name: 'PostgreSQL Backup Job',
        type: 'backup',
        location: '/k8s/production/cron-pg-backup.yaml',
        description: 'Scheduled PostgreSQL backup CronJob',
      },
      {
        name: 'Neo4j Backup Job',
        type: 'backup',
        location: '/k8s/production/cron-neo4j-backup.yaml',
        description: 'Scheduled Neo4j backup CronJob',
      },
      {
        name: 'Disaster Recovery Runbook',
        type: 'documentation',
        location: '/RUNBOOKS/disaster-recovery.md',
        description: 'Step-by-step recovery procedures',
      },
      {
        name: 'Backup Verification Script',
        type: 'automation',
        location: '/scripts/verify-backups.sh',
        description: 'Automated backup integrity verification',
      },
    ],
    documentation: [
      '/RUNBOOKS/disaster-recovery.md',
      '/docs/ops/backup-strategy.md',
      '/docs/compliance/data-retention-policy.md',
    ],
  },

  evidenceSources: [
    {
      id: 'backup-job-logs',
      type: 'audit_log',
      name: 'Backup Job Execution Logs',
      description: 'Logs from scheduled backup jobs',
      config: {
        table: 'backup_job_logs',
        query: `
          SELECT
            job_id,
            job_type,
            database_name,
            started_at,
            completed_at,
            status,
            backup_size_bytes,
            backup_location,
            checksum,
            error_message
          FROM backup_job_logs
          WHERE timestamp BETWEEN $1 AND $2
          ORDER BY timestamp DESC
        `,
        fields: [
          'job_type',
          'database_name',
          'status',
          'backup_size_bytes',
          'completed_at',
        ],
      },
      retentionPeriod: '7y',
      refreshFrequency: 'hourly',
      stalenessThreshold: '2h',
    },
    {
      id: 'backup-metrics',
      type: 'metric',
      name: 'Backup Success Metrics',
      description: 'Real-time backup success rates and timing',
      config: {
        prometheusQuery: `
          # Backup success rate (last 7 days)
          sum(backup_job_success_total) / sum(backup_job_total)

          # Time since last successful backup
          time() - max(backup_last_success_timestamp)

          # Backup size trend
          sum(backup_size_bytes) by (database)
        `,
        threshold: 0.99,
      },
      retentionPeriod: '1y',
      refreshFrequency: 'continuous',
      stalenessThreshold: '5m',
    },
    {
      id: 'backup-config',
      type: 'configuration',
      name: 'Backup Configuration',
      description: 'Current backup schedules and retention settings',
      config: {
        systems: [
          {
            name: 'PostgreSQL Backup CronJob',
            config: '/k8s/production/cron-pg-backup.yaml',
          },
          {
            name: 'Neo4j Backup CronJob',
            config: '/k8s/production/cron-neo4j-backup.yaml',
          },
          {
            name: 'Retention Policy',
            config: '/server/src/config/retention.ts',
          },
        ],
      },
      retentionPeriod: '3y',
      refreshFrequency: 'daily',
      stalenessThreshold: '24h',
    },
    {
      id: 'recovery-test-logs',
      type: 'audit_log',
      name: 'Recovery Test Results',
      description: 'Results from disaster recovery tests',
      config: {
        table: 'recovery_test_logs',
        query: `
          SELECT
            test_id,
            test_type,
            started_at,
            completed_at,
            recovery_time_seconds,
            data_loss_seconds,
            status,
            notes
          FROM recovery_test_logs
          WHERE timestamp BETWEEN $1 AND $2
          ORDER BY timestamp DESC
        `,
        fields: ['test_type', 'recovery_time_seconds', 'status', 'completed_at'],
      },
      retentionPeriod: '7y',
      refreshFrequency: 'monthly',
      stalenessThreshold: '35d',
    },
  ],

  tests: [
    {
      id: 'BACKUP-001-T01',
      name: 'Daily Backup Completion',
      description: 'Verify all scheduled backups completed successfully',
      type: 'automated',
      frequency: 'daily',
      procedure: `
        1. Query backup job logs for past 24 hours
        2. Verify PostgreSQL backup completed
        3. Verify Neo4j backup completed
        4. Verify Redis snapshot completed
        5. Check backup sizes are reasonable
        6. Verify backups are stored in correct location
      `,
      expectedResult: 'All scheduled backups completed successfully',
      automation: {
        script: 'tests/compliance/backup-completion.test.ts',
        schedule: '0 6 * * *',
        timeout: 300000,
        retries: 2,
      },
    },
    {
      id: 'BACKUP-001-T02',
      name: 'Backup Integrity Verification',
      description: 'Verify backup data integrity via checksum validation',
      type: 'automated',
      frequency: 'weekly',
      procedure: `
        1. Select random backup from past week
        2. Download backup to test environment
        3. Verify checksum matches stored value
        4. Attempt to restore backup
        5. Verify restored data integrity
      `,
      expectedResult: 'Backup checksums match and data is restorable',
      automation: {
        script: 'tests/compliance/backup-integrity.test.ts',
        schedule: '0 2 * * 0',
        timeout: 1800000,
        retries: 1,
      },
    },
    {
      id: 'BACKUP-001-T03',
      name: 'Full Recovery Test',
      description: 'End-to-end disaster recovery test',
      type: 'automated',
      frequency: 'monthly',
      procedure: `
        1. Provision isolated test environment
        2. Restore all databases from backup
        3. Verify data integrity post-restore
        4. Verify application functionality
        5. Measure recovery time
        6. Compare against RTO target
      `,
      expectedResult: 'Full recovery completes within 4-hour RTO',
      automation: {
        script: 'tests/compliance/recovery-test.test.ts',
        schedule: '0 3 1 * *',
        timeout: 14400000,
        retries: 0,
      },
    },
    {
      id: 'BACKUP-001-T04',
      name: 'Cross-Region Replication Verification',
      description: 'Verify backups are replicated to secondary region',
      type: 'automated',
      frequency: 'daily',
      procedure: `
        1. List backups in primary region
        2. List backups in secondary region
        3. Verify replication lag < 1 hour
        4. Verify checksums match across regions
      `,
      expectedResult: 'Backups are replicated with < 1 hour lag',
      automation: {
        script: 'tests/compliance/backup-replication.test.ts',
        schedule: '0 7 * * *',
        timeout: 600000,
        retries: 2,
      },
    },
  ],

  status: 'effective',
  lastTestedAt: new Date().toISOString(),
  nextTestDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),

  owner: {
    type: 'user',
    id: 'platform-team',
    name: 'Platform Engineering',
    email: 'platform@company.io',
  },
  reviewers: [
    {
      type: 'user',
      id: 'sre-team',
      name: 'SRE Team',
      email: 'sre@company.io',
    },
  ],
};

// =============================================================================
// CHANGE MANAGEMENT (CC8.1 / A.12.1.2 / CM-3)
// =============================================================================

export const CHANGE_MANAGEMENT_MAPPING: ControlDefinition = {
  id: 'CHANGE-001',
  title: 'Change Management',
  description: `Changes to information systems are authorized, tested, approved,
and documented before implementation. Emergency changes follow an expedited
process with post-implementation review.`,
  category: 'Change Management',

  frameworkMappings: [
    {
      framework: 'SOC2_TYPE_II',
      controlId: 'CC8.1',
      requirement: 'Changes to infrastructure and software are authorized and tested',
      mappingConfidence: 'exact',
    },
    {
      framework: 'ISO_27001',
      controlId: 'A.12.1.2',
      requirement: 'Change management',
      mappingConfidence: 'exact',
    },
    {
      framework: 'NIST_800_53',
      controlId: 'CM-3',
      requirement: 'Configuration Change Control',
      mappingConfidence: 'exact',
    },
    {
      framework: 'HIPAA',
      controlId: '164.308(a)(8)',
      requirement: 'Evaluation',
      mappingConfidence: 'partial',
    },
    {
      framework: 'FEDRAMP_MODERATE',
      controlId: 'CM-3',
      requirement: 'Configuration Change Control',
      mappingConfidence: 'exact',
    },
    {
      framework: 'PCI_DSS_4',
      controlId: '6.5.6',
      requirement: 'Change control procedures for all changes',
      mappingConfidence: 'exact',
    },
  ],

  implementation: {
    description: `CompanyOS enforces a rigorous change management process:

1. **Pull Request Workflow**: All changes require pull requests with:
   - Descriptive title and body
   - Linked issue/ticket
   - Test plan documentation

2. **Code Review**: Minimum 2 approving reviews required, including:
   - CODEOWNERS for sensitive paths
   - Security review for high-risk changes

3. **Automated Testing**: CI pipeline runs:
   - Unit tests
   - Integration tests
   - Security scans (SAST, dependency audit)
   - Linting and type checking

4. **Staged Deployment**: Changes flow through:
   - Development → Staging → Production
   - Automated rollback capability

5. **Audit Trail**: All changes are logged with:
   - Author, reviewers, timestamps
   - Commit hashes and signatures
   - Deployment records`,
    components: [
      {
        name: 'Branch Protection Rules',
        type: 'configuration',
        location: '.github/branch-protection.json',
        description: 'GitHub branch protection configuration',
      },
      {
        name: 'CODEOWNERS',
        type: 'configuration',
        location: '.github/CODEOWNERS',
        description: 'Required reviewers for sensitive paths',
      },
      {
        name: 'CI Pipeline',
        type: 'automation',
        location: '.github/workflows/ci.yml',
        description: 'Continuous integration workflow',
      },
      {
        name: 'Deployment Pipeline',
        type: 'automation',
        location: '.github/workflows/deploy.yml',
        description: 'Staged deployment workflow',
      },
    ],
    documentation: [
      '/docs/development/pull-request-guide.md',
      '/docs/development/code-review.md',
      '/CONTRIBUTING.md',
    ],
  },

  evidenceSources: [
    {
      id: 'change-pr-logs',
      type: 'external_api',
      name: 'Pull Request History',
      description: 'GitHub pull request data',
      config: {
        endpoint: 'https://api.github.com/repos/{owner}/{repo}/pulls',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      },
      retentionPeriod: '7y',
      refreshFrequency: 'hourly',
      stalenessThreshold: '2h',
    },
    {
      id: 'change-deployment-logs',
      type: 'audit_log',
      name: 'Deployment Audit Logs',
      description: 'Records of all deployments',
      config: {
        table: 'audit_events',
        query: `
          SELECT
            event_id,
            event_type,
            actor_id,
            environment,
            version,
            commit_sha,
            status,
            timestamp,
            metadata
          FROM audit_events
          WHERE event_category = 'deployment'
            AND timestamp BETWEEN $1 AND $2
          ORDER BY timestamp DESC
        `,
        fields: [
          'event_type',
          'actor_id',
          'environment',
          'version',
          'commit_sha',
          'status',
        ],
      },
      retentionPeriod: '7y',
      refreshFrequency: 'continuous',
      stalenessThreshold: '1h',
    },
    {
      id: 'change-ci-results',
      type: 'external_api',
      name: 'CI/CD Pipeline Results',
      description: 'GitHub Actions workflow runs',
      config: {
        endpoint: 'https://api.github.com/repos/{owner}/{repo}/actions/runs',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      },
      retentionPeriod: '3y',
      refreshFrequency: 'hourly',
      stalenessThreshold: '2h',
    },
    {
      id: 'change-branch-protection',
      type: 'configuration',
      name: 'Branch Protection Configuration',
      description: 'Current branch protection rules',
      config: {
        systems: [
          {
            name: 'Branch Protection',
            config: '.github/branch-protection.json',
          },
          {
            name: 'CODEOWNERS',
            config: '.github/CODEOWNERS',
          },
        ],
      },
      retentionPeriod: '3y',
      refreshFrequency: 'daily',
      stalenessThreshold: '24h',
    },
  ],

  tests: [
    {
      id: 'CHANGE-001-T01',
      name: 'Pull Request Required',
      description: 'Verify direct pushes to main branch are blocked',
      type: 'automated',
      frequency: 'continuous',
      procedure: `
        1. Attempt direct push to main branch
        2. Verify push is rejected
        3. Verify appropriate error message
        4. Confirm branch protection is active
      `,
      expectedResult: 'Direct pushes to protected branches are blocked',
      automation: {
        script: 'tests/compliance/change-pr-required.test.ts',
        schedule: '0 */2 * * *',
        timeout: 120000,
        retries: 2,
      },
    },
    {
      id: 'CHANGE-001-T02',
      name: 'Code Review Enforcement',
      description: 'Verify all merged PRs have required approvals',
      type: 'automated',
      frequency: 'daily',
      procedure: `
        1. Query merged PRs from past 24 hours
        2. Verify each PR has minimum 2 approvals
        3. Verify CODEOWNERS approval for sensitive files
        4. Check for any bypass of review requirements
      `,
      expectedResult: 'All merged PRs have required approvals',
      automation: {
        script: 'tests/compliance/change-review.test.ts',
        schedule: '0 5 * * *',
        timeout: 600000,
        retries: 1,
      },
    },
    {
      id: 'CHANGE-001-T03',
      name: 'CI Tests Required',
      description: 'Verify no deployments without passing CI',
      type: 'automated',
      frequency: 'continuous',
      procedure: `
        1. Query deployments from past 24 hours
        2. For each deployment, verify associated CI run
        3. Confirm CI status was 'success'
        4. Verify no manual bypasses
      `,
      expectedResult: 'No deployments without passing CI checks',
      automation: {
        script: 'tests/compliance/change-ci-pass.test.ts',
        schedule: '0 */4 * * *',
        timeout: 300000,
        retries: 2,
      },
    },
    {
      id: 'CHANGE-001-T04',
      name: 'Signed Commits Enforcement',
      description: 'Verify commits are cryptographically signed',
      type: 'automated',
      frequency: 'daily',
      procedure: `
        1. Query commits from past 24 hours
        2. Verify GPG/SSH signature on each commit
        3. Validate signature against known keys
        4. Report unsigned commits
      `,
      expectedResult: 'All commits are cryptographically signed',
      automation: {
        script: 'tests/compliance/change-signed-commits.test.ts',
        schedule: '0 6 * * *',
        timeout: 600000,
        retries: 1,
      },
    },
  ],

  status: 'effective',
  lastTestedAt: new Date().toISOString(),
  nextTestDue: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),

  owner: {
    type: 'user',
    id: 'engineering-lead',
    name: 'Engineering Lead',
    email: 'engineering@company.io',
  },
  reviewers: [
    {
      type: 'user',
      id: 'security-team',
      name: 'Security Team',
      email: 'security@company.io',
    },
  ],
};

// =============================================================================
// Export all control mappings
// =============================================================================

export const CONTROL_MAPPINGS: Record<string, ControlDefinition> = {
  'ACCESS-001': ACCESS_CONTROL_MAPPING,
  'BACKUP-001': BACKUP_RECOVERY_MAPPING,
  'CHANGE-001': CHANGE_MANAGEMENT_MAPPING,
};

/**
 * Get control definition by ID
 */
export function getControlDefinition(controlId: string): ControlDefinition | undefined {
  return CONTROL_MAPPINGS[controlId];
}

/**
 * Get controls by framework
 */
export function getControlsByFramework(framework: ComplianceFramework): ControlDefinition[] {
  return Object.values(CONTROL_MAPPINGS).filter((control) =>
    control.frameworkMappings.some((m) => m.framework === framework)
  );
}

/**
 * Get framework control ID for a given control
 */
export function getFrameworkControlId(
  controlId: string,
  framework: ComplianceFramework
): string | undefined {
  const control = CONTROL_MAPPINGS[controlId];
  if (!control) return undefined;

  const mapping = control.frameworkMappings.find((m) => m.framework === framework);
  return mapping?.controlId;
}
