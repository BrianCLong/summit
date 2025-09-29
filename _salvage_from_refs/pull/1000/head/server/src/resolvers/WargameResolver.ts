import { GraphQLContext } from '../types/context';
import {
  CrisisScenario,
  CrisisScenarioInput,
  SocialMediaTelemetry,
  AdversaryIntentEstimate,
  NarrativeHeatmapData,
  StrategicResponsePlaybook,
} from '../generated/graphql-types';
import { getNeo4jDriver } from '../db/neo4j'; // Import Neo4j driver
import { v4 as uuidv4 } from 'uuid'; // For generating UUIDs

export class WargameResolver {
  private driver = getNeo4jDriver(); // Get the Neo4j driver instance

  // Query Resolvers
  async getCrisisTelemetry(
    _parent: any,
    { scenarioId, limit, offset }: { scenarioId: string; limit?: number; offset?: number },
    _context: GraphQLContext,
  ): Promise<SocialMediaTelemetry[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Data is simulated and anonymized for training purposes.
    console.log(`Fetching telemetry for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        export class WargameResolver {
  private driver = getNeo4jDriver();

  // Query Resolvers
  async getCrisisTelemetry(
    _parent: any,
    { scenarioId, limit, offset }: { scenarioId: string; limit?: number; offset?: number },
    _context: GraphQLContext,
  ): Promise<SocialMediaTelemetry[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Data is simulated and anonymized for training purposes.
    console.log(`Fetching telemetry for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_TELEMETRY]->(t:SocialMediaPost)
        RETURN t
        SKIP $offset
        LIMIT $limit
        `,
        { scenarioId, offset: offset || 0, limit: limit || 1000 } // Default limit for telemetry
      );
      return result.records.map(record => record.get('t').properties as SocialMediaTelemetry);
    } finally {
      await session.close();
    }
  }

  async getAdversaryIntentEstimates(
    _parent: any,
    { scenarioId }: { scenarioId: string },
    _context: GraphQLContext,
  ): Promise<AdversaryIntentEstimate[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Estimates are hypothetical and for simulation only.
    console.log(`Fetching adversary intent estimates for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_INTENT_ESTIMATE]->(i:AdversaryIntent)
        RETURN i
        `,
        { scenarioId }
      );
      return result.records.map(record => record.get('i').properties as AdversaryIntentEstimate);
    } finally {
      await session.close();
    }
  }

  async getNarrativeHeatmapData(
    _parent: any,
    { scenarioId }: { scenarioId: string },
    _context: GraphQLContext,
  ): Promise<NarrativeHeatmapData[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Visualizations are based on simulated data.
    console.log(`Fetching narrative heatmap data for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_HEATMAP_DATA]->(h:NarrativeHeatmap)
        RETURN h
        `,
        { scenarioId }
      );
      return result.records.map(record => record.get('h').properties as NarrativeHeatmapData);
    } finally {
      await session.close();
    }
  }

  async getStrategicResponsePlaybooks(
    _parent: any,
    { scenarioId }: { scenarioId: string },
    _context: GraphQLContext,
  ): Promise<StrategicResponsePlaybook[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Playbooks are theoretical and for training/simulation.
    console.log(`Fetching strategic response playbooks for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_PLAYBOOK]->(p:StrategicPlaybook)
        RETURN p
        `,
        { scenarioId }
      );
      return result.records.map(record => record.get('p').properties as StrategicResponsePlaybook);
    } finally {
      await session.close();
    }
  }

  async getCrisisScenario(
    _parent: any,
    { id }: { id: string },
    _context: GraphQLContext,
  ): Promise<CrisisScenario | undefined> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log(`Fetching crisis scenario: ${id} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $id})
        RETURN s
        `,
        { id }
      );
      if (result.records.length > 0) {
        return result.records[0].get('s').properties as CrisisScenario;
      }
      return undefined;
    } finally {
      await session.close();
    }
  }

  async getAllCrisisScenarios(
    _parent: any,
    _args: any,
    _context: GraphQLContext,
  ): Promise<CrisisScenario[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log('Fetching all crisis scenarios from Neo4j');
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario)
        RETURN s
        ORDER BY s.createdAt DESC
        `
      );
      return result.records.map(record => record.get('s').properties as CrisisScenario);
    } finally {
      await session.close();
    }
  }

  // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
  // Ethics Compliance: This function simulates propagation for hypothetical scenarios.
  private async _simulatePropagation(scenarioId: string, crisisType: string, keyNarratives: string[], adversaryProfiles: string[]): Promise<void> {
    console.log(`Simulating propagation for scenario: ${scenarioId}`);
    const session = this.driver.session();
    try {
      // Example 1: Simulate narrative spread to target audiences
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:INVOLVES_NARRATIVE]->(n:KeyNarrative)
        MATCH (s)-[:TARGETS]->(ta:TargetAudience)
        MERGE (n)-[r:SPREADS_TO {intensity: rand() * 0.5 + 0.5, timestamp: datetime()}]->(ta)
        `,
        { scenarioId }
      );
      console.log(`Simulated narrative spread for scenario ${scenarioId}`);

      // Example 2: Simulate adversary influence on specific entities (conceptual)
      // This would be more complex, linking adversary actions to specific nodes in the graph
      // For now, a simple conceptual update.
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:INVOLVES_ADVERSARY]->(ap:AdversaryProfile)
        MERGE (ap)-[r:INFLUENCES {strength: rand() * 0.8 + 0.2, timestamp: datetime()}]->(e:SimulatedEntity {name: 'CriticalInfrastructure'})
        `,
        { scenarioId }
      );
      console.log(`Simulated adversary influence for scenario ${scenarioId}`);

      // Example 3: Update heatmap intensity based on simulated events
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_HEATMAP_DATA]->(h:NarrativeHeatmap)
        SET h.intensity = h.intensity + (rand() * 2 - 1) * 0.5 // Random fluctuation
        `,
        { scenarioId }
      );
      console.log(`Simulated heatmap intensity update for scenario ${scenarioId}`);

    } finally {
      await session.close();
    }
  }

  // Mutation Resolvers
  async runWarGameSimulation(
    _parent: any,
    { input }: { input: CrisisScenarioInput },
    _context: GraphQLContext,
  ): Promise<CrisisScenario> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: This simulation is hypothetical and for training purposes.
    console.log('Running war-game simulation with input:', input);

    const session = this.driver.session();
    try {
      const scenarioId = uuidv4();
      const createdAt = new Date().toISOString();
      const updatedAt = createdAt;

      // Create CrisisScenario node
      const createScenarioResult = await session.run(
        `
        CREATE (s:CrisisScenario {
          id: $scenarioId,
          crisisType: $crisisType,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          simulationParameters: $simulationParameters
        })
        RETURN s
        `,
        {
          scenarioId,
          crisisType: input.crisisType,
          createdAt,
          updatedAt,
          simulationParameters: input.simulationParameters,
        }
      );
      const newScenario = createScenarioResult.records[0].get('s').properties as CrisisScenario;

      // Create and link TargetAudiences, KeyNarratives, AdversaryProfiles
      for (const audience of input.targetAudiences) {
        await session.run(
          `
          MATCH (s:CrisisScenario {id: $scenarioId})
          MERGE (ta:TargetAudience {name: $audienceName})
          MERGE (s)-[:TARGETS]->(ta)
          `,
          { scenarioId, audienceName: audience }
        );
      }
      for (const narrative of input.keyNarratives) {
        await session.run(
          `
          MATCH (s:CrisisScenario {id: $scenarioId})
          MERGE (kn:KeyNarrative {name: $narrativeName})
          MERGE (s)-[:INVOLVES_NARRATIVE]->(kn)
          `,
          { scenarioId, narrativeName: narrative }
        );
      }
      for (const adversary of input.adversaryProfiles) {
        await session.run(
          `
          MATCH (s:CrisisScenario {id: $scenarioId})
          MERGE (ap:AdversaryProfile {name: $adversaryName})
          MERGE (s)-[:INVOLVES_ADVERSARY]->(ap)
          `,
          { scenarioId, adversaryName: adversary }
        );
      }

      // --- Call Python AI/ML services for data generation and persist to Neo4j ---

      // 1. Simulate Telemetry Analysis (NLP)
      // In a real scenario, this would process actual social media content.
      // For now, we'll send a mock text.
      const mockTelemetryText = `Breaking news: A major development in the ${newScenario.crisisType} crisis. Some sources are spreading disinformation about the situation, trying to influence ${input.targetAudiences[0]}. The adversary ${input.adversaryProfiles[0]} seems to be involved. #crisis #disinfo`;
      let analyzedTelemetry: any = {};
      try {
        const response = await axios.post(
          `${PYTHON_API_URL}/analyze-telemetry`,
          { text: mockTelemetryText },
          { headers: { 'X-API-Key': PYTHON_API_KEY } } // WAR-GAMED SIMULATION - Add API Key
        );
        analyzedTelemetry = response.data;
        console.log('Analyzed Telemetry:', analyzedTelemetry);
      } catch (apiError: any) {
        console.error('Error calling /analyze-telemetry API:', apiError.message);
        // Fallback to mock data if API call fails
        analyzedTelemetry = {
          entities: [{ text: "crisis", label: "EVENT" }],
          sentiment: parseFloat((Math.random() * 2 - 1).toFixed(2)),
          narratives: [input.keyNarratives[0] || 'general'],
        };
      }

      const mockTelemetry: SocialMediaTelemetry = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        platform: 'X',
        postId: `mock_post_${uuidv4().substring(0, 8)}`,
        content: mockTelemetryText,
        author: `mock_user_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        sentiment: analyzedTelemetry.sentiment,
        viralityScore: parseFloat((Math.random() * 100).toFixed(1)),
        volume: Math.floor(Math.random() * 1000) + 10,
        narrativeDetected: analyzedTelemetry.narratives[0] || 'general',
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (t:SocialMediaPost {
          id: $id, platform: $platform, postId: $postId, content: $content,
          author: $author, timestamp: $timestamp, sentiment: $sentiment,
          viralityScore: $viralityScore, volume: $volume, narrativeDetected: $narrativeDetected
        })
        MERGE (s)-[:HAS_TELEMETRY]->(t)
        `,
        { scenarioId: newScenario.id, ...mockTelemetry }
      );

      // 2. Estimate Adversary Intent (LLM)
      let intentEstimate: any = {};
      try {
        const response = await axios.post(
          `${PYTHON_API_URL}/estimate-intent`,
          {
            telemetry_summary: mockTelemetryText,
            graph_data_summary: `Relevant graph data for ${newScenario.crisisType} involving ${input.adversaryProfiles[0]}`,
            adversary_profile: input.adversaryProfiles[0],
          },
          { headers: { 'X-API-Key': PYTHON_API_KEY } } // WAR-GAMED SIMULATION - Add API Key
        );
        intentEstimate = response.data;
        console.log('Intent Estimate:', intentEstimate);
      } catch (apiError: any) {
        console.error('Error calling /estimate-intent API:', apiError.message);
        // Fallback to mock data
        intentEstimate = {
          estimated_intent: 'High likelihood of disinformation escalation (Fallback)',
          likelihood: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)),
          reasoning: 'API call failed, using fallback mock data.',
        };
      }

      const mockIntent: AdversaryIntentEstimate = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        adversaryProfile: input.adversaryProfiles[0] || 'unknown',
        estimatedIntent: intentEstimate.estimated_intent,
        likelihood: intentEstimate.likelihood,
        reasoning: intentEstimate.reasoning,
        timestamp: new Date().toISOString(),
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (i:AdversaryIntent {
          id: $id, adversaryProfile: $adversaryProfile, estimatedIntent: $estimatedIntent,
          likelihood: $likelihood, reasoning: $reasoning, timestamp: $timestamp
        })
        MERGE (s)-[:HAS_INTENT_ESTIMATE]->(i)
        `,
        { scenarioId: newScenario.id, ...mockIntent }
      );

      // Mock Heatmap Data (still random for now, could be improved with NLP output)
      const mockHeatmap: NarrativeHeatmapData = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        narrative: analyzedTelemetry.narratives[0] || input.keyNarratives[0] || 'general',
        intensity: parseFloat((Math.random() * 10).toFixed(2)),
        location: { lat: parseFloat((Math.random() * 180 - 90).toFixed(4)), lon: parseFloat((Math.random() * 360 - 180).toFixed(4)) },
        timestamp: new Date().toISOString(),
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (h:NarrativeHeatmap {
          id: $id, narrative: $narrative, intensity: $intensity,
          location: $location, timestamp: $timestamp
        })
        MERGE (s)-[:HAS_HEATMAP_DATA]->(h)
        `,
        { scenarioId: newScenario.id, ...mockHeatmap }
      );

      // 3. Generate Playbook (LLM)
      let generatedPlaybook: any = {};
      try {
        const response = await axios.post(
          `${PYTHON_API_URL}/generate-playbook`,
          {
            crisis_type: newScenario.crisisType,
            target_audiences: input.targetAudiences,
            key_narratives: input.keyNarratives,
            adversary_profiles: input.adversaryProfiles,
            doctrine_references: ["JP 3-13", "2023 DoD SOIE"],
          },
          { headers: { 'X-API-Key': PYTHON_API_KEY } } // WAR-GAMED SIMULATION - Add API Key
        );
        generatedPlaybook = response.data;
        console.log('Generated Playbook:', generatedPlaybook);
      } catch (apiError: any) {
        console.error('Error calling /generate-playbook API:', apiError.message);
        // Fallback to mock data
        generatedPlaybook = {
          name: 'Counter-Disinformation Playbook (Fallback)',
          doctrine_reference: 'JP 3-13 Chapter IV: Planning (Fallback)',
          description: 'API call failed, using fallback mock data.',
          steps: ['Review situation', 'Consult doctrine', 'Formulate response'],
          metrics_of_effectiveness: ['Situation awareness'],
          metrics_of_performance: ['Response time'],
        };
      }

      const mockPlaybook: StrategicResponsePlaybook = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        name: generatedPlaybook.name,
        doctrineReference: generatedPlaybook.doctrine_reference,
        description: generatedPlaybook.description,
        steps: generatedPlaybook.steps,
        metricsOfEffectiveness: generatedPlaybook.metrics_of_effectiveness,
        metricsOfPerformance: generatedPlaybook.metrics_of_performance,
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (p:StrategicPlaybook {
          id: $id, name: $name, doctrineReference: $doctrineReference,
          description: $description, steps: $steps,
          metricsOfEffectiveness: $metricsOfEffectiveness,
          metricsOfPerformance: $metricsOfPerformance
        })
        MERGE (s)-[:HAS_PLAYBOOK]->(p)
        `,
        { scenarioId: newScenario.id, ...mockPlaybook }
      );

      return newScenario;
    } finally {
      await session.close();
    }
  }

  async updateCrisisScenario(
    _parent: any,
    { id, input }: { id: string; input: CrisisScenarioInput },
    _context: GraphQLContext,
  ): Promise<CrisisScenario> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log(`Updating crisis scenario: ${id} in Neo4j`);
    const session = this.driver.session();
    try {
      const updatedAt = new Date().toISOString();
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $id})
        SET s.crisisType = $crisisType,
            s.updatedAt = $updatedAt,
            s.simulationParameters = $simulationParameters
        WITH s
        OPTIONAL MATCH (s)-[r:TARGETS|INVOLVES_NARRATIVE|INVOLVES_ADVERSARY]->(oldNode)
        DELETE r
        WITH s
        FOREACH (audienceName IN $targetAudiences |
          MERGE (ta:TargetAudience {name: audienceName})
          MERGE (s)-[:TARGETS]->(ta)
        )
        FOREACH (narrativeName IN $keyNarratives |
          MERGE (kn:KeyNarrative {name: narrativeName})
          MERGE (s)-[:INVOLVES_NARRATIVE]->(kn)
        )
        FOREACH (adversaryName IN $adversaryProfiles |
          MERGE (ap:AdversaryProfile {name: adversaryName})
          MERGE (s)-[:INVOLVES_ADVERSARY]->(ap)
        )
        RETURN s
        `,
        {
          id,
          crisisType: input.crisisType,
          targetAudiences: input.targetAudiences,
          keyNarratives: input.keyNarratives,
          adversaryProfiles: input.adversaryProfiles,
          simulationParameters: input.simulationParameters,
          updatedAt,
        }
      );
      if (result.records.length > 0) {
        return result.records[0].get('s').properties as CrisisScenario;
      }
      throw new Error(`Crisis Scenario with ID ${id} not found.`);
    } finally {
      await session.close();
    }
  }

  async deleteCrisisScenario(
    _parent: any,
    { id }: { id: string },
    _context: GraphQLContext,
  ): Promise<boolean> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log(`Deleting crisis scenario: ${id} from Neo4j`);
    const session = this.driver.session();
    try {
      // Detach and delete the CrisisScenario node and all its related nodes
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $id})
        DETACH DELETE s
        `,
        { id }
      );
      return result.summary.counters.nodesDeleted > 0;
    } finally {
      await session.close();
    }
  }
}
        `,
        { scenarioId, offset: offset || 0, limit: limit || 1000 } // Default limit for telemetry
      );
      return result.records.map(record => record.get('t').properties as SocialMediaTelemetry);
    } finally {
      await session.close();
    }
  }

  async getAdversaryIntentEstimates(
    _parent: any,
    { scenarioId }: { scenarioId: string },
    _context: GraphQLContext,
  ): Promise<AdversaryIntentEstimate[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Estimates are hypothetical and for simulation only.
    console.log(`Fetching adversary intent estimates for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_INTENT_ESTIMATE]->(i:AdversaryIntent)
        RETURN i
        `,
        { scenarioId }
      );
      return result.records.map(record => record.get('i').properties as AdversaryIntentEstimate);
    } finally {
      await session.close();
    }
  }

  async getNarrativeHeatmapData(
    _parent: any,
    { scenarioId }: { scenarioId: string },
    _context: GraphQLContext,
  ): Promise<NarrativeHeatmapData[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Visualizations are based on simulated data.
    console.log(`Fetching narrative heatmap data for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_HEATMAP_DATA]->(h:NarrativeHeatmap)
        RETURN h
        `,
        { scenarioId }
      );
      return result.records.map(record => record.get('h').properties as NarrativeHeatmapData);
    } finally {
      await session.close();
    }
  }

  async getStrategicResponsePlaybooks(
    _parent: any,
    { scenarioId }: { scenarioId: string },
    _context: GraphQLContext,
  ): Promise<StrategicResponsePlaybook[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: Playbooks are theoretical and for training/simulation.
    console.log(`Fetching strategic response playbooks for scenario: ${scenarioId} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})-[:HAS_PLAYBOOK]->(p:StrategicPlaybook)
        RETURN p
        `,
        { scenarioId }
      );
      return result.records.map(record => record.get('p').properties as StrategicResponsePlaybook);
    } finally {
      await session.close();
    }
  }

  async getCrisisScenario(
    _parent: any,
    { id }: { id: string },
    _context: GraphQLContext,
  ): Promise<CrisisScenario | undefined> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log(`Fetching crisis scenario: ${id} from Neo4j`);
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $id})
        RETURN s
        `,
        { id }
      );
      if (result.records.length > 0) {
        return result.records[0].get('s').properties as CrisisScenario;
      }
      return undefined;
    } finally {
      await session.close();
    }
  }

  async getAllCrisisScenarios(
    _parent: any,
    _args: any,
    _context: GraphQLContext,
  ): Promise<CrisisScenario[]> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log('Fetching all crisis scenarios from Neo4j');
    const session = this.driver.session();
    try {
      const result = await session.run(
        `
        MATCH (s:CrisisScenario)
        RETURN s
        ORDER BY s.createdAt DESC
        `
      );
      return result.records.map(record => record.get('s').properties as CrisisScenario);
    } finally {
      await session.close();
    }
  }

  // Mutation Resolvers
  async runWarGameSimulation(
    _parent: any,
    { input }: { input: CrisisScenarioInput },
    _context: GraphQLContext,
  ): Promise<CrisisScenario> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    // Ethics Compliance: This simulation is hypothetical and for training purposes.
    console.log('Running war-game simulation with input:', input);

    const session = this.driver.session();
    try {
      const scenarioId = uuidv4();
      const createdAt = new Date().toISOString();
      const updatedAt = createdAt;

      // Create CrisisScenario node
      const createScenarioResult = await session.run(
        `
        CREATE (s:CrisisScenario {
          id: $scenarioId,
          crisisType: $crisisType,
          createdAt: $createdAt,
          updatedAt: $updatedAt,
          simulationParameters: $simulationParameters
        })
        RETURN s
        `,
        {
          scenarioId,
          crisisType: input.crisisType,
          createdAt,
          updatedAt,
          simulationParameters: input.simulationParameters,
        }
      );
      const newScenario = createScenarioResult.records[0].get('s').properties as CrisisScenario;

      // Create and link TargetAudiences, KeyNarratives, AdversaryProfiles
      for (const audience of input.targetAudiences) {
        await session.run(
          `
          MATCH (s:CrisisScenario {id: $scenarioId})
          MERGE (ta:TargetAudience {name: $audienceName})
          MERGE (s)-[:TARGETS]->(ta)
          `,
          { scenarioId, audienceName: audience }
        );
      }
      for (const narrative of input.keyNarratives) {
        await session.run(
          `
          MATCH (s:CrisisScenario {id: $scenarioId})
          MERGE (kn:KeyNarrative {name: $narrativeName})
          MERGE (s)-[:INVOLVES_NARRATIVE]->(kn)
          `,
          { scenarioId, narrativeName: narrative }
        );
      }
      for (const adversary of input.adversaryProfiles) {
        await session.run(
          `
          MATCH (s:CrisisScenario {id: $scenarioId})
          MERGE (ap:AdversaryProfile {name: $adversaryName})
          MERGE (s)-[:INVOLVES_ADVERSARY]->(ap)
          `,
          { scenarioId, adversaryName: adversary }
        );
      }

      // --- Simulate data generation and persist to Neo4j ---
      // In a real system, these would be calls to AI/ML services or ingestion pipelines.

      // Mock Telemetry
      const mockTelemetry: SocialMediaTelemetry = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        platform: 'X',
        postId: `mock_post_${uuidv4().substring(0, 8)}`,
        content: `Simulated post about ${newScenario.crisisType} for scenario ${newScenario.id}. #wargame #simulated`,
        author: `mock_user_${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date().toISOString(),
        sentiment: parseFloat((Math.random() * 2 - 1).toFixed(2)), // -1 to 1
        viralityScore: parseFloat((Math.random() * 100).toFixed(1)),
        volume: Math.floor(Math.random() * 1000) + 10,
        narrativeDetected: input.keyNarratives[0] || 'general',
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (t:SocialMediaPost {
          id: $id, platform: $platform, postId: $postId, content: $content,
          author: $author, timestamp: $timestamp, sentiment: $sentiment,
          viralityScore: $viralityScore, volume: $volume, narrativeDetected: $narrativeDetected
        })
        MERGE (s)-[:HAS_TELEMETRY]->(t)
        `,
        { scenarioId: newScenario.id, ...mockTelemetry }
      );

      // Mock Intent Estimate
      const mockIntent: AdversaryIntentEstimate = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        adversaryProfile: input.adversaryProfiles[0] || 'unknown',
        estimatedIntent: 'High likelihood of disinformation escalation',
        likelihood: parseFloat((Math.random() * 0.3 + 0.7).toFixed(2)), // 0.7 to 1.0
        reasoning: 'Based on simulated telemetry patterns and historical adversary behavior. (Simulated LLM output)',
        timestamp: new Date().toISOString(),
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (i:AdversaryIntent {
          id: $id, adversaryProfile: $adversaryProfile, estimatedIntent: $estimatedIntent,
          likelihood: $likelihood, reasoning: $reasoning, timestamp: $timestamp
        })
        MERGE (s)-[:HAS_INTENT_ESTIMATE]->(i)
        `,
        { scenarioId: newScenario.id, ...mockIntent }
      );

      // Mock Heatmap Data
      const mockHeatmap: NarrativeHeatmapData = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        narrative: input.keyNarratives[0] || 'general',
        intensity: parseFloat((Math.random() * 10).toFixed(2)),
        location: { lat: parseFloat((Math.random() * 180 - 90).toFixed(4)), lon: parseFloat((Math.random() * 360 - 180).toFixed(4)) }, // Random lat/lon
        timestamp: new Date().toISOString(),
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (h:NarrativeHeatmap {
          id: $id, narrative: $narrative, intensity: $intensity,
          location: $location, timestamp: $timestamp
        })
        MERGE (s)-[:HAS_HEATMAP_DATA]->(h)
        `,
        { scenarioId: newScenario.id, ...mockHeatmap }
      );

      // Mock Playbook
      const mockPlaybook: StrategicResponsePlaybook = {
        id: uuidv4(),
        scenarioId: newScenario.id,
        name: 'Counter-Disinformation Playbook (Simulated)',
        doctrineReference: 'JP 3-13 Chapter IV: Planning (Simulated)',
        description: 'A simulated playbook to counter disinformation campaigns, generated based on scenario parameters. (Simulated LLM output)',
        steps: [
          'Identify disinformation narratives (Simulated)',
          'Develop counter-narratives (Simulated)',
          'Disseminate via allied channels (Simulated)',
          'Monitor impact and adjust (Simulated)',
        ],
        metricsOfEffectiveness: ['Narrative adoption rate (Simulated)', 'Sentiment shift (Simulated)'],
        metricsOfPerformance: ['Messages disseminated (Simulated)', 'Partners engaged (Simulated)'],
      };
      await session.run(
        `
        MATCH (s:CrisisScenario {id: $scenarioId})
        CREATE (p:StrategicPlaybook {
          id: $id, name: $name, doctrineReference: $doctrineReference,
          description: $description, steps: $steps,
          metricsOfEffectiveness: $metricsOfEffectiveness,
          metricsOfPerformance: $metricsOfPerformance
        })
        MERGE (s)-[:HAS_PLAYBOOK]->(p)
        `,
        { scenarioId: newScenario.id, ...mockPlaybook }
      );

      return newScenario;
    } finally {
      await session.close();
    }
  }

  async updateCrisisScenario(
    _parent: any,
    { id, input }: { id: string; input: CrisisScenarioInput },
    _context: GraphQLContext,
  ): Promise<CrisisScenario> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log(`Updating crisis scenario: ${id} in Neo4j`);
    const session = this.driver.session();
    try {
      const updatedAt = new Date().toISOString();
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $id})
        SET s.crisisType = $crisisType,
            s.updatedAt = $updatedAt,
            s.simulationParameters = $simulationParameters
        WITH s
        OPTIONAL MATCH (s)-[r:TARGETS|INVOLVES_NARRATIVE|INVOLVES_ADVERSARY]->(oldNode)
        DELETE r
        WITH s
        FOREACH (audienceName IN $targetAudiences |
          MERGE (ta:TargetAudience {name: audienceName})
          MERGE (s)-[:TARGETS]->(ta)
        )
        FOREACH (narrativeName IN $keyNarratives |
          MERGE (kn:KeyNarrative {name: narrativeName})
          MERGE (s)-[:INVOLVES_NARRATIVE]->(kn)
        )
        FOREACH (adversaryName IN $adversaryProfiles |
          MERGE (ap:AdversaryProfile {name: adversaryName})
          MERGE (s)-[:INVOLVES_ADVERSARY]->(ap)
        )
        RETURN s
        `,
        {
          id,
          crisisType: input.crisisType,
          targetAudiences: input.targetAudiences,
          keyNarratives: input.keyNarratives,
          adversaryProfiles: input.adversaryProfiles,
          simulationParameters: input.simulationParameters,
          updatedAt,
        }
      );
      if (result.records.length > 0) {
        return result.records[0].get('s').properties as CrisisScenario;
      }
      throw new Error(`Crisis Scenario with ID ${id} not found.`);
    } finally {
      await session.close();
    }
  }

  async deleteCrisisScenario(
    _parent: any,
    { id }: { id: string },
    _context: GraphQLContext,
  ): Promise<boolean> {
    // WAR-GAMED SIMULATION - FOR DECISION SUPPORT ONLY
    console.log(`Deleting crisis scenario: ${id} from Neo4j`);
    const session = this.driver.session();
    try {
      // Detach and delete the CrisisScenario node and all its related nodes
      const result = await session.run(
        `
        MATCH (s:CrisisScenario {id: $id})
        DETACH DELETE s
        `,
        { id }
      );
      return result.summary.counters.nodesDeleted > 0;
    } finally {
      await session.close();
    }
  }
}
