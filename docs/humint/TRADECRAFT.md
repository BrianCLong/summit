# HUMINT Tradecraft Guide

## Overview

This guide provides operational guidance on tradecraft, techniques, and best practices for HUMINT operations using the HUMINT Management Platform.

## Table of Contents

1. [Source Recruitment](#source-recruitment)
2. [Source Handling](#source-handling)
3. [Meeting Techniques](#meeting-techniques)
4. [Surveillance Detection](#surveillance-detection)
5. [Secure Communications](#secure-communications)
6. [Operational Security](#operational-security)
7. [Intelligence Collection](#intelligence-collection)
8. [Emergency Procedures](#emergency-procedures)

## Source Recruitment

### Recruitment Cycle

1. **Spotting** - Identify potential sources
2. **Assessment** - Evaluate access, motivation, and risk
3. **Development** - Build relationship and trust
4. **Recruitment** - Make the pitch
5. **Handling** - Ongoing management

### MICE Framework

Understand source motivation using MICE:

- **Money** - Financial incentives
- **Ideology** - Belief system alignment
- **Coercion** - Pressure or blackmail (avoid)
- **Ego** - Recognition and importance

### Best Practices

```typescript
// Assess motivation carefully
const motivationAssessment = {
  primary: 'FINANCIAL',
  secondary: 'EGO',
  strength: 'High',
  consistency: 'Demonstrated over 6 month development',
  risks: 'May seek higher payment from competitors',
  mitigations: 'Regular reviews, performance-based compensation'
};

// Document thoroughly
const recruitmentRecord = {
  developmentPeriod: '6 months',
  pitchDate: new Date(),
  initialResponse: 'Positive, willing to provide information',
  concerns: ['Family safety', 'Legal implications'],
  assurances: ['Protection measures', 'Legal coverage'],
  expectedAccess: 'Senior-level organizational information',
  compensationAgreement: '$5,000 monthly retainer + performance bonuses'
};
```

### Red Flags

- Volunteering without development
- Too eager or knowledgeable about intelligence operations
- Inconsistent background or story
- Unusual financial situation changes
- Recent security incidents in their life
- Lack of verifiable information

### Initial Vetting

```typescript
// Comprehensive vetting checklist
const vettingChecklist = {
  backgroundCheck: {
    status: 'COMPLETED',
    findings: 'No criminal record, no adverse information',
    verifications: ['Employment', 'Education', 'Residence']
  },
  referenceChecks: {
    personal: 2,
    professional: 3,
    allPositive: true
  },
  financialReview: {
    status: 'COMPLETED',
    concerns: 'None',
    debtLevel: 'Manageable'
  },
  polygraph: {
    scheduled: true,
    date: new Date('2025-02-15'),
    questions: [
      'Have you ever been an intelligence agent for another service?',
      'Are you currently working for any foreign government?',
      'Have you concealed any information in your background?'
    ]
  }
};
```

## Source Handling

### Handler-Source Relationship

The relationship is built on:
- **Trust** - Demonstrated through reliability and protection
- **Respect** - Professional, non-judgmental interaction
- **Value** - Source feels their contribution matters
- **Security** - Source feels safe and protected

### Meeting Frequency

Tailor to operational needs:

```typescript
const meetingSchedule = {
  newSource: 'Weekly for first month, then bi-weekly',
  established: 'Monthly minimum, more as needed',
  highValue: 'As required, with 48hr notice capability',
  maintenance: 'Quarterly for inactive sources'
};

// Track contact rhythm
const contactPattern = {
  frequency: 'Bi-weekly',
  lastContact: new Date('2025-01-15'),
  nextScheduled: new Date('2025-01-29'),
  typicalDay: 'Tuesday',
  typicalTime: '14:00',
  duration: '90 minutes'
};
```

### Motivation Maintenance

```typescript
// Regular motivation assessment
const motivationReview = {
  date: new Date(),
  primaryMotivation: 'FINANCIAL',
  motivationStrength: 8, // 1-10 scale
  changesSince LastReview: 'None',
  satisfactionLevel: 9, // 1-10 scale
  concerns: [],
  reinforcementNeeded: [
    'Acknowledge value of intelligence provided',
    'Timely compensation',
    'Recognition of personal risk taken'
  ],
  redFlags: []
};

// Adjust handling approach
if (motivationReview.motivationStrength < 5) {
  // Increase meeting frequency
  // Review compensation
  // Address concerns directly
  // Consider termination if irrecoverable
}
```

### Performance Management

```typescript
// Track and reward performance
const performanceMetrics = {
  period: 'Q4 2024',
  meetings: 6,
  intelligenceItems: 15,
  highValue: 8,
  mediumValue: 5,
  lowValue: 2,
  timeliness: 'Excellent',
  accuracy: 'Very High - 90% confirmed',
  cooperation: 9,
  productivity Score: 87,
  bonus: 5000,
  feedback: 'Outstanding performance. Intelligence directly supported two major operations.'
};
```

## Meeting Techniques

### Pre-Meeting Preparation

```typescript
const meetingPrep = {
  // Intelligence Requirements
  pirs: [
    'Organizational changes in target',
    'New security measures',
    'Upcoming events or operations'
  ],

  // Questions prepared
  questions: [
    {
      topic: 'Leadership',
      question: 'Have there been any changes in senior leadership?',
      followUps: [
        'What is their background?',
        'What are their priorities?',
        'Who are their key relationships?'
      ]
    }
  ],

  // Materials needed
  materials: [
    'Photos for identification',
    'Map for location marking',
    'Technical specifications for clarification'
  ],

  // Security measures
  security: {
    sdRoute: 'Route Charlie',
    authentication: 'WHISKEY-7',
    duress: 'TANGO-3',
    alternateLocation: 'Location Bravo',
    emergencyExfil: 'Available on request'
  }
};
```

### Meeting Structure

Optimal 90-minute meeting structure:

1. **Greeting & Security Check** (5 min)
   - Authentication code exchange
   - Check for surveillance
   - Assess source demeanor

2. **Rapport Building** (10 min)
   - Personal check-in
   - Build/maintain trust
   - Assess motivation state

3. **Intelligence Collection** (50 min)
   - Structured questions
   - Elicitation techniques
   - Document responses

4. **Clarification & Validation** (15 min)
   - Review information
   - Fill gaps
   - Verify understanding

5. **Tasking** (5 min)
   - Next collection requirements
   - Specific information needed
   - Timeline expectations

6. **Administrative** (5 min)
   - Next meeting
   - Compensation
   - Security review

```typescript
const meetingExecution = {
  phase: 'INTELLIGENCE_COLLECTION',
  elapsed: 35,
  notesCount: 12,
  securityIncidents: [],
  sourceCooperation: 'Excellent',
  intelligenceQuality: 'High',
  nextPhase: 'CLARIFICATION',
  onTrack: true
};
```

### Elicitation Techniques

```typescript
const elicitationTechniques = {
  // Open-ended questions
  openEnded: [
    'Tell me about...',
    'How does that work?',
    'What happened next?',
    'Can you describe...'
  ],

  // Flattery
  flattery: [
    'You would know better than anyone...',
    'With your experience...',
    'Given your position...'
  ],

  // Criticism/Provocation (use carefully)
  provocation: [
    'I heard that system doesn\'t work well',
    'Some say that approach is outdated'
  ],

  // Naïveté
  naivete: [
    'I don\'t understand how that works',
    'Could you explain that to me?',
    'That seems complicated'
  ],

  // Bracketing
  bracketing: [
    'I heard it costs between $10-50 million',
    'There are probably 50-200 people involved'
  ]
};

// Apply appropriately based on source and topic
```

### Note-Taking

```typescript
const noteProtocol = {
  during: {
    method: 'Discrete notes on phone or notebook',
    detail: 'Key points only during meeting',
    security: 'Coded or abbreviated'
  },
  after: {
    timing: 'Immediately after meeting, within 1 hour',
    method: 'Detailed reconstruction',
    format: 'Structured debrief report',
    secure: true,
    backup: true
  },
  retention: {
    raw Notes: '30 days',
    debriefReport: 'Permanent',
    recordings: 'Destroyed after transcription (if authorized)'
  }
};

// Example debrief notes structure
const debriefNotes = {
  metadata: {
    date: new Date(),
    duration: 90,
    location: 'Safe House Alpha',
    sourceCodename: 'NIGHTHAWK'
  },
  topicsCovered: [
    {
      topic: 'Organizational Changes',
      summary: 'Major restructuring announced...',
      details: '...',
      credibility: 'High - source present at announcement',
      priority: 'HIGH'
    }
  ],
  sourceAssessment: {
    cooperation: 9,
    demeanor: 'Confident and forthcoming',
    motivation: 'Consistent',
    concerns: 'None expressed'
  },
  security: {
    surveillance: 'None detected',
    incidents: 'None',
    sourceComfort: 'High'
  },
  nextSteps: [
    'Follow up on restructuring details',
    'Request org chart',
    'Next meeting in 2 weeks'
  ]
};
```

## Surveillance Detection

### SD Route Planning

```typescript
const sdRoutePlanning = {
  objectives: [
    'Detect surveillance',
    'Identify surveillance team members',
    'Lose surveillance if detected',
    'Arrive at meeting clean'
  ],

  characteristics: {
    duration: '30-60 minutes',
    complexity: 'Varies by threat level',
    chokPoints: 'Multiple',
    observationPoints: 'Strategic placement',
    alternatives: 'Built in',
    emergency: 'Abort procedures defined'
  },

  techniques: [
    'Multiple mode transportation changes',
    'Shops with multiple exits',
    'Reflective surfaces (windows, mirrors)',
    'Sudden direction changes',
    'Timed surveillance detection',
    'Counter-surveillance positioning'
  ]
};

// Example SD Route
const exampleRoute = {
  name: 'Route Delta',
  threat: 'MEDIUM',
  startPoint: 'Subway Station A',

  waypoints: [
    {
      sequence: 1,
      location: 'Subway Station A',
      action: 'Exit and walk north',
      observation: 'Check for immediate follows',
      timing: '0 min'
    },
    {
      sequence: 2,
      location: 'Department Store',
      action: 'Enter, browse, exit different door',
      observation: 'Watch for team coverage',
      timing: '10 min'
    },
    {
      sequence: 3,
      location: 'Coffee Shop',
      action: 'Sit with view of entrance, observe',
      observation: 'Identify potential surveillance',
      timing: '20 min'
    },
    {
      sequence: 4,
      location: 'Taxi Stand',
      action: 'Take taxi, note any follows',
      observation: 'Vehicle surveillance check',
      timing: '35 min'
    },
    {
      sequence: 5,
      location: 'Final Destination',
      action: 'Enter meeting location',
      observation: 'Final clearance check',
      timing: '45 min'
    }
  ],

  abort: {
    triggers: [
      'Confirmed surveillance',
      'Source compromise indicators',
      'Emergency signal from source'
    ],
    procedure: 'Proceed to alternate location, signal source via alternate channel'
  }
};
```

### Surveillance Indicators

```typescript
const surveillanceIndicators = {
  physical: [
    'Same person at multiple locations',
    'Person showing unusual interest',
    'Poor cover for action',
    'Communication (phone, radio, signals)',
    'Team formations',
    'Vehicle patterns'
  ],

  technical: [
    'Unusual phone behavior',
    'Unexpected system access',
    'Network anomalies',
    'Device tampering indicators'
  ],

  environmental: [
    'Unusual questions from acquaintances',
    'Unexpected interest in activities',
    'Changes in source behavior',
    'Security inquiries at source workplace'
  ]
};

// Response to confirmed surveillance
const surveillanceResponse = {
  immediate: [
    'Abort meeting if not already conducted',
    'Use evasion techniques',
    'Signal source via alternate channel',
    'Report to operations immediately'
  ],

  followUp: [
    'File surveillance report',
    'Assess compromise risk',
    'Review source security',
    'Adjust operational protocols',
    'Consider operational pause'
  ]
};
```

### Counter-Surveillance

```typescript
const counterSurveillance = {
  definition: 'Deliberate actions to detect surveillance',

  techniques: {
    visual: [
      'Direct observation',
      'Use of reflections',
      'Partner observation',
      'Photography'
    ],

    movement: [
      'Stops and turns',
      'Reversals',
      'Choke points',
      'Speed variations'
    ],

    technical: [
      'Electronic detection',
      'Signal analysis',
      'Camera systems'
    ]
  },

  training: 'Handlers must complete CS training annually'
};
```

## Secure Communications

### Communication Methods Selection

```typescript
const commMethodSelection = {
  factors: [
    'Security classification',
    'Urgency',
    'Source capability',
    'Threat environment',
    'Available resources'
  ],

  methods: {
    encryptedMessage: {
      security: 'HIGH',
      speed: 'FAST',
      complexity: 'MEDIUM',
      useCase: 'Routine communications'
    },
    deadDrop: {
      security: 'VERY HIGH',
      speed: 'SLOW',
      complexity: 'HIGH',
      useCase: 'High-threat environments'
    },
    physicalMeeting: {
      security: 'VARIES',
      speed: 'SLOW',
      complexity: 'HIGH',
      useCase: 'Complex information exchange'
    },
    secureVoice: {
      security: 'HIGH',
      speed: 'FAST',
      complexity: 'LOW',
      useCase: 'Urgent coordination'
    }
  }
};
```

### Authentication Protocols

```typescript
// Authentication code structure
const authCodes = {
  primary: {
    code: 'ALPHA-BRAVO-7',
    usage: 'Normal communications',
    rotation: 'Every 90 days',
    method: 'Memorized, never written'
  },

  backup: {
    code: 'CHARLIE-DELTA-3',
    usage: 'If primary compromised',
    rotation: 'Every 90 days',
    method: 'Memorized, never written'
  },

  duress: {
    code: 'ECHO-FOXTROT-9',
    usage: 'Source under duress/compromised',
    response: 'IMMEDIATE - Abort contact, activate emergency protocol',
    rotation: 'Every 90 days',
    practice: 'Never in non-duress situations'
  }
};

// Challenge-response for high-security
const challengeResponse = {
  handler: 'The weather is nice today',
  sourceResponse: 'Yes, but rain is expected',
  incorrect: 'Abort immediately',
  duressResponse: 'I hope it stays sunny' // Indicates duress
};
```

### Message Security

```typescript
const messageSecurityProtocol = {
  composition: {
    language: 'Clear but non-specific',
    names: 'Never use real names',
    locations: 'Use code designations',
    operations: 'Oblique references only',
    classification: 'Mark appropriately'
  },

  transmission: {
    encryption: 'AES-256 minimum',
    authentication: 'Always verify',
    timing: 'Vary patterns',
    retention: 'Auto-delete after read for high-security',
    receipts: 'Confirm but non-specific'
  },

  storage: {
    encrypted: true,
    access: 'Compartmented',
    backup: 'Secure system only',
    deletion: 'Secure wipe'
  }
};

// Example secure message
const secureMessage = {
  to: 'NIGHTHAWK',
  from: 'HANDLER-7',
  auth: 'ALPHA-BRAVO-7',
  content: 'Delta location, Tuesday, 1400. Topics discussed previously.',
  // Clear meaning: Safe house Delta, Tuesday 2PM, PIRs from last meeting
  encryption: 'AES-256',
  expiresAfter: '24 hours',
  requiresReceipt: true
};
```

### Dead Drop Procedures

```typescript
const deadDropProcedure = {
  selection: {
    criteria: [
      'Public but not heavily trafficked',
      'Natural reason to be there',
      'Good concealment',
      'Surveillance detection opportunities',
      'Multiple approach/exit routes'
    ],
    avoid: [
      'High-security areas',
      'Surveillance cameras',
      'Choke points',
      'Predictable patterns'
    ]
  },

  execution: {
    signal: {
      loaded: 'Blue chalk mark on specified location',
      cleared: 'Remove chalk mark',
      danger: 'Red chalk mark',
      location: 'Pre-defined signal site, different from drop site'
    },

    loading: {
      timing: 'Varied, non-pattern',
      surveillance: 'Extensive SD required',
      package: 'Weatherproof, innocent if found',
      placement: 'Secure, retrievable',
      duration: 'Minimize time at site'
    },

    retrieval: {
      checkSignal: 'Verify loaded signal first',
      surveillance: 'Extensive SD required',
      timing: 'Within agreed window',
      clearSignal: 'After successful retrieval',
      package: 'Secure immediately'
    }
  },

  emergency: {
    compromise: 'Abort, use alternate site',
    surveillance: 'Abort, notify via alternate channel',
    danger Signal: 'Abort all operations, emergency protocol'
  }
};

// Example dead drop
const deadDropExample = {
  code: 'DROP-ALPHA',
  location: {
    general: 'Central Park',
    specific: 'Behind third bench from south entrance, under rock',
    coordinates: { lat: 40.7829, lon: -73.9654 }
  },
  signal: {
    location: 'Newspaper box at north entrance',
    loaded: 'Blue chalk mark on lower right',
    cleared: 'Remove chalk',
    danger: 'Red chalk mark'
  },
  schedule: {
    checkWindow: 'Daily 08:00-09:00',
    loadWindow: 'Evenings, varied times',
    retrieveWindow: 'Within 24 hours of signal'
  },
  package: {
    type: 'Waterproof bag',
    size: 'Fits in palm',
    innocent: 'Could be geocache if found'
  }
};
```

## Operational Security

### Cover for Status

```typescript
const coverForStatus = {
  natural: {
    explanation: 'Your real reason for being there',
    examples: [
      'Business meeting',
      'Shopping',
      'Tourist',
      'Resident routine'
    ],
    best: 'True cover with slight modification'
  },

  artificial: {
    explanation: 'Fabricated reason',
    requirements: [
      'Verifiable if checked',
      'Appropriate for location/time',
      'Sustainable under questioning',
      'Supported by documentation'
    ],
    examples: [
      'Consultant visiting clients',
      'Photographer for hobby',
      'Researcher gathering information'
    ]
  },

  documentation: {
    business: ['Cards', 'Portfolio', 'Laptop'],
    tourist: ['Camera', 'Guidebook', 'Map'],
    shopper: ['Bags from stores', 'Shopping list'],
    allCases: ['Appropriate clothing', 'Expected items', 'Local knowledge']
  }
};
```

### Cover Story Management

```typescript
// Comprehensive cover story maintenance
const coverMaintenance = {
  review: {
    frequency: 'Every 90 days minimum',
    triggers: [
      'Source life changes',
      'Security incidents',
      'Extended operations',
      'Annual review'
    ]
  },

  verification: {
    employment: {
      check: 'Call company, verify position',
      frequency: 'Quarterly',
      backup: 'Have verifiable business cards, website presence'
    },
    residence: {
      check: 'Verify address, utility bills',
      frequency: 'Quarterly',
      backup: 'Mail delivery, neighbor awareness'
    },
    social: {
      check: 'Active social media presence',
      frequency: 'Weekly updates',
      backup: 'Friends/family coordination'
    },
    financial: {
      check: 'Bank accounts, credit cards in cover name',
      frequency: 'Monthly',
      backup: 'Genuine transaction history'
    }
  },

  vulnerabilities: {
    gaps: 'Unexplained time periods',
    inconsistencies: 'Conflicting information',
    verification: 'Cannot be confirmed',
    patterns: 'Predictable or unusual',
    exposure: 'Known to too many people'
  },

  updates: {
    document: 'All changes immediately',
    brief: 'Source on updates',
    test: 'Practice new elements',
    verify: 'Ensure supports are in place'
  }
};

// Red flags in cover stories
const coverRedFlags = [
  'Recently created social media accounts',
  'No digital footprint',
  'Employment cannot be verified',
  'No friends/family who know cover',
  'Gaps in employment history',
  'Inconsistent details when questioned',
  'No financial history in cover name',
  'Address not verifiable'
];
```

### Compartmentation

```typescript
const compartmentation = {
  principles: {
    needToKnow: 'Only those who need information get it',
    minimumNecessary: 'Provide only what is needed',
    sourceProtection: 'Never reveal source identity without authorization',
    operationalSecurity: 'Each compartment isolated from others'
  },

  implementation: {
    sources: 'Only handler and direct chain know identity',
    handlers: 'Only know own sources',
    intelligence: 'Source identity compartmented from intelligence',
    operations: 'Different operations isolated from each other',
    locations: 'Safe houses known to minimum personnel'
  },

  violations: {
    accidental: 'Report immediately, assess damage',
    deliberate: 'Security investigation, disciplinary action',
    compromise: 'Activate damage control procedures'
  }
};

// Compartment access matrix example
const accessMatrix = {
  'SOURCE-NIGHTHAWK-IDENTITY': {
    authorized: ['HANDLER-7', 'OPS-CHIEF', 'SECURITY-OFFICER'],
    operations: 'OPERATION-NIGHTFALL',
    classification: 'TS/SCI',
    needToKnow: 'Justified and documented'
  },
  'SOURCE-NIGHTHAWK-INTELLIGENCE': {
    authorized: ['HANDLER-7', 'ANALYSTS', 'OPS-CHIEF'],
    operations: 'OPERATION-NIGHTFALL',
    classification: 'SECRET',
    needToKnow: 'Intelligence analysis and operational planning'
  }
};
```

### Pattern Management

```typescript
const patternManagement = {
  risks: [
    'Predictable meeting times',
    'Same locations repeatedly',
    'Regular communication schedule',
    'Consistent routes',
    'Identifiable behavior patterns'
  ],

  mitigation: {
    variation: {
      timing: 'Vary meeting times by 2-4 hours',
      days: 'Different days of week',
      locations: 'Rotate through multiple safe sites',
      duration: 'Vary meeting length',
      approach: 'Different routes each time'
    },

    randomization: {
      communications: 'Irregular contact patterns',
      meetings: 'Non-predictable scheduling',
      dead Drops: 'Variable timing and locations',
      surveillance Detection: 'Different routes each time'
    },

    limits: {
      frequency: 'Not so often as to establish pattern',
      locations: 'Rotate, don\'t overuse',
      personnel: 'Vary handler when possible',
      methods: 'Use different communication methods'
    }
  },

  monitoring: {
    review: 'Monthly pattern analysis',
    detection: 'Automated anomaly detection',
    adjustment: 'Modify operations if patterns detected',
    training: 'Regular OPSEC refreshers'
  }
};
```

## Intelligence Collection

### Priority Intelligence Requirements (PIRs)

```typescript
const pirManagement = {
  structure: {
    strategic: 'Long-term national security interests',
    operational: 'Support to ongoing operations',
    tactical: 'Immediate operational needs'
  },

  source Tasking: {
    match: 'Align PIRs with source access and capability',
    priority: 'Focus on highest priority',
    realistic: 'Don\'t over-task',
    specific: 'Clear, answerable questions',
    timeline: 'Define required timeframe'
  },

  example: {
    pir: 'PIR-2025-047',
    priority: 'HIGH',
    question: 'What are the target organization\'s cybersecurity capabilities?',
    subQuestions: [
      'What security systems are in use?',
      'Who manages security?',
      'What are known vulnerabilities?',
      'What is the incident response capability?'
    ],
    timeline: '30 days',
    assignedSources: ['NIGHTHAWK', 'FALCON'],
    status: 'IN_PROGRESS',
    satisfaction: '60% - partial information received'
  }
};
```

### Collection Techniques

```typescript
const collectionTechniques = {
  direct: {
    description: 'Source directly observes or accesses information',
    advantages: 'Highest accuracy, firsthand knowledge',
    disadvantages: 'Requires direct access, may increase risk',
    examples: [
      'Photograph documents',
      'Observe meeting',
      'Access computer system',
      'Copy files'
    ]
  },

  elicitation: {
    description: 'Source obtains through conversation',
    advantages: 'Natural, low profile',
    disadvantages: 'May be incomplete or secondhand',
    examples: [
      'Ask colleagues questions',
      'Participate in discussions',
      'Attend meetings/events',
      'Social engineering'
    ]
  },

  technical: {
    description: 'Use of technical means',
    advantages: 'Can be covert, continuous collection',
    disadvantages: 'Requires equipment, technical skill, higher risk if discovered',
    examples: [
      'Recording devices',
      'Photography',
      'Electronic surveillance',
      'Computer extraction'
    ]
  },

  documentary: {
    description: 'Obtaining documents and records',
    advantages: 'Detailed, accurate information',
    disadvantages: 'Document security, detection risk',
    examples: [
      'Copy or photograph documents',
      'Download files',
      'Obtain reports',
      'Collect publications'
    ]
  }
};
```

### Information Validation

```typescript
const validationProcess = {
  sourceReliability: {
    A: 'Completely reliable - always accurate',
    B: 'Usually reliable - mostly accurate',
    C: 'Fairly reliable - generally accurate',
    D: 'Not usually reliable - often inaccurate',
    E: 'Unreliable - usually inaccurate',
    F: 'Reliability cannot be judged - new source'
  },

  informationCredibility: {
    1: 'Confirmed by other sources',
    2: 'Probably true',
    3: 'Possibly true',
    4: 'Doubtful',
    5: 'Improbable',
    6: 'Truth cannot be judged'
  },

  corroboration: {
    singleSource: 'Treat with caution',
    multipleIndependent: 'Increases confidence',
    conflicting: 'Investigate discrepancies',
    confirmed: 'Highest confidence',
    technical: 'Technical intelligence corroboration valuable'
  },

  process: [
    '1. Rate source reliability',
    '2. Assess information credibility',
    '3. Seek corroboration',
    '4. Compare with existing intelligence',
    '5. Identify gaps or inconsistencies',
    '6. Request clarification from source if needed',
    '7. Make confidence assessment',
    '8. Include in intelligence report'
  ]
};
```

## Emergency Procedures

### Emergency Categories

```typescript
const emergencyCategories = {
  sourceCompromise: {
    indicators: [
      'Source questioned by security',
      'Cover story challenged',
      'Unusual surveillance',
      'Access revoked',
      'Source reports threat'
    ],
    response: 'IMMEDIATE - Suspend contact, assess, extraction if needed'
  },

  handlerCompromise: {
    indicators: [
      'Handler surveillance',
      'Cover challenged',
      'Security questioning',
      'Unexpected official contact'
    ],
    response: 'IMMEDIATE - Suspend operations, assess all sources'
  },

  operationCompromise: {
    indicators: [
      'Multiple sources affected',
      'Locations discovered',
      'Methods exposed',
      'Counterintelligence activity'
    ],
    response: 'IMMEDIATE - Suspend all ops, damage assessment'
  },

  duress: {
    indicators: [
      'Duress code used',
      'Source behavioral changes',
      'Forced contact',
      'Authentication failure'
    ],
    response: 'IMMEDIATE - Abort contact, assume compromise'
  }
};
```

### Emergency Protocols

```typescript
const emergencyProtocol = {
  sourceInDanger: {
    immediate: [
      'Source breaks contact per plan',
      'Goes to designated safe house',
      'Uses emergency communication',
      'Follows exfiltration plan if necessary'
    ],
    handler: [
      'Verify emergency via alternate channel',
      'Activate extraction if needed',
      'Notify chain of command',
      'Protect source identity',
      'Assess compromise to other operations'
    ]
  },

  exfiltration: {
    trigger: 'Imminent threat to source life or freedom',
    plan: {
      primary: 'Pre-planned route and method',
      alternate: 'Backup route if primary compromised',
      emergency: 'Immediate extraction',
      safeHouses: 'Staged locations',
      transport: 'Pre-arranged vehicles/tickets',
      documents: 'False documents prepared',
      destination: 'Secure location'
    },
    execution: [
      'Activate on code word or emergency',
      'Source proceeds to first waypoint',
      'Handler team provides security',
      'Progress through safe houses',
      'Constant communication',
      'Adapt to circumstances',
      'Complete to safe destination'
    ]
  },

  communications: {
    normal: 'Suspended immediately',
    emergency: {
      channel: 'Pre-designated emergency method',
      authentication: 'Special emergency codes',
      frequency: 'As needed',
      security: 'Maximum protection'
    },
    restoration: 'Only after full security review'
  },

  recovery: {
    assessment: 'Full damage assessment',
    security: 'Review all procedures',
    sources: 'Check status of all related sources',
    operations: 'Evaluate impact on operations',
    lessons: 'Identify lessons learned',
    improvements: 'Implement security enhancements'
  }
};
```

### Duress Signals

```typescript
const duressSignals = {
  verbal: {
    codeWord: 'Specific word or phrase',
    example: 'Use duress code instead of normal auth',
    response: 'Abort immediately, treat as compromise'
  },

  behavioral: {
    signals: [
      'Missed authentication',
      'Wrong authentication deliberately',
      'Unusual nervousness',
      'Specific gesture or action',
      'Arrival pattern violation'
    ],
    response: 'Assess, abort if confirmed'
  },

  electronic: {
    signals: [
      'Specific character in message',
      'Wrong encryption key',
      'Message format violation',
      'Timing anomaly'
    ],
    response: 'Abort, assess compromise'
  },

  environmental: {
    signals: [
      'Specific item at meeting location',
      'Signal at dead drop site',
      'Absence of clearance signal',
      'Danger warning posted'
    ],
    response: 'Abort immediately'
  },

  training: {
    practice: 'Never use in non-emergency',
    recognition: 'All personnel trained',
    response: 'Immediate and appropriate',
    review: 'Regular exercises'
  }
};
```

## Legal and Ethical Considerations

### Legal Framework

```typescript
const legalFramework = {
  authorization: {
    requirement: 'All operations must be properly authorized',
    documentation: 'Maintain complete authorization records',
    review: 'Regular legal review of operations',
    limits: 'Operate within legal authorities'
  },

  humanRights: {
    compliance: 'Full compliance with human rights law',
    prohibition: 'No torture, inhumane treatment',
    assessment: 'Human rights impact assessment',
    monitoring: 'Ongoing compliance monitoring'
  },

  sourceProtection: {
    legal: 'Protect sources as required by law',
    ethical: 'Moral obligation to sources',
    methods: 'Appropriate protection measures',
    consequences: 'Accept responsibility'
  },

  oversight: {
    internal: 'Regular internal reviews',
    external: 'External oversight as required',
    reporting: 'Accurate reporting to authorities',
    accountability: 'Accept accountability'
  }
};
```

### Ethical Guidelines

```typescript
const ethicalGuidelines = {
  sourceWelfare: {
    priority: 'Source safety is paramount',
    informed: 'Source understands risks',
    voluntary: 'Participation is voluntary',
    protection: 'Provide appropriate protection',
    support: 'Support source and family as needed'
  },

  truthfulness: {
    reporting: 'Report accurately and honestly',
    assessment: 'Honest capability assessment',
    promises: 'Keep promises to sources',
    limitations: 'Be honest about limitations'
  },

  professionalism: {
    conduct: 'Maintain professional standards',
    relationships: 'Professional handler-source relationship',
    exploitation: 'No personal exploitation',
    respect: 'Respect for all persons'
  },

  responsibility: {
    accountability: 'Accept responsibility for decisions',
    consequences: 'Consider consequences of actions',
    oversight: 'Submit to appropriate oversight',
    improvement: 'Continuous ethical improvement'
  }
};
```

## Training Requirements

### Handler Certification

```typescript
const handlerTraining = {
  initial: {
    duration: '12 weeks',
    topics: [
      'HUMINT fundamentals',
      'Recruitment techniques',
      'Meeting management',
      'Surveillance detection',
      'Secure communications',
      'Operational security',
      'Intelligence reporting',
      'Legal and ethical framework',
      'Emergency procedures'
    ],
    practical: 'Extensive practical exercises',
    assessment: 'Comprehensive final assessment',
    certification: 'Required for operations'
  },

  continuing: {
    annual: [
      'OPSEC refresher',
      'Surveillance detection',
      'Communications security',
      'Threat briefings',
      'Legal updates'
    ],
    biennial: [
      'Advanced techniques',
      'Technology updates',
      'Case studies',
      'Lessons learned'
    ]
  },

  specialized: {
    technical: 'Technical collection methods',
    countersurveillance: 'Advanced CS techniques',
    hostile Environment: 'High-threat operations',
    emergency: 'Emergency and extraction procedures'
  }
};
```

## Conclusion

This tradecraft guide provides the foundation for professional HUMINT operations. Success requires:

1. **Thorough preparation** - Plan carefully, prepare contingencies
2. **Strict security** - Follow OPSEC principles always
3. **Professional conduct** - Maintain highest standards
4. **Continuous learning** - Stay current, learn from experience
5. **Source protection** - Paramount responsibility
6. **Legal compliance** - Operate within authorities
7. **Ethical behavior** - Maintain moral standards

Remember: The safety of sources and integrity of operations depend on following these practices consistently.

---

**Classification**: UNCLASSIFIED
**Version**: 1.0.0
**Last Updated**: 2025-11-20
**Distribution**: Authorized Personnel Only
