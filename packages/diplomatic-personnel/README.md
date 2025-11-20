# Diplomatic Personnel Tracking

Comprehensive tracking and analysis of ambassadors, envoys, diplomatic personnel, and their professional networks.

## Features

- **Personnel Tracking**: Monitor ambassadors, envoys, and diplomatic staff worldwide
- **Network Mapping**: Map diplomatic relationships and influence networks
- **Career Analysis**: Track career progression and development paths
- **Effectiveness Assessment**: Evaluate diplomat and embassy performance
- **Influence Metrics**: Calculate multi-dimensional influence scores
- **Embassy Monitoring**: Track embassy operations and effectiveness
- **Cadre Comparison**: Compare diplomatic services across countries
- **Appointment Tracking**: Monitor diplomatic appointments and rotations

## Personnel Types

- Ambassadors and high commissioners
- Special envoys and representatives
- Permanent representatives (UN, multilateral)
- Consular officers
- Diplomatic staff at all ranks
- Embassy leadership teams

## Usage

```typescript
import {
  DiplomaticPersonnelTracker,
  DiplomaticRank,
  SpecializationArea
} from '@intelgraph/diplomatic-personnel';

const tracker = new DiplomaticPersonnelTracker();

// Track a diplomat
tracker.trackDiplomat({
  id: 'dip-001',
  name: 'Ambassador Jane Smith',
  rank: DiplomaticRank.AMBASSADOR,
  country: 'USA',
  nationality: 'American',
  languages: [
    { language: 'English', proficiency: 'NATIVE' },
    { language: 'French', proficiency: 'FLUENT' },
    { language: 'Mandarin', proficiency: 'PROFESSIONAL' }
  ],
  education: [
    {
      institution: 'Georgetown University',
      degree: 'MA',
      field: 'International Relations',
      year: 2000,
      country: 'USA'
    }
  ],
  careerStart: new Date('2000-01-01'),
  currentPosting: {
    id: 'post-001',
    type: 'BILATERAL_EMBASSY',
    title: 'Ambassador to France',
    location: { city: 'Paris', country: 'France', region: 'Europe' },
    startDate: new Date('2022-01-01'),
    isCurrent: true,
    responsibilities: ['Bilateral relations', 'Economic diplomacy'],
    significantEvents: []
  },
  previousPostings: [],
  specializations: [SpecializationArea.POLITICAL_AFFAIRS, SpecializationArea.ECONOMIC_AFFAIRS],
  regionalExpertise: ['Europe', 'Asia'],
  topicalExpertise: ['Trade policy', 'Climate diplomacy'],
  relationships: [],
  effectiveness: 85,
  influence: 78,
  networkSize: 120,
  profileLevel: 'HIGH',
  // ... other fields
});

// Analyze diplomat effectiveness
const analysis = tracker.analyzeDiplomatEffectiveness('dip-001');
console.log(`Effectiveness: ${analysis.effectivenessScore}`);
console.log(`Career trajectory: ${analysis.careerTrajectory}`);
console.log('Strengths:', analysis.strengths.join(', '));
console.log('Recommendations:', analysis.recommendations.join(', '));

// Map diplomatic network
const network = tracker.mapDiplomaticNetwork('dip-001', 2);
console.log(`Direct connections: ${network.directConnections.length}`);
console.log(`Network strength: ${network.networkStrength.toFixed(1)}`);
console.log(`Geographic reach: ${network.geographicReach.join(', ')}`);
console.log('Influential contacts:');
network.influentialContacts.forEach(contact => {
  console.log(`  - ${contact.name} (${contact.country})`);
});

// Get ambassadors to a country
const ambassadors = tracker.getAmbassadorsToCountry('France');
console.log(`${ambassadors.length} ambassadors accredited to France`);

// Track an embassy
tracker.trackEmbassy({
  id: 'emb-001',
  country: 'USA',
  hostCountry: 'France',
  location: { city: 'Paris', country: 'France', region: 'Europe' },
  established: new Date('1776-01-01'),
  headOfMission: 'dip-001',
  staff: {
    totalStaff: 150,
    diplomaticStaff: 50,
    administrativeStaff: 40,
    localStaff: 60,
    byRank: [],
    bySpecialization: []
  },
  departments: [
    {
      name: 'Political Section',
      head: 'dip-002',
      staff: 15,
      focus: ['Bilateral relations', 'Political reporting']
    }
  ],
  size: 'LARGE',
  functions: ['Diplomatic representation', 'Consular services'],
  priorities: ['Trade promotion', 'Cultural exchange'],
  activities: [],
  effectiveness: 82,
  bilateralRelationshipQuality: 85,
  lastUpdated: new Date()
});

// Analyze embassy effectiveness
const embassyAnalysis = tracker.analyzeEmbassyEffectiveness('emb-001');
console.log(`Embassy effectiveness: ${embassyAnalysis.effectivenessScore}`);
console.log(`Staffing level: ${embassyAnalysis.staffingLevel}`);
console.log('Strength areas:', embassyAnalysis.strengthAreas.join(', '));

// Identify influential diplomats
const influential = tracker.identifyInfluentialDiplomats({
  minInfluence: 75,
  specialization: SpecializationArea.ECONOMIC_AFFAIRS
});
console.log(`${influential.length} influential economic diplomats`);

// Analyze career progression
const career = tracker.analyzeCareerProgression('dip-001');
console.log(`Progression rate: ${career.progressionRate} years/promotion`);
console.log(`Future prospects: ${career.futureProspects}`);
console.log(`Benchmark: ${career.benchmarkComparison}`);

// Track diplomatic cadre
tracker.trackCadre({
  country: 'USA',
  totalDiplomats: 8000,
  activeOverseas: 3500,
  activeAtHome: 4500,
  byRank: [],
  byRegion: [],
  bySpecialization: [],
  averageAge: 45,
  averageYearsOfService: 15,
  genderDistribution: { male: 4500, female: 3500 },
  recruitmentRate: 300,
  attritionRate: 5,
  trainingPrograms: ['FSI', 'Language training', 'Leadership development'],
  languageCapabilities: [
    { language: 'French', speakers: 1200 },
    { language: 'Spanish', speakers: 1500 },
    { language: 'Arabic', speakers: 800 }
  ],
  reputation: 85,
  effectiveness: 82
});

// Compare diplomatic cadres
const comparison = tracker.compareCadres(['USA', 'UK', 'France', 'China']);
console.log(`Largest cadre: ${comparison.largestCadre}`);
console.log(`Most effective: ${comparison.mostEffective}`);
console.log(`Best trained: ${comparison.bestTrained}`);
console.log('Insights:', comparison.insights.join('\n  '));

// Calculate influence metrics
const influence = tracker.calculateInfluenceMetrics('dip-001');
console.log(`Overall influence: ${influence.overallInfluence.toFixed(1)}`);
console.log(`Network influence: ${influence.networkInfluence.toFixed(1)}`);
console.log(`Political influence: ${influence.politicalInfluence.toFixed(1)}`);
console.log(`Trend: ${influence.trend}`);
console.log('Influence factors:', influence.influenceFactors.join(', '));

// Compare diplomats
const diplomatComparison = tracker.compareDiplomats(['dip-001', 'dip-002', 'dip-003']);
console.log('Common background:', diplomatComparison.commonBackground?.join(', '));
console.log('Effectiveness ranking:');
diplomatComparison.effectivenessRanking.forEach(r => {
  console.log(`  ${r.rank}. ${r.diplomat}: ${r.score}`);
});
```

## API

### DiplomaticPersonnelTracker

- `trackDiplomat(diplomat)`: Track a diplomat's profile and activities
- `getDiplomat(id)`: Get diplomat by ID
- `getDiplomatsByCountry(country)`: Get all diplomats from a country
- `getDiplomatsByRank(rank)`: Get all diplomats of specific rank
- `getAmbassadorsToCountry(hostCountry)`: Get current ambassadors to a country
- `analyzeDiplomatEffectiveness(diplomatId)`: Analyze diplomat performance
- `mapDiplomaticNetwork(diplomatId, depth)`: Map diplomatic relationships
- `trackEmbassy(embassy)`: Track embassy operations
- `analyzeEmbassyEffectiveness(embassyId)`: Analyze embassy performance
- `trackNetwork(network)`: Track diplomatic networks
- `identifyInfluentialDiplomats(criteria)`: Find influential diplomats
- `analyzeCareerProgression(diplomatId)`: Analyze career path
- `trackCadre(cadre)`: Track country's diplomatic service
- `compareCadres(countries)`: Compare diplomatic services
- `calculateInfluenceMetrics(diplomatId)`: Calculate influence scores
- `compareDiplomats(diplomatIds)`: Compare multiple diplomats
- `getStatistics()`: Get aggregate statistics

## Data Models

### Diplomat
Complete diplomat profile including:
- Personal background and education
- Current and previous postings
- Specializations and expertise
- Relationships and network
- Performance metrics
- Public activities
- Diplomatic style
- Reputation assessment

### Embassy
Embassy profile including:
- Staffing and structure
- Departments and functions
- Budget and resources
- Performance metrics
- Bilateral relationship quality

### DiplomaticNetwork
Network structure including:
- Member profiles
- Network type and purpose
- Cohesion and influence metrics

### CareerPath
Career progression tracking:
- Career stages
- Promotion velocity
- Geographic/functional diversity
- Future prospects

### InfluenceMetrics
Multi-dimensional influence assessment:
- Network influence
- Media presence
- Political access
- Policy impact
- Thought leadership
- Negotiating power

## Analysis Capabilities

### Effectiveness Assessment
- Performance scoring
- Strength/weakness identification
- Career trajectory analysis
- Peer benchmarking

### Network Analysis
- Relationship mapping
- Influence propagation
- Geographic reach
- Key contact identification

### Career Development
- Progression tracking
- Promotion forecasting
- Skill gap analysis
- Succession planning

### Comparative Analysis
- Cadre comparison
- Diplomat comparison
- Best practice identification
- Performance benchmarking
