// Status Page Integration & Communications Templates
// Sprint 26: GA Cutover communication automation

import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';

export interface StatusPageConfig {
  page_id: string;
  api_key: string;
  base_url: string;
}

export interface CommunicationTemplate {
  name: string;
  type: 'slack' | 'email' | 'status_page' | 'customer';
  subject?: string;
  content: string;
  variables: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface IncidentData {
  name: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  impact: 'none' | 'minor' | 'major' | 'critical';
  components: string[];
  body: string;
  metadata?: Record<string, any>;
}

export class StatusPageIntegration extends EventEmitter {
  private config: StatusPageConfig;
  private api: AxiosInstance;
  private templates: Map<string, CommunicationTemplate>;

  constructor(config: StatusPageConfig) {
    super();
    this.config = config;
    this.templates = new Map();

    this.api = axios.create({
      baseURL: this.config.base_url,
      headers: {
        'Authorization': `OAuth ${this.config.api_key}`,
        'Content-Type': 'application/json'
      }
    });

    this.loadTemplates();
  }

  private loadTemplates(): void {
    // GA Cutover Communication Templates
    const templates: CommunicationTemplate[] = [
      {
        name: 'cutover_start',
        type: 'status_page',
        subject: 'IntelGraph GA Cutover - Maintenance Window Started',
        content: `🚀 **IntelGraph GA Cutover - Sprint 26**

We have begun our General Availability cutover process. This maintenance window is scheduled for 2 hours ({{start_time}} - {{end_time}} UTC).

**What's happening:**
- Gradual traffic migration to new GA-ready infrastructure
- Enhanced security features (WebAuthn, policy enforcement)
- Cost optimization and performance improvements

**Expected impact:**
- No service interruption expected
- Some users may experience brief authentication prompts
- Performance may improve during the cutover

**Current status:** {{current_stage}}% traffic migrated

We'll provide updates every 30 minutes. Thank you for your patience.

🔗 **Real-time status:** {{dashboard_url}}`,
        variables: ['start_time', 'end_time', 'current_stage', 'dashboard_url'],
        urgency: 'medium'
      },

      {
        name: 'cutover_stage_update',
        type: 'status_page',
        subject: 'GA Cutover Progress Update - {{stage}}% Complete',
        content: `📊 **GA Cutover Progress Update**

✅ **Stage {{stage}}% completed successfully**
- Migration time: {{stage_duration}}
- All SLOs maintained
- No issues detected

**Next steps:**
{{#if final_stage}}
- Final validation in progress
- Cutover completion expected in {{eta_completion}}
{{else}}
- Proceeding to {{next_stage}}% traffic migration
- Next update in {{next_update_time}}
{{/if}}

**Performance metrics:**
- API latency: {{api_latency_p95}}ms (target: ≤350ms)
- Error rate: {{error_rate}}% (target: ≤0.1%)
- Cache hit rate: {{cache_hit_rate}}%

All systems operating normally.`,
        variables: ['stage', 'stage_duration', 'final_stage', 'eta_completion', 'next_stage', 'next_update_time', 'api_latency_p95', 'error_rate', 'cache_hit_rate'],
        urgency: 'low'
      },

      {
        name: 'cutover_completed',
        type: 'status_page',
        subject: 'IntelGraph GA Cutover Completed Successfully',
        content: `🎉 **IntelGraph GA Cutover Completed Successfully**

Our General Availability cutover has been completed successfully!

**What's new:**
✅ Enhanced enterprise security (WebAuthn step-up authentication)
✅ Improved performance and reliability
✅ Advanced cost optimization
✅ Full SLSA-3 supply chain security

**Final metrics:**
- Total cutover time: {{total_duration}}
- Peak latency: {{peak_latency}}ms
- Zero downtime achieved
- All SLOs maintained

**Next steps:**
- 24-hour monitoring period continues
- All new features now active
- Support team standing by

Thank you for your patience during this important upgrade!

For any questions, please contact support@intelgraph.dev`,
        variables: ['total_duration', 'peak_latency'],
        urgency: 'low'
      },

      {
        name: 'rollback_initiated',
        type: 'status_page',
        subject: 'GA Cutover Rollback Initiated',
        content: `⚠️ **GA Cutover Rollback Initiated**

We have initiated a rollback of our GA cutover due to {{rollback_reason}}.

**Current status:**
- Rollback in progress
- Traffic being redirected to stable infrastructure
- Service restoration expected within {{eta_restoration}}

**What we're doing:**
1. Immediate traffic reduction to 0%
2. Deploying previous stable version
3. Disabling new features temporarily
4. Verifying system stability

**Impact:**
- Brief service interruption possible
- Some users may need to re-authenticate
- Recent changes may be temporarily unavailable

We'll provide updates every 15 minutes until resolution.

Status: {{rollback_status}}`,
        variables: ['rollback_reason', 'eta_restoration', 'rollback_status'],
        urgency: 'critical'
      },

      {
        name: 'rollback_completed',
        type: 'status_page',
        subject: 'Rollback Completed - Service Restored',
        content: `✅ **Rollback Completed - Service Restored**

The rollback has been completed successfully. All services have been restored to their previous stable state.

**Resolution summary:**
- Rollback completed in {{rollback_duration}}
- All services now operational
- System performance returned to baseline
- No data loss occurred

**What happened:**
{{incident_summary}}

**Next steps:**
- Post-incident review scheduled for {{review_date}}
- GA cutover rescheduled pending investigation
- All systems under enhanced monitoring

We apologize for any inconvenience and appreciate your patience.`,
        variables: ['rollback_duration', 'incident_summary', 'review_date'],
        urgency: 'medium'
      },

      {
        name: 'emergency_maintenance',
        type: 'status_page',
        subject: 'Emergency Maintenance - Cost Guardrails Activated',
        content: `🚨 **Emergency Maintenance - Cost Guardrails Activated**

Our automated cost guardrails have been activated due to budget threshold exceeded.

**Current status:**
- Emergency cost management mode active
- Some non-essential features temporarily limited
- Core functionality remains available

**Affected services:**
{{#each affected_services}}
- {{name}}: {{impact}}
{{/each}}

**Expected duration:** {{estimated_duration}}

We're working to resolve this quickly and will provide updates every 30 minutes.`,
        variables: ['affected_services', 'estimated_duration'],
        urgency: 'high'
      },

      {
        name: 'slack_war_room',
        type: 'slack',
        content: `🎯 **GA Cutover War Room Update**

**Stage:** {{stage}}% traffic migration
**Status:** {{status}}
**Duration:** {{elapsed_time}}

**Key Metrics:**
• API p95: {{api_latency}}ms (target: ≤350ms)
• Error rate: {{error_rate}}% (target: ≤0.1%)
• Cache hit: {{cache_hit_rate}}%

{{#if rollback_triggers}}
⚠️ **Rollback Triggers:** {{rollback_triggers}}
{{/if}}

**Next Action:** {{next_action}}
**ETA:** {{eta}}

Dashboard: {{dashboard_url}}`,
        variables: ['stage', 'status', 'elapsed_time', 'api_latency', 'error_rate', 'cache_hit_rate', 'rollback_triggers', 'next_action', 'eta', 'dashboard_url'],
        urgency: 'medium'
      },

      {
        name: 'customer_email',
        type: 'email',
        subject: 'IntelGraph Platform Enhancement Complete',
        content: `Dear {{customer_name}},

We're excited to announce that IntelGraph has successfully completed a major platform enhancement as part of our General Availability milestone.

**What's improved:**
🔒 **Enhanced Security**: Advanced authentication and authorization
⚡ **Better Performance**: Optimized query processing and caching
💰 **Cost Efficiency**: Intelligent resource management
🛡️ **Supply Chain Security**: Full provenance verification

**For your organization:**
- {{#if enterprise_customer}}Enhanced enterprise features now available{{/if}}
- Improved API response times
- Better security compliance (SOC2, ISO27001)
- More reliable service with improved SLOs

**Action required:** None - all improvements are automatic.

**Questions?** Our support team is standing by:
- Email: support@intelgraph.dev
- Slack: {{customer_slack_channel}}
- Documentation: {{docs_url}}

Thank you for being a valued IntelGraph customer!

Best regards,
The IntelGraph Team`,
        variables: ['customer_name', 'enterprise_customer', 'customer_slack_channel', 'docs_url'],
        urgency: 'low'
      },

      {
        name: 'internal_incident',
        type: 'slack',
        content: `🚨 **INCIDENT ALERT**

**Severity:** {{severity}}
**Component:** {{component}}
**Description:** {{description}}

**Impact:** {{impact}}
**Current Status:** {{status}}

**War Room:** {{war_room_link}}
**Incident Commander:** {{incident_commander}}
**Next Update:** {{next_update}}

**Actions Taken:**
{{#each actions}}
• {{this}}
{{/each}}

**Monitoring:** {{monitoring_dashboard}}`,
        variables: ['severity', 'component', 'description', 'impact', 'status', 'war_room_link', 'incident_commander', 'next_update', 'actions', 'monitoring_dashboard'],
        urgency: 'critical'
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.name, template);
    });
  }

  async createIncident(incident: IncidentData): Promise<string> {
    try {
      const response = await this.api.post(`/pages/${this.config.page_id}/incidents`, {
        incident: {
          name: incident.name,
          status: incident.status,
          impact_override: incident.impact,
          component_ids: incident.components,
          body: incident.body,
          metadata: incident.metadata || {}
        }
      });

      const incidentId = response.data.id;
      console.log(`✅ Created status page incident: ${incidentId}`);

      this.emit('incident_created', {
        incident_id: incidentId,
        name: incident.name,
        status: incident.status
      });

      return incidentId;
    } catch (error) {
      console.error('Failed to create status page incident:', error);
      throw error;
    }
  }

  async updateIncident(incidentId: string, updates: Partial<IncidentData>): Promise<void> {
    try {
      await this.api.patch(`/pages/${this.config.page_id}/incidents/${incidentId}`, {
        incident: updates
      });

      console.log(`✅ Updated status page incident: ${incidentId}`);

      this.emit('incident_updated', {
        incident_id: incidentId,
        updates
      });
    } catch (error) {
      console.error('Failed to update status page incident:', error);
      throw error;
    }
  }

  async resolveIncident(incidentId: string, resolutionMessage: string): Promise<void> {
    try {
      await this.api.patch(`/pages/${this.config.page_id}/incidents/${incidentId}`, {
        incident: {
          status: 'resolved',
          body: resolutionMessage
        }
      });

      console.log(`✅ Resolved status page incident: ${incidentId}`);

      this.emit('incident_resolved', {
        incident_id: incidentId,
        resolution: resolutionMessage
      });
    } catch (error) {
      console.error('Failed to resolve status page incident:', error);
      throw error;
    }
  }

  async postIncidentUpdate(incidentId: string, updateBody: string): Promise<void> {
    try {
      await this.api.post(`/pages/${this.config.page_id}/incidents/${incidentId}/incident_updates`, {
        incident_update: {
          body: updateBody,
          status: 'investigating'
        }
      });

      console.log(`✅ Posted incident update: ${incidentId}`);
    } catch (error) {
      console.error('Failed to post incident update:', error);
      throw error;
    }
  }

  renderTemplate(templateName: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    let content = template.content;

    // Simple variable replacement
    template.variables.forEach(variable => {
      const value = variables[variable] || `{{${variable}}}`;
      const regex = new RegExp(`{{${variable}}}`, 'g');
      content = content.replace(regex, String(value));
    });

    // Handle conditional blocks (basic implementation)
    content = content.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, block) => {
      return variables[condition] ? block : '';
    });

    // Handle each blocks (basic implementation)
    content = content.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, block) => {
      const array = variables[arrayName];
      if (!Array.isArray(array)) return '';

      return array.map(item => {
        let itemBlock = block;
        if (typeof item === 'object') {
          Object.keys(item).forEach(key => {
            itemBlock = itemBlock.replace(new RegExp(`{{${key}}}`, 'g'), item[key]);
          });
        } else {
          itemBlock = itemBlock.replace(/{{this}}/g, String(item));
        }
        return itemBlock;
      }).join('');
    });

    return content;
  }

  async sendCommunication(templateName: string, variables: Record<string, any>, channels?: string[]): Promise<void> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const content = this.renderTemplate(templateName, variables);

    switch (template.type) {
      case 'status_page':
        await this.postStatusPageUpdate(content, template.subject, variables);
        break;

      case 'slack':
        await this.sendSlackMessage(content, channels);
        break;

      case 'email':
        await this.sendEmail(template.subject || 'IntelGraph Update', content, variables.recipients);
        break;

      case 'customer':
        await this.sendCustomerCommunication(content, template.subject, variables);
        break;

      default:
        console.warn('Unknown communication type:', template.type);
    }
  }

  private async postStatusPageUpdate(content: string, title?: string, variables?: Record<string, any>): Promise<void> {
    try {
      // If this is for an active incident, update it
      if (variables?.incident_id) {
        await this.postIncidentUpdate(variables.incident_id, content);
      } else {
        // Create new incident
        await this.createIncident({
          name: title || 'IntelGraph Update',
          status: 'monitoring',
          impact: 'none',
          components: [],
          body: content
        });
      }
    } catch (error) {
      console.error('Failed to post status page update:', error);
      throw error;
    }
  }

  private async sendSlackMessage(content: string, channels?: string[]): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) {
      console.warn('Slack webhook URL not configured');
      return;
    }

    try {
      const payload = {
        text: content,
        channels: channels,
        username: 'IntelGraph Bot',
        icon_emoji: ':robot_face:'
      };

      await axios.post(webhookUrl, payload);
      console.log('✅ Sent Slack message');
    } catch (error) {
      console.error('Failed to send Slack message:', error);
      throw error;
    }
  }

  private async sendEmail(subject: string, content: string, recipients?: string[]): Promise<void> {
    // This would integrate with your email service (SendGrid, SES, etc.)
    console.log('📧 Email would be sent:', {
      subject,
      recipients: recipients || ['team@intelgraph.dev'],
      content: content.substring(0, 100) + '...'
    });

    this.emit('email_sent', {
      subject,
      recipients,
      timestamp: new Date()
    });
  }

  private async sendCustomerCommunication(content: string, subject?: string, variables?: Record<string, any>): Promise<void> {
    // This would integrate with your customer communication platform
    console.log('👥 Customer communication would be sent:', {
      subject,
      customer_segment: variables?.customer_segment || 'all',
      content: content.substring(0, 100) + '...'
    });

    this.emit('customer_communication_sent', {
      subject,
      variables,
      timestamp: new Date()
    });
  }

  // Pre-defined communication workflows for GA cutover
  async startCutoverCommunications(cutoverData: {
    start_time: string;
    end_time: string;
    dashboard_url: string;
  }): Promise<string> {
    console.log('📢 Starting GA cutover communications');

    // Create status page incident
    const incidentId = await this.createIncident({
      name: 'IntelGraph GA Cutover - Sprint 26',
      status: 'monitoring',
      impact: 'none',
      components: [],
      body: this.renderTemplate('cutover_start', cutoverData)
    });

    // Send internal war room notification
    await this.sendCommunication('slack_war_room', {
      ...cutoverData,
      stage: 0,
      status: 'Starting',
      elapsed_time: '0m',
      api_latency: 'baseline',
      error_rate: '0.0',
      cache_hit_rate: '85',
      next_action: 'Deploy 5% canary',
      eta: '15 minutes'
    }, ['#ga-cutover-war-room']);

    return incidentId;
  }

  async updateCutoverProgress(incidentId: string, progressData: {
    stage: number;
    stage_duration: string;
    api_latency_p95: number;
    error_rate: number;
    cache_hit_rate: number;
    final_stage?: boolean;
    next_stage?: number;
  }): Promise<void> {
    console.log(`📊 Updating cutover progress: ${progressData.stage}%`);

    // Update status page
    await this.sendCommunication('cutover_stage_update', {
      ...progressData,
      incident_id: incidentId,
      next_update_time: '30 minutes',
      eta_completion: '60 minutes'
    });

    // Update war room
    await this.sendCommunication('slack_war_room', {
      stage: progressData.stage,
      status: 'In Progress',
      elapsed_time: progressData.stage_duration,
      api_latency: progressData.api_latency_p95,
      error_rate: progressData.error_rate,
      cache_hit_rate: progressData.cache_hit_rate,
      next_action: progressData.final_stage ? 'Final validation' : `Deploy ${progressData.next_stage}% canary`,
      eta: progressData.final_stage ? '30 minutes' : '15 minutes',
      dashboard_url: 'https://grafana.intelgraph.dev/d/war-room'
    }, ['#ga-cutover-war-room']);
  }

  async completeCutover(incidentId: string, completionData: {
    total_duration: string;
    peak_latency: number;
  }): Promise<void> {
    console.log('🎉 Completing cutover communications');

    // Resolve status page incident
    const resolutionMessage = this.renderTemplate('cutover_completed', completionData);
    await this.resolveIncident(incidentId, resolutionMessage);

    // Send customer communications
    await this.sendCommunication('customer_email', {
      customer_name: '{{customer_name}}',
      enterprise_customer: true,
      customer_slack_channel: '{{customer_slack_channel}}',
      docs_url: 'https://docs.intelgraph.dev'
    });

    // Final war room update
    await this.sendCommunication('slack_war_room', {
      stage: 100,
      status: '✅ COMPLETED',
      elapsed_time: completionData.total_duration,
      api_latency: completionData.peak_latency,
      error_rate: '0.0',
      cache_hit_rate: '90',
      next_action: '24h monitoring period',
      eta: 'Ongoing',
      dashboard_url: 'https://grafana.intelgraph.dev/d/war-room'
    }, ['#ga-cutover-war-room']);
  }

  async initiateRollbackCommunications(rollbackData: {
    rollback_reason: string;
    eta_restoration: string;
  }): Promise<string> {
    console.log('🚨 Initiating rollback communications');

    // Create emergency incident
    const incidentId = await this.createIncident({
      name: 'GA Cutover Rollback - Service Restoration',
      status: 'investigating',
      impact: 'major',
      components: [],
      body: this.renderTemplate('rollback_initiated', {
        ...rollbackData,
        rollback_status: 'In Progress'
      })
    });

    // Send critical internal alert
    await this.sendCommunication('internal_incident', {
      severity: 'CRITICAL',
      component: 'GA Cutover',
      description: `Rollback initiated: ${rollbackData.rollback_reason}`,
      impact: 'Service degradation possible',
      status: 'Rollback in progress',
      war_room_link: 'https://zoom.us/j/ga-cutover-war-room',
      incident_commander: 'SRE On-call',
      next_update: '15 minutes',
      actions: ['Traffic reduced to 0%', 'Previous version deploying', 'Features disabled'],
      monitoring_dashboard: 'https://grafana.intelgraph.dev/d/war-room'
    }, ['#sre-alerts', '#ga-cutover-war-room']);

    return incidentId;
  }

  getTemplate(name: string): CommunicationTemplate | undefined {
    return this.templates.get(name);
  }

  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}

// CLI for communications management
export class CommunicationsCLI {
  private statusPage: StatusPageIntegration;

  constructor() {
    const config: StatusPageConfig = {
      page_id: process.env.STATUS_PAGE_ID || 'intelgraph',
      api_key: process.env.STATUS_PAGE_API_KEY || '',
      base_url: process.env.STATUS_PAGE_URL || 'https://api.statuspage.io/v1'
    };

    this.statusPage = new StatusPageIntegration(config);
  }

  async run(args: string[]): Promise<void> {
    const command = args[0] || 'help';

    switch (command) {
      case 'list-templates':
        const templates = this.statusPage.listTemplates();
        console.log('Available templates:');
        templates.forEach(name => console.log(`  - ${name}`));
        break;

      case 'render':
        const templateName = args[1];
        const variablesJson = args[2];
        if (!templateName || !variablesJson) {
          console.error('Usage: render <template_name> <variables_json>');
          process.exit(1);
        }
        const variables = JSON.parse(variablesJson);
        const rendered = this.statusPage.renderTemplate(templateName, variables);
        console.log(rendered);
        break;

      case 'send':
        const sendTemplate = args[1];
        const sendVariables = args[2];
        const channels = args[3] ? args[3].split(',') : undefined;
        if (!sendTemplate || !sendVariables) {
          console.error('Usage: send <template_name> <variables_json> [channels]');
          process.exit(1);
        }
        await this.statusPage.sendCommunication(sendTemplate, JSON.parse(sendVariables), channels);
        console.log(`✅ Communication sent using template: ${sendTemplate}`);
        break;

      case 'start-cutover':
        const cutoverData = JSON.parse(args[1] || '{}');
        const incidentId = await this.statusPage.startCutoverCommunications(cutoverData);
        console.log(`✅ Cutover communications started. Incident ID: ${incidentId}`);
        break;

      case 'help':
      default:
        console.log(`
Communications CLI - GA Cutover

USAGE:
  communications-cli <command> [options]

COMMANDS:
  list-templates                    List available communication templates
  render <template> <variables>     Render template with variables (JSON)
  send <template> <variables> [channels]  Send communication
  start-cutover <data>             Start cutover communication flow

EXAMPLES:
  communications-cli list-templates
  communications-cli render cutover_start '{"start_time": "09:00", "end_time": "11:00"}'
  communications-cli start-cutover '{"start_time": "2025-09-17T09:00:00Z", "end_time": "2025-09-17T11:00:00Z"}'
        `);
        break;
    }
  }
}

// Export for use as module or CLI
if (require.main === module) {
  const cli = new CommunicationsCLI();
  cli.run(process.argv.slice(2)).catch(console.error);
}