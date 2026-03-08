"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowAutomation = void 0;
/**
 * Orchestrates the complete admin automation workflow.
 * Coordinates profile aggregation, form autocomplete, and proactive resolution.
 */
class WorkflowAutomation {
    profileAggregator;
    formAutocomplete;
    proactiveResolver;
    constructor(profileAggregator, formAutocomplete, proactiveResolver) {
        this.profileAggregator = profileAggregator;
        this.formAutocomplete = formAutocomplete;
        this.proactiveResolver = proactiveResolver;
    }
    /**
     * Handles a new form submission with full automation
     */
    async handleFormSubmission(citizenId, formId, data) {
        // 1. Update citizen profile with new data
        await this.profileAggregator.aggregateFromSubmission(citizenId, formId, data);
        // 2. Check for newly predictable service needs
        const needs = await this.proactiveResolver.predictServiceNeeds(citizenId);
        const autoResolvable = needs.filter(n => n.autoResolvable);
        // 3. Auto-resolve what we can
        let autoResolved = 0;
        for (const need of autoResolvable) {
            const result = await this.proactiveResolver.autoResolve(need.id, citizenId);
            if (result.resolved) {
                autoResolved++;
            }
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
    async prepareFormForCitizen(citizenId, formId, formFields) {
        // Auto-complete form
        const autocomplete = await this.formAutocomplete.autocompleteForm(citizenId, formFields.map(f => ({
            ...f,
            type: f.type,
        })));
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
    async runDailyProactiveScan(citizenIds) {
        let needsIdentified = 0;
        let autoResolved = 0;
        let notificationsSent = 0;
        for (const citizenId of citizenIds) {
            const needs = await this.proactiveResolver.predictServiceNeeds(citizenId);
            needsIdentified += needs.length;
            for (const need of needs) {
                if (need.autoResolvable) {
                    const result = await this.proactiveResolver.autoResolve(need.id, citizenId);
                    if (result.resolved) {
                        autoResolved++;
                    }
                }
                else if (need.confidence >= 0.8) {
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
exports.WorkflowAutomation = WorkflowAutomation;
