/**
 * Persona Identity Graph Model
 *
 * Represents adversarial personas, their cross-platform accounts,
 * behaviors, and deception signals as first-class entities.
 *
 * This is for DEFENSIVE intelligence only.
 */

export interface PersonaHypothesis {
    persona_id: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    risk_profile: 'BENIGN' | 'SUSPECTED_ADVERSARIAL' | 'CONFIRMED_ADVERSARIAL';
    deception_profile: 'NONE' | 'FAKE_PROFILE' | 'IDENTITY_CLONING' | 'COORDINATED_PERSONA_ARMY' | 'ANTI_LINKAGE_TACTICS';
    platforms_count: number;
    accounts_count: number;
    narrativeCampaignIds: string[];
    threatEntityIds: string[];
}

export interface PlatformAccount {
    platform: string;
    account_handle: string;
    account_id: string;
    language?: string;
    location?: string;
    image_hash?: string;
    linkage_signals: {
        structural: string[];
        content: string[];
        temporal: string[];
        cognitive: string[];
    };
}

export interface PersonaLink {
    link_type: 'CANDIDATE_LINK' | 'CONFIRMED_LINK' | 'CONTRADICTED_LINK';
    evidence_score: number;
    evidence_factors: string[];
    source_account_id: string;
    target_account_id: string;
}

export function createPersonaHypothesis(data: Partial<PersonaHypothesis> = {}): PersonaHypothesis {
    return {
        persona_id: data.persona_id || `persona_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        confidence: data.confidence || 'LOW',
        risk_profile: data.risk_profile || 'BENIGN',
        deception_profile: data.deception_profile || 'NONE',
        platforms_count: data.platforms_count || 0,
        accounts_count: data.accounts_count || 0,
        narrativeCampaignIds: data.narrativeCampaignIds || [],
        threatEntityIds: data.threatEntityIds || [],
    };
}

export function updatePersonaHypothesis(persona: PersonaHypothesis, data: Partial<PersonaHypothesis>): PersonaHypothesis {
    return { ...persona, ...data };
}

export function attachPlatformAccount(
    persona: PersonaHypothesis,
    account: PlatformAccount,
    link: PersonaLink,
    currentAccounts: PlatformAccount[]
): { updatedPersona: PersonaHypothesis, updatedAccounts: PlatformAccount[] } {
    const updatedAccounts = [...currentAccounts, account];
    const updatedPersona = computePersonaMetrics(persona, updatedAccounts);
    return { updatedPersona, updatedAccounts };
}

export function markContestedLink(link: PersonaLink, contradictory_evidence_factors: string[]): PersonaLink {
    return {
        ...link,
        link_type: 'CONTRADICTED_LINK',
        evidence_factors: [...link.evidence_factors, ...contradictory_evidence_factors],
    };
}

export function computePersonaMetrics(persona: PersonaHypothesis, accounts: PlatformAccount[]): PersonaHypothesis {
    const platforms = new Set(accounts.map(a => a.platform));
    return {
        ...persona,
        accounts_count: accounts.length,
        platforms_count: platforms.size,
    };
}
