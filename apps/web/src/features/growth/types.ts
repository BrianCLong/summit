export interface CompanyProfile {
  name: string;
  industry: string;
  stage: 'startup' | 'growth' | 'scaleup' | 'enterprise';
  employees: number;
  revenue: number;
  challenges: string[];
  goals: string[];
}

export interface Playbook {
  title: string;
  summary: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  strategic_initiatives: {
    title: string;
    description: string;
    timeline: string;
  }[];
  tactical_actions: string[];
}
