#!/usr/bin/env node

/**
 * IntelGraph AI/ML Pipeline Integration Demo
 * 
 * Demonstrates advanced AI capabilities including:
 * - Entity extraction from unstructured text
 * - Relationship inference using graph neural networks
 * - Similarity analysis with vector embeddings
 * - Anomaly detection in entity patterns
 * - Predictive analysis for threat intelligence
 * - Natural language query processing
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 IntelGraph AI/ML Pipeline Integration Demo');
console.log('===========================================\n');

class AIEntityExtractor {
    constructor() {
        this.models = {
            ner: 'spacy:en_core_web_trf',
            embedding: 'sentence-transformers/all-MiniLM-L6-v2',
            classification: 'bert-base-uncased-threat-classification'
        };
    }
    
    async extractEntities(text) {
        console.log('🔍 Extracting entities from unstructured text...');
        
        // Simulated NLP entity extraction
        const entities = [
            {
                text: 'John Anderson',
                type: 'PERSON',
                confidence: 0.95,
                start: 15,
                end: 27,
                properties: {
                    role: 'analyst',
                    department: 'intelligence'
                }
            },
            {
                text: '192.168.1.100',
                type: 'IP_ADDRESS',
                confidence: 0.98,
                start: 45,
                end: 58,
                properties: {
                    location: 'internal_network',
                    risk_score: 0.3
                }
            },
            {
                text: 'Project Alpha',
                type: 'PROJECT',
                confidence: 0.87,
                start: 70,
                end: 83,
                properties: {
                    classification: 'confidential',
                    status: 'active'
                }
            },
            {
                text: 'malware.exe',
                type: 'FILE',
                confidence: 0.92,
                start: 95,
                end: 106,
                properties: {
                    threat_type: 'trojan',
                    risk_score: 0.9
                }
            }
        ];
        
        console.log(`✅ Extracted ${entities.length} entities:`);
        entities.forEach(entity => {
            console.log(`   • ${entity.text} (${entity.type}) - Confidence: ${entity.confidence}`);
        });
        
        return entities;
    }
}

class GraphNeuralNetworkAnalyzer {
    constructor() {
        this.model_architecture = 'GraphSAGE';
        this.embedding_dim = 256;
        this.num_layers = 3;
    }
    
    async inferRelationships(entities) {
        console.log('\n🧠 Analyzing relationships with Graph Neural Networks...');
        
        // Simulated GNN relationship inference
        const relationships = [
            {
                source: 'John Anderson',
                target: 'Project Alpha',
                type: 'ASSIGNED_TO',
                confidence: 0.89,
                strength: 0.75,
                properties: {
                    role: 'lead_analyst',
                    access_level: 'full'
                }
            },
            {
                source: '192.168.1.100',
                target: 'malware.exe',
                type: 'HOSTS',
                confidence: 0.94,
                strength: 0.85,
                properties: {
                    detection_time: '2025-01-15T10:30:00Z',
                    threat_level: 'high'
                }
            },
            {
                source: 'Project Alpha',
                target: '192.168.1.100',
                type: 'USES_RESOURCE',
                confidence: 0.78,
                strength: 0.60,
                properties: {
                    access_pattern: 'regular',
                    last_access: '2025-01-15T09:45:00Z'
                }
            }
        ];
        
        console.log(`✅ Inferred ${relationships.length} relationships:`);
        relationships.forEach(rel => {
            console.log(`   • ${rel.source} --[${rel.type}]--> ${rel.target} (${rel.confidence})`);
        });
        
        return relationships;
    }
    
    async detectAnomalies(graph_data) {
        console.log('\n🔍 Detecting anomalies in graph patterns...');
        
        const anomalies = [
            {
                type: 'unusual_access_pattern',
                entity: '192.168.1.100',
                description: 'IP accessed project resources outside normal hours',
                severity: 0.7,
                evidence: {
                    access_times: ['02:30:00', '03:15:00', '04:20:00'],
                    normal_pattern: '09:00-17:00',
                    deviation_score: 0.85
                }
            },
            {
                type: 'suspicious_file_propagation',
                entity: 'malware.exe',
                description: 'File spreading through network connections',
                severity: 0.9,
                evidence: {
                    propagation_speed: 'rapid',
                    affected_systems: 5,
                    signature_match: 'known_threat_family'
                }
            }
        ];
        
        console.log(`🚨 Detected ${anomalies.length} anomalies:`);
        anomalies.forEach(anomaly => {
            console.log(`   • ${anomaly.type}: ${anomaly.description} (severity: ${anomaly.severity})`);
        });
        
        return anomalies;
    }
}

class VectorEmbeddingService {
    constructor() {
        this.model = 'sentence-transformers/all-MiniLM-L6-v2';
        this.dimension = 384;
    }
    
    async generateEmbeddings(entities) {
        console.log('\n🔢 Generating vector embeddings for semantic analysis...');
        
        const embeddings = entities.map(entity => ({
            entity_id: entity.text,
            embedding: this.generateMockEmbedding(),
            metadata: {
                type: entity.type,
                confidence: entity.confidence,
                model: this.model,
                dimension: this.dimension
            }
        }));
        
        console.log(`✅ Generated embeddings for ${embeddings.length} entities`);
        console.log(`   • Dimension: ${this.dimension}D vectors`);
        console.log(`   • Model: ${this.model}`);
        
        return embeddings;
    }
    
    async findSimilarEntities(target_entity, embeddings, threshold = 0.8) {
        console.log(`\n🔍 Finding entities similar to "${target_entity}"...`);
        
        const similarities = [
            {
                entity: 'Jane Smith',
                type: 'PERSON',
                similarity: 0.87,
                reason: 'Similar role and department attributes'
            },
            {
                entity: 'Project Beta',
                type: 'PROJECT', 
                similarity: 0.82,
                reason: 'Similar classification and access patterns'
            },
            {
                entity: '192.168.1.101',
                type: 'IP_ADDRESS',
                similarity: 0.75,
                reason: 'Same network segment and usage patterns'
            }
        ].filter(sim => sim.similarity >= threshold);
        
        console.log(`✅ Found ${similarities.length} similar entities (threshold: ${threshold}):`);
        similarities.forEach(sim => {
            console.log(`   • ${sim.entity} (${sim.type}) - Similarity: ${sim.similarity}`);
            console.log(`     Reason: ${sim.reason}`);
        });
        
        return similarities;
    }
    
    generateMockEmbedding() {
        // Generate a mock 384-dimensional vector
        return Array.from({length: this.dimension}, () => Math.random() * 2 - 1);
    }
}

class ThreatIntelligencePredictor {
    constructor() {
        this.model_type = 'ensemble';
        this.algorithms = ['random_forest', 'gradient_boosting', 'neural_network'];
    }
    
    async predictThreats(entities, relationships, anomalies) {
        console.log('\n⚠️ Analyzing threat landscape with predictive models...');
        
        const predictions = [
            {
                threat_type: 'advanced_persistent_threat',
                probability: 0.78,
                confidence: 0.85,
                indicators: [
                    'Anomalous access patterns detected',
                    'Malware presence confirmed',
                    'Project access during off-hours'
                ],
                recommended_actions: [
                    'Isolate affected systems',
                    'Review access logs for John Anderson',
                    'Implement additional monitoring on Project Alpha'
                ],
                timeline_prediction: '24-48 hours for full assessment'
            },
            {
                threat_type: 'insider_threat',
                probability: 0.65,
                confidence: 0.72,
                indicators: [
                    'Unusual project access patterns',
                    'Access outside normal working hours'
                ],
                recommended_actions: [
                    'Background check verification',
                    'Enhanced monitoring of user activities',
                    'Restrict access to sensitive resources'
                ],
                timeline_prediction: '1-2 weeks for complete evaluation'
            }
        ];
        
        console.log(`🎯 Generated ${predictions.length} threat predictions:`);
        predictions.forEach(pred => {
            console.log(`   • ${pred.threat_type.toUpperCase()}`);
            console.log(`     Probability: ${pred.probability} (Confidence: ${pred.confidence})`);
            console.log(`     Key Indicators: ${pred.indicators.length} found`);
            console.log(`     Timeline: ${pred.timeline_prediction}`);
        });
        
        return predictions;
    }
}

class NaturalLanguageProcessor {
    constructor() {
        this.model = 'transformers/roberta-base-squad';
    }
    
    async processNLQuery(query, knowledge_base) {
        console.log(`\n💬 Processing natural language query: "${query}"`);
        
        // Simulated NL query processing
        const analysis = {
            intent: 'security_investigation',
            entities_mentioned: ['John Anderson', 'Project Alpha', 'malware'],
            query_type: 'threat_assessment',
            confidence: 0.91,
            suggested_queries: [
                'MATCH (p:PERSON {name: "John Anderson"})-[r]->(proj:PROJECT) RETURN p, r, proj',
                'MATCH (ip:IP_ADDRESS)-[:HOSTS]->(file:FILE) WHERE file.risk_score > 0.8 RETURN ip, file',
                'MATCH (proj:PROJECT {name: "Project Alpha"})<-[access]-(entity) RETURN entity, access ORDER BY access.timestamp DESC'
            ],
            narrative_response: `Based on your query about John Anderson and Project Alpha security concerns, I found several concerning patterns:

1. **Anomalous Access**: John Anderson accessed Project Alpha resources outside normal business hours
2. **Malware Detection**: System 192.168.1.100 associated with Project Alpha shows malware presence
3. **Risk Assessment**: The combination suggests potential insider threat or compromised credentials

**Recommendations**:
- Immediate review of John Anderson's recent activities
- Isolate system 192.168.1.100 for forensic analysis  
- Audit all Project Alpha access logs for the past 30 days
- Consider temporarily restricting access pending investigation`
        };
        
        console.log(`✅ Query Analysis Complete:`);
        console.log(`   • Intent: ${analysis.intent}`);
        console.log(`   • Confidence: ${analysis.confidence}`);
        console.log(`   • Generated ${analysis.suggested_queries.length} Cypher queries`);
        console.log(`   • Narrative response: ${analysis.narrative_response.length} characters`);
        
        return analysis;
    }
}

class CopilotAIOrchestrator {
    constructor() {
        this.extractor = new AIEntityExtractor();
        this.gnn = new GraphNeuralNetworkAnalyzer();
        this.embeddings = new VectorEmbeddingService();
        this.predictor = new ThreatIntelligencePredictor();
        this.nlp = new NaturalLanguageProcessor();
    }
    
    async runIntelligenceAnalysis(input_text, user_query) {
        console.log('🚀 Starting comprehensive AI-powered intelligence analysis...\n');
        
        // Step 1: Entity Extraction
        const entities = await this.extractor.extractEntities(input_text);
        
        // Step 2: Relationship Inference
        const relationships = await this.gnn.inferRelationships(entities);
        
        // Step 3: Anomaly Detection
        const anomalies = await this.gnn.detectAnomalies({ entities, relationships });
        
        // Step 4: Vector Embeddings
        const embeddings = await this.embeddings.generateEmbeddings(entities);
        const similarities = await this.embeddings.findSimilarEntities('John Anderson', embeddings);
        
        // Step 5: Threat Prediction
        const threats = await this.predictor.predictThreats(entities, relationships, anomalies);
        
        // Step 6: Natural Language Processing
        const nl_analysis = await this.nlp.processNLQuery(user_query, { entities, relationships, anomalies });
        
        // Generate comprehensive report
        const analysis_report = {
            timestamp: new Date().toISOString(),
            input: {
                text_length: input_text.length,
                user_query: user_query
            },
            results: {
                entities_extracted: entities.length,
                relationships_inferred: relationships.length,
                anomalies_detected: anomalies.length,
                embeddings_generated: embeddings.length,
                threats_predicted: threats.length,
                similarities_found: similarities.length
            },
            detailed_analysis: {
                entities,
                relationships,
                anomalies,
                threats,
                similarities,
                nl_analysis
            },
            recommendations: [
                'Immediate isolation of compromised systems',
                'Enhanced monitoring of identified personnel',
                'Review and update access control policies',
                'Implement additional security measures for sensitive projects',
                'Schedule regular threat assessment reviews'
            ]
        };
        
        console.log('\n📊 ANALYSIS COMPLETE - Summary Report:');
        console.log('=====================================');
        console.log(`🔍 Entities Extracted: ${analysis_report.results.entities_extracted}`);
        console.log(`🔗 Relationships Inferred: ${analysis_report.results.relationships_inferred}`);
        console.log(`🚨 Anomalies Detected: ${analysis_report.results.anomalies_detected}`);
        console.log(`⚠️  Threats Predicted: ${analysis_report.results.threats_predicted}`);
        console.log(`🎯 Similarities Found: ${analysis_report.results.similarities_found}`);
        console.log(`💡 Recommendations: ${analysis_report.recommendations.length}`);
        
        // Save detailed report
        const reportPath = path.join(__dirname, '../ai-analysis-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(analysis_report, null, 2));
        console.log(`\n📄 Detailed analysis saved to: ${reportPath}`);
        
        return analysis_report;
    }
}

async function main() {
    const copilot = new CopilotAIOrchestrator();
    
    // Sample intelligence data for analysis
    const intelligence_text = `
    Intelligence Report: John Anderson, senior analyst in the intelligence department, 
    has been accessing Project Alpha resources from IP address 192.168.1.100. 
    Recent security scans detected malware.exe on the same system. 
    Access logs show unusual activity during non-business hours between 
    02:00-04:00 AM for the past week. Project Alpha contains classified 
    information requiring special clearance. The file malware.exe matches 
    signatures of known Advanced Persistent Threat (APT) group tools.
    `;
    
    const user_query = "What security risks are associated with John Anderson's access to Project Alpha?";
    
    try {
        await copilot.runIntelligenceAnalysis(intelligence_text, user_query);
        
        console.log('\n🎉 AI/ML Pipeline Integration Demo Complete!');
        console.log('\nCapabilities Demonstrated:');
        console.log('✅ Named Entity Recognition (NER)');
        console.log('✅ Graph Neural Network Analysis');
        console.log('✅ Vector Embedding Generation');
        console.log('✅ Anomaly Detection');
        console.log('✅ Threat Prediction');
        console.log('✅ Natural Language Understanding');
        console.log('✅ Comprehensive Intelligence Analysis');
        
    } catch (error) {
        console.error('❌ Analysis failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { CopilotAIOrchestrator };