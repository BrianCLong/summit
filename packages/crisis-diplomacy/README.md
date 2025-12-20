# Crisis Diplomacy Monitoring

Comprehensive monitoring and analysis of international crises, conflict mediation, peace processes, and crisis communications.

## Features

- **Crisis Tracking**: Monitor active international crises and conflicts
- **Escalation Assessment**: Real-time escalation risk analysis and early warning
- **Mediation Monitoring**: Track mediation efforts and effectiveness
- **Peace Process Analysis**: Assess sustainability and success prospects
- **Ceasefire Compliance**: Monitor ceasefire adherence and violations
- **Trajectory Prediction**: Forecast crisis evolution and resolution prospects
- **Deescalation Identification**: Identify diplomatic opportunities for resolution
- **Comparative Analysis**: Learn from historical crises and successful mediations
- **Early Warning**: Multi-indicator threat assessment system

## Crisis Types

- Armed conflicts
- Territorial disputes
- Diplomatic crises
- Humanitarian emergencies
- Political crises
- Nuclear crises
- International incidents

## Usage

```typescript
import {
  CrisisDiplomacyMonitor,
  CrisisType,
  CrisisPhase,
  EscalationLevel
} from '@intelgraph/crisis-diplomacy';

const monitor = new CrisisDiplomacyMonitor();

// Track a crisis
monitor.trackCrisis({
  id: 'crisis-001',
  name: 'Border Dispute',
  type: CrisisType.TERRITORIAL_DISPUTE,
  phase: CrisisPhase.ESCALATING,
  escalationLevel: EscalationLevel.HIGH,
  startDate: new Date('2024-01-01'),
  primaryParties: [
    {
      id: 'p1',
      name: 'Country A',
      type: 'STATE',
      leaders: [],
      objectives: ['Territorial integrity'],
      redLines: ['No foreign troops'],
      capabilities: { military: 70, economic: 60, political: 65, international: 50, popular: 55 },
      willingness: 60,
      constraints: ['Public opinion'],
      leverage: 65
    }
  ],
  // ... other fields
});

// Get active crises
const active = monitor.getActiveCrises();
console.log(`${active.length} active crises`);

// Assess escalation risk
const riskAssessment = monitor.assessEscalationRisk('crisis-001');
console.log(`Risk level: ${riskAssessment.level}`);
console.log(`Overall risk: ${riskAssessment.overallRisk.toFixed(1)}%`);
console.log(`Urgency: ${riskAssessment.urgency}`);
riskAssessment.immediateRisks.forEach(risk => {
  console.log(`  - ${risk.factor} (${risk.probability}% probability)`);
});

// Identify deescalation opportunities
const opportunities = monitor.identifyDeescalationOpportunities('crisis-001');
console.log('Deescalation opportunities:');
opportunities.diplomaticWindows.forEach(window => {
  console.log(`  - ${window}`);
});
console.log('Immediate actions:', opportunities.immediateActions.join(', '));

// Track mediation effort
monitor.trackMediationEffort({
  id: 'med-001',
  type: 'THIRD_PARTY_MEDIATION',
  mediator: 'UN',
  mediatorType: 'UN',
  startDate: new Date(),
  status: 'ACTIVE',
  parties: ['Country A', 'Country B'],
  objectives: ['Ceasefire', 'Territorial agreement'],
  approach: 'Shuttle diplomacy',
  phases: [],
  progress: 45,
  factors: {
    mediatorCredibility: 75,
    partyWillingness: 60,
    externalSupport: 70,
    timing: 65
  }
});

// Analyze mediation effectiveness
const mediationAnalysis = monitor.analyzeMediationEffectiveness('med-001');
console.log(`Effectiveness: ${mediationAnalysis.effectivenessScore.toFixed(1)}`);
console.log(`Prospects: ${mediationAnalysis.prospects}`);
console.log('Strengths:', mediationAnalysis.strengths.join(', '));
console.log('Weaknesses:', mediationAnalysis.weaknesses.join(', '));

// Track peace process
monitor.trackPeaceProcess({
  id: 'peace-001',
  crisis: 'crisis-001',
  name: 'Comprehensive Peace Process',
  startDate: new Date(),
  status: 'ONGOING',
  framework: 'UN-mediated framework',
  phases: [
    {
      number: 1,
      name: 'Ceasefire and confidence building',
      objectives: ['Ceasefire agreement', 'Prisoner exchange'],
      status: 'ACTIVE',
      progress: 60,
      challenges: ['Trust deficit']
    }
  ],
  stakeholders: [],
  achievements: ['Initial ceasefire'],
  challenges: ['Verification mechanisms'],
  momentum: 'MODERATE',
  publicSupport: [
    { party: 'Country A', support: 55 },
    { party: 'Country B', support: 60 }
  ],
  sustainability: 65,
  successProspects: 60
});

// Assess peace process sustainability
const sustainability = monitor.assessPeaceProcessSustainability('peace-001');
console.log(`Sustainability: ${sustainability.sustainabilityScore}%`);
console.log(`Prognosis: ${sustainability.prognosis}`);
console.log('Supporting factors:', sustainability.supportingFactors.join(', '));

// Monitor ceasefire compliance
const compliance = monitor.monitorCeasefireCompliance('crisis-001');
console.log(`Active ceasefires: ${compliance.activeCount}`);
console.log(`Average compliance: ${compliance.averageCompliance.toFixed(1)}%`);
console.log(`Trend: ${compliance.trend}`);
console.log(`Risk level: ${compliance.riskLevel}`);

// Predict trajectory
const trajectory = monitor.predictTrajectory('crisis-001');
console.log('Short-term prediction:');
console.log(`  Phase: ${trajectory.shortTerm.phase} (${trajectory.shortTerm.probability}%)`);
console.log('Medium-term prediction:');
console.log(`  Phase: ${trajectory.mediumTerm.phase} (${trajectory.mediumTerm.probability}%)`);

// Compare crises for lessons
const comparison = monitor.compareCrises(['crisis-001', 'crisis-002']);
console.log('Similarities:', comparison.similarities.join(', '));
console.log('Lessons learned:', comparison.lessons.join(', '));
console.log('Applicable strategies:', comparison.applicableStrategies.join(', '));

// Early warning assessment
const earlyWarning = monitor.generateEarlyWarning([
  {
    indicator: 'Military buildup',
    category: 'MILITARY',
    threshold: 50,
    currentLevel: 75,
    trend: 'DETERIORATING',
    urgency: 'HIGH'
  },
  {
    indicator: 'Diplomatic rhetoric',
    category: 'POLITICAL',
    threshold: 60,
    currentLevel: 80,
    trend: 'DETERIORATING',
    urgency: 'CRITICAL'
  }
]);
console.log(`Threat level: ${earlyWarning.overallThreatLevel}`);
console.log('Critical indicators:', earlyWarning.criticalIndicators.length);
console.log('Recommendations:');
earlyWarning.recommendations.forEach(rec => console.log(`  - ${rec}`));
```

## API

### CrisisDiplomacyMonitor

- `trackCrisis(crisis)`: Track a new or updated crisis
- `getCrisis(id)`: Get crisis by ID
- `getActiveCrises()`: Get all active crises
- `getCrisesByType(type)`: Get crises by type
- `getCrisesByPhase(phase)`: Get crises by phase
- `assessEscalationRisk(crisisId)`: Assess escalation risks
- `identifyDeescalationOpportunities(crisisId)`: Identify resolution opportunities
- `trackMediationEffort(effort)`: Track mediation efforts
- `analyzeMediationEffectiveness(effortId)`: Analyze mediation effectiveness
- `trackPeaceProcess(process)`: Track peace processes
- `assessPeaceProcessSustainability(processId)`: Assess sustainability
- `monitorCeasefireCompliance(crisisId)`: Monitor ceasefire compliance
- `predictTrajectory(crisisId)`: Predict crisis trajectory
- `compareCrises(crisisIds)`: Compare crises for lessons learned
- `generateEarlyWarning(indicators)`: Generate early warning assessment
- `getStatistics()`: Get aggregate statistics

## Analysis Capabilities

### Escalation Risk Assessment
- Multi-factor risk calculation
- Immediate threat identification
- Critical indicator tracking
- Mitigation option generation
- Urgency classification

### Mediation Effectiveness
- Mediator credibility assessment
- Party willingness tracking
- External support measurement
- Breakthrough and setback analysis
- Progress monitoring

### Peace Process Monitoring
- Momentum tracking
- Public support measurement
- Stakeholder commitment analysis
- Critical period identification
- Sustainability scoring

### Ceasefire Compliance
- Violation tracking
- Compliance trending
- Risk level assessment
- Verification effectiveness

### Trajectory Prediction
- Short, medium, and long-term forecasts
- Phase transition prediction
- Key factor identification
- Confidence scoring

### Comparative Analysis
- Pattern identification
- Lessons learned extraction
- Strategy applicability assessment
- Success factor analysis
