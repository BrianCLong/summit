import {
  SocialEngineeringCampaign,
  SocialEngineeringType,
  SocialTarget,
  CampaignContent,
  CampaignSchedule,
  SocialMetrics
} from '../types';

/**
 * Social Engineering Campaign Generator
 */
export class SocialEngineeringEngine {
  /**
   * Generate phishing campaign
   */
  generatePhishingCampaign(
    name: string,
    targets: SocialTarget[],
    options: {
      theme?: 'it-support' | 'hr' | 'finance' | 'executive' | 'vendor';
      urgency?: 'low' | 'medium' | 'high';
      customization?: 'generic' | 'targeted' | 'highly-targeted';
    } = {}
  ): SocialEngineeringCampaign {
    const { theme = 'it-support', urgency = 'medium', customization = 'targeted' } = options;

    const content = this.generatePhishingContent(theme, urgency, customization);
    const schedule = this.generateSchedule(targets.length);

    return {
      id: this.generateId(),
      type: customization === 'highly-targeted' ? SocialEngineeringType.SPEAR_PHISHING : SocialEngineeringType.PHISHING,
      name,
      description: `${theme} themed phishing campaign`,
      targets,
      content,
      schedule,
      metrics: this.initializeMetrics(targets.length),
      status: 'draft'
    };
  }

  /**
   * Generate spear-phishing campaign with detailed targeting
   */
  generateSpearPhishingCampaign(
    name: string,
    targets: SocialTarget[],
    intelligence: {
      companyInfo: Record<string, string>;
      recentEvents?: string[];
      socialMediaData?: Record<string, string[]>;
    }
  ): SocialEngineeringCampaign {
    const content = this.generateSpearPhishingContent(targets, intelligence);
    const schedule = this.generateSchedule(targets.length, true);

    return {
      id: this.generateId(),
      type: SocialEngineeringType.SPEAR_PHISHING,
      name,
      description: 'Highly targeted spear-phishing campaign using gathered intelligence',
      targets,
      content,
      schedule,
      metrics: this.initializeMetrics(targets.length),
      status: 'draft'
    };
  }

  /**
   * Generate vishing (voice phishing) campaign
   */
  generateVishingCampaign(
    name: string,
    targets: SocialTarget[],
    scenario: 'tech-support' | 'bank' | 'government' | 'internal-it'
  ): SocialEngineeringCampaign {
    const script = this.generateVishingScript(scenario);

    return {
      id: this.generateId(),
      type: SocialEngineeringType.VISHING,
      name,
      description: `Voice phishing campaign - ${scenario} scenario`,
      targets: targets.filter(t => t.phone),
      content: {
        body: script,
        sender: this.getVishingSender(scenario),
        callToAction: 'Provide credentials or sensitive information'
      },
      schedule: this.generateSchedule(targets.length),
      metrics: this.initializeMetrics(targets.length),
      status: 'draft'
    };
  }

  /**
   * Generate pretexting scenario
   */
  generatePretextingScenario(
    targetRole: string,
    objective: string
  ): {
    persona: string;
    backstory: string;
    script: string[];
    expectedResponses: string[];
    escalationPaths: string[];
  } {
    const scenarios: Record<string, { persona: string; backstory: string }> = {
      'it-admin': {
        persona: 'Senior Network Engineer from corporate IT',
        backstory: 'Performing emergency security audit following recent breach attempt'
      },
      'executive': {
        persona: 'Executive Assistant to CEO',
        backstory: 'Urgent request from CEO who is traveling internationally'
      },
      'hr': {
        persona: 'Benefits Coordinator from HR',
        backstory: 'Annual benefits enrollment deadline approaching'
      },
      'vendor': {
        persona: 'Account Manager from major vendor',
        backstory: 'Critical security update requiring immediate action'
      }
    };

    const scenario = scenarios[targetRole] || scenarios['vendor'];

    return {
      persona: scenario.persona,
      backstory: scenario.backstory,
      script: this.generatePretextScript(scenario.persona, objective),
      expectedResponses: [
        'Request for verification',
        'Request for callback number',
        'Request for email confirmation',
        'Compliance with request'
      ],
      escalationPaths: [
        'Reference senior management approval',
        'Cite time-sensitive deadline',
        'Offer to have supervisor call back',
        'Provide fabricated authorization codes'
      ]
    };
  }

  /**
   * Generate watering hole attack plan
   */
  generateWateringHoleAttack(
    targetOrganization: string,
    identifiedSites: string[]
  ): {
    targetSites: string[];
    exploitStrategy: string;
    payloadDelivery: string;
    evasionTechniques: string[];
    expectedYield: number;
  } {
    return {
      targetSites: identifiedSites,
      exploitStrategy: 'Inject malicious JavaScript into frequently visited sites',
      payloadDelivery: 'Drive-by download triggered by user interaction',
      evasionTechniques: [
        'IP-based filtering to target only organization range',
        'User-agent filtering for corporate browsers',
        'Time-based activation during business hours',
        'Obfuscated payload delivery'
      ],
      expectedYield: Math.round(identifiedSites.length * 0.15 * 100) / 100
    };
  }

  /**
   * Analyze campaign results
   */
  analyzeCampaignResults(
    campaign: SocialEngineeringCampaign
  ): {
    effectiveness: number;
    riskAreas: string[];
    recommendations: string[];
    benchmarkComparison: Record<string, number>;
  } {
    const metrics = campaign.metrics;
    const effectiveness = (metrics.clicked / Math.max(metrics.sent, 1)) * 100;

    const riskAreas: string[] = [];
    const recommendations: string[] = [];

    // Analyze metrics
    if (metrics.openRate > 0.5) {
      riskAreas.push('High email open rate indicates susceptibility to social engineering');
      recommendations.push('Implement security awareness training focused on email threats');
    }

    if (metrics.clickRate > 0.2) {
      riskAreas.push('High click rate on malicious links');
      recommendations.push('Deploy URL filtering and sandboxing solutions');
    }

    if (metrics.submissionRate > 0.1) {
      riskAreas.push('Users submitting credentials to phishing pages');
      recommendations.push('Implement MFA and credential monitoring');
    }

    if (metrics.reportRate < 0.1) {
      riskAreas.push('Low incident reporting rate');
      recommendations.push('Establish clear reporting procedures and incentives');
    }

    return {
      effectiveness,
      riskAreas,
      recommendations,
      benchmarkComparison: {
        industryAverageClickRate: 0.12,
        yourClickRate: metrics.clickRate,
        industryAverageReportRate: 0.15,
        yourReportRate: metrics.reportRate
      }
    };
  }

  private generatePhishingContent(
    theme: string,
    urgency: string,
    _customization: string
  ): CampaignContent {
    const templates: Record<string, { subject: string; body: string }> = {
      'it-support': {
        subject: urgency === 'high' ? 'URGENT: Password Expires in 24 Hours' : 'Action Required: Update Your Credentials',
        body: `Your network password will expire soon. To avoid disruption to your work, please update your credentials by clicking the link below.\n\n[Update Password]\n\nIf you have questions, contact the IT Help Desk.`
      },
      'hr': {
        subject: 'Important: Update Your Benefits Information',
        body: `Open enrollment for benefits is closing soon. Please review and update your benefits selections by visiting the portal below.\n\n[Access Benefits Portal]\n\nHR Department`
      },
      'finance': {
        subject: urgency === 'high' ? 'URGENT: Invoice Payment Required' : 'Invoice #INV-2024-001 - Payment Due',
        body: `Please review the attached invoice and process payment at your earliest convenience. For secure payment, use the link below.\n\n[Process Payment]\n\nAccounts Receivable`
      },
      'executive': {
        subject: 'Quick Favor - Need Your Help',
        body: `I need you to handle something for me urgently. Are you available? Reply to this email as soon as possible.\n\nSent from my iPhone`
      },
      'vendor': {
        subject: 'Your Subscription Requires Verification',
        body: `We noticed unusual activity on your account. To maintain access to your subscription, please verify your account information.\n\n[Verify Account]\n\nAccount Security Team`
      }
    };

    const template = templates[theme] || templates['it-support'];

    return {
      subject: template.subject,
      body: template.body,
      sender: this.getPhishingSender(theme),
      callToAction: 'Click link and enter credentials'
    };
  }

  private generateSpearPhishingContent(
    targets: SocialTarget[],
    intelligence: {
      companyInfo: Record<string, string>;
      recentEvents?: string[];
      socialMediaData?: Record<string, string[]>;
    }
  ): CampaignContent {
    const companyName = intelligence.companyInfo['name'] || 'Your Company';
    const recentEvent = intelligence.recentEvents?.[0] || 'recent company announcement';

    return {
      subject: `Follow-up: ${recentEvent}`,
      body: `Hi [FirstName],\n\nFollowing our ${recentEvent}, we need all ${targets[0]?.department || 'team'} members to complete a brief security verification.\n\nThis is a mandatory requirement from ${companyName} security team.\n\n[Complete Verification]\n\nBest regards,\nSecurity Team`,
      sender: `security@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
      callToAction: 'Complete verification form with corporate credentials'
    };
  }

  private generateVishingScript(scenario: string): string {
    const scripts: Record<string, string> = {
      'tech-support': `Hello, this is [Name] from Microsoft Technical Support. We've detected unusual activity on your computer that indicates a security breach. I need to help you secure your system right away. First, I'll need you to download our remote support tool...`,
      'bank': `Hello, this is [Name] from [Bank] Fraud Prevention. We've detected suspicious transactions on your account and need to verify your identity to protect your funds. Can you please confirm your account number and the last four digits of your social security number?`,
      'government': `Hello, this is [Name] from the Internal Revenue Service. There is an issue with your tax return that requires immediate attention. To avoid legal action, please provide your social security number and date of birth for verification.`,
      'internal-it': `Hi, this is [Name] from the IT Help Desk. We're doing some network maintenance and noticed your workstation hasn't been updated. I need your login credentials to push the update remotely.`
    };

    return scripts[scenario] || scripts['tech-support'];
  }

  private generatePretextScript(persona: string, objective: string): string[] {
    return [
      `Introduction: "Hello, this is ${persona}. Do you have a moment?"`,
      `Build rapport: "I hope I'm not catching you at a bad time."`,
      `Establish authority: "I'm calling about ${objective}."`,
      `Create urgency: "This is time-sensitive and needs to be handled today."`,
      `Request action: "I just need you to [specific action]."`,
      `Handle objections: "I understand your concern. Let me explain..."`,
      `Close: "Thank you for your help with this urgent matter."`
    ];
  }

  private getPhishingSender(theme: string): string {
    const senders: Record<string, string> = {
      'it-support': 'helpdesk@company-it-support.com',
      'hr': 'benefits@company-hr-portal.com',
      'finance': 'accounts@company-payments.com',
      'executive': 'ceo.name@company-mail.com',
      'vendor': 'support@service-provider.com'
    };
    return senders[theme] || senders['it-support'];
  }

  private getVishingSender(scenario: string): string {
    const senders: Record<string, string> = {
      'tech-support': 'Microsoft Technical Support',
      'bank': 'Bank Fraud Prevention',
      'government': 'Internal Revenue Service',
      'internal-it': 'IT Help Desk'
    };
    return senders[scenario] || senders['tech-support'];
  }

  private generateSchedule(targetCount: number, staggered = false): CampaignSchedule {
    const now = new Date();
    const startDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week

    const sendTimes: Date[] = [];
    if (staggered) {
      // Stagger sends across the campaign period
      const interval = (endDate.getTime() - startDate.getTime()) / targetCount;
      for (let i = 0; i < targetCount; i++) {
        sendTimes.push(new Date(startDate.getTime() + i * interval));
      }
    } else {
      // Send all at once during business hours
      const sendTime = new Date(startDate);
      sendTime.setHours(10, 0, 0, 0);
      sendTimes.push(sendTime);
    }

    return {
      startDate,
      endDate,
      sendTimes,
      followUpDays: [3, 5, 7]
    };
  }

  private initializeMetrics(targetCount: number): SocialMetrics {
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      submitted: 0,
      reported: 0,
      openRate: 0,
      clickRate: 0,
      submissionRate: 0,
      reportRate: 0
    };
  }

  private generateId(): string {
    return `social_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
