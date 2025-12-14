export const rapidAttribution = {
  id: 'rapid-attribution',
  name: 'Rapid Attribution',
  description: 'Threat attribution from indicators to ATT&CK techniques with evidence-first narrative generation',
  version: '1.0.0',
  triggers: ['manual', 'api'],
  inputs: {
    indicators: 'List of threat indicators (IP, Domain, Hash)',
  },
  outputs: {
    hypothesis: 'Generated threat hypothesis with evidence',
  },
  steps: [
    {
      id: 'enrichment',
      name: 'Enrich Indicators',
      type: 'ingestion',
      parameters: {
        source: 'threat-intel',
        type: 'enrichment',
        data: '{{inputs.indicators}}'
      }
    },
    {
      id: 'infrastructure',
      name: 'Infrastructure Discovery',
      type: 'graph_query',
      dependencies: ['enrichment'],
      parameters: {
        query: 'MATCH (i:Indicator) WHERE i.value IN $indicators RETURN i',
        params: { indicators: '{{inputs.indicators}}' }
      }
    },
    {
      id: 'analysis',
      name: 'Pattern Analysis',
      type: 'analytics',
      dependencies: ['infrastructure'],
      parameters: {
        algorithm: 'clustering',
        inputData: '{{steps.infrastructure.output.records}}'
      }
    },
    {
      id: 'narrative',
      name: 'Generate Narrative',
      type: 'copilot',
      dependencies: ['analysis'],
      parameters: {
        prompt: 'Generate an attribution report based on these clusters: {{steps.analysis.output.clusters}}'
      }
    }
  ]
};

export const phishingDiscovery = {
  id: 'phishing-discovery',
  name: 'Phishing Cluster Discovery',
  description: 'Discover and map phishing infrastructure clusters',
  version: '1.0.0',
  triggers: ['alert'],
  inputs: {
    suspiciousUrl: 'Suspicious URL detected',
  },
  outputs: {
    campaignId: 'Identified phishing campaign ID',
  },
  steps: [
    {
      id: 'scan',
      name: 'Scan URL',
      type: 'ingestion',
      parameters: {
        source: 'url-scanner',
        type: 'scan',
        data: '{{inputs.suspiciousUrl}}'
      }
    },
    {
      id: 'find-related',
      name: 'Find Related Infrastructure',
      type: 'graph_query',
      dependencies: ['scan'],
      parameters: {
        query: 'MATCH (u:URL)-[:HOSTED_ON]->(ip:IP)<-[:HOSTED_ON]-(other:URL) WHERE u.value = $url RETURN other',
        params: { url: '{{inputs.suspiciousUrl}}' }
      }
    },
    {
      id: 'classify',
      name: 'Classify Campaign',
      type: 'analytics',
      dependencies: ['find-related'],
      parameters: {
        algorithm: 'classification',
        inputData: '{{steps.find-related.output.records}}'
      }
    }
  ]
};

export const disinformationMapping = {
  id: 'disinformation-mapping',
  name: 'Disinformation Network Mapping',
  description: 'Map coordinated inauthentic behavior networks',
  version: '1.0.0',
  triggers: ['manual'],
  inputs: {
    seedAccounts: 'List of seed social media accounts',
  },
  outputs: {
    networkMap: 'Graph of coordinated accounts',
  },
  steps: [
    {
      id: 'expand-network',
      name: 'Expand Network',
      type: 'graph_query',
      parameters: {
        query: 'MATCH (a:Account)-[:FOLLOWS|INTERACTS]->(b:Account) WHERE a.id IN $seeds RETURN b',
        params: { seeds: '{{inputs.seedAccounts}}' }
      }
    },
    {
      id: 'detect-communities',
      name: 'Detect Communities',
      type: 'analytics',
      dependencies: ['expand-network'],
      parameters: {
        algorithm: 'louvain',
        inputData: '{{steps.expand-network.output.records}}'
      }
    },
    {
      id: 'analyze-content',
      name: 'Analyze Content Narrative',
      type: 'copilot',
      dependencies: ['detect-communities'],
      parameters: {
        prompt: 'Analyze the common narratives in these communities: {{steps.detect-communities.output.clusters}}'
      }
    }
  ]
};

export const humanRightsVetting = {
  id: 'human-rights-vetting',
  name: 'Human Rights Incident Vetting',
  description: 'Vet and verify reported human rights incidents',
  version: '1.0.0',
  triggers: ['report'],
  inputs: {
    reportId: 'Incident Report ID',
    location: 'Location coordinates',
  },
  outputs: {
    verificationStatus: 'Verified/Debunked/Unclear',
  },
  steps: [
    {
      id: 'fetch-evidence',
      name: 'Fetch Corroborating Evidence',
      type: 'ingestion',
      parameters: {
        source: 'osint',
        type: 'location-search',
        data: '{{inputs.location}}'
      }
    },
    {
      id: 'cross-reference',
      name: 'Cross Reference with Known Entities',
      type: 'graph_query',
      dependencies: ['fetch-evidence'],
      parameters: {
        query: 'MATCH (e:Entity) WHERE e.location NEAR $location RETURN e',
        params: { location: '{{inputs.location}}' }
      }
    },
    {
      id: 'legal-check',
      name: 'Legal & Policy Check',
      type: 'governance',
      dependencies: ['cross-reference'],
      parameters: {
        action: 'verify-incident',
        resource: '{{inputs.reportId}}'
      }
    },
    {
      id: 'assess',
      name: 'Assess Credibility',
      type: 'copilot',
      dependencies: ['legal-check', 'fetch-evidence'],
      parameters: {
        prompt: 'Assess credibility of report {{inputs.reportId}} given evidence {{steps.fetch-evidence.output}}'
      }
    }
  ]
};

export const supplyChainTrace = {
  id: 'supply-chain-trace',
  name: 'Supply-Chain Compromise Trace',
  description: 'Trace impact of compromised software component',
  version: '1.0.0',
  triggers: ['vulnerability-alert'],
  inputs: {
    componentId: 'Compromised Component ID (PURL)',
  },
  outputs: {
    impactedSystems: 'List of impacted systems',
  },
  steps: [
    {
      id: 'find-dependencies',
      name: 'Find Dependencies',
      type: 'graph_query',
      parameters: {
        query: 'MATCH (s:System)-[:DEPENDS_ON*]->(c:Component) WHERE c.purl = $purl RETURN s',
        params: { purl: '{{inputs.componentId}}' }
      }
    },
    {
      id: 'assess-criticality',
      name: 'Assess Criticality',
      type: 'analytics',
      dependencies: ['find-dependencies'],
      parameters: {
        algorithm: 'risk-scoring',
        inputData: '{{steps.find-dependencies.output.records}}'
      }
    },
    {
      id: 'compliance-check',
      name: 'Compliance Violation Check',
      type: 'governance',
      dependencies: ['assess-criticality'],
      parameters: {
        action: 'check-compliance',
        resource: '{{inputs.componentId}}'
      }
    },
    {
      id: 'generate-alert',
      name: 'Generate Impact Report',
      type: 'copilot',
      dependencies: ['assess-criticality'],
      parameters: {
        prompt: 'Generate an executive summary of the supply chain impact for component {{inputs.componentId}} affecting {{steps.find-dependencies.output.records.length}} systems.'
      }
    }
  ]
};
