/**
 * Persona Fusion Engine
 *
 * Constructs persona hypotheses from multi-platform accounts and explicitly
 * tracks deception and anti-linkage tactics.
 */

import {
    PersonaHypothesis,
    PlatformAccount,
    PersonaLink,
    createPersonaHypothesis,
    attachPlatformAccount,
    markContestedLink,
    computePersonaMetrics
} from './identity_graph';

export class PersonaFusionEngine {
    private generatedLinks: PersonaLink[] = [];

    /**
     * Consumes platform accounts and link scores to produce PersonaHypothesis nodes.
     * Stubbed logic groups accounts if scores > 0.5.
     */
    public fuse(accounts: PlatformAccount[], candidateScores: Map<string, number>): {
        personas: PersonaHypothesis[],
        links: PersonaLink[]
    } {
        const personas: PersonaHypothesis[] = [];
        const links: PersonaLink[] = [];

        // Simple mock clustering
        let currentPersona = createPersonaHypothesis({ risk_profile: 'SUSPECTED_ADVERSARIAL' });
        let currentAccounts: PlatformAccount[] = [];

        for (let i = 0; i < accounts.length; i++) {
            const acc = accounts[i];

            // Assume link exists to previous account for mock
            if (i > 0) {
                const prev = accounts[i - 1];
                const key = `${prev.account_id}_${acc.account_id}`;
                const score = candidateScores.get(key) || 0.8; // Default high for mock

                const link: PersonaLink = {
                    link_type: 'CANDIDATE_LINK',
                    evidence_score: score,
                    evidence_factors: ['heuristics'],
                    source_account_id: prev.account_id,
                    target_account_id: acc.account_id
                };
                links.push(link);

                const attached = attachPlatformAccount(currentPersona, acc, link, currentAccounts);
                currentPersona = attached.updatedPersona;
                currentAccounts = attached.updatedAccounts;
            } else {
                currentAccounts.push(acc);
                currentPersona = computePersonaMetrics(currentPersona, currentAccounts);
            }
        }

        // Detect and flag deception
        const deceptionSignals = this.detectDeception(currentAccounts);
        if (deceptionSignals.length > 0) {
            currentPersona = this.flagDeception(currentPersona, deceptionSignals);

            // Flag links as contested
            for (let i = 0; i < links.length; i++) {
                links[i] = markContestedLink(links[i], deceptionSignals);
            }
        }

        personas.push(currentPersona);
        this.generatedLinks.push(...links);

        return { personas, links };
    }

    /**
     * Identify contradictions like mismatched timezone, languages, and locations.
     */
    public detectDeception(personaAccounts: PlatformAccount[]): string[] {
        const signals: string[] = [];
        const languages = new Set(personaAccounts.map(a => a.language).filter(Boolean));
        const locations = new Set(personaAccounts.map(a => a.location).filter(Boolean));

        if (languages.size > 1) {
            signals.push('linguistic divergence');
        }
        if (locations.size > 1) {
            signals.push('conflicting locations');
        }

        return signals;
    }

    /**
     * Update the deception_profile of the PersonaHypothesis.
     */
    public flagDeception(persona: PersonaHypothesis, deceptionSignals: string[]): PersonaHypothesis {
        let profile = persona.deception_profile;
        if (deceptionSignals.includes('linguistic divergence') || deceptionSignals.includes('conflicting locations')) {
            profile = 'ANTI_LINKAGE_TACTICS';
        }
        return {
            ...persona,
            deception_profile: profile
        };
    }

    /**
     * Returns a text report detailing evidence for and against the linkage.
     */
    public explain_persona(personaId: string, accounts: PlatformAccount[], links: PersonaLink[]): string {
        const forEvidence: string[] = [];
        const againstEvidence: string[] = [];

        links.forEach(link => {
            if (link.link_type === 'CONTRADICTED_LINK') {
                againstEvidence.push(...link.evidence_factors);
            } else {
                forEvidence.push(...link.evidence_factors);
            }
        });

        return `Persona Explanation (${personaId}):
Evidence FOR Linkage:
- ${forEvidence.length > 0 ? forEvidence.join(', ') : 'None'}

Evidence AGAINST Linkage (Anti-Linkage Tactics / Deception):
- ${againstEvidence.length > 0 ? againstEvidence.join(', ') : 'None'}`;
    }
}
