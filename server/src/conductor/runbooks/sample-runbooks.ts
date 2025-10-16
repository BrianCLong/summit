// Sample Runbooks for Conductor
// Provides default operational procedures for common scenarios

import { runbookRegistry, Runbook } from './registry';

export const sampleRunbooks: Omit<Runbook, 'signature'>[] = [
  {
    id: 'incident-001',
    name: 'Critical Security Incident Response',
    version: '1.0.0',
    description:
      'Standard procedure for responding to critical security incidents including data breaches and system compromises',
    category: 'incident_response',
    severity: 'critical',
    approvalRequired: true,
    steps: [
      {
        id: 'step-001',
        order: 1,
        title: 'Immediate Assessment',
        description: 'Assess the scope and severity of the security incident',
        type: 'manual',
        preconditions: [
          'Incident has been reported',
          'Initial triage completed',
        ],
        postconditions: [
          'Severity level determined',
          'Impact assessment documented',
        ],
        riskLevel: 'medium',
        automationLevel: 'none',
        timeout: 300000, // 5 minutes
      },
      {
        id: 'step-002',
        order: 2,
        title: 'Isolate Affected Systems',
        description: 'Isolate compromised systems to prevent lateral movement',
        type: 'automated',
        command:
          'kubectl patch networkpolicy default-deny --patch=\'{"spec":{"podSelector":{"matchLabels":{"incident":"isolated"}}}}\'',
        expectedOutput: 'networkpolicy.networking.k8s.io/default-deny patched',
        rollbackCommand:
          'kubectl patch networkpolicy default-deny --type=\'merge\' -p \'{"spec":{"podSelector":{}}}\'',
        preconditions: ['Affected systems identified'],
        postconditions: ['Network isolation confirmed', 'Systems quarantined'],
        riskLevel: 'high',
        automationLevel: 'full',
        timeout: 120000, // 2 minutes
      },
      {
        id: 'step-003',
        order: 3,
        title: 'Preserve Evidence',
        description:
          'Create forensic snapshots and preserve logs for investigation',
        type: 'automated',
        command:
          'python3 /scripts/forensic_snapshot.py --incident-id=${INCIDENT_ID} --preserve-all',
        expectedOutput: 'Forensic snapshot completed successfully',
        preconditions: ['Systems isolated', 'Storage space available'],
        postconditions: ['Evidence preserved', 'Chain of custody established'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 600000, // 10 minutes
      },
      {
        id: 'step-004',
        order: 4,
        title: 'Notify Stakeholders',
        description: 'Notify incident response team and relevant stakeholders',
        type: 'automated',
        command:
          'curl -X POST ${NOTIFICATION_WEBHOOK} -d \'{"incident_id":"${INCIDENT_ID}","severity":"critical","status":"active"}\'',
        expectedOutput:
          '{"status":"sent","recipients":["security-team","management"]}',
        preconditions: ['Incident assessment complete'],
        postconditions: [
          'Stakeholders notified',
          'Communication plan activated',
        ],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 60000, // 1 minute
      },
      {
        id: 'step-005',
        order: 5,
        title: 'Begin Investigation',
        description: 'Start detailed forensic investigation of the incident',
        type: 'manual',
        preconditions: ['Evidence preserved', 'Investigation team assigned'],
        postconditions: ['Investigation plan created', 'Timeline established'],
        riskLevel: 'medium',
        automationLevel: 'assisted',
      },
    ],
    metadata: {
      author: 'security-team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['security', 'incident-response', 'critical', 'forensics'],
    },
    approvals: [],
  },

  {
    id: 'maintenance-001',
    name: 'Database Backup and Maintenance',
    version: '1.0.0',
    description:
      'Scheduled maintenance procedure for database backup, optimization, and health checks',
    category: 'maintenance',
    severity: 'medium',
    approvalRequired: false,
    steps: [
      {
        id: 'step-001',
        order: 1,
        title: 'Pre-maintenance Health Check',
        description:
          'Verify database health and connectivity before maintenance',
        type: 'verification',
        command: 'pg_isready -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER}',
        expectedOutput: '${DB_HOST}:${DB_PORT} - accepting connections',
        preconditions: ['Database accessible', 'Maintenance window active'],
        postconditions: ['Database health confirmed'],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 30000,
      },
      {
        id: 'step-002',
        order: 2,
        title: 'Create Full Backup',
        description: 'Create complete database backup with compression',
        type: 'automated',
        command:
          'pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} | gzip > /backups/db_backup_$(date +%Y%m%d_%H%M%S).sql.gz',
        expectedOutput: 'Backup completed successfully',
        rollbackCommand: 'rm -f /backups/db_backup_*.sql.gz',
        preconditions: ['Sufficient storage space', 'Database accessible'],
        postconditions: ['Backup file created', 'Backup integrity verified'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 1800000, // 30 minutes
      },
      {
        id: 'step-003',
        order: 3,
        title: 'Update Statistics',
        description: 'Update database statistics for query optimization',
        type: 'automated',
        command: 'psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "ANALYZE;"',
        expectedOutput: 'ANALYZE',
        preconditions: ['Database accessible'],
        postconditions: ['Statistics updated'],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 300000, // 5 minutes
      },
      {
        id: 'step-004',
        order: 4,
        title: 'Vacuum Database',
        description: 'Perform vacuum operation to reclaim storage space',
        type: 'automated',
        command:
          'psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c "VACUUM (VERBOSE, ANALYZE);"',
        expectedOutput: 'VACUUM',
        preconditions: ['Database accessible', 'Low activity period'],
        postconditions: ['Space reclaimed', 'Performance optimized'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 900000, // 15 minutes
      },
      {
        id: 'step-005',
        order: 5,
        title: 'Post-maintenance Verification',
        description:
          'Verify database performance and functionality after maintenance',
        type: 'verification',
        command: 'python3 /scripts/db_health_check.py --full-check',
        expectedOutput: 'All health checks passed',
        preconditions: ['Maintenance operations completed'],
        postconditions: [
          'Database performance verified',
          'System ready for production',
        ],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 300000, // 5 minutes
      },
    ],
    metadata: {
      author: 'database-team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['database', 'maintenance', 'backup', 'optimization'],
    },
    approvals: [],
  },

  {
    id: 'deployment-001',
    name: 'Blue-Green Deployment Procedure',
    version: '1.0.0',
    description:
      'Zero-downtime deployment using blue-green strategy with automated rollback capability',
    category: 'deployment',
    severity: 'high',
    approvalRequired: true,
    steps: [
      {
        id: 'step-001',
        order: 1,
        title: 'Pre-deployment Checks',
        description: 'Verify system health and readiness for deployment',
        type: 'verification',
        command:
          'kubectl get pods -l app=conductor --field-selector=status.phase=Running | wc -l',
        expectedOutput: '3', // Expecting 3 healthy pods
        preconditions: ['New version tested', 'Deployment approved'],
        postconditions: ['System health confirmed', 'Ready for deployment'],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 60000,
      },
      {
        id: 'step-002',
        order: 2,
        title: 'Deploy Green Environment',
        description: 'Deploy new version to green environment',
        type: 'automated',
        command: 'kubectl apply -f k8s/deployment-green.yaml',
        expectedOutput: 'deployment.apps/conductor-green created',
        rollbackCommand: 'kubectl delete -f k8s/deployment-green.yaml',
        preconditions: ['Pre-deployment checks passed'],
        postconditions: ['Green environment deployed', 'New version running'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 300000, // 5 minutes
      },
      {
        id: 'step-003',
        order: 3,
        title: 'Health Check Green Environment',
        description: 'Verify new version is healthy and responding correctly',
        type: 'verification',
        command:
          'curl -f http://conductor-green:3000/health && curl -f http://conductor-green:3000/api/conductor/evaluation/health',
        expectedOutput: '{"status":"healthy"}',
        preconditions: ['Green deployment completed'],
        postconditions: ['Green environment verified healthy'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 120000, // 2 minutes
      },
      {
        id: 'step-004',
        order: 4,
        title: 'Switch Traffic to Green',
        description:
          'Update load balancer to route traffic to green environment',
        type: 'automated',
        command:
          'kubectl patch service conductor-service -p \'{"spec":{"selector":{"version":"green"}}}\'',
        expectedOutput: 'service/conductor-service patched',
        rollbackCommand:
          'kubectl patch service conductor-service -p \'{"spec":{"selector":{"version":"blue"}}}\'',
        preconditions: ['Green environment healthy'],
        postconditions: [
          'Traffic routed to green',
          'Blue-green switch completed',
        ],
        riskLevel: 'high',
        automationLevel: 'full',
        timeout: 60000,
      },
      {
        id: 'step-005',
        order: 5,
        title: 'Monitor New Deployment',
        description: 'Monitor system metrics and error rates after deployment',
        type: 'verification',
        command:
          'python3 /scripts/deployment_monitor.py --duration=300 --error-threshold=0.01',
        expectedOutput: 'Deployment monitoring completed: HEALTHY',
        preconditions: ['Traffic switched to green'],
        postconditions: ['Deployment stable', 'Error rates within threshold'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 300000, // 5 minutes
      },
      {
        id: 'step-006',
        order: 6,
        title: 'Cleanup Blue Environment',
        description: 'Remove old blue environment after successful deployment',
        type: 'automated',
        command: 'kubectl delete deployment conductor-blue',
        expectedOutput: 'deployment.apps "conductor-blue" deleted',
        preconditions: ['New deployment stable', 'Monitoring period completed'],
        postconditions: ['Old version cleaned up', 'Deployment completed'],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 120000, // 2 minutes
      },
    ],
    metadata: {
      author: 'devops-team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: ['deployment', 'blue-green', 'zero-downtime', 'kubernetes'],
    },
    approvals: [],
  },

  {
    id: 'security-001',
    name: 'User Access Revocation',
    version: '1.0.0',
    description:
      'Complete procedure for revoking user access across all systems during security incidents or employee termination',
    category: 'security',
    severity: 'high',
    approvalRequired: true,
    steps: [
      {
        id: 'step-001',
        order: 1,
        title: 'Disable User Account',
        description: 'Immediately disable user account in identity provider',
        type: 'automated',
        command:
          'python3 /scripts/disable_user.py --user-id=${USER_ID} --reason="${REASON}"',
        expectedOutput: 'User account disabled successfully',
        rollbackCommand: 'python3 /scripts/enable_user.py --user-id=${USER_ID}',
        preconditions: ['Valid user ID provided', 'Reason documented'],
        postconditions: ['User account disabled', 'Access tokens revoked'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 60000,
      },
      {
        id: 'step-002',
        order: 2,
        title: 'Revoke API Keys and Tokens',
        description: 'Revoke all API keys and access tokens for the user',
        type: 'automated',
        command:
          'curl -X DELETE "${AUTH_API}/users/${USER_ID}/tokens" -H "Authorization: Bearer ${ADMIN_TOKEN}"',
        expectedOutput: '{"revoked_tokens":["count"]}',
        preconditions: ['User account disabled'],
        postconditions: ['All tokens revoked', 'API access blocked'],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 30000,
      },
      {
        id: 'step-003',
        order: 3,
        title: 'Update Access Control Lists',
        description: 'Remove user from all access control lists and groups',
        type: 'automated',
        command:
          'python3 /scripts/remove_user_acls.py --user-id=${USER_ID} --all-systems',
        expectedOutput: 'ACL updates completed',
        preconditions: ['User account disabled'],
        postconditions: ['User removed from ACLs', 'Group memberships revoked'],
        riskLevel: 'medium',
        automationLevel: 'full',
        timeout: 120000,
      },
      {
        id: 'step-004',
        order: 4,
        title: 'Archive User Data',
        description: 'Archive user data and assign ownership to manager',
        type: 'manual',
        preconditions: ['Access revocation completed', 'Manager identified'],
        postconditions: ['Data archived', 'Ownership transferred'],
        riskLevel: 'low',
        automationLevel: 'assisted',
      },
      {
        id: 'step-005',
        order: 5,
        title: 'Security Audit Log',
        description: 'Document access revocation in security audit log',
        type: 'automated',
        command:
          'python3 /scripts/audit_log.py --event="access_revocation" --user-id=${USER_ID} --reason="${REASON}" --performed-by=${ADMIN_USER}',
        expectedOutput: 'Audit log entry created',
        preconditions: ['Access revocation completed'],
        postconditions: ['Event logged', 'Audit trail updated'],
        riskLevel: 'low',
        automationLevel: 'full',
        timeout: 30000,
      },
    ],
    metadata: {
      author: 'security-team',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tags: [
        'security',
        'access-control',
        'user-management',
        'incident-response',
      ],
    },
    approvals: [],
  },
];

/**
 * Load sample runbooks into the registry
 */
export async function loadSampleRunbooks(): Promise<void> {
  try {
    console.log('Loading sample runbooks...');

    for (const runbook of sampleRunbooks) {
      try {
        await runbookRegistry.registerRunbook(runbook, 'system');
        console.log(`Loaded runbook: ${runbook.name} (${runbook.id})`);
      } catch (error) {
        console.warn(`Failed to load runbook ${runbook.id}:`, error);
      }
    }

    console.log(`Successfully loaded ${sampleRunbooks.length} sample runbooks`);
  } catch (error) {
    console.error('Error loading sample runbooks:', error);
  }
}
