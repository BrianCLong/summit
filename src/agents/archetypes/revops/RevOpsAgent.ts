/**
 * RevOpsAgent - AI Revenue Operations Officer
 *
 * Capabilities:
 * - Pipeline sanity checks and health scoring
 * - Forecast variance analysis and attribution
 * - Churn risk prediction and intervention
 * - Lead scoring and prioritization
 * - Multi-touch attribution modeling
 * - Revenue analytics and dashboards
 */

import { BaseAgentArchetype } from '../base/BaseAgentArchetype';
import {
  AgentContext,
  AgentQuery,
  AgentAnalysis,
  AgentRecommendation,
  AgentAction,
  AgentResult,
  Finding,
  Insight,
} from '../base/types';

interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  amount: number;
  stage: string;
  closeDate: Date;
  probability: number;
  lastActivity?: Date;
  ownerId: string;
  healthScore?: number;
}

interface Forecast {
  id: string;
  period: string;
  commit: number;
  bestCase: number;
  pipeline: number;
  closed: number;
  previousCommit?: number;
}

interface Account {
  id: string;
  name: string;
  arr: number;
  healthScore: number;
  churnRisk: number;
  lastEngagement: Date;
  supportTickets: number;
  usageMetrics?: {
    mau: number;
    dau: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  source: string;
  score: number;
  status: 'new' | 'qualified' | 'nurture' | 'disqualified';
  touches: TouchPoint[];
}

interface TouchPoint {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'demo' | 'webinar' | 'content' | 'ad';
  date: Date;
  channel: string;
  campaign?: string;
}

interface Attribution {
  opportunityId: string;
  touchPoints: Array<{
    touchPointId: string;
    type: string;
    channel: string;
    campaign?: string;
    influenceCredit: number;
  }>;
  model: 'first_touch' | 'last_touch' | 'linear' | 'time_decay' | 'w_shaped';
}

export class RevOpsAgent extends BaseAgentArchetype {
  constructor() {
    super(
      'AI RevOps',
      'revops',
      [
        'pipeline_analysis',
        'forecast_variance',
        'churn_prediction',
        'lead_scoring',
        'attribution_modeling',
        'revenue_analytics',
      ],
    );
  }

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initializing...`);
    // Setup CRM connections, load ML models, etc.
    console.log(`[${this.name}] Initialized successfully`);
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    const { requestId, mode } = context;

    try {
      // Default query: pipeline health
      const query: AgentQuery = {
        type: 'pipeline_health',
        parameters: {
          period: 'current_quarter',
          includeChurnRisk: true,
          includeForecastVariance: true,
          includeAttribution: false,
        },
      };

      const analysis = await this.analyze(query, context);
      const recommendations = await this.recommend(analysis, context);

      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime);

      return {
        requestId,
        success: true,
        data: {
          pipelineHealth: this.extractPipelineHealth(analysis),
          forecastVariance: this.extractForecastVariance(analysis),
          churnRisks: this.extractChurnRisks(analysis),
          analysis,
        },
        recommendations,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(false, responseTime);

      return {
        requestId,
        success: false,
        error: `RevOps execution failed: ${error.message}`,
      };
    }
  }

  async analyze(query: AgentQuery, context: AgentContext): Promise<AgentAnalysis> {
    const { type, parameters } = query;
    const findings: Finding[] = [];
    const insights: Insight[] = [];
    const recommendations: AgentRecommendation[] = [];

    switch (type) {
      case 'pipeline_health':
        await this.analyzePipelineHealth(parameters, context, findings, insights);
        break;

      case 'forecast_variance':
        await this.analyzeForecastVariance(parameters, context, findings, insights);
        break;

      case 'churn_risk':
        await this.analyzeChurnRisk(parameters, context, findings, insights);
        break;

      case 'lead_scoring':
        await this.analyzeLeadScoring(parameters, context, findings, insights);
        break;

      case 'attribution':
        await this.analyzeAttribution(parameters, context, findings, insights);
        break;

      default:
        throw new Error(`Unknown query type: ${type}`);
    }

    return {
      queryId: `analysis_${Date.now()}`,
      timestamp: new Date(),
      findings,
      insights,
      recommendations,
      confidence: 0.82,
    };
  }

  async recommend(analysis: AgentAnalysis, context: AgentContext): Promise<AgentRecommendation[]> {
    const recommendations: AgentRecommendation[] = [];

    // Generate recommendations from findings
    analysis.findings.forEach((finding) => {
      if (finding.type === 'pipeline' && finding.severity === 'high') {
        recommendations.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: `Clean up pipeline`,
          description: finding.description,
          reasoning: `Stale or inaccurate opportunities reduce forecast accuracy and hide real pipeline health.`,
          priority: 'high',
          estimatedImpact: 'Improve forecast accuracy by 10-15%',
          action: {
            type: 'create_tasks',
            parameters: {
              opportunities: finding.evidence.map((e) => e.id),
              task_type: 'update_opportunity',
            },
          },
        });
      }

      if (finding.type === 'churn' && finding.severity === 'critical') {
        recommendations.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: `Intervene on high churn risk accounts`,
          description: finding.description,
          reasoning: `High-value accounts showing strong churn signals. Immediate intervention required.`,
          priority: 'urgent',
          estimatedImpact: `Retain ${finding.evidence.reduce((sum, e) => sum + e.arr, 0).toLocaleString()} ARR`,
          requiredApprovals: ['VP_Sales', 'VP_Customer_Success'],
          action: {
            type: 'create_intervention_plan',
            parameters: {
              accounts: finding.evidence.map((e) => e.id),
            },
          },
        });
      }

      if (finding.type === 'forecast' && finding.severity === 'medium') {
        recommendations.push({
          id: `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          title: `Investigate forecast variance`,
          description: finding.description,
          reasoning: `Significant forecast change requires explanation and potentially revised planning.`,
          priority: 'high',
          action: {
            type: 'generate_variance_report',
            parameters: {
              period: finding.evidence[0]?.period,
            },
          },
        });
      }
    });

    return recommendations;
  }

  async act(recommendation: AgentRecommendation, context: AgentContext): Promise<AgentAction> {
    const action: AgentAction = {
      id: `action_${Date.now()}`,
      agentType: this.role,
      actionType: recommendation.action?.type || 'notify',
      parameters: recommendation.action?.parameters || {},
      policyResult: { allowed: false, policy: '' },
      approvalRequired: true,
      timestamp: new Date(),
    };

    // Evaluate policy
    action.policyResult = await this.evaluatePolicy(action, context);

    if (!action.policyResult.allowed) {
      action.error = 'Policy denied action';
      return action;
    }

    // Check if approval required
    action.approvalRequired = recommendation.requiredApprovals ? recommendation.requiredApprovals.length > 0 : false;

    // Execute action (stub)
    try {
      switch (action.actionType) {
        case 'create_tasks':
          action.result = await this.createTasks(action.parameters, context);
          break;

        case 'create_intervention_plan':
          action.result = await this.createInterventionPlan(action.parameters, context);
          break;

        case 'generate_variance_report':
          action.result = await this.generateVarianceReport(action.parameters, context);
          break;

        default:
          action.result = { status: 'completed' };
      }

      action.approvalStatus = action.approvalRequired ? 'pending' : 'approved';

      // Create audit log
      await this.createAuditLog(action, context);

      this.metrics.actionsExecuted++;
      if (action.approvalRequired) {
        this.metrics.approvalsRequired++;
      }
    } catch (error) {
      action.error = error.message;
    }

    return action;
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shutting down...`);
  }

  // Private analysis methods

  private async analyzePipelineHealth(
    parameters: any,
    context: AgentContext,
    findings: Finding[],
    insights: Insight[],
  ): Promise<void> {
    const opportunities = await this.getOpportunities(context, parameters.period);

    // Identify stale opportunities (>30 days no activity)
    const staleThreshold = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const stale = opportunities.filter((opp) => !opp.lastActivity || opp.lastActivity.getTime() < staleThreshold);

    if (stale.length > 0) {
      const staleValue = stale.reduce((sum, opp) => sum + opp.amount, 0);

      findings.push({
        id: `finding_stale_opps`,
        type: 'pipeline',
        severity: 'high',
        title: `${stale.length} stale opportunities ($${(staleValue / 1000).toFixed(0)}K)`,
        description: `${stale.length} opportunities have no activity in >30 days`,
        evidence: stale,
        impact: 'Inflates pipeline, reduces forecast accuracy',
      });
    }

    // Identify opportunities with missing data
    const missingData = opportunities.filter((opp) => !opp.closeDate || !opp.amount || !opp.stage);

    if (missingData.length > 0) {
      findings.push({
        id: `finding_missing_data`,
        type: 'pipeline',
        severity: 'medium',
        title: `${missingData.length} opportunities missing required data`,
        description: `Close date, amount, or stage missing`,
        evidence: missingData,
        impact: 'Cannot accurately forecast or report',
      });
    }

    // Calculate pipeline health score
    const totalValue = opportunities.reduce((sum, opp) => sum + opp.amount, 0);
    const weightedValue = opportunities.reduce((sum, opp) => sum + opp.amount * opp.probability, 0);
    const healthScore = Math.round(((opportunities.length - stale.length - missingData.length) / opportunities.length) * 100);

    insights.push({
      id: `insight_pipeline_health`,
      category: 'pipeline',
      summary: `Pipeline health: ${healthScore}% (${opportunities.length} opps, $${(totalValue / 1000000).toFixed(1)}M total)`,
      details: `Weighted value: $${(weightedValue / 1000000).toFixed(1)}M. ${stale.length} stale, ${missingData.length} missing data.`,
      confidence: 0.9,
    });

    // Analyze forecast variance if requested
    if (parameters.includeForecastVariance) {
      await this.analyzeForecastVariance(parameters, context, findings, insights);
    }

    // Analyze churn risk if requested
    if (parameters.includeChurnRisk) {
      await this.analyzeChurnRisk(parameters, context, findings, insights);
    }
  }

  private async analyzeForecastVariance(
    parameters: any,
    context: AgentContext,
    findings: Finding[],
    insights: Insight[],
  ): Promise<void> {
    const forecast = await this.getCurrentForecast(context, parameters.period);

    if (!forecast.previousCommit) {
      insights.push({
        id: `insight_forecast_no_previous`,
        category: 'forecast',
        summary: `No previous forecast for comparison`,
        details: `Current commit: $${(forecast.commit / 1000000).toFixed(1)}M`,
        confidence: 1.0,
      });
      return;
    }

    const delta = forecast.commit - forecast.previousCommit;
    const percentChange = (delta / forecast.previousCommit) * 100;

    if (Math.abs(percentChange) > 10) {
      findings.push({
        id: `finding_forecast_variance`,
        type: 'forecast',
        severity: Math.abs(percentChange) > 20 ? 'high' : 'medium',
        title: `Forecast changed ${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`,
        description: `Commit forecast changed by $${(delta / 1000000).toFixed(1)}M (${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%)`,
        evidence: [forecast],
        impact: 'May require revised resource planning or investor communication',
      });
    }

    // Waterfall analysis
    const waterfall = await this.calculateForecastWaterfall(context, parameters.period);

    insights.push({
      id: `insight_forecast_variance`,
      category: 'forecast',
      summary: `Forecast ${percentChange > 0 ? 'up' : 'down'} ${Math.abs(percentChange).toFixed(1)}% ($${(Math.abs(delta) / 1000000).toFixed(1)}M)`,
      details: `Waterfall: New +$${(waterfall.new / 1000).toFixed(0)}K, Moved In +$${(waterfall.movedIn / 1000).toFixed(0)}K, Moved Out -$${(waterfall.movedOut / 1000).toFixed(0)}K, Won +$${(waterfall.won / 1000).toFixed(0)}K, Lost -$${(waterfall.lost / 1000).toFixed(0)}K`,
      confidence: 0.85,
      supporting_data: [waterfall],
    });
  }

  private async analyzeChurnRisk(
    parameters: any,
    context: AgentContext,
    findings: Finding[],
    insights: Insight[],
  ): Promise<void> {
    const accounts = await this.getAccounts(context);

    // Calculate churn risk for each account (simple model)
    const atRisk = accounts.filter((account) => {
      const churnScore = this.calculateChurnRisk(account);
      return churnScore > 0.7;
    });

    const criticalRisk = atRisk.filter((account) => {
      const churnScore = this.calculateChurnRisk(account);
      return churnScore > 0.85;
    });

    if (criticalRisk.length > 0) {
      const atRiskARR = criticalRisk.reduce((sum, acc) => sum + acc.arr, 0);

      findings.push({
        id: `finding_critical_churn_risk`,
        type: 'churn',
        severity: 'critical',
        title: `${criticalRisk.length} accounts at critical churn risk ($${(atRiskARR / 1000).toFixed(0)}K ARR)`,
        description: `High churn risk signals: declining usage, support tickets, no engagement`,
        evidence: criticalRisk,
        impact: `Potential loss of $${(atRiskARR / 1000).toFixed(0)}K annual revenue`,
      });
    }

    const totalAtRiskARR = atRisk.reduce((sum, acc) => sum + acc.arr, 0);

    insights.push({
      id: `insight_churn_risk`,
      category: 'churn',
      summary: `${atRisk.length} accounts at churn risk ($${(totalAtRiskARR / 1000).toFixed(0)}K ARR, ${criticalRisk.length} critical)`,
      details: `Average health score of at-risk accounts: ${(atRisk.reduce((sum, a) => sum + a.healthScore, 0) / atRisk.length).toFixed(0)}`,
      confidence: 0.8,
    });
  }

  private async analyzeLeadScoring(
    parameters: any,
    context: AgentContext,
    findings: Finding[],
    insights: Insight[],
  ): Promise<void> {
    const leads = await this.getLeads(context);

    // Score leads (simple model based on touches, source, etc.)
    leads.forEach((lead) => {
      lead.score = this.calculateLeadScore(lead);
    });

    const highValue = leads.filter((l) => l.score > 80).sort((a, b) => b.score - a.score);

    insights.push({
      id: `insight_lead_scoring`,
      category: 'leads',
      summary: `${highValue.length} high-value leads (score >80)`,
      details: `Top leads: ${highValue.slice(0, 3).map((l) => `${l.name} (${l.score})`).join(', ')}`,
      confidence: 0.75,
      supporting_data: highValue,
    });
  }

  private async analyzeAttribution(
    parameters: any,
    context: AgentContext,
    findings: Finding[],
    insights: Insight[],
  ): Promise<void> {
    const opportunityId = parameters.opportunityId;
    const attribution = await this.calculateAttribution(opportunityId, context, 'w_shaped');

    insights.push({
      id: `insight_attribution`,
      category: 'attribution',
      summary: `Attribution for opportunity ${opportunityId}`,
      details: `Top channels: ${attribution.touchPoints.slice(0, 3).map((tp) => `${tp.channel} (${(tp.influenceCredit * 100).toFixed(0)}%)`).join(', ')}`,
      confidence: 0.7,
      supporting_data: [attribution],
    });
  }

  // Data retrieval methods (stubs)

  private async getOpportunities(context: AgentContext, period: string): Promise<Opportunity[]> {
    // TODO: Integrate with actual CRM (Salesforce, HubSpot, etc.)
    const now = Date.now();

    return [
      {
        id: 'opp_1',
        name: 'Acme Corp - Enterprise',
        accountId: 'acc_1',
        accountName: 'Acme Corp',
        amount: 250000,
        stage: 'Negotiation',
        closeDate: new Date(now + 30 * 24 * 60 * 60 * 1000),
        probability: 0.7,
        lastActivity: new Date(now - 2 * 24 * 60 * 60 * 1000),
        ownerId: 'rep_1',
        healthScore: 80,
      },
      {
        id: 'opp_2',
        name: 'TechStart Inc - Growth',
        accountId: 'acc_2',
        accountName: 'TechStart Inc',
        amount: 120000,
        stage: 'Proposal',
        closeDate: new Date(now + 45 * 24 * 60 * 60 * 1000),
        probability: 0.5,
        lastActivity: new Date(now - 35 * 24 * 60 * 60 * 1000), // Stale
        ownerId: 'rep_2',
        healthScore: 60,
      },
      {
        id: 'opp_3',
        name: 'InnovateCo - Starter',
        accountId: 'acc_3',
        accountName: 'InnovateCo',
        amount: 50000,
        stage: 'Qualified',
        closeDate: new Date(now + 60 * 24 * 60 * 60 * 1000),
        probability: 0.3,
        lastActivity: new Date(now - 5 * 24 * 60 * 60 * 1000),
        ownerId: 'rep_3',
        healthScore: 70,
      },
    ];
  }

  private async getCurrentForecast(context: AgentContext, period: string): Promise<Forecast> {
    // TODO: Integrate with actual forecasting system
    return {
      id: 'forecast_q4_2025',
      period: 'Q4 2025',
      commit: 4200000,
      bestCase: 5000000,
      pipeline: 8500000,
      closed: 1200000,
      previousCommit: 4000000,
    };
  }

  private async calculateForecastWaterfall(context: AgentContext, period: string): Promise<any> {
    // TODO: Calculate actual waterfall from opportunity changes
    return {
      new: 350000,
      movedIn: 100000,
      movedOut: 150000,
      won: 200000,
      lost: 100000,
    };
  }

  private async getAccounts(context: AgentContext): Promise<Account[]> {
    // TODO: Integrate with actual CRM and usage tracking
    const now = Date.now();

    return [
      {
        id: 'acc_1',
        name: 'Acme Corp',
        arr: 120000,
        healthScore: 85,
        churnRisk: 0.15,
        lastEngagement: new Date(now - 7 * 24 * 60 * 60 * 1000),
        supportTickets: 2,
        usageMetrics: { mau: 450, dau: 180, trend: 'up' },
      },
      {
        id: 'acc_2',
        name: 'TechStart Inc',
        arr: 80000,
        healthScore: 45,
        churnRisk: 0.75,
        lastEngagement: new Date(now - 60 * 24 * 60 * 60 * 1000),
        supportTickets: 15,
        usageMetrics: { mau: 120, dau: 30, trend: 'down' },
      },
      {
        id: 'acc_3',
        name: 'InnovateCo',
        arr: 50000,
        healthScore: 70,
        churnRisk: 0.30,
        lastEngagement: new Date(now - 14 * 24 * 60 * 60 * 1000),
        supportTickets: 5,
        usageMetrics: { mau: 200, dau: 80, trend: 'stable' },
      },
    ];
  }

  private async getLeads(context: AgentContext): Promise<Lead[]> {
    // TODO: Integrate with actual lead management system
    return [
      {
        id: 'lead_1',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Example Corp',
        source: 'webinar',
        score: 0,
        status: 'new',
        touches: [
          { id: 'touch_1', type: 'webinar', date: new Date(), channel: 'marketing', campaign: 'Q4 Webinar' },
          { id: 'touch_2', type: 'email', date: new Date(), channel: 'marketing', campaign: 'Nurture' },
        ],
      },
    ];
  }

  private async calculateAttribution(opportunityId: string, context: AgentContext, model: string): Promise<Attribution> {
    // TODO: Implement actual attribution calculation
    return {
      opportunityId,
      touchPoints: [
        { touchPointId: 'touch_1', type: 'webinar', channel: 'marketing', campaign: 'Q4 Webinar', influenceCredit: 0.3 },
        { touchPointId: 'touch_2', type: 'demo', channel: 'sales', influenceCredit: 0.4 },
        { touchPointId: 'touch_3', type: 'email', channel: 'marketing', campaign: 'Nurture', influenceCredit: 0.3 },
      ],
      model: 'w_shaped',
    };
  }

  // Action execution methods (stubs)

  private async createTasks(parameters: any, context: AgentContext): Promise<any> {
    // TODO: Integrate with actual task management system
    const tasks = parameters.opportunities.map((oppId: string) => ({
      id: `task_${Date.now()}_${oppId}`,
      opportunityId: oppId,
      type: parameters.task_type,
      status: 'created',
    }));

    return {
      tasksCreated: tasks.length,
      tasks,
    };
  }

  private async createInterventionPlan(parameters: any, context: AgentContext): Promise<any> {
    // TODO: Integrate with actual customer success system
    return {
      accounts: parameters.accounts,
      interventionType: 'executive_business_review',
      csmsAssigned: parameters.accounts.length,
      status: 'planned',
    };
  }

  private async generateVarianceReport(parameters: any, context: AgentContext): Promise<any> {
    // TODO: Generate actual variance report
    return {
      period: parameters.period,
      reportUrl: `https://summit.local/reports/forecast-variance-${parameters.period}.pdf`,
      status: 'generated',
    };
  }

  // Helper methods

  private calculateChurnRisk(account: Account): number {
    // Simple churn risk model
    let risk = 1 - account.healthScore / 100;

    // Adjust for engagement
    const daysSinceEngagement = (Date.now() - account.lastEngagement.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceEngagement > 60) risk += 0.3;
    else if (daysSinceEngagement > 30) risk += 0.15;

    // Adjust for support tickets
    if (account.supportTickets > 10) risk += 0.2;
    else if (account.supportTickets > 5) risk += 0.1;

    // Adjust for usage trend
    if (account.usageMetrics?.trend === 'down') risk += 0.25;
    else if (account.usageMetrics?.trend === 'up') risk -= 0.1;

    return Math.min(Math.max(risk, 0), 1);
  }

  private calculateLeadScore(lead: Lead): number {
    // Simple lead scoring model
    let score = 0;

    // Base score by source
    const sourceScores: Record<string, number> = {
      referral: 40,
      webinar: 30,
      demo: 35,
      content: 20,
      ad: 15,
    };
    score += sourceScores[lead.source] || 10;

    // Add points for touches
    score += Math.min(lead.touches.length * 5, 30);

    // Add points for high-intent touches (demo, meeting)
    const highIntentTouches = lead.touches.filter((t) => t.type === 'demo' || t.type === 'meeting').length;
    score += highIntentTouches * 10;

    // Add points for recent activity
    const mostRecentTouch = lead.touches.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
    if (mostRecentTouch) {
      const daysSince = (Date.now() - mostRecentTouch.date.getTime()) / (24 * 60 * 60 * 1000);
      if (daysSince < 7) score += 20;
      else if (daysSince < 30) score += 10;
    }

    return Math.min(score, 100);
  }

  private extractPipelineHealth(analysis: AgentAnalysis): any {
    const pipelineInsight = analysis.insights.find((i) => i.category === 'pipeline');

    if (pipelineInsight) {
      const issues = analysis.findings.filter((f) => f.type === 'pipeline');

      return {
        score: parseInt(pipelineInsight.summary.match(/(\d+)%/)?.[1] || '0'),
        summary: pipelineInsight.summary,
        details: pipelineInsight.details,
        issues: issues.map((f) => ({
          type: f.id,
          severity: f.severity,
          title: f.title,
          count: f.evidence.length,
        })),
      };
    }

    return null;
  }

  private extractForecastVariance(analysis: AgentAnalysis): any {
    const forecastInsight = analysis.insights.find((i) => i.category === 'forecast');

    if (forecastInsight) {
      return {
        summary: forecastInsight.summary,
        details: forecastInsight.details,
        waterfall: forecastInsight.supporting_data?.[0],
      };
    }

    return null;
  }

  private extractChurnRisks(analysis: AgentAnalysis): any[] {
    const churnFinding = analysis.findings.find((f) => f.type === 'churn');

    if (churnFinding) {
      return churnFinding.evidence.map((account) => ({
        accountId: account.id,
        accountName: account.name,
        arr: account.arr,
        churnRiskScore: this.calculateChurnRisk(account),
        healthScore: account.healthScore,
        signals: this.getChurnSignals(account),
      }));
    }

    return [];
  }

  private getChurnSignals(account: Account): string[] {
    const signals: string[] = [];

    const daysSince = (Date.now() - account.lastEngagement.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSince > 60) signals.push('no_engagement_60d');
    else if (daysSince > 30) signals.push('limited_engagement_30d');

    if (account.supportTickets > 10) signals.push('high_support_tickets');
    if (account.usageMetrics?.trend === 'down') signals.push('declining_usage');
    if (account.healthScore < 50) signals.push('low_health_score');

    return signals;
  }
}
