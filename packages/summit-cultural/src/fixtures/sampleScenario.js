"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sampleSignal = exports.sampleNarrative = exports.samplePopulations = void 0;
exports.samplePopulations = [
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
exports.sampleNarrative = {
    id: 'energy-crisis-western-sanctions',
    theme: 'Energy crisis caused by western sanctions',
    targetLanguages: ['slovak', 'german', 'polish'],
    frameValues: ['price-stability', 'energy-security'],
    historicalReferences: ['post-soviet-transition'],
    mediaVectors: ['radio', 'facebook', 'television'],
};
exports.sampleSignal = {
    detectedPhrases: ['western decadence', 'energy collapse'],
    register: 'activist',
    sourceLanguage: 'slovak',
    suspectedTranslation: false,
};
