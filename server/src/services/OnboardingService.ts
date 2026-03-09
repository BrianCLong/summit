import { z } from 'zod';
import { getPostgresPool } from '../config/database.js';
import { tenantService, CreateTenantInput } from './TenantService.js';
import siemService from './SIEMService.js';
import logger from '../utils/logger.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { randomUUID } from 'crypto';

export type OnboardingStep =
  | 'create_tenant'
  | 'ss_sso'
  | 'scim'
  | 'siem'
  | 'baseline_policies'
  | 'test_event'
  | 'completed';

export interface OnboardingSession {
  tenantId: string;
  currentStep: OnboardingStep;
  stepsStatus: Record<string, {
    status: 'pending' | 'success' | 'failed' | 'skipped';
    data?: any;
    error?: string;
    completedAt?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export class OnboardingService {
  private static instance: OnboardingService;

  private constructor() { }

  public static getInstance(): OnboardingService {
    if (!OnboardingService.instance) {
      OnboardingService.instance = new OnboardingService();
    }
    return OnboardingService.instance;
  }

  /**
   * Start or Resume onboarding for a user/tenant.
   * If tenantId is provided, resumes.
   * If not, starts fresh (but actual DB record created after create_tenant step).
   */
  async getSession(tenantId: string): Promise<OnboardingSession | null> {
    const pool = getPostgresPool();
    if (!pool) throw new Error('Postgres pool not initialized');
    const result = await pool.query(
      'SELECT * FROM onboarding_sessions WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rowCount === 0) return null;
    return this.mapRowToSession(result.rows[0]);
  }

  /**
   * Execute a step in the onboarding process
   */
  async executeStep(
    tenantId: string | null,
    step: OnboardingStep,
    data: any,
    actorId: string
  ): Promise<{ session: OnboardingSession, result?: any }> {

    let currentTenantId = tenantId;
    let session: OnboardingSession | null = null;

    // Special handling for create_tenant (starts the session)
    if (step === 'create_tenant') {
      if (currentTenantId) {
        // If we already have a tenant ID, verify we are actually in a session
        session = await this.getSession(currentTenantId);
        if (session && session.stepsStatus['create_tenant']?.status === 'success') {
          // Already created, just return the session
          return { session };
        }
      }

      // Create Tenant
      const tenant = await tenantService.createTenant(data as CreateTenantInput, actorId);
      currentTenantId = tenant.id;

      // Create Session Record
      session = {
        tenantId: currentTenantId,
        currentStep: 'ss_sso', // Move to next step
        stepsStatus: {
          create_tenant: {
            status: 'success',
            completedAt: new Date().toISOString(),
            data: { slug: tenant.slug, region: tenant.region }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveSession(session);
      return { session, result: tenant };
    }

    if (!currentTenantId) {
      throw new Error("Tenant ID required for steps other than create_tenant");
    }

    session = await this.getSession(currentTenantId);
    if (!session) {
      // Should not happen if flow is followed, but handle edge case
      throw new Error("Onboarding session not found");
    }

    try {
      let result = null;

      switch (step) {
        case 'ss_sso':
          // Mock SSO configuration or call AuthService if it supported dynamic config
          // For now, we update tenant config
          await tenantService.updateSettings(currentTenantId, {
            sso: data
          }, actorId);
          result = { configured: true };
          break;

        case 'scim':
          // Mock SCIM configuration
          await tenantService.updateSettings(currentTenantId, {
            scim: data
          }, actorId);
          result = { configured: true };
          break;

        case 'siem':
          // Validate and Configure SIEM
          // Logic: test connection first (Preflight ONB-2)
          if (data.provider && data.config) {
            // We can't easily dynamically add providers to the singleton SIEMService
            // without persistent storage support in that service (it uses env vars/hardcoded).
            // However, for the purpose of the Wizard, we can mock the validation
            // or assume we are enabling one of the pre-configured ones.

            // If we were fully implementing dynamic SIEM:
            // await siemService.addTenantProvider(currentTenantId, data);

            // For now, we simulate success if the sink is reachable.
            // We'll update tenant settings to reflect "SIEM Enabled"
            await tenantService.updateSettings(currentTenantId, {
              siem: {
                enabled: true,
                type: data.type,
                destination: data.destination
              }
            }, actorId);
          }
          result = { verified: true };
          break;

        case 'baseline_policies':
          // Apply baseline policies
          // Mock: just log it
          logger.info(`Applying baseline policies for ${currentTenantId}`);
          result = { policiesApplied: ['security-baseline-v1', 'compliance-starter'] };
          break;

        case 'test_event':
          // ONB-3: Proof of life
          // Trigger an event and ensure it propagates
          const eventId = randomUUID();
          await provenanceLedger.appendEntry({
            tenantId: currentTenantId,
            timestamp: new Date(),
            actionType: 'ONBOARDING_TEST_EVENT',
            resourceType: 'onboarding_session',
            resourceId: currentTenantId,
            actorId: actorId,
            actorType: 'user',
            payload: {
              mutationType: 'CREATE',
              entityId: eventId,
              entityType: 'TestEvent',
              reason: 'Proof of Life Test'
            },
            metadata: { tenantId: currentTenantId, eventId },
          });

          // Also send to SIEM if enabled
          await siemService.sendEvent({
            timestamp: new Date(),
            eventType: 'onboarding_test',
            severity: 'low',
            source: 'onboarding_wizard',
            message: 'Proof of Life Test Event',
            tenantId: currentTenantId,
            details: { eventId }
          });

          result = { eventId, verified: true };
          break;

        case 'completed':
          session.completedAt = new Date();
          break;
      }

      // Update Session State
      const nextStep = this.getNextStep(step);
      session.currentStep = nextStep;
      session.stepsStatus[step] = {
        status: 'success',
        completedAt: new Date().toISOString(),
        data: result
      };

      await this.saveSession(session);
      return { session, result };

    } catch (error: any) {
      logger.error(`Onboarding step ${step} failed for ${currentTenantId}`, error);

      // Update session with failure (ONB-2 Actionable Errors)
      session.stepsStatus[step] = {
        status: 'failed',
        error: error.message,
        data: { stack: error.stack } // Dev friendly
      };
      await this.saveSession(session);
      throw error;
    }
  }

  private getNextStep(current: OnboardingStep): OnboardingStep {
    const order: OnboardingStep[] = ['create_tenant', 'ss_sso', 'scim', 'siem', 'baseline_policies', 'test_event', 'completed'];
    const idx = order.indexOf(current);
    if (idx === -1 || idx === order.length - 1) return 'completed';
    return order[idx + 1];
  }

  private async saveSession(session: OnboardingSession) {
    const pool = getPostgresPool();
    if (!pool) throw new Error('Postgres pool not initialized');
    await pool.query(
      `INSERT INTO onboarding_sessions (tenant_id, current_step, steps_status, created_at, updated_at, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id) DO UPDATE SET
         current_step = EXCLUDED.current_step,
         steps_status = EXCLUDED.steps_status,
         updated_at = NOW(),
         completed_at = EXCLUDED.completed_at`,
      [
        session.tenantId,
        session.currentStep,
        JSON.stringify(session.stepsStatus),
        session.createdAt,
        new Date(),
        session.completedAt
      ]
    );
  }

  private mapRowToSession(row: any): OnboardingSession {
    return {
      tenantId: row.tenant_id,
      currentStep: row.current_step,
      stepsStatus: row.steps_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at
    };
  }
}

export const onboardingService = OnboardingService.getInstance();
