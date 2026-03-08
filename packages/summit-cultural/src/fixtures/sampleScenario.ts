import { LinguisticSignal, Narrative, PopulationGroup } from '../culturalGraph.js';

export const samplePopulations: PopulationGroup[] = [
  {
    id: 'polish-youth-urban',
    region: 'PL-urban',
    languages: ['polish', 'english'],
    valueSignals: ['economic-opportunity', 'european-integration'],
    historicalMemories: ['solidarity-era'],
    mediaConsumption: ['short-video', 'messaging-apps', 'online-news'],
  },
  {
    id: 'slovak-rural-energy-workers',
    region: 'SK-rural',
    languages: ['slovak', 'czech'],
    valueSignals: ['price-stability', 'energy-security'],
    historicalMemories: ['post-soviet-transition'],
    mediaConsumption: ['radio', 'facebook', 'television'],
  },
  {
    id: 'nordic-urban-professionals',
    region: 'Nordics-urban',
    languages: ['swedish', 'english'],
    valueSignals: ['climate-policy', 'institutional-trust'],
    historicalMemories: ['welfare-state-consensus'],
    mediaConsumption: ['public-broadcast', 'podcasts', 'professional-media'],
  },
];

export const sampleNarrative: Narrative = {
  id: 'energy-crisis-western-sanctions',
  theme: 'Energy crisis caused by western sanctions',
  targetLanguages: ['slovak', 'german', 'polish'],
  frameValues: ['price-stability', 'energy-security'],
  historicalReferences: ['post-soviet-transition'],
  mediaVectors: ['radio', 'facebook', 'television'],
};

export const sampleSignal: LinguisticSignal = {
  detectedPhrases: ['western decadence', 'energy collapse'],
  register: 'activist',
  sourceLanguage: 'slovak',
  suspectedTranslation: false,
};
