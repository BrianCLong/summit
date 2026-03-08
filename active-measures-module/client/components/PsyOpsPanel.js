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
const ui_1 = require("@/components/ui");
const lucide_react_1 = require("lucide-react");
const PsyOpsPanel = ({ operationId }) => {
    const [activeView, setActiveView] = (0, react_1.useState)('framework');
    const [selectedSegment, setSelectedSegment] = (0, react_1.useState)(null);
    const [psyOpsData, setPsyOpsData] = (0, react_1.useState)({
        framework: null,
        segments: [],
        heatmap: null,
    });
    // Mock data for demonstration
    (0, react_1.useEffect)(() => {
        if (operationId) {
            // Simulate API call
            setTimeout(() => {
                setPsyOpsData({
                    framework: {
                        strategic: {
                            objectives: [
                                'Shape perception of key narratives',
                                'Counter adversary messaging',
                                'Build cognitive resilience',
                                'Maintain operational security',
                            ],
                            timeHorizon: 'Medium-term (1-6 months)',
                            targetAudience: 'Multi-demographic with psychographic segmentation',
                            narrativeThemes: [
                                'Democratic values and transparency',
                                'Economic stability and prosperity',
                                'Security and national defense',
                            ],
                        },
                        operational: {
                            campaigns: [
                                {
                                    name: 'Awareness Building',
                                    phase: 'Initial',
                                    duration: 30,
                                    targetSegments: ['General population', 'Key influencers'],
                                    methods: ['Organic content', 'Educational materials'],
                                },
                                {
                                    name: 'Narrative Reinforcement',
                                    phase: 'Development',
                                    duration: 60,
                                    targetSegments: ['Target demographics', 'Opinion leaders'],
                                    methods: [
                                        'Multi-platform messaging',
                                        'Influencer engagement',
                                    ],
                                },
                            ],
                            timingConsiderations: [
                                'News cycle synchronization',
                                'Cultural event alignment',
                                'Target audience availability patterns',
                            ],
                        },
                        tactical: {
                            techniques: [
                                {
                                    name: 'Narrative Seeding',
                                    category: 'Content Creation',
                                    effectiveness: 0.7,
                                    attribution: 0.2,
                                    requirements: ['Content creators', 'Distribution channels'],
                                },
                                {
                                    name: 'Influencer Engagement',
                                    category: 'Social Amplification',
                                    effectiveness: 0.8,
                                    attribution: 0.3,
                                    requirements: [
                                        'Influencer network',
                                        'Relationship management',
                                    ],
                                },
                                {
                                    name: 'Sentiment Monitoring',
                                    category: 'Intelligence Gathering',
                                    effectiveness: 0.9,
                                    attribution: 0.1,
                                    requirements: ['Analytics tools', 'Data processing'],
                                },
                            ],
                            deliveryMechanisms: [
                                'Social media platforms',
                                'Traditional media channels',
                                'Digital advertising networks',
                                'Influencer networks',
                            ],
                            measurableOutcomes: [
                                'Sentiment shift measurement',
                                'Engagement rate analysis',
                                'Narrative penetration metrics',
                            ],
                        },
                        decisionMatrix: [
                            {
                                method: 'Organic Content Creation',
                                whenToUse: 'Long-term narrative building',
                                howToImplement: 'Create authentic, engaging content aligned with target values',
                                riskLevel: 0.2,
                                effectivenessScore: 0.7,
                            },
                            {
                                method: 'Influencer Partnerships',
                                whenToUse: 'Rapid reach to specific demographics',
                                howToImplement: 'Identify and engage authentic influencers with target audience overlap',
                                riskLevel: 0.3,
                                effectivenessScore: 0.8,
                            },
                        ],
                    },
                    segments: [
                        {
                            id: 'high_susceptibility',
                            name: 'High Susceptibility Audience',
                            size: 2500000,
                            vulnerabilityScore: 0.9,
                            oceanTraits: {
                                openness: 0.3,
                                conscientiousness: 0.4,
                                extraversion: 0.6,
                                agreeableness: 0.5,
                                neuroticism: 0.8,
                            },
                            communicationChannels: [
                                'Facebook',
                                'Twitter',
                                'Local news',
                                'WhatsApp',
                            ],
                            susceptibilityRating: 'HIGH',
                        },
                        {
                            id: 'moderate_susceptibility',
                            name: 'Moderate Susceptibility Audience',
                            size: 5000000,
                            vulnerabilityScore: 0.5,
                            oceanTraits: {
                                openness: 0.6,
                                conscientiousness: 0.7,
                                extraversion: 0.5,
                                agreeableness: 0.6,
                                neuroticism: 0.4,
                            },
                            communicationChannels: [
                                'LinkedIn',
                                'Email newsletters',
                                'Podcasts',
                                'YouTube',
                            ],
                            susceptibilityRating: 'MEDIUM',
                        },
                        {
                            id: 'low_susceptibility',
                            name: 'Low Susceptibility Audience',
                            size: 1000000,
                            vulnerabilityScore: 0.2,
                            oceanTraits: {
                                openness: 0.9,
                                conscientiousness: 0.8,
                                extraversion: 0.4,
                                agreeableness: 0.5,
                                neuroticism: 0.2,
                            },
                            communicationChannels: [
                                'Academic journals',
                                'Professional conferences',
                                'Expert forums',
                            ],
                            susceptibilityRating: 'LOW',
                        },
                    ],
                    heatmap: {
                        segments: [
                            {
                                segmentId: 'high_susceptibility',
                                segmentName: 'High Susceptibility',
                                vulnerabilities: [
                                    {
                                        type: 'emotional_trigger',
                                        severity: 0.9,
                                        exploitability: 0.8,
                                        combinedScore: 0.72,
                                    },
                                    {
                                        type: 'cognitive_bias',
                                        severity: 0.8,
                                        exploitability: 0.7,
                                        combinedScore: 0.56,
                                    },
                                    {
                                        type: 'social_pressure',
                                        severity: 0.6,
                                        exploitability: 0.9,
                                        combinedScore: 0.54,
                                    },
                                ],
                            },
                        ],
                        vulnerabilityTypes: [
                            'emotional_trigger',
                            'cognitive_bias',
                            'social_pressure',
                            'information_gap',
                        ],
                        maxSeverity: 0.9,
                    },
                });
            }, 1000);
        }
    }, [operationId]);
    if (!operationId) {
        return (<ui_1.Card>
        <ui_1.CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <lucide_react_1.Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
            <p className="text-muted-foreground">
              Select an operation to view PsyOps analysis
            </p>
          </div>
        </ui_1.CardContent>
      </ui_1.Card>);
    }
    const getSusceptibilityColor = (rating) => {
        switch (rating) {
            case 'HIGH':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'MEDIUM':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'LOW':
                return 'bg-green-100 text-green-800 border-green-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };
    const getRiskColor = (risk) => {
        if (risk > 0.7)
            return 'bg-red-500';
        if (risk > 0.4)
            return 'bg-yellow-500';
        return 'bg-green-500';
    };
    const renderOceanTraits = (traits) => {
        const traitNames = {
            openness: 'Openness',
            conscientiousness: 'Conscientiousness',
            extraversion: 'Extraversion',
            agreeableness: 'Agreeableness',
            neuroticism: 'Neuroticism',
        };
        return (<div className="grid grid-cols-1 gap-2">
        {Object.entries(traits).map(([key, value]) => (<div key={key} className="flex items-center justify-between">
            <span className="text-xs font-medium">
              {traitNames[key]}
            </span>
            <div className="flex items-center space-x-2">
              <ui_1.Progress value={value * 100} className="w-16 h-2"/>
              <span className="text-xs w-8 text-right">
                {(value * 100).toFixed(0)}%
              </span>
            </div>
          </div>))}
      </div>);
    };
    return (<div className="space-y-6">
      <ui_1.Card>
        <ui_1.CardHeader>
          <ui_1.CardTitle className="flex items-center">
            <lucide_react_1.Brain className="h-5 w-5 mr-2"/>
            Psychological Operations Center
          </ui_1.CardTitle>
        </ui_1.CardHeader>
        <ui_1.CardContent>
          <ui_1.Tabs value={activeView} onValueChange={(value) => setActiveView(value)}>
            <ui_1.TabsList className="grid w-full grid-cols-4">
              <ui_1.TabsTrigger value="framework">Framework</ui_1.TabsTrigger>
              <ui_1.TabsTrigger value="segmentation">Segmentation</ui_1.TabsTrigger>
              <ui_1.TabsTrigger value="analysis">Analysis</ui_1.TabsTrigger>
              <ui_1.TabsTrigger value="execution">Execution</ui_1.TabsTrigger>
            </ui_1.TabsList>

            <ui_1.TabsContent value="framework" className="space-y-4">
              {psyOpsData.framework ? (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Strategic Level */}
                  <ui_1.Card>
                    <ui_1.CardHeader>
                      <ui_1.CardTitle className="text-lg flex items-center">
                        <lucide_react_1.Target className="h-4 w-4 mr-2"/>
                        Strategic Level
                      </ui_1.CardTitle>
                    </ui_1.CardHeader>
                    <ui_1.CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Objectives</h4>
                        <ul className="text-sm space-y-1">
                          {psyOpsData.framework.strategic.objectives.map((objective, index) => (<li key={index} className="flex items-start">
                                <lucide_react_1.CheckCircle className="h-3 w-3 mr-2 mt-0.5 text-green-500"/>
                                {objective}
                              </li>))}
                        </ul>
                      </div>

                      <ui_1.Separator />

                      <div>
                        <h4 className="font-medium mb-2">Narrative Themes</h4>
                        <div className="flex flex-wrap gap-2">
                          {psyOpsData.framework.strategic.narrativeThemes.map((theme, index) => (<ui_1.Badge key={index} variant="outline">
                                {theme}
                              </ui_1.Badge>))}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2">Time Horizon</h4>
                        <p className="text-sm text-muted-foreground">
                          {psyOpsData.framework.strategic.timeHorizon}
                        </p>
                      </div>
                    </ui_1.CardContent>
                  </ui_1.Card>

                  {/* Tactical Level */}
                  <ui_1.Card>
                    <ui_1.CardHeader>
                      <ui_1.CardTitle className="text-lg flex items-center">
                        <lucide_react_1.Zap className="h-4 w-4 mr-2"/>
                        Tactical Techniques
                      </ui_1.CardTitle>
                    </ui_1.CardHeader>
                    <ui_1.CardContent>
                      <div className="space-y-3">
                        {psyOpsData.framework.tactical.techniques.map((technique, index) => (<div key={index} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium text-sm">
                                  {technique.name}
                                </h5>
                                <ui_1.Badge variant="outline" className="text-xs">
                                  {technique.category}
                                </ui_1.Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                  <span className="font-medium">
                                    Effectiveness:
                                  </span>
                                  <ui_1.Progress value={technique.effectiveness * 100} className="mt-1 h-2"/>
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Attribution:
                                  </span>
                                  <ui_1.Progress value={technique.attribution * 100} className="mt-1 h-2"/>
                                </div>
                              </div>
                            </div>))}
                      </div>
                    </ui_1.CardContent>
                  </ui_1.Card>

                  {/* Operational Campaigns */}
                  <ui_1.Card className="lg:col-span-2">
                    <ui_1.CardHeader>
                      <ui_1.CardTitle className="text-lg flex items-center">
                        <lucide_react_1.BarChart3 className="h-4 w-4 mr-2"/>
                        Operational Campaigns
                      </ui_1.CardTitle>
                    </ui_1.CardHeader>
                    <ui_1.CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {psyOpsData.framework.operational.campaigns.map((campaign, index) => (<div key={index} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-medium">{campaign.name}</h5>
                                <ui_1.Badge variant="outline">
                                  {campaign.phase}
                                </ui_1.Badge>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-center">
                                  <lucide_react_1.Clock className="h-3 w-3 mr-1"/>
                                  Duration: {campaign.duration} days
                                </div>
                                <div>
                                  <span className="font-medium">Methods:</span>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {campaign.methods.map((method, i) => (<ui_1.Badge key={i} variant="secondary" className="text-xs">
                                        {method}
                                      </ui_1.Badge>))}
                                  </div>
                                </div>
                              </div>
                            </div>))}
                      </div>
                    </ui_1.CardContent>
                  </ui_1.Card>
                </div>) : (<div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>)}
            </ui_1.TabsContent>

            <ui_1.TabsContent value="segmentation" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {psyOpsData.segments.map((segment) => (<ui_1.Card key={segment.id} className={`cursor-pointer transition-all ${selectedSegment === segment.id
                ? 'ring-2 ring-blue-500'
                : ''}`} onClick={() => setSelectedSegment(segment.id)}>
                    <ui_1.CardHeader>
                      <ui_1.CardTitle className="text-lg flex items-center justify-between">
                        <span>{segment.name}</span>
                        <ui_1.Badge className={getSusceptibilityColor(segment.susceptibilityRating)}>
                          {segment.susceptibilityRating}
                        </ui_1.Badge>
                      </ui_1.CardTitle>
                    </ui_1.CardHeader>
                    <ui_1.CardContent className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {(segment.size / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Estimated reach
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">
                          Vulnerability Score
                        </h4>
                        <div className="flex items-center space-x-2">
                          <ui_1.Progress value={segment.vulnerabilityScore * 100} className="flex-1"/>
                          <span className="text-sm font-medium">
                            {(segment.vulnerabilityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">
                          OCEAN Traits
                        </h4>
                        {renderOceanTraits(segment.oceanTraits)}
                      </div>

                      <div>
                        <h4 className="font-medium mb-2 text-sm">
                          Communication Channels
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {segment.communicationChannels
                .slice(0, 3)
                .map((channel, index) => (<ui_1.Badge key={index} variant="outline" className="text-xs">
                                {channel}
                              </ui_1.Badge>))}
                          {segment.communicationChannels.length > 3 && (<ui_1.Badge variant="outline" className="text-xs">
                              +{segment.communicationChannels.length - 3}
                            </ui_1.Badge>)}
                        </div>
                      </div>
                    </ui_1.CardContent>
                  </ui_1.Card>))}
              </div>
            </ui_1.TabsContent>

            <ui_1.TabsContent value="analysis" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Vulnerability Heatmap */}
                <ui_1.Card>
                  <ui_1.CardHeader>
                    <ui_1.CardTitle className="flex items-center">
                      <lucide_react_1.AlertTriangle className="h-4 w-4 mr-2"/>
                      Vulnerability Analysis
                    </ui_1.CardTitle>
                  </ui_1.CardHeader>
                  <ui_1.CardContent>
                    {psyOpsData.heatmap && (<div className="space-y-4">
                        {psyOpsData.heatmap.segments.map((segment) => (<div key={segment.segmentId} className="p-3 border rounded-lg">
                            <h5 className="font-medium mb-2">
                              {segment.segmentName}
                            </h5>
                            <div className="space-y-2">
                              {segment.vulnerabilities.map((vuln, index) => (<div key={index} className="flex items-center justify-between text-sm">
                                  <span className="capitalize">
                                    {vuln.type.replace('_', ' ')}
                                  </span>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-16 h-2 bg-gray-200 rounded-full">
                                      <div className={`h-2 rounded-full ${vuln.combinedScore > 0.6
                        ? 'bg-red-500'
                        : vuln.combinedScore > 0.3
                            ? 'bg-yellow-500'
                            : 'bg-green-500'}`} style={{
                        width: `${vuln.combinedScore * 100}%`,
                    }}/>
                                    </div>
                                    <span className="text-xs font-medium w-8 text-right">
                                      {(vuln.combinedScore * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>))}
                            </div>
                          </div>))}
                      </div>)}
                  </ui_1.CardContent>
                </ui_1.Card>

                {/* Decision Matrix */}
                <ui_1.Card>
                  <ui_1.CardHeader>
                    <ui_1.CardTitle className="flex items-center">
                      <lucide_react_1.Settings className="h-4 w-4 mr-2"/>
                      Decision Matrix
                    </ui_1.CardTitle>
                  </ui_1.CardHeader>
                  <ui_1.CardContent>
                    {psyOpsData.framework && (<div className="space-y-3">
                        {psyOpsData.framework.decisionMatrix.map((decision, index) => (<div key={index} className="p-3 border rounded-lg">
                              <h5 className="font-medium text-sm mb-1">
                                {decision.method}
                              </h5>
                              <p className="text-xs text-muted-foreground mb-2">
                                {decision.whenToUse}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="font-medium">
                                    Risk Level:
                                  </span>
                                  <div className="flex items-center mt-1">
                                    <div className={`w-2 h-2 rounded-full mr-1 ${getRiskColor(decision.riskLevel)}`}/>
                                    <span>
                                      {(decision.riskLevel * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <span className="font-medium">
                                    Effectiveness:
                                  </span>
                                  <div className="flex items-center mt-1">
                                    <div className={`w-2 h-2 rounded-full mr-1 ${getRiskColor(1 - decision.effectivenessScore)}`}/>
                                    <span>
                                      {(decision.effectivenessScore * 100).toFixed(0)}
                                      %
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>))}
                      </div>)}
                  </ui_1.CardContent>
                </ui_1.Card>
              </div>
            </ui_1.TabsContent>

            <ui_1.TabsContent value="execution" className="space-y-4">
              <ui_1.Alert>
                <lucide_react_1.AlertTriangle className="h-4 w-4"/>
                <ui_1.AlertDescription>
                  PsyOps execution requires proper authorization and compliance
                  with ethical guidelines. All operations must be approved
                  through the established chain of command.
                </ui_1.AlertDescription>
              </ui_1.Alert>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ui_1.Card>
                  <ui_1.CardHeader>
                    <ui_1.CardTitle>Execution Readiness</ui_1.CardTitle>
                  </ui_1.CardHeader>
                  <ui_1.CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Target Analysis Complete
                        </span>
                        <lucide_react_1.CheckCircle className="h-4 w-4 text-green-500"/>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ethical Review Approved</span>
                        <lucide_react_1.CheckCircle className="h-4 w-4 text-green-500"/>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Legal Compliance Verified
                        </span>
                        <lucide_react_1.CheckCircle className="h-4 w-4 text-green-500"/>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Resource Allocation</span>
                        <lucide_react_1.AlertTriangle className="h-4 w-4 text-yellow-500"/>
                      </div>
                    </div>
                  </ui_1.CardContent>
                </ui_1.Card>

                <ui_1.Card>
                  <ui_1.CardHeader>
                    <ui_1.CardTitle>Monitoring & Metrics</ui_1.CardTitle>
                  </ui_1.CardHeader>
                  <ui_1.CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold">85%</div>
                        <div className="text-xs text-muted-foreground">
                          Readiness Score
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">12</div>
                        <div className="text-xs text-muted-foreground">
                          Active Metrics
                        </div>
                      </div>
                    </div>
                    <ui_1.Button className="w-full" disabled>
                      <lucide_react_1.Eye className="h-4 w-4 mr-2"/>
                      Launch Operation Dashboard
                    </ui_1.Button>
                  </ui_1.CardContent>
                </ui_1.Card>
              </div>
            </ui_1.TabsContent>
          </ui_1.Tabs>
        </ui_1.CardContent>
      </ui_1.Card>
    </div>);
};
exports.default = PsyOpsPanel;
