import { PromptInjectionDefense, AIToolCall } from '../security/PromptInjectionDefense';
import { ReasonForAccessManager } from '../middleware/reasonForAccess';
import { EventEmitter } from 'events';

interface AIAssistantContext {
  user_id: string;
  tenant_id: string;
  investigation_id?: string;
  case_id?: string;
  session_id: string;
  permissions: string[];
  security_clearance?: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context: AIAssistantContext;
  tool_calls?: AIToolCall[];
  metadata?: {
    risk_score?: number;
    sanitized?: boolean;
    blocked_tools?: string[];
    reasoning?: string;
  };
}

interface AITool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
    required: string[];
  };
  security_level: 'public' | 'internal' | 'restricted' | 'classified';
  required_permissions: string[];
  handler: (parameters: any, context: AIAssistantContext) => Promise<any>;
}

/**
 * Secure AI Assistant with Tool Allowlist and Comprehensive Logging
 * Provides AI assistance while enforcing security policies and monitoring
 */
export class SecureAIAssistant extends EventEmitter {
  private promptDefense: PromptInjectionDefense;
  private reasonManager: ReasonForAccessManager;
  private availableTools: Map<string, AITool> = new Map();
  private conversationHistory: Map<string, AIMessage[]> = new Map();
  private toolCallLog: Array<{
    timestamp: Date;
    user_id: string;
    tool_name: string;
    parameters: any;
    success: boolean;
    error?: string;
    security_decision: 'allowed' | 'blocked' | 'sanitized';
  }> = [];

  constructor(
    promptDefense: PromptInjectionDefense,
    reasonManager: ReasonForAccessManager
  ) {
    super();
    this.promptDefense = promptDefense;
    this.reasonManager = reasonManager;
    
    this.initializeSecureTools();
    this.startSecurityMonitoring();
  }

  /**
   * Initialize secure AI tools with proper access controls
   */
  private initializeSecureTools(): void {
    const tools: AITool[] = [
      {
        name: 'search_entities',
        description: 'Search for entities in investigations with specified criteria',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query for entities' },
            investigation_id: { type: 'string', description: 'Investigation ID to search within' },
            entity_types: { type: 'array', description: 'Types of entities to search for' },
            limit: { type: 'number', description: 'Maximum number of results' }
          },
          required: ['query']
        },
        security_level: 'internal',
        required_permissions: ['investigation:read'],
        handler: this.handleSearchEntities.bind(this)
      },
      {
        name: 'get_investigation_summary',
        description: 'Get a summary of an investigation including key findings',
        parameters: {
          type: 'object',
          properties: {
            investigation_id: { type: 'string', description: 'Investigation ID', required: true }
          },
          required: ['investigation_id']
        },
        security_level: 'internal',
        required_permissions: ['investigation:read'],
        handler: this.handleGetInvestigationSummary.bind(this)
      },
      {
        name: 'analyze_relationships',
        description: 'Analyze relationships between entities in the current context',
        parameters: {
          type: 'object',
          properties: {
            entity_ids: { type: 'array', description: 'Entity IDs to analyze relationships for' },
            depth: { type: 'number', description: 'Relationship depth to analyze (1-3)' },
            relationship_types: { type: 'array', description: 'Types of relationships to include' }
          },
          required: ['entity_ids']
        },
        security_level: 'internal',
        required_permissions: ['entity:read', 'relationship:read'],
        handler: this.handleAnalyzeRelationships.bind(this)
      },
      {
        name: 'generate_timeline',
        description: 'Generate a timeline of events for investigation or case',
        parameters: {
          type: 'object',
          properties: {
            investigation_id: { type: 'string', description: 'Investigation ID' },
            case_id: { type: 'string', description: 'Case ID' },
            date_range: { type: 'object', description: 'Date range for timeline' },
            event_types: { type: 'array', description: 'Types of events to include' }
          },
          required: []
        },
        security_level: 'internal',
        required_permissions: ['investigation:read'],
        handler: this.handleGenerateTimeline.bind(this)
      },
      {
        name: 'export_analysis_report',
        description: 'Export an analysis report with current findings',
        parameters: {
          type: 'object',
          properties: {
            investigation_id: { type: 'string', description: 'Investigation ID' },
            report_type: { type: 'string', description: 'Type of report to generate' },
            format: { type: 'string', description: 'Export format (PDF, DOCX, JSON)' },
            reason_for_access: { type: 'string', description: 'Reason for exporting this report', required: true }
          },
          required: ['reason_for_access']
        },
        security_level: 'restricted',
        required_permissions: ['export:create', 'investigation:read'],
        handler: this.handleExportReport.bind(this)
      },
      {
        name: 'get_security_alerts',
        description: 'Retrieve current security alerts and their status',
        parameters: {
          type: 'object',
          properties: {
            severity: { type: 'string', description: 'Alert severity filter' },
            status: { type: 'string', description: 'Alert status filter' },
            limit: { type: 'number', description: 'Maximum number of alerts' }
          },
          required: []
        },
        security_level: 'internal',
        required_permissions: ['alert:read'],
        handler: this.handleGetSecurityAlerts.bind(this)
      },
      {
        name: 'calculate_risk_score',
        description: 'Calculate risk score for entities or investigations',
        parameters: {
          type: 'object',
          properties: {
            target_id: { type: 'string', description: 'ID of target to score' },
            target_type: { type: 'string', description: 'Type of target (entity, investigation)' },
            factors: { type: 'array', description: 'Risk factors to consider' }
          },
          required: ['target_id', 'target_type']
        },
        security_level: 'internal',
        required_permissions: ['analysis:read'],
        handler: this.handleCalculateRiskScore.bind(this)
      }
    ];

    tools.forEach(tool => {
      this.availableTools.set(tool.name, tool);
    });

    console.log(`Initialized ${tools.length} secure AI tools`);
  }

  /**
   * Process user message with full security enforcement
   */
  async processMessage(
    content: string,
    context: AIAssistantContext
  ): Promise<{
    response: string;
    safe: boolean;
    tool_calls: AIToolCall[];
    security_events: string[];
    reasoning?: string;
  }> {
    const securityEvents: string[] = [];
    
    try {
      // Sanitize input against prompt injection
      const sanitizationResult = this.promptDefense.sanitizeInput(content, {
        user_id: context.user_id,
        investigation_id: context.investigation_id,
        max_length: 8000
      });

      if (!sanitizationResult.safe) {
        securityEvents.push(`prompt_injection_detected: ${sanitizationResult.detected_attacks.length} patterns`);
        
        // Log security incident
        this.emit('security_incident', {
          type: 'prompt_injection_attempt',
          user_id: context.user_id,
          risk_score: sanitizationResult.risk_score,
          detected_patterns: sanitizationResult.detected_attacks,
          original_content: content
        });
      }

      // Use sanitized content
      const sanitizedContent = sanitizationResult.sanitized;

      // Create message record
      const message: AIMessage = {
        id: this.generateMessageId(),
        role: 'user',
        content: sanitizedContent,
        timestamp: new Date(),
        context,
        metadata: {
          risk_score: sanitizationResult.risk_score,
          sanitized: !sanitizationResult.safe
        }
      };

      // Store in conversation history
      this.addToConversationHistory(context.session_id, message);

      // Generate AI response with tool calls
      const aiResponse = await this.generateSecureResponse(sanitizedContent, context);
      
      // Validate and execute tool calls
      const validatedToolCalls: AIToolCall[] = [];
      const toolResults: any[] = [];

      for (const toolCall of aiResponse.tool_calls || []) {
        const validation = await this.validateAndExecuteToolCall(toolCall, context);
        
        if (validation.success) {
          validatedToolCalls.push(toolCall);
          toolResults.push(validation.result);
        } else {
          securityEvents.push(`tool_call_blocked: ${toolCall.name} - ${validation.reason}`);
        }
      }

      // Create assistant response
      const assistantMessage: AIMessage = {
        id: this.generateMessageId(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        context,
        tool_calls: validatedToolCalls,
        metadata: {
          blocked_tools: aiResponse.tool_calls?.filter(tc => 
            !validatedToolCalls.find(vtc => vtc.name === tc.name)
          ).map(tc => tc.name),
          reasoning: aiResponse.reasoning
        }
      };

      this.addToConversationHistory(context.session_id, assistantMessage);

      // Emit processing event for monitoring
      this.emit('message_processed', {
        user_id: context.user_id,
        session_id: context.session_id,
        security_events,
        tool_calls_executed: validatedToolCalls.length,
        risk_score: sanitizationResult.risk_score
      });

      return {
        response: aiResponse.content,
        safe: sanitizationResult.safe && securityEvents.length === 0,
        tool_calls: validatedToolCalls,
        security_events: securityEvents,
        reasoning: aiResponse.reasoning
      };

    } catch (error) {
      console.error('AI Assistant processing error:', error);
      
      this.emit('processing_error', {
        user_id: context.user_id,
        error: error.message,
        content_length: content.length
      });

      return {
        response: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        safe: false,
        tool_calls: [],
        security_events: ['processing_error']
      };
    }
  }

  /**
   * Validate and execute AI tool call with security controls
   */
  private async validateAndExecuteToolCall(
    toolCall: AIToolCall,
    context: AIAssistantContext
  ): Promise<{
    success: boolean;
    result?: any;
    reason?: string;
  }> {
    const tool = this.availableTools.get(toolCall.name);
    
    // Check if tool exists
    if (!tool) {
      this.logToolCall(toolCall, context, false, 'tool_not_found', 'blocked');
      return { success: false, reason: 'Tool not found' };
    }

    // Validate tool call using prompt defense
    const validation = this.promptDefense.validateToolCall(toolCall);
    if (!validation.allowed) {
      this.logToolCall(toolCall, context, false, validation.reason, 'blocked');
      return { success: false, reason: validation.reason };
    }

    // Check security level access
    const hasSecurityAccess = this.checkSecurityLevelAccess(tool.security_level, context);
    if (!hasSecurityAccess) {
      this.logToolCall(toolCall, context, false, 'insufficient_security_clearance', 'blocked');
      return { success: false, reason: 'Insufficient security clearance' };
    }

    // Check required permissions
    const hasPermissions = tool.required_permissions.every(permission => 
      context.permissions.includes(permission)
    );
    
    if (!hasPermissions) {
      this.logToolCall(toolCall, context, false, 'insufficient_permissions', 'blocked');
      return { success: false, reason: 'Insufficient permissions' };
    }

    // Special handling for export tools (require reason-for-access)
    if (tool.name.includes('export') && !toolCall.parameters.reason_for_access) {
      this.logToolCall(toolCall, context, false, 'missing_reason_for_access', 'blocked');
      return { success: false, reason: 'Export operations require reason-for-access' };
    }

    // Execute tool with sanitized parameters
    try {
      const result = await tool.handler(
        validation.sanitized_parameters || toolCall.parameters,
        context
      );

      this.logToolCall(toolCall, context, true, undefined, 'allowed');
      
      return { success: true, result };

    } catch (error) {
      console.error(`Tool execution error for ${toolCall.name}:`, error);
      this.logToolCall(toolCall, context, false, error.message, 'allowed');
      
      return { success: false, reason: `Tool execution failed: ${error.message}` };
    }
  }

  /**
   * Generate secure AI response (mock implementation)
   */
  private async generateSecureResponse(
    content: string,
    context: AIAssistantContext
  ): Promise<{
    content: string;
    tool_calls?: AIToolCall[];
    reasoning: string;
  }> {
    // This is a mock implementation. In production, this would integrate with
    // your chosen LLM (OpenAI, Anthropic, etc.) with proper security controls
    
    const isQuestion = content.includes('?');
    const mentionsSearch = content.toLowerCase().includes('search') || content.toLowerCase().includes('find');
    const mentionsExport = content.toLowerCase().includes('export') || content.toLowerCase().includes('download');
    const mentionsAnalysis = content.toLowerCase().includes('analyz') || content.toLowerCase().includes('relationship');

    let response = "I'm here to help with your intelligence analysis work. ";
    const toolCalls: AIToolCall[] = [];

    if (mentionsSearch) {
      response += "I can help you search for entities and information. ";
      
      // Extract search terms (simplified)
      const searchMatch = content.match(/search.+?for\s+([^.!?]+)/i);
      if (searchMatch) {
        toolCalls.push({
          name: 'search_entities',
          parameters: {
            query: searchMatch[1].trim(),
            investigation_id: context.investigation_id,
            limit: 20
          },
          timestamp: new Date(),
          context
        });
      }
    }

    if (mentionsAnalysis) {
      response += "I can analyze relationships and patterns in your data. ";
      
      if (context.investigation_id) {
        toolCalls.push({
          name: 'analyze_relationships',
          parameters: {
            investigation_id: context.investigation_id,
            depth: 2
          },
          timestamp: new Date(),
          context
        });
      }
    }

    if (mentionsExport) {
      response += "For export operations, I'll need a reason-for-access to proceed. ";
    }

    if (isQuestion && !mentionsSearch && !mentionsAnalysis && !mentionsExport) {
      response += "What specific aspect of your investigation would you like help with? I can search entities, analyze relationships, generate timelines, or calculate risk scores.";
    }

    return {
      content: response,
      tool_calls: toolCalls,
      reasoning: `Generated response based on user query patterns: search=${mentionsSearch}, analysis=${mentionsAnalysis}, export=${mentionsExport}`
    };
  }

  /**
   * Tool handler implementations
   */
  private async handleSearchEntities(parameters: any, context: AIAssistantContext): Promise<any> {
    // Mock implementation - in production, this would query your actual database
    return {
      entities: [
        {
          id: 'entity_1',
          type: 'person',
          name: `Search result for: ${parameters.query}`,
          confidence: 0.85,
          properties: {
            last_seen: new Date().toISOString(),
            risk_score: 0.3
          }
        }
      ],
      total_count: 1,
      query_time_ms: 45
    };
  }

  private async handleGetInvestigationSummary(parameters: any, context: AIAssistantContext): Promise<any> {
    return {
      investigation_id: parameters.investigation_id,
      title: "Sample Investigation",
      status: "active",
      created_at: new Date().toISOString(),
      summary: "This investigation involves analyzing network connections and entity relationships.",
      key_findings: [
        "Identified 15 related entities",
        "Detected 3 suspicious communication patterns",
        "Risk score: Medium (0.6)"
      ],
      entity_count: 15,
      relationship_count: 28
    };
  }

  private async handleAnalyzeRelationships(parameters: any, context: AIAssistantContext): Promise<any> {
    return {
      relationships: [
        {
          source: parameters.entity_ids[0],
          target: parameters.entity_ids[1] || 'entity_2',
          type: 'communicates_with',
          strength: 0.8,
          last_interaction: new Date().toISOString()
        }
      ],
      analysis_summary: "Strong communication patterns detected between entities",
      risk_assessment: "Medium risk based on interaction frequency"
    };
  }

  private async handleGenerateTimeline(parameters: any, context: AIAssistantContext): Promise<any> {
    return {
      timeline: [
        {
          timestamp: new Date().toISOString(),
          event_type: "entity_created",
          description: "Investigation entity identified",
          entities_involved: ["entity_1"]
        }
      ],
      time_range: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString()
      },
      event_count: 1
    };
  }

  private async handleExportReport(parameters: any, context: AIAssistantContext): Promise<any> {
    // This would integrate with your export system and require reason-for-access validation
    return {
      export_id: `export_${Date.now()}`,
      status: "initiated",
      format: parameters.format || 'PDF',
      reason_for_access: parameters.reason_for_access,
      estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };
  }

  private async handleGetSecurityAlerts(parameters: any, context: AIAssistantContext): Promise<any> {
    return {
      alerts: [
        {
          id: "alert_1",
          severity: "medium",
          status: "active",
          title: "Unusual network activity detected",
          created_at: new Date().toISOString()
        }
      ],
      total_count: 1
    };
  }

  private async handleCalculateRiskScore(parameters: any, context: AIAssistantContext): Promise<any> {
    return {
      target_id: parameters.target_id,
      risk_score: 0.65,
      risk_level: "medium",
      contributing_factors: [
        "High activity volume",
        "Unusual communication patterns",
        "Geographic anomalies"
      ],
      calculated_at: new Date().toISOString()
    };
  }

  /**
   * Utility methods
   */
  private checkSecurityLevelAccess(level: string, context: AIAssistantContext): boolean {
    const clearanceLevels = ['public', 'internal', 'restricted', 'classified'];
    const userClearance = context.security_clearance || 'internal';
    
    const requiredIndex = clearanceLevels.indexOf(level);
    const userIndex = clearanceLevels.indexOf(userClearance);
    
    return userIndex >= requiredIndex;
  }

  private logToolCall(
    toolCall: AIToolCall,
    context: AIAssistantContext,
    success: boolean,
    error?: string,
    securityDecision: 'allowed' | 'blocked' | 'sanitized' = 'allowed'
  ): void {
    this.toolCallLog.push({
      timestamp: new Date(),
      user_id: context.user_id,
      tool_name: toolCall.name,
      parameters: toolCall.parameters,
      success,
      error,
      security_decision: securityDecision
    });

    // Keep only last 10000 entries
    if (this.toolCallLog.length > 10000) {
      this.toolCallLog = this.toolCallLog.slice(-10000);
    }
  }

  private addToConversationHistory(sessionId: string, message: AIMessage): void {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    
    const history = this.conversationHistory.get(sessionId)!;
    history.push(message);
    
    // Keep only last 50 messages per session
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSecurityMonitoring(): void {
    // Monitor for suspicious patterns every 5 minutes
    setInterval(() => {
      this.analyzeSecurityMetrics();
    }, 5 * 60 * 1000);
  }

  private analyzeSecurityMetrics(): void {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    
    const recentLogs = this.toolCallLog.filter(
      log => log.timestamp.getTime() > lastHour
    );

    const blockedCalls = recentLogs.filter(log => log.security_decision === 'blocked').length;
    const totalCalls = recentLogs.length;
    const blockRate = totalCalls > 0 ? blockedCalls / totalCalls : 0;

    if (blockRate > 0.1) { // More than 10% blocked
      this.emit('high_block_rate', {
        block_rate: blockRate,
        blocked_calls: blockedCalls,
        total_calls: totalCalls,
        time_period: 'last_hour'
      });
    }
  }

  /**
   * Get security and usage statistics
   */
  getStatistics(): {
    total_tools: number;
    tool_calls_24h: number;
    blocked_calls_24h: number;
    top_blocked_tools: Array<{ tool: string; count: number }>;
    top_users_by_calls: Array<{ user_id: string; calls: number }>;
    security_incidents_24h: number;
  } {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentLogs = this.toolCallLog.filter(
      log => log.timestamp.getTime() > oneDayAgo
    );

    const blockedLogs = recentLogs.filter(log => log.security_decision === 'blocked');
    
    // Count blocked tools
    const blockedToolCount = new Map<string, number>();
    blockedLogs.forEach(log => {
      const count = blockedToolCount.get(log.tool_name) || 0;
      blockedToolCount.set(log.tool_name, count + 1);
    });

    // Count calls per user
    const userCallCount = new Map<string, number>();
    recentLogs.forEach(log => {
      const count = userCallCount.get(log.user_id) || 0;
      userCallCount.set(log.user_id, count + 1);
    });

    return {
      total_tools: this.availableTools.size,
      tool_calls_24h: recentLogs.length,
      blocked_calls_24h: blockedLogs.length,
      top_blocked_tools: Array.from(blockedToolCount.entries())
        .map(([tool, count]) => ({ tool, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      top_users_by_calls: Array.from(userCallCount.entries())
        .map(([user_id, calls]) => ({ user_id, calls }))
        .sort((a, b) => b.calls - a.calls)
        .slice(0, 10),
      security_incidents_24h: blockedLogs.length
    };
  }
}

export { SecureAIAssistant, AIAssistantContext, AIMessage, AITool };