import type { CitizenProfile } from './types.js';
import type { CitizenProfileAggregator } from './citizen-profile-aggregator.js';
import type { FormAutocomplete } from './form-autocomplete.js';
import type { ProactiveServiceResolver } from './proactive-service-resolver.js';

/**
 * Orchestrates the complete admin automation workflow.
 * Coordinates profile aggregation, form autocomplete, and proactive resolution.
 */
export class WorkflowAutomation {
  constructor(
    private profileAggregator: CitizenProfileAggregator,
    private formAutocomplete: FormAutocomplete,
    private proactiveResolver: ProactiveServiceResolver,
  ) {}

  /**
   * Handles a new form submission with full automation
   */
  async handleFormSubmission(
    citizenId: string,
    formId: string,
    data: Record<string, unknown>,
  ): Promise<{
    profileUpdated: boolean;
    newNeedsDetected: number;
    autoResolved: number;
  }> {
    // 1. Update citizen profile with new data
    await this.profileAggregator.aggregateFromSubmission(citizenId, formId, data);

    // 2. Check for newly predictable service needs
    const needs = await this.proactiveResolver.predictServiceNeeds(citizenId);
    const autoResolvable = needs.filter(n => n.autoResolvable);

    // 3. Auto-resolve what we can
    let autoResolved = 0;
    for (const need of autoResolvable) {
      const result = await this.proactiveResolver.autoResolve(need.id, citizenId);
      if (result.resolved) autoResolved++;
    }

    return {
      profileUpdated: true,
      newNeedsDetected: needs.length,
      autoResolved,
    };
  }

  /**
   * Prepares a form for citizen with maximum autocomplete
   */
  async prepareFormForCitizen(
    citizenId: string,
    formId: string,
    formFields: { id: string; name: string; type: string; required: boolean }[],
  ): Promise<{
    prefilledValues: Record<string, unknown>;
    completionRate: number;
    pendingNeeds: number;
  }> {
    // Auto-complete form
    const autocomplete = await this.formAutocomplete.autocompleteForm(
      citizenId,
      formFields.map(f => ({
        ...f,
        type: f.type as 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'file' | 'address' | 'phone' | 'email',
      })),
    );

    // Check for pending needs
    const pendingNeeds = await this.proactiveResolver.getPendingNeeds(citizenId);

    return {
      prefilledValues: autocomplete.values,
      completionRate: autocomplete.completionRate,
      pendingNeeds: pendingNeeds.length,
    };
  }

  /**
   * Runs daily proactive scan for all citizens
   */
  async runDailyProactiveScan(citizenIds: string[]): Promise<{
    scanned: number;
    needsIdentified: number;
    autoResolved: number;
    notificationsSent: number;
  }> {
    let needsIdentified = 0;
    let autoResolved = 0;
    let notificationsSent = 0;

    for (const citizenId of citizenIds) {
      const needs = await this.proactiveResolver.predictServiceNeeds(citizenId);
      needsIdentified += needs.length;

      for (const need of needs) {
        if (need.autoResolvable) {
          const result = await this.proactiveResolver.autoResolve(need.id, citizenId);
          if (result.resolved) autoResolved++;
        } else if (need.confidence >= 0.8) {
          await this.proactiveResolver.notifyCitizen(citizenId, need.id);
          notificationsSent++;
        }
      }
    }

    return {
      scanned: citizenIds.length,
      needsIdentified,
      autoResolved,
      notificationsSent,
    };
  }
}
