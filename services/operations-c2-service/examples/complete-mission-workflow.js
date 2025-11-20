/**
 * Complete Mission Workflow Example
 *
 * Demonstrates a full intelligence operation from planning to completion,
 * integrating all C2 platform capabilities.
 */

import OperationsC2Service from '../src/index.js';

/**
 * Execute a complete mission workflow
 */
async function runCompleteMissionWorkflow() {
  console.log('\n=== Intelligence Operations C2 Platform - Complete Mission Workflow ===\n');

  const service = OperationsC2Service;

  // =========================================================================
  // PHASE 1: Mission Planning
  // =========================================================================
  console.log('PHASE 1: Mission Planning\n');

  const missionData = {
    id: 'mission-example-001',
    operationId: 'op-thunderstrike',
    name: 'Operation Thunderstrike',
    codeName: 'THUNDERSTRIKE',
    classification: 'SECRET',
    type: 'MULTI_DISCIPLINE',
    objective: 'Locate and assess adversary command infrastructure in target region',
    background: 'Intelligence indicates presence of command facilities requiring assessment',
    priority: 'HIGH',
    status: 'PLANNING',

    planningTeam: [
      {
        userId: 'analyst-001',
        role: 'Mission Commander',
        clearanceLevel: 'TOP_SECRET'
      },
      {
        userId: 'analyst-002',
        role: 'Intelligence Officer',
        clearanceLevel: 'SECRET'
      },
      {
        userId: 'analyst-003',
        role: 'Collection Manager',
        clearanceLevel: 'SECRET'
      }
    ],

    requirements: [
      {
        id: 'req-001',
        operationId: 'op-thunderstrike',
        priority: 'CRITICAL',
        type: 'ESSENTIAL_ELEMENT',
        description: 'Identify location of command facilities',
        rationale: 'Critical for mission success',
        targetLocation: {
          lat: 35.123,
          lon: 44.567,
          radius: 10,
          name: 'Target Area Bravo'
        },
        deadline: '2025-02-15T00:00:00Z',
        status: 'ACTIVE',
        collectionGuidance: 'Multi-INT collection required: IMINT, SIGINT, HUMINT',
        disseminationRestrictions: ['NOFORN'],
        relatedRequirements: [],
        metadata: {}
      },
      {
        id: 'req-002',
        operationId: 'op-thunderstrike',
        priority: 'HIGH',
        type: 'PRIORITY_REQUIREMENT',
        description: 'Assess command facility capabilities',
        rationale: 'Understand adversary command structure',
        targetLocation: {
          lat: 35.123,
          lon: 44.567,
          radius: 10,
          name: 'Target Area Bravo'
        },
        deadline: '2025-02-20T00:00:00Z',
        status: 'ACTIVE',
        collectionGuidance: 'Technical intelligence and pattern of life analysis',
        disseminationRestrictions: [],
        relatedRequirements: ['req-001'],
        metadata: {}
      }
    ],

    collectionPlan: {
      assets: ['sat-001', 'uav-001'],
      platforms: ['SATELLITE_LEO', 'UAV_STRATEGIC'],
      sensors: ['ELECTRO_OPTICAL', 'SAR', 'SIGINT'],
      timelines: [],
      deconflictions: []
    },

    resources: {
      personnel: [
        {
          userId: 'analyst-001',
          role: 'Mission Commander',
          allocation: 100
        },
        {
          userId: 'analyst-002',
          role: 'Intelligence Analyst',
          allocation: 75
        }
      ],
      budget: {
        allocated: 500000,
        spent: 0,
        currency: 'USD'
      },
      equipment: []
    },

    timeline: {
      startDate: '2025-02-01T00:00:00Z',
      endDate: '2025-02-28T00:00:00Z',
      milestones: [
        {
          id: 'milestone-1',
          name: 'Planning Complete',
          description: 'Mission planning and approval',
          dueDate: '2025-02-05T00:00:00Z',
          completed: false,
          dependencies: []
        },
        {
          id: 'milestone-2',
          name: 'Collection Phase',
          description: 'Execute collection operations',
          dueDate: '2025-02-15T00:00:00Z',
          completed: false,
          dependencies: ['milestone-1']
        },
        {
          id: 'milestone-3',
          name: 'Analysis Complete',
          description: 'Complete intelligence analysis',
          dueDate: '2025-02-25T00:00:00Z',
          completed: false,
          dependencies: ['milestone-2']
        }
      ]
    },

    risks: [
      {
        id: 'risk-001',
        category: 'OPERATIONAL',
        description: 'Weather may impact collection operations',
        likelihood: 'MEDIUM',
        impact: 'MEDIUM',
        mitigation: 'Schedule alternate collection windows',
        contingency: 'Extend mission timeline if needed',
        owner: 'analyst-003',
        status: 'IDENTIFIED'
      },
      {
        id: 'risk-002',
        category: 'SECURITY',
        description: 'Asset detection by adversary',
        likelihood: 'LOW',
        impact: 'HIGH',
        mitigation: 'Use standoff collection methods',
        contingency: 'Abort collection if detection imminent',
        owner: 'analyst-001',
        status: 'MITIGATED'
      }
    ],

    compliance: {
      legalAuthority: ['NSPM-13', 'EO 12333'],
      policyReferences: ['DoD 5240.1-R'],
      approvals: [],
      restrictions: ['NOFORN on sensitive methods'],
      reviewDates: ['2025-02-01T00:00:00Z']
    },

    opsec: {
      criticalInformation: ['Collection times', 'Asset capabilities'],
      indicators: ['Unusual satellite tasking', 'UAV deployments'],
      threats: ['Adversary intelligence services'],
      vulnerabilities: ['Predictable collection patterns'],
      countermeasures: [
        {
          measure: 'Vary collection schedules',
          implementation: 'Randomize collection windows',
          responsible: 'analyst-003'
        }
      ]
    },

    contingencies: [
      {
        scenario: 'Asset failure',
        triggerConditions: ['Asset offline', 'Collection gap'],
        response: 'Task backup asset',
        resources: ['sat-002'],
        decisionAuthority: 'analyst-001'
      }
    ],

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'analyst-001',
    metadata: {}
  };

  console.log('Creating mission plan...');
  const { mission, cop, workflow } = service.createOperation(missionData);
  console.log(`✓ Mission created: ${mission.id}`);
  console.log(`✓ COP initialized: ${cop.id}`);
  console.log(`✓ Workflow created: ${workflow.id}`);

  // =========================================================================
  // PHASE 2: Collection Coordination
  // =========================================================================
  console.log('\nPHASE 2: Collection Coordination\n');

  console.log('Coordinating collection assets...');
  const tasks = service.coordinateCollection(mission.id, mission.requirements);
  console.log(`✓ Created ${tasks.length} collection tasks`);

  // Simulate collection asset registration
  console.log('\nRegistering collection assets...');
  const satelliteAsset = {
    id: 'sat-001',
    name: 'Keyhole-17',
    type: 'SATELLITE',
    platform: 'SATELLITE_LEO',
    status: 'AVAILABLE',
    capabilities: {
      sensors: [
        {
          id: 'eo-sensor',
          type: 'ELECTRO_OPTICAL',
          resolution: '0.3m',
          range: 800,
          fieldOfView: 1.5,
          status: 'OPERATIONAL'
        },
        {
          id: 'sar-sensor',
          type: 'SAR',
          resolution: '1m',
          status: 'OPERATIONAL'
        }
      ],
      coverage: {
        type: 'AREA',
        maxArea: 2000,
        revisitRate: 12,
        persistence: false
      },
      communications: {
        dataRate: 150,
        latency: 30,
        reliability: 98
      }
    },
    position: {
      lat: 0,
      lon: 0,
      altitude: 600000,
      speed: 27000,
      lastUpdate: new Date().toISOString()
    },
    operational: {
      availability: 95,
      utilizationRate: 60,
      lastMaintenance: '2025-01-01T00:00:00Z',
      nextMaintenance: '2025-03-01T00:00:00Z',
      operatingHours: 8760,
      maxOperatingHours: 87600
    },
    security: {
      classification: 'TOP_SECRET_SCI',
      caveats: ['TALENT_KEYHOLE'],
      authorizedUsers: ['analyst-001', 'analyst-002', 'analyst-003'],
      foreignDisclosure: false
    },
    assignment: {
      currentMission: mission.id,
      assignedTo: 'analyst-003',
      priority: 'HIGH',
      availableFrom: new Date().toISOString()
    },
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log(`✓ Satellite asset registered: ${satelliteAsset.name}`);

  // =========================================================================
  // PHASE 3: Intelligence Processing and Fusion
  // =========================================================================
  console.log('\nPHASE 3: Intelligence Processing and Fusion\n');

  // Simulate receiving intelligence reports
  const reports = [
    {
      id: 'report-imint-001',
      discipline: 'IMINT',
      source: {
        id: 'sat-001',
        type: 'SATELLITE',
        reliability: 'A',
        credibility: '1'
      },
      title: 'Facility Identification - Target Area Bravo',
      summary: 'Large facility complex with command characteristics identified',
      details: 'Satellite imagery reveals 100x50m structure with communications arrays',
      classification: 'SECRET',
      caveats: ['TALENT_KEYHOLE'],
      disseminationControls: ['NOFORN'],
      reportDate: new Date().toISOString(),
      informationDate: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      location: {
        lat: 35.123,
        lon: 44.567,
        accuracy: 3,
        name: 'Target Area Bravo'
      },
      entities: [
        {
          id: 'facility-001',
          type: 'FACILITY',
          name: 'Command Facility Alpha',
          confidence: 90
        }
      ],
      collectionMethod: 'SATELLITE_IMAGERY',
      processingLevel: 'ANALYZED',
      confidence: 92,
      priority: 'PRIORITY',
      relatedReports: [],
      contradicts: [],
      confirms: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'report-sigint-001',
      discipline: 'SIGINT',
      source: {
        id: 'ground-station-001',
        type: 'GROUND_STATION',
        reliability: 'B',
        credibility: '2'
      },
      title: 'Command Communications Detected',
      summary: 'Military command frequency activity detected in target area',
      details: 'Intercept of VHF communications consistent with command operations',
      classification: 'TOP_SECRET',
      caveats: ['SI'],
      disseminationControls: ['NOFORN'],
      reportDate: new Date().toISOString(),
      informationDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      location: {
        lat: 35.124,
        lon: 44.568,
        accuracy: 50,
        name: 'Target Area Bravo'
      },
      entities: [
        {
          id: 'comms-node-001',
          type: 'FACILITY',
          name: 'Communications Node',
          confidence: 85
        }
      ],
      collectionMethod: 'SIGINT',
      processingLevel: 'ANALYZED',
      confidence: 87,
      priority: 'PRIORITY',
      relatedReports: ['report-imint-001'],
      contradicts: [],
      confirms: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  console.log('Processing intelligence reports...');
  const { correlations, fusedProduct } = service.processIntelligence(reports);
  console.log(`✓ Processed ${reports.length} intelligence reports`);
  console.log(`✓ Found ${correlations.length} correlations`);
  if (fusedProduct) {
    console.log(`✓ Created fused product: ${fusedProduct.id}`);
    console.log(`  Confidence: ${fusedProduct.assessment.confidence}%`);
  }

  // =========================================================================
  // PHASE 4: Targeting
  // =========================================================================
  console.log('\nPHASE 4: Targeting\n');

  const targetData = {
    id: 'target-001',
    name: 'Command Facility Alpha',
    category: 'HIGH_VALUE',
    type: 'COMMAND_CONTROL',
    status: 'NOMINATED',
    location: {
      lat: 35.123,
      lon: 44.567,
      altitude: 500,
      accuracy: 3,
      coordinateSystem: 'WGS84',
      mgrs: '38SMB1234567890'
    },
    description: 'Primary adversary command facility for regional operations',
    function: 'Command and control of military operations in sector',
    significance: 'CRITICAL',
    intelligence: {
      lastObserved: new Date().toISOString(),
      observationSource: 'sat-001',
      confidence: 92,
      activityLevel: 'HIGH',
      occupancy: {
        estimated: 50,
        minimum: 30,
        maximum: 80
      }
    },
    characteristics: {
      dimensions: {
        length: 100,
        width: 50,
        height: 15
      },
      construction: 'Reinforced concrete',
      hardening: 'MODERATE',
      vulnerabilities: [
        'Communications arrays on roof',
        'Vehicle entrance on south side',
        'Generator facility adjacent'
      ]
    },
    collateral: {
      civilianProximity: 800,
      civilianEstimate: 5,
      culturalSites: [],
      environmentalConcerns: [],
      restrictionLevel: 'LOW'
    },
    patternOfLife: {
      observations: [
        {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          activity: 'High personnel activity',
          personnel: 50,
          vehicles: 10
        }
      ],
      peakActivity: '0800-1700 local time',
      minActivity: '2200-0600 local time',
      patterns: ['Shift changes at 0800 and 1800', 'Supply deliveries on Tuesdays']
    },
    weatherConstraints: {
      cloudCeiling: 1000,
      visibility: 5,
      windSpeed: 50,
      precipitation: 'LIGHT_ONLY'
    },
    priority: 1,
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  console.log('Developing target...');
  const { target, targetPackage, collateral } = service.supportTargeting(targetData);
  console.log(`✓ Target developed: ${target.name}`);
  console.log(`✓ Target package created: ${targetPackage.id}`);
  console.log(`✓ Collateral risk assessed: ${collateral.civilianRisk}`);
  console.log(`  Estimated civilian casualties: ${collateral.estimated}`);

  // =========================================================================
  // PHASE 5: Decision Support
  // =========================================================================
  console.log('\nPHASE 5: Decision Support\n');

  console.log('Generating decision support products...');
  const { riskAssessment, briefing } = service.generateDecisionProducts(mission.id);
  console.log(`✓ Risk assessment created: ${riskAssessment.id}`);
  console.log(`  Overall risk: ${riskAssessment.overallRisk}`);
  console.log(`✓ Executive briefing generated: ${briefing.id}`);
  console.log(`  Title: ${briefing.title}`);

  // =========================================================================
  // PHASE 6: Mission Completion Summary
  // =========================================================================
  console.log('\nPHASE 6: Mission Summary\n');

  console.log('Mission Status:');
  console.log(`  ID: ${mission.id}`);
  console.log(`  Name: ${mission.name}`);
  console.log(`  Status: ${mission.status}`);
  console.log(`  Priority: ${mission.priority}`);
  console.log(`  Classification: ${mission.classification}`);

  console.log('\nCollection Summary:');
  console.log(`  Tasks Created: ${tasks.length}`);
  console.log(`  Assets Employed: ${mission.collectionPlan.assets.length}`);

  console.log('\nIntelligence Summary:');
  console.log(`  Reports Processed: ${reports.length}`);
  console.log(`  Correlations Found: ${correlations.length}`);
  console.log(`  Entities Identified: ${reports.reduce((sum, r) => sum + r.entities.length, 0)}`);

  console.log('\nTargeting Summary:');
  console.log(`  Targets Developed: 1`);
  console.log(`  Target Packages: 1`);
  console.log(`  Collateral Risk: ${collateral.civilianRisk}`);

  console.log('\nDecision Products:');
  console.log(`  Risk Assessments: 1`);
  console.log(`  Executive Briefings: 1`);

  console.log('\n=== Mission Workflow Complete ===\n');

  return {
    mission,
    cop,
    workflow,
    tasks,
    reports,
    correlations,
    fusedProduct,
    target,
    targetPackage,
    collateral,
    riskAssessment,
    briefing
  };
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCompleteMissionWorkflow()
    .then(result => {
      console.log('\nWorkflow executed successfully!');
      console.log('\nFinal Status:');
      console.log(JSON.stringify({
        missionId: result.mission.id,
        status: result.mission.status,
        tasksCreated: result.tasks.length,
        reportsProcessed: result.reports.length,
        targetsDeveloped: 1
      }, null, 2));
    })
    .catch(error => {
      console.error('\nError executing workflow:', error);
      process.exit(1);
    });
}

export default runCompleteMissionWorkflow;
