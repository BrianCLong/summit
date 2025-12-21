export interface JurisdictionContext {
  user?: {
    id: string;
    role: string;
    tenantId: string;
    region?: string;
  };
  ip?: string;
  region?: string;
}

export interface JurisdictionDecision {
  region: string;
  permitted: boolean;
  prohibitedFeatures: string[];
  requiredAudits: string[];
}

export class JurisdictionResolver {
  private static instance: JurisdictionResolver;

  public static getInstance(): JurisdictionResolver {
    if (!JurisdictionResolver.instance) {
      JurisdictionResolver.instance = new JurisdictionResolver();
    }
    return JurisdictionResolver.instance;
  }

  public resolve(context: JurisdictionContext): JurisdictionDecision {
    // Default to US if not specified
    const region = context.region || context.user?.region || 'US';

    const decision: JurisdictionDecision = {
      region,
      permitted: true,
      prohibitedFeatures: [],
      requiredAudits: []
    };

    switch (region) {
      case 'EU':
        decision.prohibitedFeatures = ['unexplained_model_output', 'dark_pattern_ui'];
        decision.requiredAudits = ['gdpr_impact_assessment', 'explanation_trace'];
        break;
      case 'US':
        decision.prohibitedFeatures = ['unlogged_decision_path'];
        decision.requiredAudits = ['equal_opportunity_check'];
        break;
      case 'CA':
        decision.prohibitedFeatures = ['biometric_harvesting'];
        decision.requiredAudits = ['pipeda_compliance'];
        break;
      case 'CN':
         decision.prohibitedFeatures = ['unfiltered_generative_content', 'cross_border_data_transfer'];
         break;
      default:
        // Default safe
        decision.requiredAudits = ['basic_logging'];
    }

    return decision;
  }
}
