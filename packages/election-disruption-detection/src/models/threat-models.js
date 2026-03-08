"use strict";
/**
 * Threat Models for Election Security
 *
 * Comprehensive threat modeling based on:
 * - Historical election interference patterns
 * - State actor TTPs
 * - Domestic extremist tactics
 * - Technology vulnerability assessments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.THREAT_MODELS = void 0;
// Pre-defined threat models based on known patterns
exports.THREAT_MODELS = [
    {
        id: 'tm-001',
        name: 'State-Sponsored Influence Operation',
        category: 'FOREIGN_STATE',
        actors: ['STATE_INTELLIGENCE', 'PROXY_GROUP'],
        objectives: [
            'Undermine confidence in democratic institutions',
            'Promote preferred candidate/policy',
            'Exacerbate social divisions',
            'Create chaos and confusion',
        ],
        capabilities: [
            'Large-scale social media manipulation',
            'Deepfake generation',
            'Hack-and-leak operations',
            'Covert media placement',
            'Cultivation of unwitting amplifiers',
        ],
        indicators: [
            {
                type: 'NETWORK',
                pattern: 'Coordinated inauthentic behavior clusters',
                confidence: 0.8,
                falsePositiveRate: 0.1,
            },
            {
                type: 'LINGUISTIC',
                pattern: 'Non-native language patterns',
                confidence: 0.6,
                falsePositiveRate: 0.2,
            },
            {
                type: 'TEMPORAL',
                pattern: 'Activity aligned with foreign time zones',
                confidence: 0.5,
                falsePositiveRate: 0.3,
            },
        ],
        mitigations: [
            {
                control: 'Platform transparency requirements',
                effectiveness: 0.6,
                implementationCost: 'HIGH',
                timeToImplement: 'MONTHS',
            },
            {
                control: 'Media literacy campaigns',
                effectiveness: 0.4,
                implementationCost: 'MEDIUM',
                timeToImplement: 'WEEKS',
            },
        ],
        historicalPrecedents: [
            {
                event: 'Internet Research Agency operations',
                year: 2016,
                actor: 'Russia',
                impact: 'Significant social media reach, divisive content amplification',
                lessonsLearned: [
                    'Early detection crucial',
                    'Platform cooperation essential',
                    'Attribution enables response',
                ],
            },
        ],
    },
    {
        id: 'tm-002',
        name: 'Domestic Voter Suppression Campaign',
        category: 'DOMESTIC_EXTREMIST',
        actors: ['POLITICAL_OPERATIVE', 'LONE_ACTOR'],
        objectives: [
            'Reduce turnout in targeted demographics',
            'Create confusion about voting procedures',
            'Intimidate voters and election workers',
        ],
        capabilities: [
            'Targeted disinformation distribution',
            'Robocall/text campaigns',
            'Physical intimidation',
            'Legal harassment',
        ],
        indicators: [
            {
                type: 'TARGETING',
                pattern: 'Demographic-specific misinformation',
                confidence: 0.9,
                falsePositiveRate: 0.05,
            },
            {
                type: 'CONTENT',
                pattern: 'Wrong date/location/requirement claims',
                confidence: 0.95,
                falsePositiveRate: 0.02,
            },
        ],
        mitigations: [
            {
                control: 'Official information campaigns',
                effectiveness: 0.7,
                implementationCost: 'MEDIUM',
                timeToImplement: 'DAYS',
            },
            {
                control: 'Hotline for voter assistance',
                effectiveness: 0.5,
                implementationCost: 'LOW',
                timeToImplement: 'DAYS',
            },
        ],
        historicalPrecedents: [],
    },
    {
        id: 'tm-003',
        name: 'Election Infrastructure Cyberattack',
        category: 'FOREIGN_STATE',
        actors: ['APT', 'MILITARY_UNIT'],
        objectives: [
            'Compromise voter registration databases',
            'Disrupt election day operations',
            'Create evidence for fraud narratives',
            'Undermine result confidence',
        ],
        capabilities: [
            'Advanced persistent threats',
            'Zero-day exploitation',
            'Supply chain compromise',
            'Ransomware deployment',
        ],
        indicators: [
            {
                type: 'TECHNICAL',
                pattern: 'Unusual network traffic to election systems',
                confidence: 0.85,
                falsePositiveRate: 0.15,
            },
            {
                type: 'TECHNICAL',
                pattern: 'Credential harvesting attempts',
                confidence: 0.9,
                falsePositiveRate: 0.1,
            },
        ],
        mitigations: [
            {
                control: 'Network segmentation',
                effectiveness: 0.8,
                implementationCost: 'HIGH',
                timeToImplement: 'MONTHS',
            },
            {
                control: 'Paper ballot backup',
                effectiveness: 0.95,
                implementationCost: 'MEDIUM',
                timeToImplement: 'WEEKS',
            },
        ],
        historicalPrecedents: [
            {
                event: 'Voter registration database probing',
                year: 2016,
                actor: 'Russia (GRU)',
                impact: 'Systems accessed but vote counts unaffected',
                lessonsLearned: [
                    'Paper trails essential',
                    'Audit capabilities critical',
                    'Resilience over prevention',
                ],
            },
        ],
    },
];
