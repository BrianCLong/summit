import React, { useState, useEffect } from 'react';

interface CryptoAddress {
  address: string;
  blockchain: 'bitcoin' | 'ethereum' | 'monero' | 'litecoin' | 'bitcoin_cash' | 'zcash' | 'dash' | 'dogecoin';
  type: 'p2pkh' | 'p2sh' | 'bech32' | 'eoa' | 'contract' | 'multisig' | 'unknown';
  balance: number;
  currency: string;
  usdValue: number;
  firstSeen: Date;
  lastSeen: Date;
  totalTransactions: number;
  riskScore: number;
  tags: Array<{
    tag: string;
    source: 'manual' | 'chainalysis' | 'elliptic' | 'ciphertrace' | 'internal';
    confidence: number;
  }>;
  cluster?: {
    id: string;
    name: string;
    size: number;
    category: 'exchange' | 'mixer' | 'darknet' | 'ransomware' | 'unknown';
  };
}

interface CryptoTransaction {
  id: string;
  hash: string;
  blockchain: string;
  timestamp: Date;
  blockHeight: number;
  inputs: Array<{
    address: string;
    amount: number;
    scriptType?: string;
  }>;
  outputs: Array<{
    address: string;
    amount: number;
    scriptType?: string;
  }>;
  fee: number;
  confirmations: number;
  size: number;
  riskScore: number;
  flags: Array<{
    type: 'privacy_coin' | 'mixer' | 'high_risk_exchange' | 'sanctions_list' | 'darknet_market' | 'ransomware' | 'suspicious_pattern';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  analysis: {
    mixingDetected: boolean;
    peelChain: boolean;
    consolidation: boolean;
    distribution: boolean;
    privacyTechniques: string[];
  };
}

interface BlockchainCluster {
  id: string;
  name: string;
  category: 'exchange' | 'mixer' | 'darknet' | 'ransomware' | 'defi' | 'gambling' | 'mining' | 'merchant' | 'unknown';
  addresses: string[];
  totalBalance: number;
  totalTransactions: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  firstSeen: Date;
  lastActivity: Date;
  tags: string[];
  attribution: {
    entity?: string;
    jurisdiction?: string;
    source: string;
    confidence: number;
  };
}

interface InvestigationPath {
  id: string;
  fromAddress: string;
  toAddress: string;
  hops: Array<{
    address: string;
    transaction: string;
    amount: number;
    timestamp: Date;
    riskScore: number;
  }>;
  totalAmount: number;
  timeSpan: number; // hours
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    mixingDetected: boolean;
    knownBadActors: string[];
    jurisdictionChanges: string[];
    privacyTechniques: string[];
  };
}

interface CryptocurrencyAnalyzerProps {
  investigationId?: string;
  initialAddress?: string;
  onAddressAnalysis?: (address: CryptoAddress, analysis: any) => void;
  onTransactionFlag?: (transaction: CryptoTransaction, flag: any) => void;
  onClusterIdentification?: (cluster: BlockchainCluster) => void;
  onPathTracing?: (path: InvestigationPath) => void;
  className?: string;
}

const CryptocurrencyAnalyzer: React.FC<CryptocurrencyAnalyzerProps> = ({
  investigationId,
  initialAddress,
  onAddressAnalysis = () => {},
  onTransactionFlag = () => {},
  onClusterIdentification = () => {},
  onPathTracing = () => {},
  className = ''
}) => {
  const [activeView, setActiveView] = useState<'search' | 'addresses' | 'transactions' | 'clusters' | 'paths' | 'analysis'>('search');
  const [searchAddress, setSearchAddress] = useState(initialAddress || '');
  const [searchResults, setSearchResults] = useState<CryptoAddress[]>([]);
  const [watchedAddresses, setWatchedAddresses] = useState<CryptoAddress[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<CryptoTransaction[]>([]);
  const [identifiedClusters, setIdentifiedClusters] = useState<BlockchainCluster[]>([]);
  const [investigationPaths, setInvestigationPaths] = useState<InvestigationPath[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<CryptoAddress | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisDepth, setAnalysisDepth] = useState(3);
  const [blockchainFilter, setBlockchainFilter] = useState<string>('all');

  const supportedBlockchains = [
    { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', color: '#f7931a' },
    { id: 'ethereum', name: 'Ethereum', symbol: 'ETH', color: '#627eea' },
    { id: 'monero', name: 'Monero', symbol: 'XMR', color: '#ff6600' },
    { id: 'litecoin', name: 'Litecoin', symbol: 'LTC', color: '#bfbbbb' },
    { id: 'bitcoin_cash', name: 'Bitcoin Cash', symbol: 'BCH', color: '#8dc351' },
    { id: 'zcash', name: 'Zcash', symbol: 'ZEC', color: '#f4b728' },
    { id: 'dash', name: 'Dash', symbol: 'DASH', color: '#008ce7' },
    { id: 'dogecoin', name: 'Dogecoin', symbol: 'DOGE', color: '#cdb05e' }
  ];

  useEffect(() => {
    generateMockWatchedAddresses();
    generateMockTransactions();
    generateMockClusters();
    generateMockInvestigationPaths();
    
    if (initialAddress) {
      performAddressSearch(initialAddress);
    }
  }, [investigationId, initialAddress]);

  const generateMockWatchedAddresses = () => {
    const mockAddresses: CryptoAddress[] = [
      {
        address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        blockchain: 'bitcoin',
        type: 'p2pkh',
        balance: 0,
        currency: 'BTC',
        usdValue: 0,
        firstSeen: new Date('2009-01-03'),
        lastSeen: new Date('2009-01-03'),
        totalTransactions: 1,
        riskScore: 0,
        tags: [
          { tag: 'Genesis Block', source: 'internal', confidence: 100 },
          { tag: 'Satoshi Nakamoto', source: 'manual', confidence: 95 }
        ]
      },
      {
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        blockchain: 'bitcoin',
        type: 'bech32',
        balance: 15.67234,
        currency: 'BTC',
        usdValue: 678945.23,
        firstSeen: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000),
        totalTransactions: 1247,
        riskScore: 75,
        tags: [
          { tag: 'High Risk Exchange', source: 'chainalysis', confidence: 87 },
          { tag: 'Sanctioned Entity', source: 'elliptic', confidence: 92 }
        ],
        cluster: {
          id: 'cluster-001',
          name: 'Ransomware Group Alpha',
          size: 234,
          category: 'ransomware'
        }
      },
      {
        address: '0x742d35Cc6969B82C5C7c4D56d8b3DEDb3b3b7d4A',
        blockchain: 'ethereum',
        type: 'eoa',
        balance: 1234.567,
        currency: 'ETH',
        usdValue: 2845673.45,
        firstSeen: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 5 * 60 * 1000),
        totalTransactions: 5672,
        riskScore: 45,
        tags: [
          { tag: 'DeFi Protocol', source: 'internal', confidence: 78 },
          { tag: 'Whale Account', source: 'manual', confidence: 85 }
        ]
      },
      {
        address: '47KtLdksHvN6UF3BNMnPTWzd5NXww37ydsN5RbD6XTHBiCnvz',
        blockchain: 'monero',
        type: 'unknown',
        balance: 0, // Privacy coin - balance hidden
        currency: 'XMR',
        usdValue: 0,
        firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        lastSeen: new Date(Date.now() - 12 * 60 * 60 * 1000),
        totalTransactions: 234,
        riskScore: 95,
        tags: [
          { tag: 'Darknet Market', source: 'ciphertrace', confidence: 89 },
          { tag: 'Money Laundering', source: 'chainalysis', confidence: 76 }
        ]
      }
    ];
    
    setWatchedAddresses(mockAddresses);
  };

  const generateMockTransactions = () => {
    const mockTransactions: CryptoTransaction[] = Array.from({ length: 50 }, (_, i) => ({
      id: `tx-${String(i + 1).padStart(3, '0')}`,
      hash: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      blockchain: supportedBlockchains[Math.floor(Math.random() * supportedBlockchains.length)].id,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      blockHeight: Math.floor(Math.random() * 100000) + 800000,
      inputs: [
        {
          address: `addr-in-${i + 1}`,
          amount: Math.random() * 10 + 0.1
        }
      ],
      outputs: [
        {
          address: `addr-out-${i + 1}`,
          amount: Math.random() * 10 + 0.1
        }
      ],
      fee: Math.random() * 0.001 + 0.0001,
      confirmations: Math.floor(Math.random() * 100) + 1,
      size: Math.floor(Math.random() * 1000) + 250,
      riskScore: Math.random() * 100,
      flags: Math.random() > 0.7 ? [
        {
          type: ['mixer', 'high_risk_exchange', 'sanctions_list', 'darknet_market'][Math.floor(Math.random() * 4)] as any,
          description: 'Flagged transaction requiring review',
          severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any
        }
      ] : [],
      analysis: {
        mixingDetected: Math.random() > 0.8,
        peelChain: Math.random() > 0.7,
        consolidation: Math.random() > 0.6,
        distribution: Math.random() > 0.5,
        privacyTechniques: Math.random() > 0.8 ? ['CoinJoin', 'Mixing Service'] : []
      }
    }));
    
    setRecentTransactions(mockTransactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  };

  const generateMockClusters = () => {
    const mockClusters: BlockchainCluster[] = [
      {
        id: 'cluster-001',
        name: 'Ransomware Group Alpha',
        category: 'ransomware',
        addresses: Array.from({ length: 234 }, (_, i) => `addr-rw-${i + 1}`),
        totalBalance: 45.67,
        totalTransactions: 5672,
        riskLevel: 'critical',
        description: 'Known ransomware operation targeting healthcare facilities',
        firstSeen: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        tags: ['ransomware', 'healthcare_targeting', 'sophisticated'],
        attribution: {
          entity: 'Evil Corp',
          jurisdiction: 'Russia',
          source: 'FBI Report',
          confidence: 87
        }
      },
      {
        id: 'cluster-002',
        name: 'Crypto Mixer Service Beta',
        category: 'mixer',
        addresses: Array.from({ length: 1247 }, (_, i) => `addr-mx-${i + 1}`),
        totalBalance: 1234.89,
        totalTransactions: 45672,
        riskLevel: 'high',
        description: 'Large-scale cryptocurrency mixing service',
        firstSeen: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 30 * 60 * 1000),
        tags: ['mixer', 'privacy_service', 'high_volume'],
        attribution: {
          source: 'Blockchain Analysis',
          confidence: 75
        }
      },
      {
        id: 'cluster-003',
        name: 'Darknet Market Gamma',
        category: 'darknet',
        addresses: Array.from({ length: 567 }, (_, i) => `addr-dn-${i + 1}`),
        totalBalance: 89.23,
        totalTransactions: 12453,
        riskLevel: 'critical',
        description: 'Major darknet marketplace for illicit goods',
        firstSeen: new Date(Date.now() - 540 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        tags: ['darknet', 'marketplace', 'illicit_goods'],
        attribution: {
          entity: 'Hydra Market',
          source: 'Law Enforcement',
          confidence: 92
        }
      }
    ];
    
    setIdentifiedClusters(mockClusters);
  };

  const generateMockInvestigationPaths = () => {
    const mockPaths: InvestigationPath[] = [
      {
        id: 'path-001',
        fromAddress: '1SourceAddr123456789',
        toAddress: '1DestAddr987654321',
        hops: [
          {
            address: '1Hop1Addr111111111',
            transaction: 'tx-hash-001',
            amount: 5.67,
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            riskScore: 25
          },
          {
            address: '1Hop2Addr222222222',
            transaction: 'tx-hash-002',
            amount: 5.65,
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            riskScore: 75
          },
          {
            address: '1Hop3Addr333333333',
            transaction: 'tx-hash-003',
            amount: 5.63,
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            riskScore: 45
          }
        ],
        totalAmount: 5.63,
        timeSpan: 48, // hours
        riskAssessment: {
          overallRisk: 'high',
          mixingDetected: true,
          knownBadActors: ['Mixer Service Beta'],
          jurisdictionChanges: ['United States', 'Russia'],
          privacyTechniques: ['CoinJoin', 'Chain Hopping']
        }
      },
      {
        id: 'path-002',
        fromAddress: '1Suspicious123456789',
        toAddress: '1Exchange987654321',
        hops: [
          {
            address: '1Exchange111111111',
            transaction: 'tx-hash-004',
            amount: 12.34,
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
            riskScore: 30
          }
        ],
        totalAmount: 12.34,
        timeSpan: 12,
        riskAssessment: {
          overallRisk: 'medium',
          mixingDetected: false,
          knownBadActors: [],
          jurisdictionChanges: [],
          privacyTechniques: []
        }
      }
    ];
    
    setInvestigationPaths(mockPaths);
  };

  const performAddressSearch = async (address: string) => {
    if (!address.trim()) return;
    
    setIsAnalyzing(true);
    setSearchAddress(address);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock search result
    const mockResult: CryptoAddress = {
      address: address,
      blockchain: detectBlockchain(address),
      type: 'p2pkh',
      balance: Math.random() * 100,
      currency: 'BTC',
      usdValue: Math.random() * 4000000,
      firstSeen: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      lastSeen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      totalTransactions: Math.floor(Math.random() * 1000) + 1,
      riskScore: Math.random() * 100,
      tags: [
        { tag: 'Analyzed Address', source: 'internal', confidence: 95 }
      ]
    };
    
    setSearchResults([mockResult]);
    setIsAnalyzing(false);
    onAddressAnalysis(mockResult, { searchDepth: analysisDepth });
  };

  const detectBlockchain = (address: string): CryptoAddress['blockchain'] => {
    if (address.startsWith('1') || address.startsWith('3') || address.startsWith('bc1')) return 'bitcoin';
    if (address.startsWith('0x')) return 'ethereum';
    if (address.startsWith('L')) return 'litecoin';
    if (address.startsWith('4') || address.startsWith('8')) return 'monero';
    return 'bitcoin'; // default
  };

  const addToWatchlist = (address: CryptoAddress) => {
    if (!watchedAddresses.find(w => w.address === address.address)) {
      setWatchedAddresses(prev => [address, ...prev]);
    }
  };

  const removeFromWatchlist = (address: string) => {
    setWatchedAddresses(prev => prev.filter(w => w.address !== address));
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 80) return 'text-red-700 bg-red-100 border-red-200';
    if (riskScore >= 60) return 'text-orange-700 bg-orange-100 border-orange-200';
    if (riskScore >= 40) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-green-700 bg-green-100 border-green-200';
  };

  const formatCurrency = (amount: number, currency: string) => {
    return `${amount.toFixed(8)} ${currency}`;
  };

  const formatUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const filteredAddresses = watchedAddresses.filter(addr => 
    blockchainFilter === 'all' || addr.blockchain === blockchainFilter
  );

  const filteredTransactions = recentTransactions.filter(tx => 
    blockchainFilter === 'all' || tx.blockchain === blockchainFilter
  );

  return (
    <div className={`cryptocurrency-analyzer ${className}`}>
      {/* Header */}
      <div className="mb-6 border-b pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Cryptocurrency & Blockchain Analysis</h2>
          <div className="flex items-center gap-4">
            <select
              value={blockchainFilter}
              onChange={(e) => setBlockchainFilter(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All Blockchains</option>
              {supportedBlockchains.map(blockchain => (
                <option key={blockchain.id} value={blockchain.id}>
                  {blockchain.name} ({blockchain.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={() => setActiveView('search')}
            className={`px-4 py-2 rounded-md ${activeView === 'search' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔍 Address Search
          </button>
          <button
            onClick={() => setActiveView('addresses')}
            className={`px-4 py-2 rounded-md ${activeView === 'addresses' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📍 Watched Addresses ({watchedAddresses.length})
          </button>
          <button
            onClick={() => setActiveView('transactions')}
            className={`px-4 py-2 rounded-md ${activeView === 'transactions' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🔄 Transactions ({recentTransactions.length})
          </button>
          <button
            onClick={() => setActiveView('clusters')}
            className={`px-4 py-2 rounded-md ${activeView === 'clusters' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🕸️ Clusters ({identifiedClusters.length})
          </button>
          <button
            onClick={() => setActiveView('paths')}
            className={`px-4 py-2 rounded-md ${activeView === 'paths' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🛤️ Investigation Paths ({investigationPaths.length})
          </button>
          <button
            onClick={() => setActiveView('analysis')}
            className={`px-4 py-2 rounded-md ${activeView === 'analysis' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📊 Analysis Tools
          </button>
        </div>
      </div>
      
      {/* Address Search View */}
      {activeView === 'search' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Blockchain Address Search</h3>
            
            <div className="flex gap-4 mb-4">
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Enter blockchain address (Bitcoin, Ethereum, Monero, etc.)"
                className="flex-1 px-4 py-2 border rounded-md"
                onKeyPress={(e) => e.key === 'Enter' && performAddressSearch(searchAddress)}
              />
              <select
                value={analysisDepth}
                onChange={(e) => setAnalysisDepth(Number(e.target.value))}
                className="px-3 py-2 border rounded-md"
              >
                <option value={1}>Depth 1</option>
                <option value={2}>Depth 2</option>
                <option value={3}>Depth 3</option>
                <option value={5}>Depth 5</option>
              </select>
              <button
                onClick={() => performAddressSearch(searchAddress)}
                disabled={isAnalyzing || !searchAddress.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            
            {isAnalyzing && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <div className="text-gray-600">Analyzing blockchain address...</div>
                <div className="text-sm text-gray-500 mt-2">
                  This may take a few moments for complex addresses
                </div>
              </div>
            )}
            
            {searchResults.length > 0 && !isAnalyzing && (
              <div className="space-y-4">
                <h4 className="font-medium">Search Results</h4>
                {searchResults.map(address => (
                  <div key={address.address} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-mono text-sm mb-1">{address.address}</div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded capitalize">
                            {address.blockchain}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {address.type}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded ${getRiskColor(address.riskScore)}`}>
                            Risk: {address.riskScore.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => addToWatchlist(address)}
                        className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200"
                      >
                        + Watch
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-600">Balance:</span>
                        <div className="font-medium">{formatCurrency(address.balance, address.currency)}</div>
                        <div className="text-xs text-gray-500">{formatUSD(address.usdValue)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Transactions:</span>
                        <div className="font-medium">{address.totalTransactions.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">First Seen:</span>
                        <div className="font-medium">{address.firstSeen.toLocaleDateString()}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Seen:</span>
                        <div className="font-medium">{address.lastSeen.toLocaleDateString()}</div>
                      </div>
                    </div>
                    
                    {address.tags.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm text-gray-600">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {address.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              {tag.tag} ({tag.confidence}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {address.cluster && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <span className="text-red-800 font-medium">Cluster Association:</span>
                        <div className="text-sm text-red-700 mt-1">
                          {address.cluster.name} ({address.cluster.category}) - {address.cluster.size} addresses
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Watched Addresses View */}
      {activeView === 'addresses' && (
        <div className="space-y-4">
          {filteredAddresses.map(address => (
            <div key={address.address} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono text-sm mb-2">{address.address}</div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-1 text-xs rounded text-white"
                      style={{ backgroundColor: supportedBlockchains.find(b => b.id === address.blockchain)?.color }}
                    >
                      {supportedBlockchains.find(b => b.id === address.blockchain)?.symbol}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getRiskColor(address.riskScore)}`}>
                      Risk: {address.riskScore.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200">
                    Analyze
                  </button>
                  <button
                    onClick={() => removeFromWatchlist(address.address)}
                    className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-600">Balance:</span>
                  <div className="font-medium">{formatCurrency(address.balance, address.currency)}</div>
                  <div className="text-xs text-gray-500">{formatUSD(address.usdValue)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Transactions:</span>
                  <div className="font-medium">{address.totalTransactions.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">First Activity:</span>
                  <div className="font-medium">{address.firstSeen.toLocaleDateString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Activity:</span>
                  <div className="font-medium">{address.lastSeen.toLocaleDateString()}</div>
                </div>
              </div>
              
              {address.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {address.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {tag.tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {filteredAddresses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-lg font-medium mb-2">No watched addresses</h3>
              <p>Search for addresses to add them to your watchlist</p>
            </div>
          )}
        </div>
      )}
      
      {/* Transactions View */}
      {activeView === 'transactions' && (
        <div className="space-y-4">
          {filteredTransactions.slice(0, 20).map(tx => (
            <div key={tx.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-mono text-sm mb-1">{tx.hash.substring(0, 32)}...</div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-1 text-xs rounded text-white"
                      style={{ backgroundColor: supportedBlockchains.find(b => b.id === tx.blockchain)?.color }}
                    >
                      {supportedBlockchains.find(b => b.id === tx.blockchain)?.symbol}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded ${getRiskColor(tx.riskScore)}`}>
                      Risk: {tx.riskScore.toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500">
                      Block {tx.blockHeight.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>{tx.timestamp.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">{tx.confirmations} confirmations</div>
                </div>
              </div>
              
              {tx.flags.length > 0 && (
                <div className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-800 font-medium">⚠️ Flagged Transaction</span>
                  </div>
                  {tx.flags.map((flag, index) => (
                    <div key={index} className="text-sm text-orange-700">
                      {flag.type.replace('_', ' ')}: {flag.description}
                    </div>
                  ))}
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 font-medium">Inputs ({tx.inputs.length}):</span>
                  <div className="mt-1 space-y-1">
                    {tx.inputs.slice(0, 3).map((input, index) => (
                      <div key={index} className="font-mono text-xs p-2 bg-gray-50 rounded">
                        {input.address.substring(0, 20)}... ({input.amount.toFixed(8)})
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Outputs ({tx.outputs.length}):</span>
                  <div className="mt-1 space-y-1">
                    {tx.outputs.slice(0, 3).map((output, index) => (
                      <div key={index} className="font-mono text-xs p-2 bg-gray-50 rounded">
                        {output.address.substring(0, 20)}... ({output.amount.toFixed(8)})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {(tx.analysis.mixingDetected || tx.analysis.privacyTechniques.length > 0) && (
                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <span className="text-purple-800 font-medium">Privacy Analysis:</span>
                  <div className="text-sm text-purple-700 mt-1">
                    {tx.analysis.mixingDetected && <div>• Mixing detected</div>}
                    {tx.analysis.peelChain && <div>• Peel chain pattern</div>}
                    {tx.analysis.privacyTechniques.map(technique => (
                      <div key={technique}>• {technique} usage detected</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Clusters View */}
      {activeView === 'clusters' && (
        <div className="space-y-4">
          {identifiedClusters.map(cluster => (
            <div key={cluster.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-lg font-semibold mb-1">{cluster.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${getRiskColor(cluster.riskLevel === 'critical' ? 95 : cluster.riskLevel === 'high' ? 75 : 45)}`}>
                      {cluster.riskLevel.toUpperCase()} RISK
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded capitalize">
                      {cluster.category}
                    </span>
                  </div>
                </div>
                <button className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200">
                  Investigate
                </button>
              </div>
              
              <p className="text-gray-600 mb-4">{cluster.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-gray-600">Addresses:</span>
                  <div className="font-medium">{cluster.addresses.length.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Total Balance:</span>
                  <div className="font-medium">{cluster.totalBalance.toFixed(4)} BTC</div>
                </div>
                <div>
                  <span className="text-gray-600">Transactions:</span>
                  <div className="font-medium">{cluster.totalTransactions.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-gray-600">Last Activity:</span>
                  <div className="font-medium">{cluster.lastActivity.toLocaleDateString()}</div>
                </div>
              </div>
              
              {cluster.attribution.entity && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-3">
                  <span className="text-red-800 font-medium">Attribution:</span>
                  <div className="text-sm text-red-700 mt-1">
                    Entity: {cluster.attribution.entity}
                    {cluster.attribution.jurisdiction && ` (${cluster.attribution.jurisdiction})`}
                    <div className="text-xs mt-1">
                      Source: {cluster.attribution.source} ({cluster.attribution.confidence}% confidence)
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-1">
                {cluster.tags.map(tag => (
                  <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Investigation Paths View */}
      {activeView === 'paths' && (
        <div className="space-y-4">
          {investigationPaths.map(path => (
            <div key={path.id} className="bg-white rounded-lg border p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-medium mb-2">Investigation Path</h4>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${getRiskColor(
                      path.riskAssessment.overallRisk === 'critical' ? 95 :
                      path.riskAssessment.overallRisk === 'high' ? 75 :
                      path.riskAssessment.overallRisk === 'medium' ? 55 : 25
                    )}`}>
                      {path.riskAssessment.overallRisk.toUpperCase()} RISK
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      {path.hops.length + 1} hops
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{formatCurrency(path.totalAmount, 'BTC')}</div>
                  <div className="text-xs text-gray-500">{path.timeSpan}h timespan</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2 text-sm">
                  <span className="text-gray-600">From:</span>
                  <span className="font-mono">{path.fromAddress}</span>
                </div>
                
                {path.hops.map((hop, index) => (
                  <div key={index} className="flex items-center gap-2 ml-4 mb-2 text-sm">
                    <span className="text-gray-400">↓</span>
                    <span className="font-mono">{hop.address}</span>
                    <span className={`px-2 py-1 text-xs rounded ${getRiskColor(hop.riskScore)}`}>
                      {hop.riskScore.toFixed(0)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {hop.amount.toFixed(4)} BTC • {hop.timestamp.toLocaleDateString()}
                    </span>
                  </div>
                ))}
                
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">To:</span>
                  <span className="font-mono">{path.toAddress}</span>
                </div>
              </div>
              
              {(path.riskAssessment.mixingDetected || path.riskAssessment.knownBadActors.length > 0) && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                  <span className="text-orange-800 font-medium">Risk Indicators:</span>
                  <div className="text-sm text-orange-700 mt-1 space-y-1">
                    {path.riskAssessment.mixingDetected && <div>• Mixing activity detected</div>}
                    {path.riskAssessment.knownBadActors.map(actor => (
                      <div key={actor}>• Interaction with known bad actor: {actor}</div>
                    ))}
                    {path.riskAssessment.jurisdictionChanges.length > 0 && (
                      <div>• Jurisdiction changes: {path.riskAssessment.jurisdictionChanges.join(' → ')}</div>
                    )}
                    {path.riskAssessment.privacyTechniques.map(technique => (
                      <div key={technique}>• Privacy technique used: {technique}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {investigationPaths.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🛤️</div>
              <h3 className="text-lg font-medium mb-2">No investigation paths</h3>
              <p>Trace funds between addresses to create investigation paths</p>
            </div>
          )}
        </div>
      )}
      
      {/* Analysis Tools View */}
      {activeView === 'analysis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: 'Address Clustering',
                description: 'Group related addresses using heuristics and behavioral analysis',
                icon: '🕸️',
                action: 'Run Clustering'
              },
              {
                name: 'Transaction Flow Analysis',
                description: 'Trace the flow of funds through multiple transactions',
                icon: '🌊',
                action: 'Trace Funds'
              },
              {
                name: 'Privacy Coin Analysis',
                description: 'Advanced analysis of privacy-focused cryptocurrencies',
                icon: '👁️‍🗨️',
                action: 'Analyze Privacy'
              },
              {
                name: 'Exchange Attribution',
                description: 'Identify which exchanges addresses belong to',
                icon: '🏛️',
                action: 'Identify Exchanges'
              },
              {
                name: 'Mixing Detection',
                description: 'Detect use of cryptocurrency mixing services',
                icon: '🌀',
                action: 'Detect Mixing'
              },
              {
                name: 'Risk Scoring',
                description: 'Calculate comprehensive risk scores for addresses and transactions',
                icon: '⚖️',
                action: 'Calculate Risk'
              }
            ].map(tool => (
              <div key={tool.name} className="bg-white rounded-lg border p-6">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{tool.icon}</div>
                  <h3 className="text-lg font-semibold">{tool.name}</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4 text-center">{tool.description}</p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  {tool.action}
                </button>
              </div>
            ))}
          </div>
          
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold mb-4">Supported Blockchains & Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supportedBlockchains.map(blockchain => (
                <div key={blockchain.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: blockchain.color }}
                    ></div>
                    <span className="font-medium">{blockchain.name}</span>
                    <span className="text-sm text-gray-500">({blockchain.symbol})</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    ✅ Address Analysis • ✅ Transaction Tracing • ✅ Clustering
                    {blockchain.id === 'monero' && ' • ⚠️ Limited (Privacy Coin)'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CryptocurrencyAnalyzer;