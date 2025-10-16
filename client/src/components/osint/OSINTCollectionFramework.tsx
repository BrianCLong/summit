import React, { useState, useEffect } from 'react';

interface OSINTSource {
  id: string;
  name: string;
  category:
    | 'social_media'
    | 'web_search'
    | 'public_records'
    | 'news_media'
    | 'government'
    | 'academic'
    | 'financial'
    | 'technical'
    | 'darknet';
  type: 'automated' | 'manual' | 'api' | 'scraping' | 'syndicated';
  url?: string;
  apiEndpoint?: string;
  credentials?: {
    apiKey?: string;
    username?: string;
    rateLimits: {
      requestsPerHour: number;
      requestsPerDay: number;
    };
  };
  isActive: boolean;
  lastCollected?: Date;
  dataQuality: {
    reliability: number;
    timeliness: number;
    completeness: number;
    accuracy: number;
  };
  collectionRules: {
    keywords: string[];
    geoFilters?: string[];
    dateRange?: { start: Date; end: Date };
    languages?: string[];
    contentTypes?: string[];
  };
}

interface OSINTArtifact {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  content: string;
  contentType:
    | 'text'
    | 'image'
    | 'video'
    | 'audio'
    | 'document'
    | 'webpage'
    | 'social_post'
    | 'news_article';
  url?: string;
  author?: {
    username?: string;
    displayName?: string;
    verified?: boolean;
    followers?: number;
    profileUrl?: string;
  };
  metadata: {
    language: string;
    location?: {
      country?: string;
      city?: string;
      coordinates?: { latitude: number; longitude: number };
    };
    timestamp: Date;
    collectedAt: Date;
    sentiment?: 'positive' | 'negative' | 'neutral';
    topics?: string[];
    mentions?: string[];
    hashtags?: string[];
    confidence: number;
  };
  analysis: {
    relevanceScore: number;
    credibilityScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    entityExtractions: Array<{
      type:
        | 'person'
        | 'organization'
        | 'location'
        | 'event'
        | 'technology'
        | 'phone'
        | 'email'
        | 'ip'
        | 'url';
      value: string;
      confidence: number;
      context: string;
    }>;
    keyPhrases: string[];
    relationships: Array<{
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
    }>;
  };
  tags: string[];
  flags: Array<{
    type:
      | 'misinformation'
      | 'threat'
      | 'sensitive'
      | 'urgent'
      | 'duplicate'
      | 'expired';
    reason: string;
    flaggedBy: string;
    flaggedAt: Date;
  }>;
}

interface OSINTCollection {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  createdBy: string;
  createdAt: Date;
  lastUpdated: Date;
  searchQueries: Array<{
    query: string;
    sources: string[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    schedule: {
      frequency: 'continuous' | 'hourly' | 'daily' | 'weekly';
      nextRun?: Date;
    };
  }>;
  artifacts: string[];
  statistics: {
    totalArtifacts: number;
    newToday: number;
    relevantItems: number;
    highRiskItems: number;
    duplicatesRemoved: number;
    averageCredibility: number;
  };
  filters: {
    minRelevance: number;
    minCredibility: number;
    excludeKeywords: string[];
    requiredKeywords: string[];
    dateRange?: { start: Date; end: Date };
  };
}

interface ThreatIndicator {
  id: string;
  type:
    | 'ioc'
    | 'ttp'
    | 'vulnerability'
    | 'campaign'
    | 'actor'
    | 'infrastructure';
  value: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  contexts: Array<{
    campaign?: string;
    malwareFamily?: string;
    attackVector?: string;
    targetSector?: string;
    geography?: string;
    description: string;
  }>;
  mitreTactics?: string[];
  associatedArtifacts: string[];
}

interface OSINTAnalytics {
  timeframe: { start: Date; end: Date };
  summary: {
    totalCollections: number;
    totalArtifacts: number;
    uniqueSources: number;
    averageQuality: number;
    topTopics: Array<{
      topic: string;
      count: number;
      trend: 'up' | 'down' | 'stable';
    }>;
    geographicDistribution: Array<{
      country: string;
      count: number;
      percentage: number;
    }>;
    languageDistribution: Array<{
      language: string;
      count: number;
      percentage: number;
    }>;
  };
  trends: {
    collectionVolume: Array<{ date: Date; count: number }>;
    qualityTrend: Array<{ date: Date; quality: number }>;
    topicEvolution: Array<{ date: Date; topics: { [topic: string]: number } }>;
    sentimentTrend: Array<{
      date: Date;
      positive: number;
      negative: number;
      neutral: number;
    }>;
  };
  threats: {
    newIndicators: number;
    escalatedThreats: number;
    activeCampaigns: string[];
    riskDistribution: { [level: string]: number };
  };
}

interface OSINTCollectionFrameworkProps {
  investigationId?: string;
  onArtifactDiscovered?: (artifact: OSINTArtifact) => void;
  onThreatDetected?: (threat: ThreatIndicator) => void;
  onCollectionComplete?: (collection: OSINTCollection) => void;
  onAnalyticsUpdate?: (analytics: OSINTAnalytics) => void;
  autoStart?: boolean;
  className?: string;
}

const OSINTCollectionFramework: React.FC<OSINTCollectionFrameworkProps> = ({
  investigationId,
  onArtifactDiscovered = () => {},
  onThreatDetected = () => {},
  onCollectionComplete = () => {},
  onAnalyticsUpdate = () => {},
  autoStart = false,
  className = '',
}) => {
  const [activeView, setActiveView] = useState<
    | 'dashboard'
    | 'sources'
    | 'collections'
    | 'artifacts'
    | 'threats'
    | 'analytics'
  >('dashboard');
  const [osintSources, setOsintSources] = useState<OSINTSource[]>([]);
  const [collections, setCollections] = useState<OSINTCollection[]>([]);
  const [artifacts, setArtifacts] = useState<OSINTArtifact[]>([]);
  const [threats, setThreats] = useState<ThreatIndicator[]>([]);
  const [analytics, setAnalytics] = useState<OSINTAnalytics | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [selectedCollection, setSelectedCollection] =
    useState<OSINTCollection | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');

  const sourceCategories = [
    { id: 'social_media', name: 'Social Media', icon: '📱', color: '#1da1f2' },
    { id: 'web_search', name: 'Web Search', icon: '🔍', color: '#34a853' },
    {
      id: 'public_records',
      name: 'Public Records',
      icon: '📋',
      color: '#ea4335',
    },
    { id: 'news_media', name: 'News Media', icon: '📰', color: '#ff6d00' },
    { id: 'government', name: 'Government', icon: '🏛️', color: '#1976d2' },
    { id: 'academic', name: 'Academic', icon: '🎓', color: '#7b1fa2' },
    { id: 'financial', name: 'Financial', icon: '💰', color: '#388e3c' },
    { id: 'technical', name: 'Technical', icon: '⚙️', color: '#5d4037' },
    { id: 'darknet', name: 'Dark Web', icon: '🌐', color: '#424242' },
  ];

  useEffect(() => {
    generateMockOSINTSources();
    generateMockCollections();
    generateMockArtifacts();
    generateMockThreats();
    generateMockAnalytics();

    if (autoStart) {
      startRealTimeCollection();
    }

    const collectionInterval = setInterval(() => {
      simulateRealTimeCollection();
    }, 30000); // Every 30 seconds

    return () => clearInterval(collectionInterval);
  }, [investigationId, autoStart]);

  const generateMockOSINTSources = () => {
    const mockSources: OSINTSource[] = [
      {
        id: 'twitter-api',
        name: 'Twitter API v2',
        category: 'social_media',
        type: 'api',
        apiEndpoint: 'https://api.twitter.com/2/',
        isActive: true,
        lastCollected: new Date(Date.now() - 15 * 60 * 1000),
        dataQuality: {
          reliability: 0.85,
          timeliness: 0.95,
          completeness: 0.78,
          accuracy: 0.82,
        },
        collectionRules: {
          keywords: ['cybersecurity', 'threat intelligence', 'data breach'],
          languages: ['en', 'es', 'fr'],
          contentTypes: ['tweets', 'replies'],
        },
        credentials: {
          rateLimits: { requestsPerHour: 300, requestsPerDay: 5000 },
        },
      },
      {
        id: 'reddit-scraper',
        name: 'Reddit Intelligence',
        category: 'social_media',
        type: 'scraping',
        url: 'https://reddit.com',
        isActive: true,
        lastCollected: new Date(Date.now() - 45 * 60 * 1000),
        dataQuality: {
          reliability: 0.75,
          timeliness: 0.88,
          completeness: 0.85,
          accuracy: 0.79,
        },
        collectionRules: {
          keywords: ['security', 'hacking', 'malware', 'phishing'],
          contentTypes: ['posts', 'comments'],
        },
        credentials: {
          rateLimits: { requestsPerHour: 60, requestsPerDay: 1000 },
        },
      },
      {
        id: 'google-news',
        name: 'Google News API',
        category: 'news_media',
        type: 'api',
        apiEndpoint: 'https://newsapi.org/v2/',
        isActive: true,
        lastCollected: new Date(Date.now() - 30 * 60 * 1000),
        dataQuality: {
          reliability: 0.92,
          timeliness: 0.9,
          completeness: 0.88,
          accuracy: 0.91,
        },
        collectionRules: {
          keywords: ['cyber attack', 'data breach', 'ransomware', 'APT'],
          languages: ['en'],
          contentTypes: ['articles', 'headlines'],
        },
        credentials: {
          rateLimits: { requestsPerHour: 100, requestsPerDay: 1000 },
        },
      },
      {
        id: 'pastebin-monitor',
        name: 'Pastebin Monitor',
        category: 'technical',
        type: 'automated',
        url: 'https://pastebin.com',
        isActive: true,
        lastCollected: new Date(Date.now() - 10 * 60 * 1000),
        dataQuality: {
          reliability: 0.65,
          timeliness: 0.98,
          completeness: 0.7,
          accuracy: 0.68,
        },
        collectionRules: {
          keywords: ['password', 'breach', 'dump', 'leak', 'hack'],
          contentTypes: ['pastes'],
        },
        credentials: {
          rateLimits: { requestsPerHour: 500, requestsPerDay: 10000 },
        },
      },
      {
        id: 'sec-filings',
        name: 'SEC EDGAR Database',
        category: 'government',
        type: 'api',
        apiEndpoint: 'https://www.sec.gov/Archives/edgar/data/',
        isActive: true,
        lastCollected: new Date(Date.now() - 120 * 60 * 1000),
        dataQuality: {
          reliability: 0.98,
          timeliness: 0.7,
          completeness: 0.95,
          accuracy: 0.97,
        },
        collectionRules: {
          keywords: ['cybersecurity', 'data breach', 'incident'],
          contentTypes: ['10-K', '10-Q', '8-K'],
        },
        credentials: {
          rateLimits: { requestsPerHour: 10, requestsPerDay: 100 },
        },
      },
    ];

    setOsintSources(mockSources);
  };

  const generateMockCollections = () => {
    const mockCollections: OSINTCollection[] = [
      {
        id: 'collection-001',
        name: 'APT Campaign Monitoring',
        description:
          'Continuous monitoring for advanced persistent threat campaigns',
        status: 'active',
        createdBy: 'Threat Intelligence Team',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
        searchQueries: [
          {
            query: 'APT29 OR Cozy Bear OR "advanced persistent threat"',
            sources: ['twitter-api', 'google-news', 'reddit-scraper'],
            priority: 'critical',
            schedule: {
              frequency: 'hourly',
              nextRun: new Date(Date.now() + 45 * 60 * 1000),
            },
          },
          {
            query: 'state-sponsored attack OR nation-state',
            sources: ['google-news', 'sec-filings'],
            priority: 'high',
            schedule: { frequency: 'daily' },
          },
        ],
        artifacts: [],
        statistics: {
          totalArtifacts: 1247,
          newToday: 34,
          relevantItems: 892,
          highRiskItems: 23,
          duplicatesRemoved: 156,
          averageCredibility: 0.78,
        },
        filters: {
          minRelevance: 0.6,
          minCredibility: 0.5,
          excludeKeywords: ['false positive', 'outdated'],
          requiredKeywords: [],
          dateRange: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date(),
          },
        },
      },
      {
        id: 'collection-002',
        name: 'Cryptocurrency Threat Intelligence',
        description: 'Monitoring for cryptocurrency-related threats and fraud',
        status: 'active',
        createdBy: 'Financial Crimes Unit',
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        lastUpdated: new Date(Date.now() - 60 * 60 * 1000),
        searchQueries: [
          {
            query: 'cryptocurrency scam OR bitcoin fraud OR crypto hack',
            sources: ['twitter-api', 'reddit-scraper', 'google-news'],
            priority: 'high',
            schedule: { frequency: 'continuous' },
          },
        ],
        artifacts: [],
        statistics: {
          totalArtifacts: 867,
          newToday: 28,
          relevantItems: 634,
          highRiskItems: 45,
          duplicatesRemoved: 89,
          averageCredibility: 0.72,
        },
        filters: {
          minRelevance: 0.5,
          minCredibility: 0.4,
          excludeKeywords: ['advertisement'],
          requiredKeywords: ['crypto', 'bitcoin', 'ethereum'],
        },
      },
    ];

    setCollections(mockCollections);
    setSelectedCollection(mockCollections[0]);
  };

  const generateMockArtifacts = () => {
    const contentTypes: OSINTArtifact['contentType'][] = [
      'text',
      'image',
      'webpage',
      'social_post',
      'news_article',
      'document',
    ];
    const riskLevels: ('low' | 'medium' | 'high' | 'critical')[] = [
      'low',
      'medium',
      'high',
      'critical',
    ];
    const sentiments: ('positive' | 'negative' | 'neutral')[] = [
      'positive',
      'negative',
      'neutral',
    ];

    const mockArtifacts: OSINTArtifact[] = Array.from(
      { length: 150 },
      (_, i) => ({
        id: `artifact-${String(i + 1).padStart(3, '0')}`,
        sourceId:
          osintSources[Math.floor(Math.random() * osintSources.length)]?.id ||
          'twitter-api',
        sourceName:
          osintSources[Math.floor(Math.random() * osintSources.length)]?.name ||
          'Twitter API v2',
        title: `Intelligence Artifact ${i + 1}`,
        content: `Mock OSINT content for artifact ${i + 1}. This represents intelligence data collected from open sources including social media, news, and technical platforms.`,
        contentType:
          contentTypes[Math.floor(Math.random() * contentTypes.length)],
        url: `https://source-${i}.com/artifact/${i + 1}`,
        author:
          Math.random() > 0.3
            ? {
                username: `user_${i + 1}`,
                displayName: `Source User ${i + 1}`,
                verified: Math.random() > 0.7,
                followers: Math.floor(Math.random() * 100000),
                profileUrl: `https://platform.com/user_${i + 1}`,
              }
            : undefined,
        metadata: {
          language: ['en', 'es', 'fr', 'de', 'zh'][
            Math.floor(Math.random() * 5)
          ],
          location:
            Math.random() > 0.4
              ? {
                  country: [
                    'United States',
                    'United Kingdom',
                    'Germany',
                    'France',
                    'China',
                  ][Math.floor(Math.random() * 5)],
                  city: ['New York', 'London', 'Berlin', 'Paris', 'Beijing'][
                    Math.floor(Math.random() * 5)
                  ],
                  coordinates:
                    Math.random() > 0.7
                      ? {
                          latitude: Math.random() * 180 - 90,
                          longitude: Math.random() * 360 - 180,
                        }
                      : undefined,
                }
              : undefined,
          timestamp: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          ),
          collectedAt: new Date(
            Date.now() - Math.random() * 2 * 60 * 60 * 1000,
          ),
          sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
          topics: [
            'cybersecurity',
            'threat intelligence',
            'data breach',
            'malware',
            'phishing',
          ].slice(0, Math.floor(Math.random() * 3) + 1),
          mentions:
            Math.random() > 0.6
              ? [
                  `@user${Math.floor(Math.random() * 100)}`,
                  `@company${Math.floor(Math.random() * 50)}`,
                ]
              : [],
          hashtags:
            Math.random() > 0.5
              ? ['#cybersecurity', '#infosec', '#threatintel'].slice(
                  0,
                  Math.floor(Math.random() * 2) + 1,
                )
              : [],
          confidence: Math.random() * 40 + 60,
        },
        analysis: {
          relevanceScore: Math.random() * 40 + 60,
          credibilityScore: Math.random() * 50 + 50,
          riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
          entityExtractions: [
            {
              type: ['person', 'organization', 'location', 'technology'][
                Math.floor(Math.random() * 4)
              ] as any,
              value: `Entity_${i + 1}`,
              confidence: Math.random() * 30 + 70,
              context: 'Extracted from content analysis',
            },
          ],
          keyPhrases: [
            'threat actor',
            'data exfiltration',
            'command and control',
          ].slice(0, Math.floor(Math.random() * 2) + 1),
          relationships:
            Math.random() > 0.7
              ? [
                  {
                    subject: `Entity_${i + 1}`,
                    predicate: 'associated_with',
                    object: `ThreatActor_${Math.floor(Math.random() * 10)}`,
                    confidence: Math.random() * 30 + 70,
                  },
                ]
              : [],
        },
        tags: ['osint', 'intelligence', 'threat'].concat(
          Math.random() > 0.5 ? ['urgent'] : [],
        ),
        flags:
          Math.random() > 0.8
            ? [
                {
                  type: ['threat', 'sensitive', 'urgent'][
                    Math.floor(Math.random() * 3)
                  ] as any,
                  reason:
                    'High-priority intelligence item requiring immediate attention',
                  flaggedBy: 'Automated Analysis System',
                  flaggedAt: new Date(
                    Date.now() - Math.random() * 60 * 60 * 1000,
                  ),
                },
              ]
            : [],
      }),
    );

    setArtifacts(
      mockArtifacts.sort(
        (a, b) =>
          b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime(),
      ),
    );
  };

  const generateMockThreats = () => {
    const threatTypes: ThreatIndicator['type'][] = [
      'ioc',
      'ttp',
      'vulnerability',
      'campaign',
      'actor',
      'infrastructure',
    ];
    const severityLevels: ThreatIndicator['severity'][] = [
      'info',
      'low',
      'medium',
      'high',
      'critical',
    ];

    const mockThreats: ThreatIndicator[] = Array.from(
      { length: 75 },
      (_, i) => ({
        id: `threat-${String(i + 1).padStart(3, '0')}`,
        type: threatTypes[Math.floor(Math.random() * threatTypes.length)],
        value: `ThreatIndicator_${i + 1}`,
        severity:
          severityLevels[Math.floor(Math.random() * severityLevels.length)],
        confidence: Math.random() * 40 + 60,
        source: [
          'Intelligence Feed Alpha',
          'OSINT Collection Beta',
          'Threat Research Team',
        ][Math.floor(Math.random() * 3)],
        firstSeen: new Date(
          Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000,
        ),
        lastSeen: new Date(
          Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
        ),
        contexts: [
          {
            campaign:
              Math.random() > 0.5
                ? `Campaign_${Math.floor(Math.random() * 20) + 1}`
                : undefined,
            malwareFamily:
              Math.random() > 0.6
                ? ['Emotet', 'Trickbot', 'Ryuk', 'Maze'][
                    Math.floor(Math.random() * 4)
                  ]
                : undefined,
            attackVector: ['Email', 'Web', 'USB', 'Network'][
              Math.floor(Math.random() * 4)
            ],
            targetSector: [
              'Financial',
              'Healthcare',
              'Government',
              'Technology',
            ][Math.floor(Math.random() * 4)],
            geography: ['Global', 'North America', 'Europe', 'Asia-Pacific'][
              Math.floor(Math.random() * 4)
            ],
            description: `Threat context description for indicator ${i + 1}`,
          },
        ],
        mitreTactics: ['T1566.001', 'T1059.001', 'T1055', 'T1003.001'].slice(
          0,
          Math.floor(Math.random() * 3) + 1,
        ),
        associatedArtifacts: [
          `artifact-${String(Math.floor(Math.random() * 150) + 1).padStart(3, '0')}`,
        ],
      }),
    );

    setThreats(
      mockThreats.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime()),
    );
  };

  const generateMockAnalytics = () => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const mockAnalytics: OSINTAnalytics = {
      timeframe: { start: weekAgo, end: now },
      summary: {
        totalCollections: collections.length,
        totalArtifacts: 15420,
        uniqueSources: osintSources.length,
        averageQuality: 0.78,
        topTopics: [
          { topic: 'Cybersecurity', count: 3240, trend: 'up' },
          { topic: 'Data Breach', count: 2180, trend: 'up' },
          { topic: 'Malware', count: 1890, trend: 'stable' },
          { topic: 'Phishing', count: 1650, trend: 'down' },
          { topic: 'Ransomware', count: 1440, trend: 'up' },
        ],
        geographicDistribution: [
          { country: 'United States', count: 6200, percentage: 40.2 },
          { country: 'United Kingdom', count: 2300, percentage: 14.9 },
          { country: 'Germany', count: 1800, percentage: 11.7 },
          { country: 'France', count: 1200, percentage: 7.8 },
          { country: 'China', count: 1000, percentage: 6.5 },
        ],
        languageDistribution: [
          { language: 'English', count: 12500, percentage: 81.1 },
          { language: 'Spanish', count: 1200, percentage: 7.8 },
          { language: 'French', count: 800, percentage: 5.2 },
          { language: 'German', count: 600, percentage: 3.9 },
          { language: 'Chinese', count: 320, percentage: 2.1 },
        ],
      },
      trends: {
        collectionVolume: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000),
          count: Math.floor(Math.random() * 500) + 1800 + i * 50,
        })),
        qualityTrend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000),
          quality: 0.65 + Math.random() * 0.25 + i * 0.02,
        })),
        topicEvolution: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000),
          topics: {
            Cybersecurity: Math.floor(Math.random() * 100) + 400 + i * 20,
            'Data Breach': Math.floor(Math.random() * 80) + 300 + i * 15,
            Malware: Math.floor(Math.random() * 60) + 250 + i * 10,
          },
        })),
        sentimentTrend: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(weekAgo.getTime() + i * 24 * 60 * 60 * 1000),
          positive: Math.floor(Math.random() * 200) + 300,
          negative: Math.floor(Math.random() * 300) + 500,
          neutral: Math.floor(Math.random() * 400) + 800,
        })),
      },
      threats: {
        newIndicators: 47,
        escalatedThreats: 12,
        activeCampaigns: [
          'APT29 Campaign',
          'Ransomware Campaign Alpha',
          'Financial Fraud Ring Beta',
        ],
        riskDistribution: {
          critical: 8,
          high: 23,
          medium: 45,
          low: 67,
          info: 89,
        },
      },
    };

    setAnalytics(mockAnalytics);
    onAnalyticsUpdate(mockAnalytics);
  };

  const startRealTimeCollection = () => {
    setIsCollecting(true);
  };

  const stopRealTimeCollection = () => {
    setIsCollecting(false);
  };

  const simulateRealTimeCollection = () => {
    if (!isCollecting) return;

    // Simulate discovering new artifacts
    if (Math.random() > 0.7) {
      const newArtifact: OSINTArtifact = {
        id: `artifact-${Date.now()}`,
        sourceId:
          osintSources[Math.floor(Math.random() * osintSources.length)]?.id ||
          'twitter-api',
        sourceName: 'Real-time Collection',
        title: 'New Intelligence Artifact',
        content:
          'Real-time intelligence artifact discovered through automated collection',
        contentType: 'social_post',
        metadata: {
          language: 'en',
          timestamp: new Date(),
          collectedAt: new Date(),
          confidence: Math.random() * 30 + 70,
          topics: ['threat intelligence', 'cybersecurity'],
          hashtags: ['#threatintel'],
        },
        analysis: {
          relevanceScore: Math.random() * 40 + 60,
          credibilityScore: Math.random() * 50 + 50,
          riskLevel: ['low', 'medium', 'high'][
            Math.floor(Math.random() * 3)
          ] as any,
          entityExtractions: [],
          keyPhrases: ['real-time intelligence'],
          relationships: [],
        },
        tags: ['real-time', 'osint'],
        flags: [],
      };

      setArtifacts((prev) => [newArtifact, ...prev.slice(0, 149)]);
      onArtifactDiscovered(newArtifact);
    }

    // Simulate threat detection
    if (Math.random() > 0.9) {
      const newThreat: ThreatIndicator = {
        id: `threat-${Date.now()}`,
        type: 'ioc',
        value: `RealTime_IOC_${Date.now()}`,
        severity: ['medium', 'high', 'critical'][
          Math.floor(Math.random() * 3)
        ] as any,
        confidence: Math.random() * 30 + 70,
        source: 'Real-time OSINT Collection',
        firstSeen: new Date(),
        lastSeen: new Date(),
        contexts: [
          {
            description:
              'Threat indicator discovered through real-time OSINT collection',
            attackVector: 'Unknown',
            targetSector: 'Multiple',
          },
        ],
        associatedArtifacts: [],
      };

      setThreats((prev) => [newThreat, ...prev.slice(0, 74)]);
      onThreatDetected(newThreat);
    }
  };

  const createNewCollection = (
    name: string,
    description: string,
    queries: string[],
  ) => {
    const newCollection: OSINTCollection = {
      id: `collection-${Date.now()}`,
      name,
      description,
      status: 'active',
      createdBy: 'Current User',
      createdAt: new Date(),
      lastUpdated: new Date(),
      searchQueries: queries.map((query) => ({
        query,
        sources: osintSources.filter((s) => s.isActive).map((s) => s.id),
        priority: 'medium',
        schedule: { frequency: 'hourly' },
      })),
      artifacts: [],
      statistics: {
        totalArtifacts: 0,
        newToday: 0,
        relevantItems: 0,
        highRiskItems: 0,
        duplicatesRemoved: 0,
        averageCredibility: 0,
      },
      filters: {
        minRelevance: 0.5,
        minCredibility: 0.4,
        excludeKeywords: [],
        requiredKeywords: [],
      },
    };

    setCollections((prev) => [newCollection, ...prev]);
    onCollectionComplete(newCollection);
  };

  const getRiskColor = (risk: string | number) => {
    if (typeof risk === 'string') {
      switch (risk) {
        case 'critical':
          return 'text-red-700 bg-red-100 border-red-200';
        case 'high':
          return 'text-orange-700 bg-orange-100 border-orange-200';
        case 'medium':
          return 'text-yellow-700 bg-yellow-100 border-yellow-200';
        case 'low':
          return 'text-blue-700 bg-blue-100 border-blue-200';
        case 'info':
          return 'text-gray-700 bg-gray-100 border-gray-200';
        default:
          return 'text-gray-700 bg-gray-100 border-gray-200';
      }
    } else {
      if (risk >= 80) return 'text-red-700 bg-red-100 border-red-200';
      if (risk >= 60) return 'text-orange-700 bg-orange-100 border-orange-200';
      if (risk >= 40) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      return 'text-green-700 bg-green-100 border-green-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'paused':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'completed':
        return 'text-blue-700 bg-blue-100 border-blue-200';
      case 'failed':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const filteredArtifacts = artifacts.filter((artifact) => {
    const matchesSearch =
      searchQuery === '' ||
      artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.tags.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesCategory =
      filterCategory === 'all' ||
      osintSources.find((s) => s.id === artifact.sourceId)?.category ===
        filterCategory;

    const matchesRisk =
      filterRisk === 'all' || artifact.analysis.riskLevel === filterRisk;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  const filteredThreats = threats.filter((threat) => {
    const matchesSearch =
      searchQuery === '' ||
      threat.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      threat.contexts.some((ctx) =>
        ctx.description.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    const matchesRisk = filterRisk === 'all' || threat.severity === filterRisk;

    return matchesSearch && matchesRisk;
  });

  return (
    <div className={`osint-collection-framework ${className}`}>
      {/* Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            OSINT Collection & Analysis Framework
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${isCollecting ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
              ></div>
              <span className="text-sm text-gray-600">
                Collection {isCollecting ? 'Active' : 'Stopped'}
              </span>
            </div>
            <button
              onClick={
                isCollecting ? stopRealTimeCollection : startRealTimeCollection
              }
              className={`px-4 py-2 rounded-md text-sm ${
                isCollecting
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {isCollecting ? '⏸️ Stop Collection' : '▶️ Start Collection'}
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${activeView === 'dashboard' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView('sources')}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${activeView === 'sources' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔗 Sources ({osintSources.filter((s) => s.isActive).length})
          </button>
          <button
            onClick={() => setActiveView('collections')}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${activeView === 'collections' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📂 Collections (
            {collections.filter((c) => c.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveView('artifacts')}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${activeView === 'artifacts' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📄 Artifacts ({artifacts.length})
          </button>
          <button
            onClick={() => setActiveView('threats')}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${activeView === 'threats' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            ⚠️ Threats (
            {
              threats.filter(
                (t) => t.severity === 'high' || t.severity === 'critical',
              ).length
            }
            )
          </button>
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 rounded-md whitespace-nowrap ${activeView === 'analytics' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📈 Analytics
          </button>
        </div>
      </div>

      {/* Dashboard View */}
      {activeView === 'dashboard' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-blue-600">
                {artifacts.length}
              </div>
              <div className="text-sm text-gray-600">Total Artifacts</div>
              <div className="text-xs text-gray-500 mt-1">
                {
                  artifacts.filter(
                    (a) =>
                      a.analysis.riskLevel === 'high' ||
                      a.analysis.riskLevel === 'critical',
                  ).length
                }{' '}
                high-risk
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-600">
                {osintSources.filter((s) => s.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active Sources</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Set(osintSources.map((s) => s.category)).size} categories
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-orange-600">
                {collections.filter((c) => c.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Running Collections</div>
              <div className="text-xs text-gray-500 mt-1">
                {collections.reduce(
                  (sum, c) => sum + c.searchQueries.length,
                  0,
                )}{' '}
                queries
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-2xl font-bold text-red-600">
                {threats.filter((t) => t.severity === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Critical Threats</div>
              <div className="text-xs text-gray-500 mt-1">
                {threats.filter((t) => t.severity === 'high').length} high
                severity
              </div>
            </div>
          </div>

          {/* Source Categories Overview */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Collection Sources by Category
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {sourceCategories.map((category) => {
                const sourceCount = osintSources.filter(
                  (s) => s.category === category.id && s.isActive,
                ).length;
                return (
                  <div
                    key={category.id}
                    className="text-center p-3 border rounded-lg"
                  >
                    <div
                      className="text-2xl mb-2"
                      style={{ color: category.color }}
                    >
                      {category.icon}
                    </div>
                    <div className="font-medium text-sm">{category.name}</div>
                    <div className="text-xs text-gray-500">
                      {sourceCount} active
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">
                Recent High-Priority Artifacts
              </h3>
              <div className="space-y-3">
                {artifacts
                  .filter(
                    (a) =>
                      a.analysis.riskLevel === 'high' ||
                      a.analysis.riskLevel === 'critical',
                  )
                  .slice(0, 5)
                  .map((artifact) => (
                    <div
                      key={artifact.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {artifact.title}
                        </div>
                        <div className="text-xs text-gray-600">
                          {artifact.sourceName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {artifact.metadata.timestamp.toLocaleString()}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded ml-2 ${getRiskColor(artifact.analysis.riskLevel)}`}
                      >
                        {artifact.analysis.riskLevel.toUpperCase()}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-4">Latest Threat Indicators</h3>
              <div className="space-y-3">
                {threats.slice(0, 5).map((threat) => (
                  <div
                    key={threat.id}
                    className="flex items-start justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{threat.value}</div>
                      <div className="text-xs text-gray-600 capitalize">
                        {threat.type} • {threat.source}
                      </div>
                      <div className="text-xs text-gray-500">
                        {threat.lastSeen.toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded ml-2 ${getRiskColor(threat.severity)}`}
                    >
                      {threat.severity.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sources View */}
      {activeView === 'sources' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {osintSources.map((source) => (
              <div key={source.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="text-2xl"
                      style={{
                        color: sourceCategories.find(
                          (c) => c.id === source.category,
                        )?.color,
                      }}
                    >
                      {
                        sourceCategories.find((c) => c.id === source.category)
                          ?.icon
                      }
                    </div>
                    <div>
                      <h4 className="font-semibold">{source.name}</h4>
                      <p className="text-sm text-gray-600 capitalize">
                        {source.category.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      source.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {source.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <div className="font-medium capitalize">{source.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Last Collected:</span>
                    <div className="font-medium text-xs">
                      {source.lastCollected
                        ? source.lastCollected.toLocaleString()
                        : 'Never'}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <span className="text-xs text-gray-600">Data Quality:</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="text-xs">
                      Reliability:{' '}
                      {(source.dataQuality.reliability * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs">
                      Timeliness:{' '}
                      {(source.dataQuality.timeliness * 100).toFixed(0)}%
                    </div>
                  </div>
                </div>

                {source.credentials && (
                  <div className="text-xs text-gray-600">
                    <div>
                      Rate Limit:{' '}
                      {source.credentials.rateLimits.requestsPerHour}/hour
                    </div>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-1">
                  {source.collectionRules.keywords
                    .slice(0, 3)
                    .map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        {keyword}
                      </span>
                    ))}
                  {source.collectionRules.keywords.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{source.collectionRules.keywords.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collections View */}
      {activeView === 'collections' && (
        <div className="space-y-4">
          {collections.map((collection) => (
            <div key={collection.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{collection.name}</h4>
                  <p className="text-gray-600">{collection.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs rounded ${getStatusColor(collection.status)}`}
                  >
                    {collection.status.toUpperCase()}
                  </span>
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200">
                    Configure
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600">Total Artifacts:</span>
                  <div className="font-medium">
                    {collection.statistics.totalArtifacts.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">New Today:</span>
                  <div className="font-medium text-green-600">
                    {collection.statistics.newToday}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">High Risk:</span>
                  <div className="font-medium text-red-600">
                    {collection.statistics.highRiskItems}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Quality:</span>
                  <div className="font-medium">
                    {(collection.statistics.averageCredibility * 100).toFixed(
                      0,
                    )}
                    %
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <span className="text-sm font-medium">Search Queries:</span>
                <div className="mt-1 space-y-1">
                  {collection.searchQueries.slice(0, 2).map((query, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                      <div className="font-mono text-xs">{query.query}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Priority: {query.priority} • Frequency:{' '}
                        {query.schedule.frequency} • Sources:{' '}
                        {query.sources.length}
                      </div>
                    </div>
                  ))}
                  {collection.searchQueries.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{collection.searchQueries.length - 2} more queries
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-600">
                Created by {collection.createdBy} on{' '}
                {collection.createdAt.toLocaleDateString()} • Last updated:{' '}
                {collection.lastUpdated.toLocaleString()}
              </div>
            </div>
          ))}

          {collections.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📂</div>
              <h3 className="text-lg font-medium mb-2">
                No collections configured
              </h3>
              <p className="mb-4">
                Create your first OSINT collection to start gathering
                intelligence
              </p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Create Collection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Artifacts View */}
      {activeView === 'artifacts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search artifacts..."
              className="px-3 py-2 border rounded-md text-sm flex-1"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Categories</option>
              {sourceCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Artifacts List */}
          <div className="space-y-4">
            {filteredArtifacts.slice(0, 50).map((artifact) => (
              <div key={artifact.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold">{artifact.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {artifact.content}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${getRiskColor(artifact.analysis.riskLevel)}`}
                    >
                      {artifact.analysis.riskLevel.toUpperCase()}
                    </span>
                    {artifact.flags.length > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                        🚩 FLAGGED
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
                  <div>
                    <span className="text-gray-600">Source:</span>
                    <div className="font-medium">{artifact.sourceName}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Relevance:</span>
                    <div className="font-medium">
                      {artifact.analysis.relevanceScore.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Credibility:</span>
                    <div className="font-medium">
                      {artifact.analysis.credibilityScore.toFixed(0)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Timestamp:</span>
                    <div className="font-medium">
                      {artifact.metadata.timestamp.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {artifact.analysis.entityExtractions.length > 0 && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-600">Entities:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {artifact.analysis.entityExtractions
                        .slice(0, 3)
                        .map((entity, index) => (
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

                <div className="flex flex-wrap gap-1">
                  {artifact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {artifact.metadata.sentiment && (
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        artifact.metadata.sentiment === 'positive'
                          ? 'bg-green-100 text-green-700'
                          : artifact.metadata.sentiment === 'negative'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {artifact.metadata.sentiment}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filteredArtifacts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-medium mb-2">
                  No artifacts match your filters
                </h3>
                <p>
                  Try adjusting your search criteria or collection parameters
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threats View */}
      {activeView === 'threats' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search threats..."
              className="px-3 py-2 border rounded-md text-sm flex-1"
            />
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>

          {/* Threats List */}
          <div className="space-y-4">
            {filteredThreats.slice(0, 30).map((threat) => (
              <div key={threat.id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold font-mono">{threat.value}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded capitalize">
                        {threat.type.replace('_', ' ')}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${getRiskColor(threat.severity)}`}
                      >
                        {threat.severity.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {threat.confidence.toFixed(0)}% confidence
                    </div>
                    <div className="text-xs text-gray-500">
                      {threat.lastSeen.toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Source:</span>
                    <div className="font-medium">{threat.source}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">First Seen:</span>
                    <div className="font-medium">
                      {threat.firstSeen.toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Associated Artifacts:</span>
                    <div className="font-medium">
                      {threat.associatedArtifacts.length}
                    </div>
                  </div>
                </div>

                {threat.contexts.length > 0 && (
                  <div className="mb-3 p-3 bg-gray-50 rounded-md">
                    <span className="text-sm font-medium">Context:</span>
                    {threat.contexts[0].campaign && (
                      <div className="text-sm text-gray-700 mt-1">
                        Campaign: {threat.contexts[0].campaign}
                      </div>
                    )}
                    <div className="text-sm text-gray-700">
                      {threat.contexts[0].description}
                    </div>
                  </div>
                )}

                {threat.mitreTactics && threat.mitreTactics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {threat.mitreTactics.map((tactic) => (
                      <span
                        key={tactic}
                        className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded"
                      >
                        {tactic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {filteredThreats.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-medium mb-2">
                  No threats match your filters
                </h3>
                <p>Adjust your search criteria to see more threat indicators</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {activeView === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">
              Collection Analytics Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.summary.totalArtifacts.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Artifacts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.summary.uniqueSources}
                </div>
                <div className="text-sm text-gray-600">Unique Sources</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(analytics.summary.averageQuality * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-600">Avg Quality</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {analytics.threats.newIndicators}
                </div>
                <div className="text-sm text-gray-600">New Threats</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">Top Topics</h4>
              <div className="space-y-2">
                {analytics.summary.topTopics.map((topic) => (
                  <div
                    key={topic.topic}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{topic.topic}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {topic.count.toLocaleString()}
                      </span>
                      <span
                        className={`text-xs px-1 py-0.5 rounded ${
                          topic.trend === 'up'
                            ? 'bg-green-100 text-green-700'
                            : topic.trend === 'down'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {topic.trend === 'up'
                          ? '↗'
                          : topic.trend === 'down'
                            ? '↘'
                            : '→'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">Geographic Distribution</h4>
              <div className="space-y-2">
                {analytics.summary.geographicDistribution
                  .slice(0, 5)
                  .map((geo) => (
                    <div
                      key={geo.country}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{geo.country}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{ width: `${geo.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">
                          {geo.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">Language Distribution</h4>
              <div className="space-y-2">
                {analytics.summary.languageDistribution.map((lang) => (
                  <div
                    key={lang.language}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{lang.language}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {lang.count.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({lang.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border p-4">
              <h4 className="font-semibold mb-3">Threat Overview</h4>
              <div className="space-y-2">
                {Object.entries(analytics.threats.riskDistribution).map(
                  ([level, count]) => (
                    <div
                      key={level}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm capitalize">{level}:</span>
                      <span
                        className={`px-2 py-1 text-xs rounded font-medium ${getRiskColor(level)}`}
                      >
                        {count}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OSINTCollectionFramework;
