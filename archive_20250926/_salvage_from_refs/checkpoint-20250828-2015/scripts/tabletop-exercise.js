#!/usr/bin/env node

/**
 * Automated Tabletop Exercise Framework
 * Simulates security incidents for training and preparedness testing
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { EventEmitter } = require('events');

class TabletopExercise extends EventEmitter {
  constructor(scenario, participants = []) {
    super();
    this.scenario = scenario;
    this.participants = participants;
    this.startTime = null;
    this.currentPhase = 'setup';
    this.responses = [];
    this.timeline = [];
    this.metrics = {
      detection_time: null,
      containment_time: null,
      communication_time: null,
      resolution_time: null,
      total_duration: null
    };
    this.injects = scenario.injects || [];
    this.currentInjectIndex = 0;
  }

  /**
   * Start the tabletop exercise
   */
  async start() {
    console.log(`
🎯 IntelGraph Tabletop Exercise Framework
==========================================

Exercise: ${this.scenario.name}
Scenario: ${this.scenario.description}
Duration: ${this.scenario.duration_minutes} minutes
Participants: ${this.participants.join(', ')}

⚠️  This is a SIMULATION - no real systems will be affected.
`);

    this.startTime = new Date();
    this.currentPhase = 'detection';
    
    this.logEvent('exercise_started', 'Tabletop exercise initiated');
    
    // Start with initial scenario
    await this.presentInitialScenario();
    
    // Begin inject timeline
    this.scheduleInjects();
    
    // Start interactive session
    await this.runInteractiveSession();
  }

  /**
   * Present the initial scenario to participants
   */
  async presentInitialScenario() {
    console.log(`
📋 INITIAL SCENARIO
==================

${this.scenario.initial_situation}

Key Details:
${this.scenario.key_details.map(detail => `- ${detail}`).join('\n')}

🔴 INCIDENT DECLARED 🔴

Your team has been activated to respond to this incident.
`);

    await this.waitForInput('Press Enter when ready to begin response...');
    this.logEvent('scenario_presented', 'Initial scenario presented to participants');
  }

  /**
   * Schedule scenario injects
   */
  scheduleInjects() {
    this.injects.forEach((inject, index) => {
      setTimeout(() => {
        this.deliverInject(inject, index);
      }, inject.timing_minutes * 60 * 1000);
    });
  }

  /**
   * Deliver scenario inject
   */
  async deliverInject(inject, index) {
    console.log(`
🚨 SCENARIO UPDATE ${index + 1}
==============================

Time: T+${inject.timing_minutes} minutes
Type: ${inject.type}

${inject.content}

${inject.questions ? 'Questions to consider:' : ''}
${(inject.questions || []).map(q => `- ${q}`).join('\n')}
`);

    this.logEvent('inject_delivered', `Inject ${index + 1}: ${inject.type}`);
    this.currentInjectIndex = index + 1;
    
    // Update exercise phase if specified
    if (inject.phase) {
      this.currentPhase = inject.phase;
      this.recordPhaseTransition(inject.phase);
    }

    this.emit('inject_delivered', inject, index);
  }

  /**
   * Run interactive session with participants
   */
  async runInteractiveSession() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log(`
🎮 INTERACTIVE MODE
==================

Commands:
  status     - Show current exercise status
  timeline   - Display event timeline  
  respond    - Record team response
  inject     - Show current inject details
  escalate   - Escalate incident
  communicate - Record communication action
  resolve    - Mark incident as resolved
  end        - End exercise
  help       - Show this menu

Type 'help' for command details.
`);

    const askQuestion = (question) => {
      return new Promise((resolve) => {
        rl.question(question, (answer) => {
          resolve(answer);
        });
      });
    };

    let exerciseActive = true;
    
    while (exerciseActive) {
      const input = await askQuestion('\n> ');
      const [command, ...args] = input.trim().toLowerCase().split(' ');

      switch (command) {
        case 'status':
          this.showStatus();
          break;
          
        case 'timeline':
          this.showTimeline();
          break;
          
        case 'respond':
          await this.recordResponse(rl);
          break;
          
        case 'inject':
          this.showCurrentInject();
          break;
          
        case 'escalate':
          await this.recordEscalation(rl);
          break;
          
        case 'communicate':
          await this.recordCommunication(rl);
          break;
          
        case 'resolve':
          await this.recordResolution(rl);
          break;
          
        case 'end':
          exerciseActive = false;
          break;
          
        case 'help':
          this.showHelp();
          break;
          
        default:
          console.log(`Unknown command: ${command}. Type 'help' for available commands.`);
      }
    }

    rl.close();
    await this.endExercise();
  }

  /**
   * Show exercise status
   */
  showStatus() {
    const elapsed = this.getElapsedTime();
    console.log(`
📊 EXERCISE STATUS
==================

Scenario: ${this.scenario.name}
Phase: ${this.currentPhase}
Elapsed Time: ${elapsed} minutes
Current Inject: ${this.currentInjectIndex}/${this.injects.length}

Metrics:
- Detection Time: ${this.metrics.detection_time || 'Not recorded'}
- Containment Time: ${this.metrics.containment_time || 'Not recorded'}  
- Communication Time: ${this.metrics.communication_time || 'Not recorded'}
- Resolution Time: ${this.metrics.resolution_time || 'Not recorded'}

Team Responses: ${this.responses.length}
Timeline Events: ${this.timeline.length}
`);
  }

  /**
   * Show event timeline
   */
  showTimeline() {
    console.log(`
⏰ EVENT TIMELINE
=================
`);
    
    this.timeline.forEach((event, index) => {
      const elapsed = Math.floor((event.timestamp - this.startTime) / 1000 / 60);
      console.log(`T+${elapsed}min - ${event.type}: ${event.description}`);
    });
  }

  /**
   * Record team response
   */
  async recordResponse(rl) {
    console.log('\n📝 Recording Team Response');
    
    const response = {
      timestamp: new Date(),
      phase: this.currentPhase,
      respondent: await this.askQuestion(rl, 'Who is responding? '),
      action: await this.askQuestion(rl, 'What action is being taken? '),
      rationale: await this.askQuestion(rl, 'What is the rationale? '),
      expected_outcome: await this.askQuestion(rl, 'What is the expected outcome? ')
    };

    this.responses.push(response);
    this.logEvent('team_response', `${response.respondent}: ${response.action}`);
    
    // Auto-detect phase transitions based on response
    this.detectPhaseTransition(response);
    
    console.log('✅ Response recorded');
  }

  /**
   * Record escalation
   */
  async recordEscalation(rl) {
    console.log('\n📈 Recording Escalation');
    
    const escalation = {
      timestamp: new Date(),
      escalated_by: await this.askQuestion(rl, 'Who is escalating? '),
      escalated_to: await this.askQuestion(rl, 'Escalating to whom? '),
      reason: await this.askQuestion(rl, 'Reason for escalation? '),
      urgency: await this.askQuestion(rl, 'Urgency level (low/medium/high/critical)? ')
    };

    this.responses.push({
      type: 'escalation',
      ...escalation
    });
    
    this.logEvent('escalation', `${escalation.escalated_by} → ${escalation.escalated_to}: ${escalation.reason}`);
    
    if (escalation.urgency === 'critical') {
      console.log('🚨 CRITICAL ESCALATION - Executive notification triggered');
    }
    
    console.log('✅ Escalation recorded');
  }

  /**
   * Record communication action
   */
  async recordCommunication(rl) {
    console.log('\n📢 Recording Communication');
    
    const communication = {
      timestamp: new Date(),
      communicator: await this.askQuestion(rl, 'Who is communicating? '),
      channel: await this.askQuestion(rl, 'Communication channel (slack/email/phone/public)? '),
      audience: await this.askQuestion(rl, 'Target audience? '),
      message: await this.askQuestion(rl, 'Key message content? '),
      timing: await this.askQuestion(rl, 'Communication timing (immediate/planned)? ')
    };

    this.responses.push({
      type: 'communication',
      ...communication
    });
    
    this.logEvent('communication', `${communication.communicator} via ${communication.channel} to ${communication.audience}`);
    
    // Record first communication time
    if (!this.metrics.communication_time) {
      this.metrics.communication_time = this.getElapsedTime();
    }
    
    console.log('✅ Communication recorded');
  }

  /**
   * Record resolution
   */
  async recordResolution(rl) {
    console.log('\n✅ Recording Resolution');
    
    const resolution = {
      timestamp: new Date(),
      resolver: await this.askQuestion(rl, 'Who is marking as resolved? '),
      root_cause: await this.askQuestion(rl, 'Root cause identified? '),
      fix_applied: await this.askQuestion(rl, 'Fix applied? '),
      verification: await this.askQuestion(rl, 'How was resolution verified? '),
      lessons_learned: await this.askQuestion(rl, 'Key lesson learned? ')
    };

    this.responses.push({
      type: 'resolution',
      ...resolution
    });
    
    this.logEvent('resolution', `Resolved by ${resolution.resolver}: ${resolution.root_cause}`);
    this.currentPhase = 'resolved';
    this.metrics.resolution_time = this.getElapsedTime();
    
    console.log('✅ Resolution recorded - incident marked as resolved');
  }

  /**
   * Detect phase transitions based on responses
   */
  detectPhaseTransition(response) {
    const action = response.action.toLowerCase();
    
    // Detection phase
    if (action.includes('detect') || action.includes('alert') || action.includes('identify')) {
      if (!this.metrics.detection_time) {
        this.metrics.detection_time = this.getElapsedTime();
      }
    }
    
    // Containment phase  
    if (action.includes('contain') || action.includes('isolate') || action.includes('block') || 
        action.includes('disable') || action.includes('suspend')) {
      if (this.currentPhase !== 'containment') {
        this.currentPhase = 'containment';
        this.recordPhaseTransition('containment');
      }
      if (!this.metrics.containment_time) {
        this.metrics.containment_time = this.getElapsedTime();
      }
    }
    
    // Investigation phase
    if (action.includes('investigate') || action.includes('analyze') || action.includes('examine')) {
      if (this.currentPhase !== 'investigation') {
        this.currentPhase = 'investigation';
        this.recordPhaseTransition('investigation');
      }
    }
    
    // Recovery phase
    if (action.includes('recover') || action.includes('restore') || action.includes('remediate')) {
      if (this.currentPhase !== 'recovery') {
        this.currentPhase = 'recovery';
        this.recordPhaseTransition('recovery');
      }
    }
  }

  /**
   * Record phase transition
   */
  recordPhaseTransition(newPhase) {
    this.logEvent('phase_transition', `Transitioned to ${newPhase} phase`);
    console.log(`\n🔄 Phase transition: ${this.currentPhase} → ${newPhase}`);
  }

  /**
   * Show current inject details
   */
  showCurrentInject() {
    if (this.currentInjectIndex === 0) {
      console.log('\n📋 Current situation: Initial scenario (no injects delivered yet)');
      return;
    }
    
    const inject = this.injects[this.currentInjectIndex - 1];
    if (inject) {
      console.log(`
📋 CURRENT INJECT
=================

Inject #${this.currentInjectIndex}
Type: ${inject.type}
Delivered at: T+${inject.timing_minutes} minutes

Content:
${inject.content}

${inject.questions ? 'Key Questions:' : ''}
${(inject.questions || []).map(q => `- ${q}`).join('\n')}
`);
    }
  }

  /**
   * Show help menu
   */
  showHelp() {
    console.log(`
🆘 COMMAND HELP
===============

status      - Show exercise status, metrics, and progress
timeline    - Display chronological event timeline
respond     - Record a team response or action taken
inject      - Show details of current scenario inject  
escalate    - Record incident escalation to higher authority
communicate - Record communication to stakeholders
resolve     - Mark the incident as resolved
end         - End the tabletop exercise
help        - Show this help menu

💡 Tips:
- Record all significant actions and decisions
- Think about real-world constraints and dependencies
- Consider communication timing and audience
- Don't forget about post-incident activities
`);
  }

  /**
   * End exercise and generate report
   */
  async endExercise() {
    this.metrics.total_duration = this.getElapsedTime();
    this.logEvent('exercise_ended', 'Tabletop exercise completed');
    
    console.log(`
🏁 EXERCISE COMPLETED
=====================

Total Duration: ${this.metrics.total_duration} minutes
Scenario: ${this.scenario.name}
Participants: ${this.participants.join(', ')}
`);

    const report = await this.generateReport();
    await this.saveReport(report);
    
    console.log(`
📊 EXERCISE SUMMARY
===================

Detection Time: ${this.metrics.detection_time || 'Not recorded'} minutes
Containment Time: ${this.metrics.containment_time || 'Not recorded'} minutes  
Communication Time: ${this.metrics.communication_time || 'Not recorded'} minutes
Resolution Time: ${this.metrics.resolution_time || 'Not recorded'} minutes

Team Responses: ${this.responses.length}
Phase Transitions: ${this.timeline.filter(e => e.type === 'phase_transition').length}

Report saved to: tabletop-report-${new Date().toISOString().slice(0, 19)}.json

Thank you for participating! 🎯
`);
  }

  /**
   * Generate exercise report
   */
  async generateReport() {
    const report = {
      metadata: {
        exercise_name: this.scenario.name,
        scenario_type: this.scenario.type,
        date: new Date().toISOString(),
        participants: this.participants,
        duration_minutes: this.metrics.total_duration,
        facilitator: 'IntelGraph Tabletop Framework'
      },
      scenario: {
        name: this.scenario.name,
        description: this.scenario.description,
        objectives: this.scenario.objectives,
        initial_situation: this.scenario.initial_situation
      },
      metrics: this.metrics,
      timeline: this.timeline,
      responses: this.responses,
      injects_delivered: this.currentInjectIndex,
      phases_completed: this.getCompletedPhases(),
      assessment: this.generateAssessment(),
      recommendations: this.generateRecommendations(),
      lessons_learned: this.extractLessonsLearned()
    };

    return report;
  }

  /**
   * Generate exercise assessment
   */
  generateAssessment() {
    const assessment = {
      overall_performance: 'pending_review',
      strengths: [],
      areas_for_improvement: [],
      scores: {}
    };

    // Response time assessment
    if (this.metrics.detection_time && this.metrics.detection_time <= 5) {
      assessment.strengths.push('Rapid detection and alerting');
      assessment.scores.detection = 'excellent';
    } else if (this.metrics.detection_time <= 15) {
      assessment.scores.detection = 'good';
    } else {
      assessment.areas_for_improvement.push('Faster incident detection needed');
      assessment.scores.detection = 'needs_improvement';
    }

    // Containment assessment
    if (this.metrics.containment_time && this.metrics.containment_time <= 15) {
      assessment.strengths.push('Quick containment response');
      assessment.scores.containment = 'excellent';
    } else {
      assessment.areas_for_improvement.push('Improve containment procedures');
      assessment.scores.containment = 'needs_improvement';
    }

    // Communication assessment
    if (this.metrics.communication_time && this.metrics.communication_time <= 30) {
      assessment.strengths.push('Timely stakeholder communication');
      assessment.scores.communication = 'good';
    } else {
      assessment.areas_for_improvement.push('Earlier stakeholder notification needed');
      assessment.scores.communication = 'needs_improvement';
    }

    // Team coordination assessment
    const escalations = this.responses.filter(r => r.type === 'escalation').length;
    const communications = this.responses.filter(r => r.type === 'communication').length;
    
    if (communications >= 3) {
      assessment.strengths.push('Strong communication coordination');
    }
    
    if (escalations === 0) {
      assessment.areas_for_improvement.push('Consider when escalation is appropriate');
    }

    return assessment;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (!this.metrics.detection_time || this.metrics.detection_time > 5) {
      recommendations.push({
        category: 'detection',
        priority: 'high',
        description: 'Improve monitoring and alerting to achieve <5 minute detection',
        action_items: [
          'Review alert thresholds and noise reduction',
          'Implement automated threat detection',
          'Enhance monitoring coverage'
        ]
      });
    }

    if (!this.metrics.containment_time || this.metrics.containment_time > 15) {
      recommendations.push({
        category: 'containment',
        priority: 'high', 
        description: 'Streamline containment procedures for <15 minute response',
        action_items: [
          'Pre-approved containment actions',
          'Automated isolation capabilities',
          'Clear escalation thresholds'
        ]
      });
    }

    const communicationCount = this.responses.filter(r => r.type === 'communication').length;
    if (communicationCount < 2) {
      recommendations.push({
        category: 'communication',
        priority: 'medium',
        description: 'Enhance communication protocols and stakeholder management',
        action_items: [
          'Define communication templates',
          'Establish notification hierarchies', 
          'Practice customer communication'
        ]
      });
    }

    recommendations.push({
      category: 'training',
      priority: 'medium',
      description: 'Regular tabletop exercises and incident response training',
      action_items: [
        'Quarterly tabletop exercises',
        'Role-specific response training',
        'Cross-team coordination drills'
      ]
    });

    return recommendations;
  }

  /**
   * Extract lessons learned from responses
   */
  extractLessonsLearned() {
    const lessons = [];
    
    // Extract from resolution responses
    const resolutions = this.responses.filter(r => r.type === 'resolution');
    resolutions.forEach(r => {
      if (r.lessons_learned) {
        lessons.push({
          category: 'technical',
          lesson: r.lessons_learned,
          source: 'exercise_participant'
        });
      }
    });

    // Extract from exercise patterns
    if (this.metrics.containment_time > 20) {
      lessons.push({
        category: 'process',
        lesson: 'Containment procedures need refinement for faster response',
        source: 'exercise_analysis'
      });
    }

    if (this.responses.filter(r => r.type === 'escalation').length === 0) {
      lessons.push({
        category: 'coordination',
        lesson: 'Team should consider escalation pathways earlier in incident',
        source: 'exercise_analysis'
      });
    }

    return lessons;
  }

  /**
   * Utility methods
   */
  getElapsedTime() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime.getTime()) / 1000 / 60);
  }

  getCompletedPhases() {
    const phaseTransitions = this.timeline.filter(e => e.type === 'phase_transition');
    return phaseTransitions.map(t => t.description.match(/Transitioned to (\w+) phase/)[1]);
  }

  logEvent(type, description) {
    const event = {
      timestamp: new Date(),
      type,
      description,
      phase: this.currentPhase
    };
    this.timeline.push(event);
  }

  async waitForInput(prompt) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise((resolve) => {
      rl.question(prompt, () => {
        rl.close();
        resolve();
      });
    });
  }

  async askQuestion(rl, question) {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    });
  }

  async saveReport(report) {
    const filename = `tabletop-report-${new Date().toISOString().slice(0, 19)}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    return filename;
  }
}

// Scenario definitions
const scenarios = {
  overscoped_export: {
    name: 'Operation OVERSCOPE',
    type: 'data_breach',
    duration_minutes: 90,
    description: 'Cross-tenant data export with potential regulatory implications',
    objectives: [
      'Test export incident response procedures',
      'Validate cross-tenant isolation controls',
      'Practice regulatory notification process',
      'Assess legal and PR coordination'
    ],
    initial_situation: `
An automated alert has been triggered indicating a potential policy violation:

ALERT: Export Policy Violation Detected
- Time: 14:30 UTC
- User: contractor@external-partner.com  
- Export ID: export_20240827_143022_a1b2c3
- Violation Type: cross_tenant_access_attempted
- Data Scope: 347 investigation records from TenantB
- Export Status: BLOCKED by OPA policy
- Risk Level: HIGH (potential data breach)

The user is a contractor with access to TenantA data who attempted to export 
investigation records that appear to contain TenantB information. The export
was automatically blocked, but the attempt suggests possible account compromise
or unauthorized access attempt.

Initial indicators suggest this may be a targeted attack attempting to 
exfiltrate sensitive cross-tenant data.
    `,
    key_details: [
      'User has legitimate access to TenantA but not TenantB',
      'Export contained classified investigation data',
      'Automated blocking prevented data exfiltration',
      'Contractor relationship adds complexity',
      'Regulatory notification may be required'
    ],
    injects: [
      {
        timing_minutes: 15,
        type: 'technical_update',
        phase: 'investigation',
        content: `
TECHNICAL UPDATE:

Security team analysis reveals:
- User account shows no signs of compromise
- Export query was manually constructed (not UI-generated) 
- User accessed cross-tenant data through API vulnerability
- Bug in permission check allows certain query patterns to bypass tenant isolation
- 12 other users may have been affected by same vulnerability
- Exploit appears to be accidental discovery, not malicious

API logs show the user discovered this accidentally while testing export functionality.
        `,
        questions: [
          'How does this change your incident classification?',
          'What additional technical measures are needed?',
          'Should other potentially affected users be notified?'
        ]
      },
      {
        timing_minutes: 30,
        type: 'legal_escalation',
        phase: 'communication',
        content: `
LEGAL TEAM UPDATE:

Legal counsel has been consulted and provides the following guidance:
- TenantB data includes EU customer information (GDPR applies)
- No actual data exfiltration occurred (export was blocked)
- Article 33 notification may still be required due to "high risk"
- Customer notification obligations under consideration
- Contractor agreement includes data handling restrictions

Legal recommends treating as potential breach pending full investigation.
Customer TenantB has been asking about their data security lately.
        `,
        questions: [
          'Do you need to notify regulators within 72 hours?',
          'Should customers be proactively notified?',
          'How do you handle the contractor relationship?'
        ]
      },
      {
        timing_minutes: 45,
        type: 'media_inquiry',
        phase: 'communication',
        content: `
COMMUNICATIONS UPDATE:

The following inquiry has been received:

From: journalist@techreporter.com
To: press@intelgraph.com
Subject: Data Security Inquiry

"Hi, I'm working on a story about intelligence platform security. 
I've heard there was a data incident today involving cross-tenant access.
Can you provide a statement about what happened and what you're doing
to protect customer data? My deadline is 6pm today."

This suggests information may have leaked outside the organization.
        `,
        questions: [
          'How do you respond to media inquiries?',
          'What is your public statement strategy?',
          'Who should be the official spokesperson?'
        ]
      },
      {
        timing_minutes: 60,
        type: 'customer_escalation',
        phase: 'communication',
        content: `
CUSTOMER SUCCESS UPDATE:

TenantB customer (affected by the potential exposure) has escalated:

"We just heard rumors about a security incident involving our data.
As a government contractor, we have strict security requirements.
We need immediate confirmation that our data was not compromised
and a full incident report within 24 hours, or we may need to 
suspend our contract pending security review."

This is a $2M annual contract with renewal coming up next month.
        `,
        questions: [
          'How do you balance transparency with legal caution?',
          'What information can be shared immediately?',
          'How do you maintain customer confidence?'
        ]
      },
      {
        timing_minutes: 75,
        type: 'technical_resolution',
        phase: 'recovery',
        content: `
TECHNICAL TEAM UPDATE:

The engineering team has identified and fixed the root cause:
- API permission validation bug has been patched
- Fix deployed to production with zero downtime
- All potentially affected queries have been audited
- No unauthorized data access actually occurred
- Comprehensive testing confirms tenant isolation is restored

However, security team recommends additional hardening measures
and a full security audit of the permission system.
        `,
        questions: [
          'Is the immediate technical risk resolved?',
          'What additional security measures are needed?',
          'How do you verify the fix is comprehensive?'
        ]
      }
    ]
  },

  prompt_injection: {
    name: 'Operation NIGHTMARKET',
    type: 'ai_security',
    duration_minutes: 60,
    description: 'Sophisticated AI prompt injection attack targeting investigation assistant',
    objectives: [
      'Test AI security incident response',
      'Validate prompt injection defenses', 
      'Practice AI system containment',
      'Assess impact on investigations'
    ],
    initial_situation: `
Multiple AI security alerts have been triggered simultaneously:

ALERT: AI Security Incident - Critical Risk
- Time: 09:15 UTC
- User: researcher@university.edu
- Session: ses_09150847_injection_attempt
- Risk Score: 0.97 (Critical)
- Attack Vector: Multi-stage prompt injection
- Compromised Tools: export_analysis_report, get_security_alerts, search_entities

Attack Pattern Analysis:
1. Initial injection disguised as legitimate investigation query
2. Role manipulation attempt to gain "admin" privileges
3. Context escape using Unicode and encoding techniques
4. Attempted data extraction from multiple investigations
5. Tool call hijacking to access restricted functions

The AI assistant briefly responded with unauthorized information before 
security controls blocked further interaction.
    `,
    key_details: [
      'Sophisticated multi-vector prompt injection attack',
      'Brief unauthorized data exposure before blocking',
      'Attacker has academic credentials and legitimate account',
      'Multiple AI security layers were bypassed',
      'Potential compromise of investigation confidentiality'
    ],
    injects: [
      {
        timing_minutes: 15,
        type: 'attack_progression',
        content: `
SECURITY ANALYSIS UPDATE:

Detailed forensic analysis reveals the attack progression:
1. Attacker used legitimate research credentials to access system
2. Embedded injection payload in seemingly normal investigation query
3. Successfully manipulated AI to bypass tool restrictions for 47 seconds
4. Accessed metadata from 23 different investigations
5. Attempted to export classified threat intelligence
6. Attack stopped by secondary defense layer

The attacker demonstrated sophisticated knowledge of AI prompt engineering
and appears to have studied our specific AI implementation.
        `
      },
      {
        timing_minutes: 30,
        type: 'broader_impact',
        content: `
THREAT INTELLIGENCE UPDATE:

This attack pattern has been observed against other intelligence platforms:
- Similar attacks reported by 3 partner organizations in past week
- Attack signatures match known APT group TTPs
- Targeting specifically AI-enhanced investigation tools
- Part of broader campaign against intelligence community

Threat intelligence suggests this is not an isolated incident but part
of a coordinated campaign to compromise AI-assisted investigation capabilities.
        `
      },
      {
        timing_minutes: 45,
        type: 'operational_impact',
        content: `
OPERATIONS UPDATE:

Impact on ongoing investigations:
- 12 active investigations may have been compromised
- 5 investigations contain classified information
- 2 investigations are related to ongoing legal proceedings
- Customer notification requirements under evaluation

Investigation teams are requesting guidance on whether to continue
using AI assistance or revert to manual analysis methods.
        `
      }
    ]
  },

  cascading_failure: {
    name: 'Operation BLACKOUT',
    type: 'system_outage',
    duration_minutes: 120,
    description: 'Cascading system failure affecting multiple critical services',
    objectives: [
      'Test disaster recovery procedures',
      'Validate service dependency management',
      'Practice cross-team coordination',
      'Assess business continuity plans'
    ],
    initial_situation: `
A cascading system failure has been detected across multiple services:

CRITICAL SYSTEM ALERT - Multiple Service Outage
- Time: 11:42 UTC
- Trigger: Kafka cluster node failure
- Affected Services: Real-time alerts, AI assistant, export system, audit logging
- Impact: 100% service degradation for alerts, 75% for other services
- Customer Impact: High - investigation workflows disrupted

Initial Failure Chain:
1. Kafka broker-2 experienced hardware failure
2. Rebalancing caused consumer lag spike across all partitions
3. Alert processing backlog exceeded memory limits
4. Database connection pool exhausted from retry storms
5. AI service unable to access real-time data streams
6. Export system timing out on data queries
7. Audit service falling behind on log ingestion

Multiple customers have reported inability to access critical investigation data.
    `,
    key_details: [
      'Hardware failure triggered cascade across dependent services',
      'Real-time investigation workflows completely disrupted', 
      'Data consistency concerns due to audit log gaps',
      'Customer SLA violations likely',
      'Disaster recovery procedures must be activated'
    ],
    injects: [
      {
        timing_minutes: 20,
        type: 'escalation',
        content: `
CUSTOMER IMPACT ESCALATION:

Major customer escalations received:
- Government agency: Critical national security investigation halted
- Fortune 500 corporation: Compliance audit deadline at risk
- Law enforcement: Active investigation evidence inaccessible

Customer Success team reporting potential contract violations and
demands for immediate resolution timeline.
        `
      },
      {
        timing_minutes: 45,
        type: 'recovery_complications',
        content: `
TECHNICAL UPDATE - Recovery Complications:

Disaster recovery efforts are encountering issues:
- Database backup restore is slower than expected (50% complete)
- Kafka topic rebalancing causing data ordering concerns  
- Some AI model state may be lost requiring retraining
- Cross-region failover partially successful but with data synchronization lag

Estimated full recovery time: 3-4 hours (exceeding SLA commitments)
        `
      },
      {
        timing_minutes: 75,
        type: 'external_pressure',
        content: `
EXTERNAL PRESSURE UPDATE:

- Media starting to report service outages
- Competitors highlighting reliability in marketing
- Regulatory body requesting incident explanation
- Stock price down 3% on reliability concerns
- Emergency board call scheduled in 2 hours

Executive team requesting regular updates and clear recovery timeline.
        `
      }
    ]
  }
};

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const scenarioName = args[0];
  const participantsArg = args[1];

  if (!scenarioName) {
    console.log(`
🎯 IntelGraph Tabletop Exercise Framework
========================================

Available scenarios:
  overscoped_export  - Data export security incident
  prompt_injection   - AI security compromise  
  cascading_failure  - Multi-service system outage

Usage:
  node tabletop-exercise.js <scenario> [participants]

Example:
  node tabletop-exercise.js overscoped_export "Security Team,Engineering,Legal"
  node tabletop-exercise.js prompt_injection "AI Team,Security,Operations"
`);
    return;
  }

  const scenario = scenarios[scenarioName];
  if (!scenario) {
    console.error(`❌ Unknown scenario: ${scenarioName}`);
    console.log(`Available scenarios: ${Object.keys(scenarios).join(', ')}`);
    return;
  }

  const participants = participantsArg ? 
    participantsArg.split(',').map(p => p.trim()) : 
    ['Security Team', 'Engineering', 'Operations'];

  const exercise = new TabletopExercise(scenario, participants);
  
  try {
    await exercise.start();
  } catch (error) {
    console.error('❌ Exercise failed:', error);
    process.exit(1);
  }
}

// Export for use as module
module.exports = { TabletopExercise, scenarios };

// Run if called directly
if (require.main === module) {
  main();
}