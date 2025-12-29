export interface RegionalConfig {
  countryCode: string;
  region: string;
  residency: {
    dataRegion: string;
    allowedTransferTargets: string[];
    strictSovereignty: boolean;
  };
  privacy: {
    requiresConsent: boolean;
    retentionYears: number;
    rightToBeForgotten: boolean;
    dataMinimization: boolean;
  };
  features: {
    aiFeatures: boolean; // Some regions might block AI
    betaFeatures: boolean;
  };
  sla: {
    uptimeTarget: number; // e.g., 99.9
    maxResponseTimeMs: number;
  };
  support: {
    hours: string; // "24/7" or "09:00-17:00 CET"
    escalationEmail: string;
    language: string;
  };
}

export const REGIONAL_CATALOG: Record<string, RegionalConfig> = {
  US: {
    countryCode: 'US',
    region: 'us-east-1',
    residency: {
      dataRegion: 'us-east-1',
      allowedTransferTargets: ['EU', 'UK'], // Just an example
      strictSovereignty: false,
    },
    privacy: {
      requiresConsent: false,
      retentionYears: 7,
      rightToBeForgotten: true,
      dataMinimization: false,
    },
    features: {
      aiFeatures: true,
      betaFeatures: true,
    },
    sla: {
      uptimeTarget: 99.9,
      maxResponseTimeMs: 500,
    },
    support: {
      hours: '24/7',
      escalationEmail: 'escalations-us@summit.com',
      language: 'en',
    },
  },
  DE: {
    countryCode: 'DE',
    region: 'eu-central-1',
    residency: {
      dataRegion: 'eu-central-1',
      allowedTransferTargets: [], // Strict residency
      strictSovereignty: true,
    },
    privacy: {
      requiresConsent: true,
      retentionYears: 10,
      rightToBeForgotten: true,
      dataMinimization: true,
    },
    features: {
      aiFeatures: true, // Assuming enabled for now
      betaFeatures: false,
    },
    sla: {
      uptimeTarget: 99.95,
      maxResponseTimeMs: 300,
    },
    support: {
      hours: '09:00-17:00 CET',
      escalationEmail: 'escalations-de@summit.com',
      language: 'de',
    },
  },
  UK: {
    countryCode: 'UK',
    region: 'eu-west-2',
    residency: {
      dataRegion: 'eu-west-2',
      allowedTransferTargets: ['EU'],
      strictSovereignty: false,
    },
    privacy: {
      requiresConsent: true,
      retentionYears: 7,
      rightToBeForgotten: true,
      dataMinimization: true,
    },
    features: {
      aiFeatures: true,
      betaFeatures: false,
    },
    sla: {
      uptimeTarget: 99.9,
      maxResponseTimeMs: 400,
    },
    support: {
      hours: '09:00-17:00 BST',
      escalationEmail: 'escalations-uk@summit.com',
      language: 'en',
    },
  },
};
