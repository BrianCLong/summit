import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface RecommendationContext {
  investigationId: string;
  currentEntities: string[];
  currentRelationships: string[];
  investigationTags: string[];
  investigationType: 'financial' | 'cyber' | 'osint' | 'forensics' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timeConstraint?: Date;
  budget?: number;
  availableResources: string[];
  complianceRequirements: string[];
}

interface AIRecommendation {
  id: string;
  type: 'entity_discovery' | 'relationship_exploration' | 'data_enrichment' | 'tool_suggestion' | 'methodology' | 'collaboration';
  title: string;
  description: string;
  rationale: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'analysis' | 'data' | 'workflow' | 'investigation';
  estimatedEffort: {
    time: string;
    complexity: 'low' | 'medium' | 'high';
    resources: string[];
  };
  prerequisites: string[];
  potentialImpact: string;
  relatedRecommendations: string[];
  actionItems: {
    id: string;
    description: string;
    completed: boolean;
    estimatedTime: string;
  }[];
  metadata: {
    mlModelUsed: string;
    dataSourcesAnalyzed: string[];
    similarCasesFound: number;
    confidenceFactors: {
      factor: string;
      weight: number;
      confidence: number;
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
  feedback?: {
    rating: 1 | 2 | 3 | 4 | 5;
    comments: string;
    helpful: boolean;
  };
}

interface SimilarCase {
  id: string;
  title: string;
  description: string;
  outcome: 'successful' | 'partial' | 'unsuccessful';
  similarity: number;
  investigationType: string;
  timeToResolution: number;
  keyFindings: string[];
  methodsUsed: string[];
  lessonsLearned: string[];
  applicableInsights: string[];
}

interface InvestigationStrategy {
  id: string;
  name: string;
  description: string;
  phases: {
    name: string;
    description: string;
    estimatedDuration: string;
    tasks: string[];
    deliverables: string[];
  }[];
  successCriteria: string[];
  riskFactors: string[];
  requiredSkills: string[];
  recommendedTools: string[];
}

interface InvestigationRecommendationsEngineProps {
  investigationId?: string;
  context?: Partial<RecommendationContext>;
  onRecommendationAccept?: (recommendation: AIRecommendation) => void;
  onRecommendationReject?: (recommendationId: string, reason: string) => void;
  onStrategySelect?: (strategy: InvestigationStrategy) => void;
  enableRealTimeUpdates?: boolean;
  className?: string;
}

const InvestigationRecommendationsEngine: React.FC<InvestigationRecommendationsEngineProps> = ({
  investigationId,
  context,
  onRecommendationAccept,
  onRecommendationReject,
  onStrategySelect,
  enableRealTimeUpdates = true,
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'recommendations' | 'strategies' | 'similar_cases' | 'insights'>('recommendations');
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [strategies, setStrategies] = useState<InvestigationStrategy[]>([]);
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('confidence');
  const [showAcceptedOnly, setShowAcceptedOnly] = useState(false);
  
  const analysisRef = useRef<HTMLDivElement>(null);

  // Mock investigation context
  const mockContext: RecommendationContext = useMemo(() => ({
    investigationId: investigationId || 'inv-001',
    currentEntities: ['entity-001', 'entity-002', 'entity-003'],
    currentRelationships: ['rel-001', 'rel-002'],
    investigationTags: ['financial', 'fraud', 'aml', 'suspicious-activity'],
    investigationType: 'financial',
    priority: 'high',
    timeConstraint: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    budget: 50000,
    availableResources: ['data-analyst', 'investigator', 'ai-tools', 'external-apis'],
    complianceRequirements: ['kyc', 'aml', 'gdpr', 'sox'],
    ...context
  }), [investigationId, context]);

  // Mock recommendations
  const mockRecommendations: AIRecommendation[] = useMemo(() => [
    {
      id: 'rec-001',
      type: 'entity_discovery',
      title: 'Explore Shell Company Networks',
      description: 'AI analysis suggests investigating potential shell company structures connected to Entity-002',
      rationale: 'Pattern matching with 847 similar financial fraud cases shows 89% likelihood of shell company involvement',
      confidence: 89,
      priority: 'high',
      category: 'analysis',
      estimatedEffort: {
        time: '2-3 days',
        complexity: 'medium',
        resources: ['data-analyst', 'ai-tools']
      },
      prerequisites: ['Access to corporate registry data', 'Enhanced due diligence clearance'],
      potentialImpact: 'Could reveal 5-8 additional entities and uncover the full money laundering network',
      relatedRecommendations: ['rec-003', 'rec-005'],
      actionItems: [
        {
          id: 'action-001',
          description: 'Query corporate registry for entities with similar incorporation patterns',
          completed: false,
          estimatedTime: '4 hours'
        },
        {
          id: 'action-002',
          description: 'Cross-reference beneficial ownership data',
          completed: false,
          estimatedTime: '6 hours'
        },
        {
          id: 'action-003',
          description: 'Analyze transaction patterns between discovered entities',
          completed: false,
          estimatedTime: '8 hours'
        }
      ],
      metadata: {
        mlModelUsed: 'Financial Network Analysis v2.3',
        dataSourcesAnalyzed: ['Corporate Registry', 'Transaction Data', 'Beneficial Ownership DB'],
        similarCasesFound: 847,
        confidenceFactors: [
          { factor: 'Pattern Similarity', weight: 0.4, confidence: 92 },
          { factor: 'Historical Success Rate', weight: 0.3, confidence: 85 },
          { factor: 'Data Quality', weight: 0.3, confidence: 91 }
        ]
      },
      createdAt: new Date(Date.now() - 1800000),
      updatedAt: new Date(Date.now() - 600000)
    },
    {
      id: 'rec-002',
      type: 'data_enrichment',
      title: 'Enrich with Social Media Intelligence',
      description: 'Supplement investigation with social media analysis of key individuals',
      rationale: 'OSINT analysis shows high correlation between social media activity and financial misconduct timing',
      confidence: 76,
      priority: 'medium',
      category: 'data',
      estimatedEffort: {
        time: '1-2 days',
        complexity: 'low',
        resources: ['osint-specialist', 'social-media-apis']
      },
      prerequisites: ['OSINT tool access', 'Social media API credits'],
      potentialImpact: 'May reveal additional associates, timeline discrepancies, or lifestyle inconsistencies',
      relatedRecommendations: ['rec-004'],
      actionItems: [
        {
          id: 'action-004',
          description: 'Collect social media profiles for key individuals',
          completed: false,
          estimatedTime: '2 hours'
        },
        {
          id: 'action-005',
          description: 'Analyze posting patterns and connections',
          completed: false,
          estimatedTime: '6 hours'
        }
      ],
      metadata: {
        mlModelUsed: 'OSINT Correlation Engine v1.8',
        dataSourcesAnalyzed: ['Social Media APIs', 'Public Records', 'News Sources'],
        similarCasesFound: 342,
        confidenceFactors: [
          { factor: 'Data Availability', weight: 0.5, confidence: 82 },
          { factor: 'Relevance Score', weight: 0.5, confidence: 70 }
        ]
      },
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(Date.now() - 1200000)
    },
    {
      id: 'rec-003',
      type: 'tool_suggestion',
      title: 'Deploy Advanced Graph Analytics',
      description: 'Use Palantir Gotham or similar platform for complex relationship mapping',
      rationale: 'Investigation complexity score (8.7/10) suggests manual analysis insufficient for optimal results',
      confidence: 94,
      priority: 'critical',
      category: 'workflow',
      estimatedEffort: {
        time: '3-5 days',
        complexity: 'high',
        resources: ['graph-analyst', 'palantir-license', 'data-engineer']
      },
      prerequisites: ['Platform license', 'Data ingestion setup', 'Analyst training'],
      potentialImpact: 'Could increase investigation efficiency by 300% and discover hidden patterns',
      relatedRecommendations: ['rec-001'],
      actionItems: [
        {
          id: 'action-006',
          description: 'Procure platform access and licensing',
          completed: false,
          estimatedTime: '1 day'
        },
        {
          id: 'action-007',
          description: 'Set up data ingestion pipelines',
          completed: false,
          estimatedTime: '2 days'
        },
        {
          id: 'action-008',
          description: 'Train team on platform usage',
          completed: false,
          estimatedTime: '1 day'
        }
      ],
      metadata: {
        mlModelUsed: 'Investigation Complexity Analyzer v3.1',
        dataSourcesAnalyzed: ['Investigation Metadata', 'Tool Performance DB', 'Case History'],
        similarCasesFound: 156,
        confidenceFactors: [
          { factor: 'Complexity Match', weight: 0.6, confidence: 96 },
          { factor: 'Tool Effectiveness', weight: 0.4, confidence: 91 }
        ]
      },
      createdAt: new Date(Date.now() - 2400000),
      updatedAt: new Date(Date.now() - 900000)
    },
    {
      id: 'rec-004',
      type: 'methodology',
      title: 'Implement Timeline Analysis Methodology',
      description: 'Apply temporal correlation analysis to identify patterns across different data sources',
      rationale: 'Multi-source temporal analysis has 73% success rate in similar financial fraud cases',
      confidence: 73,
      priority: 'medium',
      category: 'analysis',
      estimatedEffort: {
        time: '2-4 days',
        complexity: 'medium',
        resources: ['temporal-analyst', 'timeline-tools']
      },
      prerequisites: ['Synchronized data timestamps', 'Timeline analysis tools'],
      potentialImpact: 'May identify coordinated activities and reveal investigation timeline',
      relatedRecommendations: ['rec-002'],
      actionItems: [
        {
          id: 'action-009',
          description: 'Normalize timestamps across all data sources',
          completed: false,
          estimatedTime: '4 hours'
        },
        {
          id: 'action-010',
          description: 'Create comprehensive timeline visualization',
          completed: false,
          estimatedTime: '8 hours'
        },
        {
          id: 'action-011',
          description: 'Identify temporal patterns and anomalies',
          completed: false,
          estimatedTime: '6 hours'
        }
      ],
      metadata: {
        mlModelUsed: 'Temporal Pattern Recognition v2.1',
        dataSourcesAnalyzed: ['Transaction Logs', 'Communication Records', 'Event Timeline'],
        similarCasesFound: 278,
        confidenceFactors: [
          { factor: 'Method Effectiveness', weight: 0.7, confidence: 75 },
          { factor: 'Data Suitability', weight: 0.3, confidence: 68 }
        ]
      },
      createdAt: new Date(Date.now() - 4200000),
      updatedAt: new Date(Date.now() - 1800000)
    }
  ], []);

  const mockStrategies: InvestigationStrategy[] = useMemo(() => [
    {
      id: 'strategy-001',
      name: 'Financial Fraud Deep Dive',
      description: 'Comprehensive methodology for investigating complex financial fraud cases',
      phases: [
        {
          name: 'Initial Assessment',
          description: 'Evaluate scope, gather initial evidence, establish investigation parameters',
          estimatedDuration: '3-5 days',
          tasks: [
            'Review available evidence',
            'Identify key stakeholders',
            'Establish investigation timeline',
            'Assess resource requirements'
          ],
          deliverables: [
            'Investigation charter',
            'Evidence inventory',
            'Resource allocation plan'
          ]
        },
        {
          name: 'Data Collection',
          description: 'Systematic gathering of financial records, communications, and supporting evidence',
          estimatedDuration: '1-2 weeks',
          tasks: [
            'Execute data requests',
            'Collect transaction records',
            'Gather communication logs',
            'Obtain regulatory filings'
          ],
          deliverables: [
            'Consolidated data repository',
            'Data quality assessment',
            'Chain of custody documentation'
          ]
        },
        {
          name: 'Analysis & Investigation',
          description: 'Deep analysis of collected data to identify patterns and build evidence',
          estimatedDuration: '2-4 weeks',
          tasks: [
            'Transaction pattern analysis',
            'Network relationship mapping',
            'Timeline reconstruction',
            'Anomaly identification'
          ],
          deliverables: [
            'Analysis findings report',
            'Visual network maps',
            'Evidence correlation matrix'
          ]
        },
        {
          name: 'Documentation & Reporting',
          description: 'Compile findings into comprehensive investigation report',
          estimatedDuration: '1 week',
          tasks: [
            'Draft investigation report',
            'Prepare evidence packages',
            'Create executive summary',
            'Validate findings'
          ],
          deliverables: [
            'Final investigation report',
            'Evidence documentation',
            'Recommendations for action'
          ]
        }
      ],
      successCriteria: [
        'Clear evidence trail established',
        'All suspicious activities documented',
        'Regulatory compliance maintained',
        'Actionable recommendations provided'
      ],
      riskFactors: [
        'Limited data availability',
        'Jurisdictional challenges',
        'Time constraints',
        'Resource limitations'
      ],
      requiredSkills: [
        'Financial analysis',
        'Data forensics',
        'Regulatory knowledge',
        'Report writing'
      ],
      recommendedTools: [
        'i2 Analyst Notebook',
        'Palantir Gotham',
        'SAS Fraud Detection',
        'Excel/Power BI'
      ]
    }
  ], []);

  const mockSimilarCases: SimilarCase[] = useMemo(() => [
    {
      id: 'case-001',
      title: 'Multi-Jurisdictional Money Laundering Scheme',
      description: 'Complex financial fraud involving shell companies across 8 jurisdictions',
      outcome: 'successful',
      similarity: 94,
      investigationType: 'financial',
      timeToResolution: 45,
      keyFindings: [
        'Network of 23 shell companies identified',
        '$15M in illicit funds traced',
        'Coordination with 4 international agencies',
        'Lead to 7 arrests and convictions'
      ],
      methodsUsed: [
        'Corporate registry analysis',
        'Transaction pattern matching',
        'Social network analysis',
        'Timeline correlation'
      ],
      lessonsLearned: [
        'Early international cooperation crucial',
        'Shell company patterns highly predictable',
        'Social media intelligence valuable for timing'
      ],
      applicableInsights: [
        'Focus on incorporation date clustering',
        'Cross-reference beneficial ownership early',
        'Monitor for coordinated account activity'
      ]
    },
    {
      id: 'case-002',
      title: 'Cryptocurrency Mixing Service Investigation',
      description: 'Investigation of decentralized money laundering through mixing services',
      outcome: 'partial',
      similarity: 78,
      investigationType: 'financial',
      timeToResolution: 62,
      keyFindings: [
        'Identified primary mixing service operators',
        'Tracked $8M through multiple hops',
        'Developed new blockchain analysis techniques'
      ],
      methodsUsed: [
        'Blockchain analysis',
        'Clustering algorithms',
        'Exchange cooperation',
        'Timing analysis'
      ],
      lessonsLearned: [
        'Privacy coins present significant challenges',
        'Exchange cooperation varies by jurisdiction',
        'Time-sensitive evidence collection critical'
      ],
      applicableInsights: [
        'Early blockchain forensics yields better results',
        'Focus on exchange entry/exit points',
        'Coordinate with multiple blockchain analytics firms'
      ]
    }
  ], []);

  // Initialize data and real-time updates
  useEffect(() => {
    setRecommendations(mockRecommendations);
    setStrategies(mockStrategies);
    setSimilarCases(mockSimilarCases);

    if (!enableRealTimeUpdates) return;

    // Simulate AI generating new recommendations
    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every interval
        const newRec: AIRecommendation = {
          id: `rec-${Date.now()}`,
          type: 'data_enrichment',
          title: 'Real-time Intelligence Update',
          description: 'New data source identified that may be relevant to investigation',
          rationale: 'Machine learning algorithms detected pattern match with high-confidence indicators',
          confidence: Math.floor(Math.random() * 30) + 70,
          priority: 'medium',
          category: 'data',
          estimatedEffort: {
            time: '2-4 hours',
            complexity: 'low',
            resources: ['data-analyst']
          },
          prerequisites: ['API access verification'],
          potentialImpact: 'May provide additional context for current analysis',
          relatedRecommendations: [],
          actionItems: [
            {
              id: `action-${Date.now()}`,
              description: 'Review new data source relevance',
              completed: false,
              estimatedTime: '2 hours'
            }
          ],
          metadata: {
            mlModelUsed: 'Real-time Pattern Detection v1.2',
            dataSourcesAnalyzed: ['Live Feed Monitor'],
            similarCasesFound: Math.floor(Math.random() * 100),
            confidenceFactors: [
              { factor: 'Pattern Match', weight: 0.8, confidence: Math.floor(Math.random() * 20) + 70 },
              { factor: 'Timeliness', weight: 0.2, confidence: 95 }
            ]
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setRecommendations(prev => [newRec, ...prev.slice(0, 9)]);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [mockRecommendations, mockStrategies, mockSimilarCases, enableRealTimeUpdates]);

  // Filtered and sorted recommendations
  const filteredRecommendations = useMemo(() => {
    const filtered = recommendations.filter(rec => {
      if (showAcceptedOnly && !rec.feedback?.helpful) return false;
      if (filterPriority !== 'all' && rec.priority !== filterPriority) return false;
      if (filterCategory !== 'all' && rec.category !== filterCategory) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return b.confidence - a.confidence;
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        default:
          return 0;
      }
    });
  }, [recommendations, filterPriority, filterCategory, sortBy, showAcceptedOnly]);

  const generateNewRecommendations = useCallback(async () => {
    setIsGenerating(true);
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newRecs = [
      {
        ...mockRecommendations[0],
        id: `rec-gen-${Date.now()}`,
        title: 'AI-Generated: Enhanced Pattern Analysis',
        description: 'Advanced ML analysis suggests investigating additional entity clusters',
        confidence: Math.floor(Math.random() * 20) + 80,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    setRecommendations(prev => [...newRecs, ...prev]);
    setIsGenerating(false);
  }, [mockRecommendations]);

  const handleRecommendationFeedback = useCallback((recId: string, helpful: boolean, rating: number, comments?: string) => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === recId 
        ? { ...rec, feedback: { helpful, rating: rating as any, comments: comments || '' } }
        : rec
    ));
  }, []);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className={`investigation-recommendations-engine ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>
            🧠 AI Investigation Recommendations
          </h3>
          
          <button
            onClick={generateNewRecommendations}
            disabled={isGenerating}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: isGenerating ? '#6c757d' : '#1a73e8',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {isGenerating ? '🧠 Generating...' : '⚡ Generate New'}
          </button>
        </div>

        {/* Context Summary */}
        <div style={{ padding: '12px 16px', backgroundColor: '#f8f9fa', border: '1px solid var(--hairline)', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: '#666' }}>
            <strong>Investigation Context:</strong> {mockContext.investigationType} • Priority: {mockContext.priority} • 
            {mockContext.currentEntities.length} entities • {mockContext.currentRelationships.length} relationships •
            Tags: {mockContext.investigationTags.slice(0, 2).join(', ')}
            {mockContext.investigationTags.length > 2 && ` +${mockContext.investigationTags.length - 2}`}
          </div>
        </div>

        {/* View Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--hairline)', marginBottom: '16px' }}>
          {[
            { key: 'recommendations', label: '🎯 Recommendations', count: filteredRecommendations.length },
            { key: 'strategies', label: '📋 Strategies', count: strategies.length },
            { key: 'similar_cases', label: '📚 Similar Cases', count: similarCases.length },
            { key: 'insights', label: '💡 Insights', count: 0 }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key as any)}
              style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeView === tab.key ? '2px solid #1a73e8' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === tab.key ? '600' : '400',
                color: activeView === tab.key ? '#1a73e8' : '#666'
              }}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Filters */}
        {activeView === 'recommendations' && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              style={{ padding: '6px', fontSize: '13px', border: '1px solid var(--hairline)', borderRadius: '4px' }}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{ padding: '6px', fontSize: '13px', border: '1px solid var(--hairline)', borderRadius: '4px' }}
            >
              <option value="all">All Categories</option>
              <option value="analysis">Analysis</option>
              <option value="data">Data</option>
              <option value="workflow">Workflow</option>
              <option value="investigation">Investigation</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ padding: '6px', fontSize: '13px', border: '1px solid var(--hairline)', borderRadius: '4px' }}
            >
              <option value="confidence">Sort by Confidence</option>
              <option value="priority">Sort by Priority</option>
              <option value="created">Sort by Created</option>
            </select>

            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
              <input
                type="checkbox"
                checked={showAcceptedOnly}
                onChange={(e) => setShowAcceptedOnly(e.target.checked)}
              />
              Show accepted only
            </label>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeView === 'recommendations' && (
          <div style={{ height: '100%', display: 'grid', gridTemplateColumns: selectedRecommendation ? '1fr 1fr' : '1fr', gap: '16px' }}>
            {/* Recommendations List */}
            <div style={{ overflow: 'auto', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', backgroundColor: '#f8f9fa' }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  AI Recommendations ({filteredRecommendations.length})
                </h4>
              </div>
              
              <div>
                {filteredRecommendations.map(rec => (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecommendation(rec)}
                    style={{
                      padding: '16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor: selectedRecommendation?.id === rec.id ? '#e3f2fd' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedRecommendation?.id !== rec.id) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedRecommendation?.id !== rec.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h5 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                          {rec.title}
                        </h5>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                          {rec.type.replace('_', ' ')} • {rec.category} • {rec.estimatedEffort.time}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: getPriorityColor(rec.priority),
                            color: 'white',
                            fontWeight: '600'
                          }}
                        >
                          {rec.priority.toUpperCase()}
                        </span>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          {rec.confidence}% confidence
                        </div>
                      </div>
                    </div>
                    
                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '8px', lineHeight: '1.4' }}>
                      {rec.description}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <div>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '12px',
                            backgroundColor: getComplexityColor(rec.estimatedEffort.complexity),
                            color: 'white',
                            fontSize: '10px',
                            fontWeight: '500'
                          }}
                        >
                          {rec.estimatedEffort.complexity.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ color: '#666' }}>
                        {rec.actionItems.length} action{rec.actionItems.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    {rec.feedback && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '4px 8px', 
                        backgroundColor: rec.feedback.helpful ? '#d4edda' : '#f8d7da', 
                        borderRadius: '4px', 
                        fontSize: '11px' 
                      }}>
                        {rec.feedback.helpful ? '✅ Accepted' : '❌ Rejected'} • Rating: {rec.feedback.rating}/5
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendation Details */}
            {selectedRecommendation && (
              <div style={{ overflow: 'auto', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--hairline)', backgroundColor: '#f8f9fa' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    Recommendation Details
                  </h4>
                </div>
                
                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <h5 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                      {selectedRecommendation.title}
                    </h5>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                      {selectedRecommendation.type.replace('_', ' ')} • Created: {selectedRecommendation.createdAt.toLocaleDateString()}
                    </div>
                    
                    <p style={{ fontSize: '14px', marginBottom: '12px', lineHeight: '1.4' }}>
                      {selectedRecommendation.description}
                    </p>
                    
                    <div style={{ padding: '12px', backgroundColor: '#f0f8ff', border: '1px solid #b3d9ff', borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>AI Rationale:</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{selectedRecommendation.rationale}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Action Items</h6>
                    <div>
                      {selectedRecommendation.actionItems.map(action => (
                        <div
                          key={action.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '8px',
                            padding: '8px',
                            marginBottom: '8px',
                            backgroundColor: action.completed ? '#d4edda' : '#f8f9fa',
                            borderRadius: '4px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={action.completed}
                            onChange={() => {
                              // Handle action completion
                            }}
                            style={{ marginTop: '2px' }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: '500' }}>
                              {action.description}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                              Est. time: {action.estimatedTime}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Confidence Analysis</h6>
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px' }}>Overall Confidence</span>
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>
                          {selectedRecommendation.confidence}%
                        </span>
                      </div>
                      <div style={{ 
                        height: '8px', 
                        backgroundColor: '#e9ecef', 
                        borderRadius: '4px' 
                      }}>
                        <div 
                          style={{ 
                            width: `${selectedRecommendation.confidence}%`, 
                            height: '100%', 
                            backgroundColor: selectedRecommendation.confidence > 80 ? '#28a745' :
                                            selectedRecommendation.confidence > 60 ? '#ffc107' : '#dc3545',
                            borderRadius: '4px'
                          }} 
                        />
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '12px' }}>
                      {selectedRecommendation.metadata.confidenceFactors.map(factor => (
                        <div key={factor.factor} style={{ marginBottom: '4px' }}>
                          <strong>{factor.factor}:</strong> {factor.confidence}% (weight: {(factor.weight * 100).toFixed(0)}%)
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Metadata</h6>
                    <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                      <div><strong>ML Model:</strong> {selectedRecommendation.metadata.mlModelUsed}</div>
                      <div><strong>Similar Cases:</strong> {selectedRecommendation.metadata.similarCasesFound}</div>
                      <div><strong>Data Sources:</strong> {selectedRecommendation.metadata.dataSourcesAnalyzed.join(', ')}</div>
                      <div><strong>Potential Impact:</strong> {selectedRecommendation.potentialImpact}</div>
                    </div>
                  </div>

                  <div>
                    <h6 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Actions</h6>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <button
                        onClick={() => onRecommendationAccept?.(selectedRecommendation)}
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ✅ Accept
                      </button>
                      
                      <button
                        onClick={() => onRecommendationReject?.(selectedRecommendation.id, 'Not relevant')}
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        ❌ Reject
                      </button>
                      
                      <button
                        style={{
                          padding: '8px 16px',
                          fontSize: '12px',
                          backgroundColor: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        💬 Feedback
                      </button>
                    </div>
                    
                    {!selectedRecommendation.feedback && (
                      <div>
                        <div style={{ fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>Rate this recommendation:</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[1, 2, 3, 4, 5].map(rating => (
                            <button
                              key={rating}
                              onClick={() => handleRecommendationFeedback(selectedRecommendation.id, rating >= 3, rating)}
                              style={{
                                padding: '4px 8px',
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {rating}⭐
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'strategies' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Investigation Strategies
            </h4>
            
            {strategies.map(strategy => (
              <div
                key={strategy.id}
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '20px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h5 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0' }}>
                      {strategy.name}
                    </h5>
                    <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>
                      {strategy.description}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => onStrategySelect?.(strategy)}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      backgroundColor: '#1a73e8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Select Strategy
                  </button>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <h6 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Implementation Phases:</h6>
                  <div>
                    {strategy.phases.map((phase, index) => (
                      <div key={index} style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                          {index + 1}. {phase.name} ({phase.estimatedDuration})
                        </div>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                          {phase.description}
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>
                          <strong>Tasks:</strong> {phase.tasks.slice(0, 2).join(', ')}
                          {phase.tasks.length > 2 && ` +${phase.tasks.length - 2} more`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Required Skills:</div>
                    <div style={{ color: '#666' }}>{strategy.requiredSkills.join(', ')}</div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '4px' }}>Recommended Tools:</div>
                    <div style={{ color: '#666' }}>{strategy.recommendedTools.slice(0, 2).join(', ')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeView === 'similar_cases' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
              Similar Cases ({similarCases.length})
            </h4>
            
            {similarCases.map(case_item => (
              <div
                key={case_item.id}
                style={{
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                    {case_item.title}
                  </h5>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a73e8' }}>
                      {case_item.similarity}% similar
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        backgroundColor: case_item.outcome === 'successful' ? '#28a745' : 
                                        case_item.outcome === 'partial' ? '#ffc107' : '#dc3545',
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      {case_item.outcome.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                  {case_item.description}
                </p>
                
                <div style={{ fontSize: '12px', marginBottom: '12px' }}>
                  <strong>Resolution time:</strong> {case_item.timeToResolution} days
                </div>
                
                <details>
                  <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                    Key Findings & Applicable Insights
                  </summary>
                  <div style={{ marginTop: '8px', fontSize: '11px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <strong>Methods Used:</strong> {case_item.methodsUsed.join(', ')}
                    </div>
                    <div>
                      <strong>Applicable Insights:</strong>
                      <ul style={{ marginTop: '4px', paddingLeft: '20px' }}>
                        {case_item.applicableInsights.map((insight, index) => (
                          <li key={index}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}

        {activeView === 'insights' && (
          <div style={{ padding: '16px', border: '1px solid var(--hairline)', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ padding: '40px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                💡 Advanced Investigation Insights
              </h4>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
                Deep analytical insights and predictive intelligence for investigation optimization.
              </p>
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
                🚧 Advanced insights engine coming soon - will include:
                <ul style={{ textAlign: 'left', marginTop: '12px', marginLeft: '20px' }}>
                  <li>Predictive case outcome modeling</li>
                  <li>Resource optimization recommendations</li>
                  <li>Investigation path optimization</li>
                  <li>Real-time pattern emergence alerts</li>
                  <li>Cross-case correlation insights</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationRecommendationsEngine;