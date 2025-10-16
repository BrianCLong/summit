/**
 * Interactive Documentation Engine
 *
 * Creates rich, interactive documentation experiences with:
 * - Live code examples and playgrounds
 * - Interactive API testing
 * - Real-time code validation
 * - Collaborative editing and commenting
 * - Embedded sandboxes and demos
 * - Progressive disclosure and guided tours
 * - Adaptive content based on user skill level
 * - Multi-language code examples
 */

import { EventEmitter } from 'events';

export interface InteractiveConfig {
  sandboxProvider: 'codesandbox' | 'stackblitz' | 'custom';
  enableLiveEditing: boolean;
  enableCollaboration: boolean;
  enableCodeValidation: boolean;
  supportedLanguages: string[];
  apiEndpoint?: string;
  authProvider?: 'github' | 'google' | 'custom';
  maxSandboxes: number;
  sessionTimeout: number;
}

export interface CodeExample {
  id: string;
  title: string;
  description: string;
  language: string;
  code: string;
  dependencies?: { [pkg: string]: string };
  files?: { [filename: string]: string };
  metadata: {
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    topics: string[];
    estimatedTime: number;
    prerequisites: string[];
  };
  interactive: {
    editable: boolean;
    runnable: boolean;
    collaborative: boolean;
    showLineNumbers: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
}

export interface APISandbox {
  id: string;
  title: string;
  description: string;
  apiEndpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: { [key: string]: string };
  parameters?: { [key: string]: APIParameter };
  requestBody?: any;
  examples: APIExample[];
  authentication?: {
    type: 'bearer' | 'apikey' | 'oauth2' | 'basic';
    config: any;
  };
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
  example: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    enum?: any[];
  };
}

export interface APIExample {
  name: string;
  description: string;
  request: {
    headers?: { [key: string]: string };
    parameters?: { [key: string]: any };
    body?: any;
  };
  response: {
    status: number;
    headers?: { [key: string]: string };
    body: any;
  };
}

export interface InteractiveSession {
  id: string;
  userId?: string;
  type: 'code' | 'api' | 'tutorial';
  contentId: string;
  createdAt: Date;
  lastActivity: Date;
  state: {
    currentCode: string;
    output: string;
    errors: string[];
    variables: { [key: string]: any };
  };
  participants?: string[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  lineNumber?: number;
  timestamp: Date;
  replies: Comment[];
  resolved: boolean;
}

export interface GuidedTour {
  id: string;
  title: string;
  description: string;
  steps: TourStep[];
  targetAudience: 'beginner' | 'intermediate' | 'advanced' | 'all';
  estimatedDuration: number;
  prerequisites: string[];
}

export interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector for highlight
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'type' | 'scroll' | 'wait';
  validation?: (state: any) => boolean;
  codeExample?: CodeExample;
  apiSandbox?: APISandbox;
}

export class InteractiveDocsEngine extends EventEmitter {
  private config: InteractiveConfig;
  private codeExamples: Map<string, CodeExample> = new Map();
  private apiSandboxes: Map<string, APISandbox> = new Map();
  private activeSessions: Map<string, InteractiveSession> = new Map();
  private guidedTours: Map<string, GuidedTour> = new Map();
  private collaborationManager: CollaborationManager;
  private validationEngine: CodeValidationEngine;

  constructor(config: InteractiveConfig) {
    super();
    this.config = config;
    this.collaborationManager = new CollaborationManager();
    this.validationEngine = new CodeValidationEngine();
  }

  /**
   * Initialize the interactive documentation engine
   */
  public async initialize(): Promise<void> {
    console.log('🎮 Initializing interactive documentation engine...');

    try {
      // Initialize collaboration features
      if (this.config.enableCollaboration) {
        await this.collaborationManager.initialize();
      }

      // Initialize code validation
      if (this.config.enableCodeValidation) {
        await this.validationEngine.initialize();
      }

      // Set up session cleanup
      this.setupSessionCleanup();

      console.log('✅ Interactive documentation engine initialized');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize interactive engine:', error);
      throw error;
    }
  }

  /**
   * Create a code example
   */
  public createCodeExample(example: CodeExample): void {
    this.codeExamples.set(example.id, example);
    this.emit('code_example_created', example.id);
  }

  /**
   * Create an API sandbox
   */
  public createAPISandbox(sandbox: APISandbox): void {
    this.apiSandboxes.set(sandbox.id, sandbox);
    this.emit('api_sandbox_created', sandbox.id);
  }

  /**
   * Start an interactive session
   */
  public async startSession(
    type: 'code' | 'api' | 'tutorial',
    contentId: string,
    userId?: string,
  ): Promise<InteractiveSession> {
    const sessionId = this.generateSessionId();

    const initialState: any = {};

    if (type === 'code') {
      const example = this.codeExamples.get(contentId);
      if (!example) throw new Error(`Code example ${contentId} not found`);
      initialState.currentCode = example.code;
    }

    const session: InteractiveSession = {
      id: sessionId,
      userId,
      type,
      contentId,
      createdAt: new Date(),
      lastActivity: new Date(),
      state: {
        currentCode: initialState.currentCode || '',
        output: '',
        errors: [],
        variables: {},
      },
      participants: userId ? [userId] : [],
      comments: [],
    };

    this.activeSessions.set(sessionId, session);

    // Set up auto-save
    this.setupAutoSave(sessionId);

    this.emit('session_started', sessionId);
    return session;
  }

  /**
   * Execute code in sandbox
   */
  public async executeCode(
    sessionId: string,
    code: string,
  ): Promise<ExecutionResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    try {
      // Validate code if enabled
      if (this.config.enableCodeValidation) {
        const validation = await this.validationEngine.validate(
          code,
          session.contentId,
        );
        if (!validation.valid) {
          return {
            success: false,
            output: '',
            errors: validation.errors,
            executionTime: 0,
          };
        }
      }

      const startTime = Date.now();
      const result = await this.runCode(code, session);
      const executionTime = Date.now() - startTime;

      // Update session state
      session.state.currentCode = code;
      session.state.output = result.output;
      session.state.errors = result.errors;
      session.lastActivity = new Date();

      const executionResult: ExecutionResult = {
        success: result.success,
        output: result.output,
        errors: result.errors,
        executionTime,
        console: result.console,
        variables: result.variables,
      };

      this.emit('code_executed', sessionId, executionResult);
      return executionResult;
    } catch (error) {
      const executionResult: ExecutionResult = {
        success: false,
        output: '',
        errors: [error.message],
        executionTime: 0,
      };

      this.emit('code_execution_error', sessionId, error);
      return executionResult;
    }
  }

  /**
   * Test API endpoint
   */
  public async testAPIEndpoint(
    sessionId: string,
    request: APIRequest,
  ): Promise<APIResponse> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const sandbox = this.apiSandboxes.get(session.contentId);
    if (!sandbox) throw new Error(`API sandbox ${session.contentId} not found`);

    try {
      const response = await this.makeAPIRequest(sandbox, request);

      session.lastActivity = new Date();
      this.emit('api_tested', sessionId, response);

      return response;
    } catch (error) {
      const errorResponse: APIResponse = {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        data: { error: error.message },
        executionTime: 0,
      };

      this.emit('api_test_error', sessionId, error);
      return errorResponse;
    }
  }

  /**
   * Add comment to session
   */
  public async addComment(
    sessionId: string,
    userId: string,
    userName: string,
    content: string,
    lineNumber?: number,
  ): Promise<Comment> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const comment: Comment = {
      id: this.generateCommentId(),
      userId,
      userName,
      content,
      lineNumber,
      timestamp: new Date(),
      replies: [],
      resolved: false,
    };

    session.comments.push(comment);
    session.lastActivity = new Date();

    // Notify collaborators
    if (this.config.enableCollaboration) {
      await this.collaborationManager.notifyComment(sessionId, comment);
    }

    this.emit('comment_added', sessionId, comment);
    return comment;
  }

  /**
   * Create guided tour
   */
  public createGuidedTour(tour: GuidedTour): void {
    this.guidedTours.set(tour.id, tour);
    this.emit('guided_tour_created', tour.id);
  }

  /**
   * Start guided tour
   */
  public async startGuidedTour(
    tourId: string,
    userId?: string,
  ): Promise<TourSession> {
    const tour = this.guidedTours.get(tourId);
    if (!tour) throw new Error(`Guided tour ${tourId} not found`);

    const sessionId = this.generateSessionId();
    const tourSession: TourSession = {
      id: sessionId,
      tourId,
      userId,
      currentStep: 0,
      startedAt: new Date(),
      completedSteps: [],
      progress: 0,
      state: {},
    };

    this.emit('guided_tour_started', tourSession);
    return tourSession;
  }

  /**
   * Generate embeddable widget
   */
  public generateEmbeddableWidget(
    type: 'code' | 'api' | 'tour',
    contentId: string,
    options: EmbedOptions = {},
  ): string {
    const widgetId = `interactive-widget-${Date.now()}`;

    const config = {
      type,
      contentId,
      apiEndpoint: this.config.apiEndpoint,
      theme: options.theme || 'light',
      height: options.height || 400,
      width: options.width || '100%',
      features: {
        liveEditing:
          options.enableLiveEditing !== false && this.config.enableLiveEditing,
        collaboration:
          options.enableCollaboration !== false &&
          this.config.enableCollaboration,
        validation:
          options.enableValidation !== false &&
          this.config.enableCodeValidation,
      },
    };

    return `
<div id="${widgetId}" class="interactive-docs-widget">
  <div class="widget-loading">Loading interactive content...</div>
</div>
<script>
(function() {
  const config = ${JSON.stringify(config)};
  
  // Load the interactive widget
  const script = document.createElement('script');
  script.src = '${this.config.apiEndpoint}/widget.js';
  script.onload = function() {
    window.InteractiveDocsWidget.init('${widgetId}', config);
  };
  document.head.appendChild(script);
})();
</script>
    `;
  }

  /**
   * Get session analytics
   */
  public async getSessionAnalytics(
    startDate: Date,
    endDate: Date,
    filters?: { [key: string]: any },
  ): Promise<SessionAnalytics> {
    const sessions = Array.from(this.activeSessions.values()).filter(
      (session) =>
        session.createdAt >= startDate && session.createdAt <= endDate,
    );

    return {
      totalSessions: sessions.length,
      uniqueUsers: new Set(sessions.map((s) => s.userId).filter(Boolean)).size,
      averageSessionDuration: this.calculateAverageSessionDuration(sessions),
      codeExecutions: await this.getCodeExecutionStats(sessions),
      apiTests: await this.getAPITestStats(sessions),
      mostPopularExamples: await this.getMostPopularExamples(sessions),
      userEngagement: await this.getUserEngagementMetrics(sessions),
      errorRates: await this.getErrorRates(sessions),
    };
  }

  // Private methods
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15);
  }

  private generateCommentId(): string {
    return 'comment_' + Math.random().toString(36).substring(2, 15);
  }

  private async runCode(
    code: string,
    session: InteractiveSession,
  ): Promise<any> {
    // This would integrate with actual code execution environment
    // For security, this should run in isolated sandboxes

    switch (this.config.sandboxProvider) {
      case 'codesandbox':
        return await this.runInCodeSandbox(code, session);
      case 'stackblitz':
        return await this.runInStackBlitz(code, session);
      case 'custom':
        return await this.runInCustomSandbox(code, session);
      default:
        throw new Error(
          `Unsupported sandbox provider: ${this.config.sandboxProvider}`,
        );
    }
  }

  private async runInCodeSandbox(
    code: string,
    session: InteractiveSession,
  ): Promise<any> {
    // CodeSandbox integration
    return {
      success: true,
      output: 'Code executed successfully',
      errors: [],
      console: [],
      variables: {},
    };
  }

  private async runInStackBlitz(
    code: string,
    session: InteractiveSession,
  ): Promise<any> {
    // StackBlitz integration
    return {
      success: true,
      output: 'Code executed successfully',
      errors: [],
      console: [],
      variables: {},
    };
  }

  private async runInCustomSandbox(
    code: string,
    session: InteractiveSession,
  ): Promise<any> {
    // Custom sandbox implementation
    return {
      success: true,
      output: 'Code executed successfully',
      errors: [],
      console: [],
      variables: {},
    };
  }

  private async makeAPIRequest(
    sandbox: APISandbox,
    request: APIRequest,
  ): Promise<APIResponse> {
    const startTime = Date.now();

    try {
      const response = await fetch(sandbox.apiEndpoint, {
        method: sandbox.method,
        headers: {
          ...sandbox.headers,
          ...request.headers,
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
      });

      const data = await response.json();
      const executionTime = Date.now() - startTime;

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data,
        executionTime,
      };
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  private setupSessionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const timeout = this.config.sessionTimeout;

      for (const [sessionId, session] of this.activeSessions) {
        if (now - session.lastActivity.getTime() > timeout) {
          this.activeSessions.delete(sessionId);
          this.emit('session_expired', sessionId);
        }
      }
    }, 60000); // Check every minute
  }

  private setupAutoSave(sessionId: string): void {
    const interval = setInterval(() => {
      const session = this.activeSessions.get(sessionId);
      if (!session) {
        clearInterval(interval);
        return;
      }

      this.saveSession(session);
    }, 30000); // Auto-save every 30 seconds
  }

  private async saveSession(session: InteractiveSession): Promise<void> {
    // Implementation would save to persistent storage
    this.emit('session_saved', session.id);
  }

  // Analytics helper methods
  private calculateAverageSessionDuration(
    sessions: InteractiveSession[],
  ): number {
    if (sessions.length === 0) return 0;

    const totalDuration = sessions.reduce((sum, session) => {
      const endTime = session.lastActivity || new Date();
      return sum + (endTime.getTime() - session.createdAt.getTime());
    }, 0);

    return totalDuration / sessions.length;
  }

  private async getCodeExecutionStats(
    sessions: InteractiveSession[],
  ): Promise<any> {
    // Implementation for code execution statistics
    return {};
  }

  private async getAPITestStats(sessions: InteractiveSession[]): Promise<any> {
    // Implementation for API test statistics
    return {};
  }

  private async getMostPopularExamples(
    sessions: InteractiveSession[],
  ): Promise<any> {
    // Implementation for popularity metrics
    return {};
  }

  private async getUserEngagementMetrics(
    sessions: InteractiveSession[],
  ): Promise<any> {
    // Implementation for engagement metrics
    return {};
  }

  private async getErrorRates(sessions: InteractiveSession[]): Promise<any> {
    // Implementation for error rate analysis
    return {};
  }
}

// Supporting classes and interfaces
class CollaborationManager {
  async initialize(): Promise<void> {
    // Initialize real-time collaboration features
  }

  async notifyComment(sessionId: string, comment: Comment): Promise<void> {
    // Notify other participants about new comment
  }
}

class CodeValidationEngine {
  async initialize(): Promise<void> {
    // Initialize code validation rules and engines
  }

  async validate(code: string, exampleId: string): Promise<ValidationResult> {
    return {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };
  }
}

interface ExecutionResult {
  success: boolean;
  output: string;
  errors: string[];
  executionTime: number;
  console?: string[];
  variables?: { [key: string]: any };
}

interface APIRequest {
  headers?: { [key: string]: string };
  parameters?: { [key: string]: any };
  body?: any;
}

interface APIResponse {
  status: number;
  statusText: string;
  headers: { [key: string]: string };
  data: any;
  executionTime: number;
}

interface TourSession {
  id: string;
  tourId: string;
  userId?: string;
  currentStep: number;
  startedAt: Date;
  completedSteps: number[];
  progress: number;
  state: { [key: string]: any };
}

interface EmbedOptions {
  theme?: 'light' | 'dark' | 'auto';
  height?: number;
  width?: string;
  enableLiveEditing?: boolean;
  enableCollaboration?: boolean;
  enableValidation?: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

interface SessionAnalytics {
  totalSessions: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  codeExecutions: any;
  apiTests: any;
  mostPopularExamples: any;
  userEngagement: any;
  errorRates: any;
}
