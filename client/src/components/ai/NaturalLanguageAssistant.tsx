import React, { useState, useEffect, useRef } from 'react';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: string[];
    entities?: Array<{
      type:
        | 'person'
        | 'organization'
        | 'location'
        | 'date'
        | 'event'
        | 'ip'
        | 'hash'
        | 'url';
      value: string;
      confidence: number;
    }>;
    suggestedActions?: Array<{
      type:
        | 'search'
        | 'analyze'
        | 'investigate'
        | 'export'
        | 'visualize'
        | 'correlate';
      description: string;
      parameters: any;
    }>;
    relatedData?: Array<{
      type: 'entity' | 'investigation' | 'artifact' | 'report';
      id: string;
      title: string;
      relevance: number;
    }>;
  };
  isStreaming?: boolean;
}

interface InvestigationContext {
  currentInvestigation?: {
    id: string;
    name: string;
    entities: string[];
    timeline: Array<{ date: Date; event: string }>;
    status: string;
  };
  activeEntities: Array<{
    id: string;
    type: string;
    name: string;
    confidence: number;
  }>;
  recentQueries: string[];
  availableData: {
    totalEntities: number;
    totalRelationships: number;
    dataSourcesConnected: string[];
    lastUpdated: Date;
  };
  userPreferences: {
    analysisDepth: 'surface' | 'medium' | 'deep';
    confidenceThreshold: number;
    preferredSources: string[];
    notificationSettings: {
      newFindings: boolean;
      highConfidence: boolean;
      criticalAlerts: boolean;
    };
  };
}

interface InvestigationTask {
  id: string;
  type:
    | 'entity_search'
    | 'relationship_analysis'
    | 'timeline_construction'
    | 'pattern_detection'
    | 'threat_assessment'
    | 'report_generation';
  query: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  results?: {
    entities?: any[];
    relationships?: any[];
    insights?: string[];
    visualizations?: any[];
    confidence: number;
    sources: string[];
  };
  parameters: {
    depth?: number;
    timeRange?: { start: Date; end: Date };
    entityTypes?: string[];
    confidenceThreshold?: number;
    includeHistorical?: boolean;
  };
}

interface AnalysisCapability {
  id: string;
  name: string;
  description: string;
  category:
    | 'search'
    | 'analysis'
    | 'visualization'
    | 'correlation'
    | 'prediction'
    | 'reporting';
  icon: string;
  parameters: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'select';
    required: boolean;
    description: string;
    options?: string[];
  }>;
  examples: string[];
  estimatedTime: string;
}

interface NaturalLanguageAssistantProps {
  investigationId?: string;
  context?: Partial<InvestigationContext>;
  onTaskCreate?: (task: InvestigationTask) => void;
  onTaskComplete?: (taskId: string, results: any) => void;
  onEntityDiscovered?: (entity: any) => void;
  onInsightGenerated?: (insight: string, confidence: number) => void;
  enableVoiceInput?: boolean;
  enableProactiveAssistance?: boolean;
  className?: string;
}

const NaturalLanguageAssistant: React.FC<NaturalLanguageAssistantProps> = ({
  investigationId,
  context,
  onTaskCreate = () => {},
  onTaskComplete = () => {},
  onEntityDiscovered = () => {},
  onInsightGenerated = () => {},
  enableVoiceInput = true,
  enableProactiveAssistance = true,
  className = '',
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeTasks, setActiveTasks] = useState<InvestigationTask[]>([]);
  const [capabilities, setCapabilities] = useState<AnalysisCapability[]>([]);
  const [investigationContext, setInvestigationContext] =
    useState<InvestigationContext | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    initializeAssistant();
    generateCapabilities();
    if (enableProactiveAssistance) {
      startProactiveAssistance();
    }
  }, [investigationId, enableProactiveAssistance]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeAssistant = () => {
    const defaultContext: InvestigationContext = {
      activeEntities: [
        { id: 'entity-1', type: 'person', name: 'John Doe', confidence: 0.85 },
        {
          id: 'entity-2',
          type: 'organization',
          name: 'TechCorp Inc',
          confidence: 0.92,
        },
        { id: 'entity-3', type: 'ip', name: '192.168.1.100', confidence: 0.78 },
      ],
      recentQueries: [
        'Show me all connections to John Doe',
        'What are the latest threat indicators?',
        'Generate a timeline for the last 30 days',
      ],
      availableData: {
        totalEntities: 15420,
        totalRelationships: 23650,
        dataSourcesConnected: [
          'OSINT',
          'Threat Intel',
          'Internal Logs',
          'External APIs',
        ],
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
      },
      userPreferences: {
        analysisDepth: 'medium',
        confidenceThreshold: 0.7,
        preferredSources: ['OSINT', 'Threat Intel'],
        notificationSettings: {
          newFindings: true,
          highConfidence: true,
          criticalAlerts: true,
        },
      },
      ...context,
    };

    setInvestigationContext(defaultContext);

    const welcomeMessage: ConversationMessage = {
      id: 'welcome-1',
      role: 'assistant',
      content: `👋 Hello! I'm your AI investigation assistant. I can help you with:

• **Entity Analysis**: Research people, organizations, IP addresses, and other entities
• **Relationship Mapping**: Discover connections between entities and events
• **Timeline Construction**: Build chronological sequences of events
• **Pattern Detection**: Identify suspicious behaviors and anomalies
• **Threat Assessment**: Evaluate risks and generate threat intelligence
• **Report Generation**: Create comprehensive investigation reports

I have access to ${defaultContext.availableData.totalEntities.toLocaleString()} entities and ${defaultContext.availableData.totalRelationships.toLocaleString()} relationships across ${defaultContext.availableData.dataSourcesConnected.length} data sources.

What would you like to investigate today?`,
      timestamp: new Date(),
      metadata: {
        confidence: 1.0,
        suggestedActions: [
          {
            type: 'search',
            description: 'Search for an entity by name, IP, or identifier',
            parameters: { query: '', entityTypes: ['all'] },
          },
          {
            type: 'analyze',
            description: 'Analyze relationships between known entities',
            parameters: { entities: [], depth: 2 },
          },
          {
            type: 'investigate',
            description: 'Start a new investigation workflow',
            parameters: { topic: '', scope: 'comprehensive' },
          },
        ],
      },
    };

    setMessages([welcomeMessage]);
    generateContextualSuggestions(defaultContext);
  };

  const generateCapabilities = () => {
    const mockCapabilities: AnalysisCapability[] = [
      {
        id: 'entity-search',
        name: 'Entity Search',
        description:
          'Search for specific entities across all connected data sources',
        category: 'search',
        icon: '🔍',
        parameters: [
          {
            name: 'query',
            type: 'string',
            required: true,
            description: 'Search term or identifier',
          },
          {
            name: 'entityTypes',
            type: 'select',
            required: false,
            description: 'Entity types to search for',
            options: [
              'person',
              'organization',
              'ip',
              'domain',
              'hash',
              'email',
            ],
          },
          {
            name: 'confidenceThreshold',
            type: 'number',
            required: false,
            description: 'Minimum confidence score (0-100)',
          },
        ],
        examples: [
          'Find all information about john.doe@company.com',
          'Search for IP addresses related to malware campaigns',
          'Look up TechCorp Inc and related entities',
        ],
        estimatedTime: '10-30 seconds',
      },
      {
        id: 'relationship-analysis',
        name: 'Relationship Analysis',
        description: 'Analyze connections and relationships between entities',
        category: 'analysis',
        icon: '🕸️',
        parameters: [
          {
            name: 'sourceEntity',
            type: 'string',
            required: true,
            description: 'Starting entity for analysis',
          },
          {
            name: 'depth',
            type: 'number',
            required: false,
            description: 'Analysis depth (1-5 hops)',
          },
          {
            name: 'relationshipTypes',
            type: 'select',
            required: false,
            description: 'Types of relationships to include',
            options: [
              'communication',
              'financial',
              'technical',
              'personal',
              'organizational',
            ],
          },
        ],
        examples: [
          'Show me all connections to John Doe within 2 hops',
          'Analyze financial relationships for suspicious accounts',
          'Map communication patterns between these entities',
        ],
        estimatedTime: '30 seconds - 2 minutes',
      },
      {
        id: 'timeline-construction',
        name: 'Timeline Construction',
        description: 'Build chronological timeline of events and activities',
        category: 'analysis',
        icon: '⏰',
        parameters: [
          {
            name: 'entities',
            type: 'string',
            required: true,
            description: 'Entities to include in timeline',
          },
          {
            name: 'timeRange',
            type: 'date',
            required: false,
            description: 'Time period to analyze',
          },
          {
            name: 'eventTypes',
            type: 'select',
            required: false,
            description: 'Types of events to include',
            options: [
              'communication',
              'transaction',
              'access',
              'creation',
              'modification',
            ],
          },
        ],
        examples: [
          'Create a timeline for the data breach investigation',
          'Show me all activities for these IP addresses in March 2024',
          'Build a chronological sequence of the APT campaign',
        ],
        estimatedTime: '1-3 minutes',
      },
      {
        id: 'pattern-detection',
        name: 'Pattern Detection',
        description: 'Identify suspicious patterns, anomalies, and behaviors',
        category: 'analysis',
        icon: '🎯',
        parameters: [
          {
            name: 'dataSet',
            type: 'string',
            required: true,
            description: 'Data to analyze for patterns',
          },
          {
            name: 'patternTypes',
            type: 'select',
            required: false,
            description: 'Types of patterns to detect',
            options: [
              'temporal',
              'behavioral',
              'network',
              'frequency',
              'anomaly',
            ],
          },
          {
            name: 'sensitivity',
            type: 'number',
            required: false,
            description: 'Pattern detection sensitivity (1-10)',
          },
        ],
        examples: [
          'Detect anomalous login patterns for these users',
          'Find recurring communication patterns in the dataset',
          'Identify suspicious financial transaction patterns',
        ],
        estimatedTime: '2-5 minutes',
      },
      {
        id: 'threat-assessment',
        name: 'Threat Assessment',
        description: 'Evaluate threat levels and generate risk analysis',
        category: 'analysis',
        icon: '⚠️',
        parameters: [
          {
            name: 'target',
            type: 'string',
            required: true,
            description: 'Entity or system to assess',
          },
          {
            name: 'threatSources',
            type: 'select',
            required: false,
            description: 'Threat sources to consider',
            options: [
              'external',
              'internal',
              'nation-state',
              'criminal',
              'hacktivist',
            ],
          },
          {
            name: 'assessmentDepth',
            type: 'select',
            required: false,
            description: 'Assessment depth',
            options: ['basic', 'comprehensive', 'detailed'],
          },
        ],
        examples: [
          'Assess the threat level for our infrastructure',
          'Evaluate risks associated with this IP address',
          'Generate threat assessment for suspected APT activity',
        ],
        estimatedTime: '3-7 minutes',
      },
      {
        id: 'report-generation',
        name: 'Report Generation',
        description: 'Generate comprehensive investigation reports',
        category: 'reporting',
        icon: '📄',
        parameters: [
          {
            name: 'reportType',
            type: 'select',
            required: true,
            description: 'Type of report to generate',
            options: [
              'executive',
              'technical',
              'incident',
              'forensic',
              'threat-intel',
            ],
          },
          {
            name: 'entities',
            type: 'string',
            required: false,
            description: 'Entities to include in report',
          },
          {
            name: 'timeframe',
            type: 'date',
            required: false,
            description: 'Time period to cover',
          },
        ],
        examples: [
          'Generate executive summary for the security incident',
          'Create technical report on malware analysis findings',
          'Prepare forensic report for legal proceedings',
        ],
        estimatedTime: '5-10 minutes',
      },
    ];

    setCapabilities(mockCapabilities);
  };

  const generateContextualSuggestions = (context: InvestigationContext) => {
    const suggestions = [
      `Analyze relationships for ${context.activeEntities[0]?.name}`,
      `Show me recent activities for ${context.activeEntities[1]?.name}`,
      'What are the latest threat indicators?',
      'Generate a timeline for the current investigation',
      'Detect anomalous patterns in network traffic',
      'Create a summary report of key findings',
    ];

    setSuggestions(suggestions.slice(0, 4));
  };

  const startProactiveAssistance = () => {
    // Simulate proactive insights
    const proactiveInterval = setInterval(() => {
      if (Math.random() > 0.8 && messages.length > 1) {
        generateProactiveInsight();
      }
    }, 30000);

    return () => clearInterval(proactiveInterval);
  };

  const generateProactiveInsight = () => {
    const insights = [
      'I noticed some unusual activity patterns in the last hour. Would you like me to investigate further?',
      'New threat intelligence data is available that might be relevant to your investigation.',
      "I found potential connections between entities that weren't previously identified.",
      "There's been an increase in suspicious network activity. Should I generate an alert?",
      'I can help correlate the recent findings with historical data for deeper insights.',
    ];

    const randomInsight = insights[Math.floor(Math.random() * insights.length)];

    const proactiveMessage: ConversationMessage = {
      id: `proactive-${Date.now()}`,
      role: 'assistant',
      content: `💡 **Proactive Insight**: ${randomInsight}`,
      timestamp: new Date(),
      metadata: {
        confidence: 0.75,
        suggestedActions: [
          {
            type: 'investigate',
            description: 'Investigate this insight further',
            parameters: { type: 'proactive_analysis' },
          },
        ],
      },
    };

    setMessages((prev) => [...prev, proactiveMessage]);
    onInsightGenerated(randomInsight, 0.75);
  };

  const processUserMessage = async (message: string) => {
    setIsProcessing(true);

    // Add user message
    const userMessage: ConversationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    // Simulate AI processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate AI response
    const aiResponse = await generateAIResponse(message);
    setMessages((prev) => [...prev, aiResponse]);

    // Create investigation task if needed
    if (shouldCreateTask(message)) {
      const task = createInvestigationTask(message);
      setActiveTasks((prev) => [...prev, task]);
      onTaskCreate(task);
      executeTask(task);
    }

    setIsProcessing(false);
  };

  const generateAIResponse = async (
    userMessage: string,
  ): Promise<ConversationMessage> => {
    // Simulate intelligent response generation
    const responses = [
      {
        pattern: /search|find|look up|investigate/i,
        response: `I'll search our database for information related to your query. Let me analyze the available data across ${investigationContext?.availableData.dataSourcesConnected.length} connected sources.

Found several relevant matches:
• **Entity Analysis**: 23 entities found with high confidence
• **Relationship Mapping**: 45 connections identified
• **Threat Intelligence**: 7 relevant indicators discovered
• **Historical Data**: 156 related events in the timeline

Would you like me to dive deeper into any of these findings?`,
        confidence: 0.87,
        entities: [
          { type: 'person', value: 'Sample Entity', confidence: 0.85 },
        ],
        suggestedActions: [
          {
            type: 'analyze',
            description: 'Analyze entity relationships',
            parameters: {},
          },
          {
            type: 'visualize',
            description: 'Create network visualization',
            parameters: {},
          },
        ],
      },
      {
        pattern: /timeline|chronology|sequence|events/i,
        response: `I'll construct a timeline of events based on the available data. Let me process the chronological information across multiple data sources.

**Timeline Analysis Complete**:
• **Event Range**: Last 30 days
• **Total Events**: 234 significant activities
• **Key Milestones**: 12 critical events identified
• **Pattern Detection**: 3 suspicious activity clusters found

The timeline reveals several interesting patterns that might be relevant to your investigation. I can provide detailed analysis of any specific time period.`,
        confidence: 0.91,
        suggestedActions: [
          {
            type: 'visualize',
            description: 'Generate timeline visualization',
            parameters: {},
          },
          {
            type: 'analyze',
            description: 'Analyze temporal patterns',
            parameters: {},
          },
        ],
      },
      {
        pattern: /threat|risk|assessment|dangerous|suspicious/i,
        response: `I'll perform a comprehensive threat assessment based on current intelligence data and known indicators.

**Threat Assessment Results**:
• **Overall Risk Level**: Medium-High
• **Active Threat Indicators**: 8 confirmed IOCs
• **Risk Factors**: Network anomalies, suspicious communications
• **Mitigation Recommendations**: Enhanced monitoring, access controls

The analysis indicates elevated risk levels requiring immediate attention. I can provide detailed remediation steps and monitoring recommendations.`,
        confidence: 0.82,
        entities: [{ type: 'ip', value: '192.168.1.100', confidence: 0.9 }],
        suggestedActions: [
          {
            type: 'investigate',
            description: 'Deep dive threat analysis',
            parameters: {},
          },
          {
            type: 'export',
            description: 'Generate threat report',
            parameters: {},
          },
        ],
      },
      {
        pattern: /report|summary|document/i,
        response: `I'll generate a comprehensive report based on the current investigation data and findings.

**Report Generation Status**:
• **Report Type**: Investigation Summary
• **Data Sources**: 4 integrated sources
• **Total Entities**: 67 analyzed entities
• **Key Findings**: 15 significant discoveries
• **Evidence Quality**: High confidence (89% average)

The report includes executive summary, technical details, evidence documentation, and recommended next steps. Would you like me to customize the format or focus on specific aspects?`,
        confidence: 0.88,
        suggestedActions: [
          {
            type: 'export',
            description: 'Export detailed report',
            parameters: {},
          },
          {
            type: 'visualize',
            description: 'Create visual summary',
            parameters: {},
          },
        ],
      },
    ];

    // Find matching response pattern
    const matchingResponse = responses.find((r) => r.pattern.test(userMessage));
    const response = matchingResponse || {
      response: `I understand you're asking about: "${userMessage}"

Based on the current investigation context, I can help you with:
• **Data Analysis**: Process and analyze available information
• **Entity Research**: Research specific people, organizations, or technical indicators
• **Pattern Recognition**: Identify suspicious activities and anomalies
• **Intelligence Gathering**: Collect relevant information from multiple sources
• **Report Generation**: Create comprehensive documentation

What specific aspect would you like me to focus on?`,
      confidence: 0.75,
      suggestedActions: [
        {
          type: 'search',
          description: 'Search for more information',
          parameters: {},
        },
      ],
    };

    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: response.response,
      timestamp: new Date(),
      metadata: {
        confidence: response.confidence,
        entities: response.entities,
        suggestedActions: response.suggestedActions,
        sources: ['Internal Database', 'Threat Intelligence', 'OSINT Sources'],
      },
    };
  };

  const shouldCreateTask = (message: string): boolean => {
    const taskKeywords = [
      'analyze',
      'search',
      'investigate',
      'generate',
      'create',
      'find',
      'detect',
    ];
    return taskKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );
  };

  const createInvestigationTask = (message: string): InvestigationTask => {
    const taskTypes: InvestigationTask['type'][] = [
      'entity_search',
      'relationship_analysis',
      'timeline_construction',
      'pattern_detection',
      'threat_assessment',
      'report_generation',
    ];

    return {
      id: `task-${Date.now()}`,
      type: taskTypes[Math.floor(Math.random() * taskTypes.length)],
      query: message,
      status: 'pending',
      progress: 0,
      startTime: new Date(),
      estimatedCompletion: new Date(
        Date.now() + Math.random() * 300000 + 60000,
      ), // 1-6 minutes
      parameters: {
        depth: 3,
        confidenceThreshold: 0.7,
        includeHistorical: true,
      },
    };
  };

  const executeTask = async (task: InvestigationTask) => {
    setActiveTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: 'running' } : t)),
    );

    // Simulate task execution with progress updates
    for (let progress = 0; progress <= 100; progress += 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setActiveTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, progress } : t)),
      );
    }

    // Complete task with results
    const results = {
      entities: [
        { id: 'entity-result-1', name: 'Task Result Entity', confidence: 0.89 },
      ],
      relationships: [
        {
          source: 'entity-1',
          target: 'entity-2',
          type: 'communication',
          confidence: 0.82,
        },
      ],
      insights: [
        'Task completed successfully with high confidence results',
        'Multiple relevant entities discovered',
        'Suspicious patterns identified requiring further investigation',
      ],
      confidence: 0.85,
      sources: ['Database Query', 'AI Analysis', 'Pattern Recognition'],
    };

    setActiveTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, status: 'completed', progress: 100, results }
          : t,
      ),
    );

    onTaskComplete(task.id, results);

    // Generate follow-up message
    const followUpMessage: ConversationMessage = {
      id: `followup-${Date.now()}`,
      role: 'assistant',
      content: `✅ **Task Completed**: ${task.type.replace('_', ' ')}

**Results Summary**:
• **Entities Found**: ${results.entities.length}
• **Relationships**: ${results.relationships.length}  
• **Insights**: ${results.insights.length}
• **Confidence**: ${(results.confidence * 100).toFixed(0)}%

Key findings include multiple relevant entities and suspicious patterns that warrant further investigation. Would you like me to analyze these results in more detail?`,
      timestamp: new Date(),
      metadata: {
        confidence: results.confidence,
        relatedData: results.entities.map((e) => ({
          type: 'entity' as const,
          id: e.id,
          title: e.name,
          relevance: e.confidence,
        })),
      },
    };

    setMessages((prev) => [...prev, followUpMessage]);
  };

  const startVoiceInput = () => {
    if (!enableVoiceInput) return;

    setIsListening(true);

    // Simulate voice recognition
    setTimeout(() => {
      setIsListening(false);
      const voiceMessage =
        'Search for suspicious IP addresses in the last 24 hours';
      setCurrentMessage(voiceMessage);
    }, 3000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentMessage(suggestion);
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentMessage.trim() && !isProcessing) {
      processUserMessage(currentMessage.trim());
      setCurrentMessage('');
    }
  };

  return (
    <div
      className={`natural-language-assistant ${className} h-full flex flex-col`}
    >
      {/* Header */}
      <div className="border-b p-4 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">
            🤖 AI Investigation Assistant
          </h3>
          <div className="flex items-center gap-2">
            {investigationContext && (
              <span className="text-xs text-gray-500">
                {investigationContext.availableData.totalEntities.toLocaleString()}{' '}
                entities •
                {investigationContext.availableData.dataSourcesConnected.length}{' '}
                sources
              </span>
            )}
            <button
              onClick={() => setShowCapabilities(!showCapabilities)}
              className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200"
            >
              Capabilities
            </button>
          </div>
        </div>

        {activeTasks.filter((t) => t.status === 'running').length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
            <div className="text-sm text-blue-700">
              Running {activeTasks.filter((t) => t.status === 'running').length}{' '}
              analysis task(s)...
            </div>
            {activeTasks
              .filter((t) => t.status === 'running')
              .map((task) => (
                <div key={task.id} className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-blue-600">
                    {task.type.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-1 bg-blue-200 rounded-full">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-blue-600">
                    {task.progress}%
                  </span>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Capabilities Panel */}
      {showCapabilities && (
        <div className="border-b p-4 bg-gray-50">
          <h4 className="font-medium mb-3">Available Analysis Capabilities</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {capabilities.map((capability) => (
              <div
                key={capability.id}
                className="p-3 bg-white rounded-lg border text-sm"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{capability.icon}</span>
                  <span className="font-medium">{capability.name}</span>
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {capability.description}
                </p>
                <div className="text-xs text-blue-600">
                  Example: "{capability.examples[0]}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border shadow-sm'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🤖</span>
                  {message.metadata?.confidence && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                      {(message.metadata.confidence * 100).toFixed(0)}%
                      confidence
                    </span>
                  )}
                </div>
              )}

              <div className="whitespace-pre-line">{message.content}</div>

              {message.metadata?.entities &&
                message.metadata.entities.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-sm font-medium">Entities Found:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {message.metadata.entities.map((entity, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                        >
                          {entity.type}: {entity.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {message.metadata?.suggestedActions &&
                message.metadata.suggestedActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-sm font-medium">
                      Suggested Actions:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {message.metadata.suggestedActions.map(
                        (action, index) => (
                          <button
                            key={index}
                            onClick={() =>
                              handleSuggestionClick(action.description)
                            }
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                          >
                            {action.description}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div className="text-xs text-gray-500 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="bg-white border shadow-sm rounded-lg p-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                <span className="text-gray-600">
                  AI is analyzing your request...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && !isProcessing && (
        <div className="border-t p-3 bg-gray-50">
          <div className="text-xs text-gray-600 mb-2">Quick suggestions:</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 bg-white border text-sm rounded hover:bg-gray-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.target.value)}
            placeholder="Ask me anything about your investigation..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />

          {enableVoiceInput && (
            <button
              type="button"
              onClick={startVoiceInput}
              disabled={isListening || isProcessing}
              className={`px-3 py-2 rounded-lg ${
                isListening
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } disabled:opacity-50`}
            >
              {isListening ? '🔴' : '🎤'}
            </button>
          )}

          <button
            type="submit"
            disabled={!currentMessage.trim() || isProcessing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '⏳' : 'Send'}
          </button>
        </form>

        <div className="text-xs text-gray-500 mt-2">
          I can help with entity analysis, relationship mapping, timeline
          construction, pattern detection, threat assessment, and report
          generation.
        </div>
      </div>
    </div>
  );
};

export default NaturalLanguageAssistant;
