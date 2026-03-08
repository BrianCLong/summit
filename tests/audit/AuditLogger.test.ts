import { AdvancedAuditLogger } from '../../src/audit/AuditLogger'

describe('AdvancedAuditLogger validation', () => {
  const logger = new AdvancedAuditLogger({
    retention_days: 30,
    archive_after_days: 90,
    compression: false,
    encryption: false,
    siem_integration: false,
    real_time_analysis: false,
    alert_thresholds: {
      failed_auth_attempts: 5,
      data_access_volume: 1000,
      privilege_escalation: true,
    },
    storage: {
      primary: 'file',
      archive: 'file',
      backup: false,
    },
  })

  it('rejects missing action', async () => {
    await expect(
      logger.logEvent({ resource: 'RESOURCE_ONLY', details: {} }),
    ).rejects.toThrow('audit.action is required')
  })

  it('rejects invalid outcome values', async () => {
    await expect(
      logger.logEvent({
        action: 'READ',
        resource: 'RESOURCE',
        // @ts-expect-error intentional invalid input for validation
        outcome: 'UNKNOWN',
      }),
    ).rejects.toThrow('audit.outcome is invalid')
  })
})
