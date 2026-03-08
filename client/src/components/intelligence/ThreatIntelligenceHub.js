"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const ThreatIntelligenceHub = ({ investigationId, onIndicatorSelect, onCampaignSelect, onActorSelect, autoRefresh = true, refreshInterval = 300000, // 5 minutes
className = '', }) => {
    const [activeView, setActiveView] = (0, react_1.useState)('indicators');
    const [selectedIndicator, setSelectedIndicator] = (0, react_1.useState)(null);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [filterSeverity, setFilterSeverity] = (0, react_1.useState)('all');
    const [filterType, setFilterType] = (0, react_1.useState)('all');
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [lastUpdated, setLastUpdated] = (0, react_1.useState)(new Date());
    // Mock data for demonstration
    const mockIndicators = (0, react_1.useMemo)(() => [
        {
            id: 'ind-001',
            type: 'ip',
            value: '192.168.1.100',
            confidence: 95,
            severity: 'high',
            source: 'VirusTotal',
            firstSeen: new Date(2024, 0, 15),
            lastSeen: new Date(),
            tags: ['APT29', 'phishing', 'c2'],
            context: {
                malwareFamily: 'Cobalt Strike',
                campaign: 'Operation Winter Storm',
                actor: 'APT29',
                ttps: ['T1071.001', 'T1105', 'T1036.005'],
            },
            relatedIndicators: ['ind-002', 'ind-003'],
            isActive: true,
            verified: true,
        },
        {
            id: 'ind-002',
            type: 'domain',
            value: 'malicious-domain.com',
            confidence: 88,
            severity: 'critical',
            source: 'Recorded Future',
            firstSeen: new Date(2024, 0, 10),
            lastSeen: new Date(),
            tags: ['phishing', 'credential-theft'],
            context: {
                malwareFamily: 'AgentTesla',
                campaign: 'Operation Winter Storm',
                ttps: ['T1566.001', 'T1204.002'],
            },
            relatedIndicators: ['ind-001', 'ind-004'],
            isActive: true,
            verified: true,
        },
        {
            id: 'ind-003',
            type: 'hash',
            value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            confidence: 92,
            severity: 'high',
            source: 'MISP',
            firstSeen: new Date(2024, 0, 12),
            lastSeen: new Date(2024, 0, 20),
            tags: ['malware', 'trojan'],
            context: {
                malwareFamily: 'Emotet',
                ttps: ['T1055', 'T1027'],
            },
            relatedIndicators: ['ind-001'],
            isActive: false,
            verified: true,
        },
    ], []);
    const mockCampaigns = (0, react_1.useMemo)(() => [
        {
            id: 'camp-001',
            name: 'Operation Winter Storm',
            description: 'Large-scale phishing campaign targeting financial institutions',
            actors: ['APT29', 'APT28'],
            ttps: ['T1566.001', 'T1204.002', 'T1071.001'],
            indicators: ['ind-001', 'ind-002'],
            firstActivity: new Date(2024, 0, 1),
            lastActivity: new Date(),
            status: 'active',
            confidence: 90,
            severity: 'critical',
            targets: ['financial', 'healthcare', 'government'],
            geography: ['US', 'EU', 'APAC'],
        },
    ], []);
    const mockActors = (0, react_1.useMemo)(() => [
        {
            id: 'actor-001',
            name: 'APT29',
            aliases: ['Cozy Bear', 'The Dukes'],
            type: 'nation-state',
            sophistication: 'expert',
            motivation: ['espionage', 'intelligence'],
            geography: ['Russia'],
            campaigns: ['camp-001'],
            ttps: ['T1071.001', 'T1105', 'T1036.005'],
            firstActivity: new Date(2020, 0, 1),
            lastActivity: new Date(),
            isActive: true,
        },
    ], []);
    // Filtered data based on search and filters
    const filteredIndicators = (0, react_1.useMemo)(() => {
        return mockIndicators.filter((indicator) => {
            const matchesSearch = searchQuery === '' ||
                indicator.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
                indicator.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesSeverity = filterSeverity === 'all' || indicator.severity === filterSeverity;
            const matchesType = filterType === 'all' || indicator.type === filterType;
            return matchesSearch && matchesSeverity && matchesType;
        });
    }, [mockIndicators, searchQuery, filterSeverity, filterType]);
    // Auto-refresh logic
    (0, react_1.useEffect)(() => {
        if (!autoRefresh)
            return;
        const interval = setInterval(() => {
            setLastUpdated(new Date());
            // In real implementation, this would trigger data refresh
        }, refreshInterval);
        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);
    const handleIndicatorClick = (0, react_1.useCallback)((indicator) => {
        setSelectedIndicator(indicator);
        onIndicatorSelect?.(indicator);
    }, [onIndicatorSelect]);
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return '#dc3545';
            case 'high':
                return '#fd7e14';
            case 'medium':
                return '#ffc107';
            case 'low':
                return '#28a745';
            default:
                return '#6c757d';
        }
    };
    const getTypeIcon = (type) => {
        switch (type) {
            case 'ip':
                return '🌐';
            case 'domain':
                return '🏷️';
            case 'hash':
                return '#️⃣';
            case 'url':
                return '🔗';
            case 'email':
                return '📧';
            case 'file':
                return '📄';
            case 'registry':
                return '📝';
            default:
                return '❓';
        }
    };
    return (<div className={`threat-intelligence-hub ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
        }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600', margin: 0 }}>
            🛡️ Threat Intelligence Hub
          </h3>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: '12px',
            color: '#6c757d',
        }}>
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            {autoRefresh && <span>🔄 Auto-refresh</span>}
          </div>
        </div>

        {/* View Tabs */}
        <div style={{
            display: 'flex',
            borderBottom: '1px solid var(--hairline)',
            marginBottom: '16px',
        }}>
          {[
            {
                key: 'indicators',
                label: '🎯 Indicators',
                count: filteredIndicators.length,
            },
            {
                key: 'campaigns',
                label: '📋 Campaigns',
                count: mockCampaigns.length,
            },
            { key: 'actors', label: '🕵️ Actors', count: mockActors.length },
            { key: 'feeds', label: '📡 Feeds', count: 3 },
        ].map((tab) => (<button key={tab.key} onClick={() => setActiveView(tab.key)} style={{
                padding: '12px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeView === tab.key
                    ? '2px solid #1a73e8'
                    : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeView === tab.key ? '600' : '400',
                color: activeView === tab.key ? '#1a73e8' : '#666',
            }}>
              {tab.label} ({tab.count})
            </button>))}
        </div>

        {/* Search and Filters */}
        <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
        }}>
          <input type="text" placeholder="Search indicators, tags, or IOCs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{
            padding: '8px 12px',
            border: '1px solid var(--hairline)',
            borderRadius: '4px',
            flex: '1 1 300px',
            fontSize: '14px',
        }}/>

          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={{
            padding: '8px',
            border: '1px solid var(--hairline)',
            borderRadius: '4px',
            fontSize: '14px',
        }}>
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{
            padding: '8px',
            border: '1px solid var(--hairline)',
            borderRadius: '4px',
            fontSize: '14px',
        }}>
            <option value="all">All Types</option>
            <option value="ip">IP Address</option>
            <option value="domain">Domain</option>
            <option value="hash">Hash</option>
            <option value="url">URL</option>
            <option value="email">Email</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeView === 'indicators' && (<div style={{
                height: '100%',
                display: 'grid',
                gridTemplateColumns: selectedIndicator ? '1fr 1fr' : '1fr',
                gap: '16px',
            }}>
            {/* Indicators List */}
            <div style={{
                overflow: 'auto',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
              <div style={{
                padding: '16px',
                borderBottom: '1px solid var(--hairline)',
                backgroundColor: '#f8f9fa',
            }}>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Threat Indicators ({filteredIndicators.length})
                </h4>
              </div>

              <div>
                {filteredIndicators.map((indicator) => (<div key={indicator.id} onClick={() => handleIndicatorClick(indicator)} style={{
                    padding: '16px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    backgroundColor: selectedIndicator?.id === indicator.id
                        ? '#e3f2fd'
                        : 'transparent',
                    transition: 'background-color 0.2s',
                }} onMouseEnter={(e) => {
                    if (selectedIndicator?.id !== indicator.id) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                }} onMouseLeave={(e) => {
                    if (selectedIndicator?.id !== indicator.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }
                }}>
                    <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                }}>
                      <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                        <span style={{ fontSize: '16px' }}>
                          {getTypeIcon(indicator.type)}
                        </span>
                        <code style={{
                    fontSize: '13px',
                    backgroundColor: '#f8f9fa',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    wordBreak: 'break-all',
                }}>
                          {indicator.value}
                        </code>
                      </div>

                      <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                }}>
                        <span style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    backgroundColor: getSeverityColor(indicator.severity),
                    color: 'white',
                    fontWeight: '600',
                }}>
                          {indicator.severity.toUpperCase()}
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {indicator.confidence}%
                        </span>
                      </div>
                    </div>

                    <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginBottom: '8px',
                }}>
                      {indicator.tags.slice(0, 3).map((tag) => (<span key={tag} style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '12px',
                        color: '#495057',
                    }}>
                          {tag}
                        </span>))}
                      {indicator.tags.length > 3 && (<span style={{ fontSize: '11px', color: '#666' }}>
                          +{indicator.tags.length - 3}
                        </span>)}
                    </div>

                    <div style={{ fontSize: '12px', color: '#666' }}>
                      <div>Source: {indicator.source}</div>
                      <div>
                        Last seen: {indicator.lastSeen.toLocaleDateString()}
                      </div>
                    </div>
                  </div>))}
              </div>
            </div>

            {/* Indicator Details */}
            {selectedIndicator && (<div style={{
                    overflow: 'auto',
                    border: '1px solid var(--hairline)',
                    borderRadius: '8px',
                }}>
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--hairline)',
                    backgroundColor: '#f8f9fa',
                }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
                    Indicator Details
                  </h4>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ marginBottom: '24px' }}>
                    <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                }}>
                      <span style={{ fontSize: '20px' }}>
                        {getTypeIcon(selectedIndicator.type)}
                      </span>
                      <code style={{
                    fontSize: '14px',
                    backgroundColor: '#f8f9fa',
                    padding: '4px 8px',
                    borderRadius: '4px',
                }}>
                        {selectedIndicator.value}
                      </code>
                    </div>

                    <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px',
                    marginBottom: '16px',
                }}>
                      <div>
                        <strong>Type:</strong> {selectedIndicator.type}
                      </div>
                      <div>
                        <strong>Confidence:</strong>{' '}
                        {selectedIndicator.confidence}%
                      </div>
                      <div>
                        <strong>Severity:</strong>
                        <span style={{
                    marginLeft: '4px',
                    color: getSeverityColor(selectedIndicator.severity),
                    fontWeight: '600',
                }}>
                          {selectedIndicator.severity}
                        </span>
                      </div>
                      <div>
                        <strong>Status:</strong>{' '}
                        {selectedIndicator.isActive
                    ? '🟢 Active'
                    : '🔴 Inactive'}
                      </div>
                    </div>
                  </div>

                  {selectedIndicator.context && (<div style={{ marginBottom: '24px' }}>
                      <h5 style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '8px',
                    }}>
                        Context
                      </h5>
                      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                        {selectedIndicator.context.malwareFamily && (<div>
                            <strong>Malware Family:</strong>{' '}
                            {selectedIndicator.context.malwareFamily}
                          </div>)}
                        {selectedIndicator.context.campaign && (<div>
                            <strong>Campaign:</strong>{' '}
                            {selectedIndicator.context.campaign}
                          </div>)}
                        {selectedIndicator.context.actor && (<div>
                            <strong>Actor:</strong>{' '}
                            {selectedIndicator.context.actor}
                          </div>)}
                        {selectedIndicator.context.ttps && (<div>
                            <strong>TTPs:</strong>{' '}
                            {selectedIndicator.context.ttps.join(', ')}
                          </div>)}
                      </div>
                    </div>)}

                  <div style={{ marginBottom: '24px' }}>
                    <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                }}>
                      Tags
                    </h5>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedIndicator.tags.map((tag) => (<span key={tag} style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '12px',
                        color: '#495057',
                    }}>
                          {tag}
                        </span>))}
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: '#666' }}>
                    <div>
                      <strong>Source:</strong> {selectedIndicator.source}
                    </div>
                    <div>
                      <strong>First Seen:</strong>{' '}
                      {selectedIndicator.firstSeen.toLocaleString()}
                    </div>
                    <div>
                      <strong>Last Seen:</strong>{' '}
                      {selectedIndicator.lastSeen.toLocaleString()}
                    </div>
                    <div>
                      <strong>Verified:</strong>{' '}
                      {selectedIndicator.verified ? '✅ Yes' : '❌ No'}
                    </div>
                  </div>
                </div>
              </div>)}
          </div>)}

        {activeView === 'campaigns' && (<div style={{
                padding: '16px',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
            }}>
              Threat Campaigns
            </h4>

            {mockCampaigns.map((campaign) => (<div key={campaign.id} style={{
                    padding: '16px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    cursor: 'pointer',
                }} onClick={() => onCampaignSelect?.(campaign)}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                }}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                    {campaign.name}
                  </h5>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    backgroundColor: getSeverityColor(campaign.severity),
                    color: 'white',
                    fontWeight: '600',
                }}>
                    {campaign.severity.toUpperCase()}
                  </span>
                </div>

                <p style={{
                    fontSize: '13px',
                    color: '#666',
                    marginBottom: '12px',
                    lineHeight: '1.4',
                }}>
                  {campaign.description}
                </p>

                <div style={{ fontSize: '12px', color: '#666' }}>
                  <div>
                    <strong>Actors:</strong> {campaign.actors.join(', ')}
                  </div>
                  <div>
                    <strong>Status:</strong> {campaign.status}
                  </div>
                  <div>
                    <strong>Last Activity:</strong>{' '}
                    {campaign.lastActivity.toLocaleDateString()}
                  </div>
                </div>
              </div>))}
          </div>)}

        {activeView === 'actors' && (<div style={{
                padding: '16px',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
            }}>
              Threat Actors
            </h4>

            {mockActors.map((actor) => (<div key={actor.id} style={{
                    padding: '16px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    cursor: 'pointer',
                }} onClick={() => onActorSelect?.(actor)}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                }}>
                  <h5 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>
                    {actor.name}
                  </h5>
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                }}>
                    {actor.type.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: '12px', marginBottom: '8px' }}>
                  <strong>Aliases:</strong> {actor.aliases.join(', ')}
                </div>

                <div style={{ fontSize: '12px', color: '#666' }}>
                  <div>
                    <strong>Sophistication:</strong> {actor.sophistication}
                  </div>
                  <div>
                    <strong>Geography:</strong> {actor.geography.join(', ')}
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    {actor.isActive ? '🟢 Active' : '🔴 Inactive'}
                  </div>
                  <div>
                    <strong>Last Activity:</strong>{' '}
                    {actor.lastActivity.toLocaleDateString()}
                  </div>
                </div>
              </div>))}
          </div>)}

        {activeView === 'feeds' && (<div style={{
                padding: '16px',
                border: '1px solid var(--hairline)',
                borderRadius: '8px',
            }}>
            <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '16px',
            }}>
              Intelligence Feeds
            </h4>

            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                {
                    name: 'VirusTotal',
                    status: 'active',
                    lastSync: new Date(),
                    indicators: 1247,
                },
                {
                    name: 'Recorded Future',
                    status: 'active',
                    lastSync: new Date(),
                    indicators: 892,
                },
                {
                    name: 'MISP',
                    status: 'warning',
                    lastSync: new Date(Date.now() - 3600000),
                    indicators: 534,
                },
            ].map((feed) => (<div key={feed.name} style={{
                    padding: '16px',
                    border: '1px solid #e9ecef',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                  <div>
                    <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    margin: '0 0 4px 0',
                }}>
                      {feed.name}
                    </h5>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {feed.indicators} indicators • Last sync:{' '}
                      {feed.lastSync.toLocaleTimeString()}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    backgroundColor: feed.status === 'active' ? '#28a745' : '#ffc107',
                    color: 'white',
                }}>
                      {feed.status.toUpperCase()}
                    </span>
                  </div>
                </div>))}
            </div>
          </div>)}
      </div>
    </div>);
};
exports.default = ThreatIntelligenceHub;
