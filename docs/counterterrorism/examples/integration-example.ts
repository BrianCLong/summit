/**
 * Integration Example: Complete Threat Detection and Assessment Workflow
 *
 * This example demonstrates how to use all components together for
 * a comprehensive counterterrorism intelligence operation.
 */

import { OrganizationTracker } from '@intelgraph/terrorist-tracking';
import { AttackDetector } from '@intelgraph/extremism-monitor';
import { RadicalizationMonitor } from '@intelgraph/radicalization-detection';
import { FighterTracker } from '@intelgraph/foreign-fighters';
import { FinanceTracker } from '@intelgraph/terrorist-finance';
import { PropagandaAnalyzer } from '@intelgraph/propaganda-analysis';
import { CounterterrorismService } from '@intelgraph/counterterrorism-service';
import { ThreatAssessmentService } from '@intelgraph/threat-assessment-service';

/**
 * Example 1: Track a New Terrorist Organization
 */
async function trackNewOrganization() {
  const tracker = new OrganizationTracker();

  // Register the organization
  await tracker.trackOrganization({
    id: 'org-example-001',
    name: 'Example Terrorist Organization',
    aliases: ['ETO', 'The Example Group'],
    type: 'PRIMARY',
    ideology: ['RELIGIOUS_EXTREMISM'],
    foundedDate: new Date('2020-01-01'),
    operatingRegions: ['Middle East', 'North Africa', 'Europe'],
    estimatedStrength: 5000,
    status: 'ACTIVE',
    affiliates: ['org-example-002', 'org-example-003'],
    metadata: {
      designation_date: '2021-06-15',
      designating_authority: 'US State Department'
    }
  });

  // Add leadership structure
  await tracker.updateLeadership({
    organizationId: 'org-example-001',
    hierarchyType: 'HIERARCHICAL',
    members: [
      {
        personId: 'person-001',
        name: 'Example Leader',
        aliases: ['The Commander'],
        role: 'Supreme Leader',
        rank: '1',
        status: 'ACTIVE',
        responsibilities: ['Strategic direction', 'External relations'],
        knownAssociates: ['person-002', 'person-003']
      },
      {
        personId: 'person-002',
        name: 'Example Deputy',
        aliases: ['The Deputy'],
        role: 'Military Commander',
        rank: '2',
        status: 'ACTIVE',
        responsibilities: ['Military operations', 'Training'],
        knownAssociates: ['person-001']
      }
    ],
    commandStructure: [
      {
        level: 1,
        position: 'Supreme Leader',
        memberId: 'person-001',
        subordinates: ['person-002', 'person-003'],
        region: 'Global'
      }
    ]
  });

  // Track financing
  await tracker.trackFinancing({
    organizationId: 'org-example-001',
    estimatedAnnualBudget: 50000000,
    fundingSources: [
      {
        type: 'CRIMINAL_ACTIVITY',
        description: 'Kidnapping for ransom operations',
        estimatedAmount: 20000000,
        frequency: 'ONGOING',
        region: 'Middle East',
        verified: true
      },
      {
        type: 'DONATIONS',
        description: 'Private donations from sympathizers',
        estimatedAmount: 15000000,
        frequency: 'ONGOING',
        verified: true
      }
    ],
    financialNetworks: [
      {
        id: 'network-001',
        type: 'HAWALA',
        nodes: ['hawala-operator-001', 'hawala-operator-002'],
        regions: ['Middle East', 'Europe']
      }
    ],
    frontCompanies: ['company-001', 'company-002'],
    charities: ['charity-001']
  });

  console.log('Organization tracked successfully');

  // Get comprehensive profile
  const profile = await tracker.getOrganizationProfile('org-example-001');
  console.log('Organization Profile:', JSON.stringify(profile, null, 2));
}

/**
 * Example 2: Detect and Assess an Attack Plot
 */
async function detectAttackPlot() {
  const detector = new AttackDetector();

  // Register attack plan
  await detector.registerAttackPlan({
    id: 'attack-001',
    status: 'PLANNING',
    targetType: 'CIVILIAN',
    targets: [
      {
        id: 'target-001',
        name: 'Example Shopping Mall',
        type: 'CIVILIAN',
        location: {
          country: 'United States',
          region: 'Northeast',
          city: 'New York',
          address: '123 Main Street'
        },
        vulnerability: {
          score: 0.7,
          factors: ['High foot traffic', 'Limited security', 'Public access'],
          securityMeasures: ['Security guards', 'CCTV cameras'],
          weaknesses: ['Multiple entry points', 'Inadequate screening'],
          assessmentDate: new Date()
        },
        surveillance: [],
        significance: 'HIGH'
      }
    ],
    planners: ['person-004', 'person-005'],
    indicators: [],
    confidence: 0.65,
    severity: 'HIGH',
    discovered: new Date(),
    lastUpdated: new Date(),
    intelligence: [
      {
        type: 'HUMINT',
        reliability: 'PROBABLE',
        description: 'Informant reported planning discussions',
        collected: new Date()
      }
    ]
  });

  // Record indicators
  await detector.recordWeaponsProcurement({
    id: 'weapons-001',
    individualId: 'person-004',
    weaponTypes: ['SMALL_ARMS', 'AMMUNITION'],
    quantity: 2,
    date: new Date(),
    detected: true,
    intelligence: [
      {
        type: 'SIGINT',
        reliability: 'CONFIRMED',
        description: 'Intercepted communications about weapons purchase',
        collected: new Date()
      }
    ]
  });

  await detector.recordTrainingActivity({
    id: 'training-001',
    participants: ['person-004', 'person-005'],
    type: 'WEAPONS',
    startDate: new Date(),
    skills: ['Firearms', 'Tactical movement'],
    detected: true
  });

  // Assess risk
  const risk = await detector.assessRisk('attack-001');
  console.log('Attack Risk Assessment:', JSON.stringify(risk, null, 2));

  // Query threats
  const threats = await detector.queryAttackPlans({
    status: ['PLANNING', 'PREPARATION'],
    severities: ['CRITICAL', 'HIGH']
  });

  console.log(`Found ${threats.totalCount} active threats`);
  console.log(`${threats.criticalThreats.length} critical threats requiring immediate attention`);
}

/**
 * Example 3: Monitor Radicalization Process
 */
async function monitorRadicalization() {
  const monitor = new RadicalizationMonitor();

  // Create radicalization profile
  await monitor.monitorIndividual({
    id: 'profile-001',
    individualId: 'person-006',
    status: 'AT_RISK',
    stage: 'IDENTIFICATION',
    pathway: {
      primary: 'ONLINE',
      secondary: ['PEER_NETWORK'],
      description: 'Radicalized through social media and online forums',
      duration: 180 // 6 months
    },
    indicators: [
      {
        id: 'indicator-001',
        type: 'CONTENT_CONSUMPTION',
        description: 'Regular viewing of extremist propaganda videos',
        detected: new Date(),
        confidence: 0.8,
        severity: 'HIGH',
        source: 'OSINT monitoring'
      },
      {
        id: 'indicator-002',
        type: 'SOCIAL_ISOLATION',
        description: 'Withdrawn from family and previous friends',
        detected: new Date(),
        confidence: 0.7,
        severity: 'MEDIUM',
        source: 'Family report'
      }
    ],
    timeline: {
      profileCreated: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      firstIndicator: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000),
      stageProgression: [
        {
          from: 'PRE_RADICALIZATION',
          to: 'IDENTIFICATION',
          date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          catalysts: ['Exposure to propaganda', 'Personal grievance']
        }
      ],
      criticalEvents: []
    },
    influences: [
      {
        id: 'influence-001',
        type: 'ONLINE_COMMUNITY',
        source: 'Extremist forum',
        description: 'Active participation in extremist online community',
        impact: 'HIGH',
        startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
      }
    ],
    interventions: [],
    riskScore: 0.6,
    lastAssessed: new Date()
  });

  // Track online activity
  await monitor.trackOnlineActivity({
    individualId: 'person-006',
    platforms: [
      {
        platform: 'Twitter',
        accountId: '@example_user',
        activityLevel: 'HIGH',
        contentTypes: ['extremist content', 'propaganda'],
        interactions: 500
      }
    ],
    contentExposure: [
      {
        id: 'content-001',
        type: 'VIDEO',
        platform: 'YouTube',
        viewed: new Date(),
        engagement: 'SHARE',
        extremismLevel: 'EXTREME'
      }
    ],
    echoChambers: [
      {
        id: 'chamber-001',
        platform: 'Telegram',
        name: 'Example Extremist Channel',
        memberCount: 5000,
        ideology: 'Religious extremism',
        extremismLevel: 'HIGH',
        activities: ['Propaganda sharing', 'Recruitment']
      }
    ],
    recruiters: [],
    progression: []
  });

  // Get intervention recommendations
  const interventions = await monitor.recommendInterventions('person-006');
  console.log('Recommended Interventions:', JSON.stringify(interventions, null, 2));
}

/**
 * Example 4: Track Foreign Fighter
 */
async function trackForeignFighter() {
  const tracker = new FighterTracker();

  // Track fighter
  await tracker.trackFighter({
    id: 'fighter-001',
    personalInfo: {
      name: 'Example Fighter',
      aliases: [],
      nationality: 'United States',
      languages: ['English', 'Arabic'],
      skills: ['Engineering background'],
      background: 'Former university student'
    },
    status: 'IN_CONFLICT_ZONE',
    journey: {
      departure: {
        date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        location: 'United States',
        method: 'Commercial flight',
        documents: [
          {
            type: 'PASSPORT',
            number: 'US123456',
            country: 'United States',
            authentic: true
          }
        ],
        detected: true
      },
      conflictZoneEntry: {
        date: new Date(Date.now() - 350 * 24 * 60 * 60 * 1000),
        location: 'Syria',
        method: 'Land crossing',
        documents: [],
        detected: true
      },
      facilitators: ['facilitator-001'],
      network: 'Example fighter network',
      route: ['United States', 'Turkey', 'Syria']
    },
    combatExperience: {
      conflictZone: 'Syria',
      organization: 'org-example-001',
      role: 'Fighter',
      duration: 365,
      training: [
        {
          type: 'Weapons',
          skills: ['Small arms', 'Explosives'],
          duration: 30
        }
      ],
      operations: [],
      specializations: ['IED construction']
    },
    affiliations: ['org-example-001'],
    threatLevel: 'HIGH',
    monitoring: {
      active: true,
      methods: ['SIGINT', 'HUMINT'],
      agencies: ['FBI', 'CIA']
    },
    lastUpdated: new Date()
  });

  console.log('Foreign fighter tracked');

  // Analyze fighter flows
  const flows = await tracker.analyzeFighterFlows();
  console.log('Fighter Flows:', flows);
}

/**
 * Example 5: Track Terrorist Financing
 */
async function trackFinancing() {
  const tracker = new FinanceTracker();

  // Track financial entity
  await tracker.trackEntity({
    id: 'entity-001',
    type: 'INDIVIDUAL',
    name: 'Example Financier',
    identifiers: [
      {
        type: 'Passport',
        value: 'XX123456',
        country: 'Country X',
        verified: true
      }
    ],
    location: 'Middle East',
    status: 'ACTIVE',
    sanctioned: false,
    riskScore: 0.85
  });

  // Record transactions
  await tracker.recordTransaction({
    id: 'tx-001',
    from: 'entity-001',
    to: 'org-example-001',
    amount: 100000,
    currency: 'USD',
    date: new Date(),
    method: 'HAWALA',
    suspicious: true,
    flagged: true
  });

  // Track hawala network
  await tracker.trackHawalaNetwork({
    id: 'hawala-001',
    operators: [
      {
        id: 'operator-001',
        name: 'Example Operator',
        location: 'Dubai',
        connections: ['operator-002'],
        volume: 1000000,
        flagged: true
      }
    ],
    locations: ['Dubai', 'Karachi', 'London'],
    estimatedVolume: 5000000,
    active: true,
    monitored: true
  });

  // Get funding sources
  const sources = await tracker.getFundingSources('org-example-001');
  console.log('Funding Sources:', sources);

  // Calculate disruption impact
  const impact = await tracker.calculateDisruptionImpact('entity-001');
  console.log('Disruption Impact:', impact);
}

/**
 * Example 6: Analyze Propaganda
 */
async function analyzePropaganda() {
  const analyzer = new PropagandaAnalyzer();

  // Analyze content
  await analyzer.analyzeContent({
    id: 'content-001',
    type: 'VIDEO',
    organization: 'org-example-001',
    created: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    discovered: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    title: 'Example Propaganda Video',
    language: 'English',
    themes: ['Martyrdom', 'Revenge'],
    narrative: {
      primaryMessage: 'Call to action against perceived enemies',
      themes: [
        {
          type: 'MARTYRDOM',
          description: 'Glorification of suicide attacks',
          prominence: 'HIGH'
        }
      ],
      targets: ['Western countries'],
      emotionalAppeal: [
        {
          type: 'ANGER',
          intensity: 0.9,
          target: 'Western governments'
        }
      ],
      frames: ['Us vs Them', 'Defensive jihad'],
      grievances: ['Military interventions', 'Occupation'],
      callToAction: 'Join the fight'
    },
    distribution: {
      platforms: [
        {
          platform: 'YouTube',
          posted: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          views: 50000,
          shares: 1000,
          active: false,
          removed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)
        }
      ],
      networks: [],
      reach: 50000,
      engagement: {
        views: 50000,
        likes: 2000,
        shares: 1000,
        comments: 500,
        reactions: {}
      },
      viralityScore: 0.6
    },
    impact: {
      reach: 50000,
      influence: 0.7,
      recruitment: 5
    },
    removed: true
  });

  // Assess effectiveness
  const effectiveness = await analyzer.assessEffectiveness('content-001');
  console.log('Propaganda Effectiveness:', effectiveness);

  // Query high-impact content
  const highImpact = await analyzer.identifyHighImpactContent();
  console.log(`Found ${highImpact.length} high-impact propaganda items`);
}

/**
 * Example 7: Integrated Counterterrorism Operation
 */
async function integratedOperation() {
  const ctService = new CounterterrorismService();
  const taService = new ThreatAssessmentService();

  // Get comprehensive threat picture
  const threatPicture = await ctService.getThreatPicture();
  console.log('Threat Picture:', JSON.stringify(threatPicture, null, 2));

  // Identify interdiction opportunities
  const opportunities = await ctService.identifyInterdictionOpportunities();
  console.log(`Found ${opportunities.length} interdiction opportunities`);

  for (const opportunity of opportunities) {
    console.log(`
Opportunity: ${opportunity.opportunity}
Target: ${opportunity.targetId}
Probability: ${(opportunity.probability * 100).toFixed(1)}%
Impact: ${(opportunity.impact * 100).toFixed(1)}%
Recommendation: ${opportunity.recommendation}
    `);
  }

  // Identify disruption targets
  const targets = await ctService.identifyDisruptionTargets();
  console.log(`Found ${targets.length} disruption targets`);

  // Calculate attack probabilities
  const probability = await taService.calculateAttackProbability('target-001');
  console.log('Attack Probability:', JSON.stringify(probability, null, 2));

  // Generate risk matrix
  const matrix = await taService.generateRiskMatrix();
  console.log(`Risk Matrix: ${matrix.scenarios.length} scenarios identified`);

  // Display top risks
  console.log('\nTop Risk Scenarios:');
  matrix.scenarios.slice(0, 5).forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.description}`);
    console.log(`   Risk Score: ${(scenario.riskScore * 100).toFixed(1)}%`);
    console.log(`   Priority: ${scenario.priority}`);
    console.log(`   Mitigations: ${scenario.mitigations.length}`);
  });

  // Ensure legal compliance
  await ctService.ensureLegalCompliance({
    operationId: 'op-example-001',
    jurisdiction: 'United States',
    legalBasis: ['USA PATRIOT Act Section 215', 'FISA'],
    authorizations: [
      {
        authority: 'FISA Court',
        type: 'Electronic Surveillance',
        granted: new Date(),
        conditions: ['Minimization procedures', 'Reporting requirements']
      }
    ],
    humanRights: {
      conducted: true,
      date: new Date(),
      findings: ['No violations identified'],
      compliance: true,
      mitigations: []
    },
    oversight: [
      {
        date: new Date(),
        body: 'Congressional Intelligence Committee',
        type: 'Periodic Review',
        findings: ['Operation within legal bounds'],
        recommendations: []
      }
    ]
  });

  console.log('Legal compliance verified');
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.log('=== Counterterrorism Intelligence Platform Examples ===\n');

  try {
    console.log('Example 1: Track New Organization');
    await trackNewOrganization();
    console.log('\n---\n');

    console.log('Example 2: Detect Attack Plot');
    await detectAttackPlot();
    console.log('\n---\n');

    console.log('Example 3: Monitor Radicalization');
    await monitorRadicalization();
    console.log('\n---\n');

    console.log('Example 4: Track Foreign Fighter');
    await trackForeignFighter();
    console.log('\n---\n');

    console.log('Example 5: Track Financing');
    await trackFinancing();
    console.log('\n---\n');

    console.log('Example 6: Analyze Propaganda');
    await analyzePropaganda();
    console.log('\n---\n');

    console.log('Example 7: Integrated Operation');
    await integratedOperation();
    console.log('\n---\n');

    console.log('All examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  trackNewOrganization,
  detectAttackPlot,
  monitorRadicalization,
  trackForeignFighter,
  trackFinancing,
  analyzePropaganda,
  integratedOperation,
  runAllExamples
};
