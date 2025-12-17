import { UsageDimension } from './events';

export interface Plan {
  id: string;
  name: string;
  kind: 'free' | 'team' | 'enterprise' | 'custom';
  quotas: {
    [key in UsageDimension]?: number;
  };
  overagePolicy?: {
    allowed: boolean;
    dimensions: UsageDimension[];
    rateCardId?: string;
  };
  features: string[];
}
