import { advancedMLService } from '../services/AdvancedMLService.js';
import { logger } from '../logging.js';
import { wrapResolversWithPolicy } from './policyWrapper.js';

/**
 * GraphQL resolvers for advanced ML capabilities
 */

const resolvers = {
  Query: {
    /**
     * Get ML system health and information
     */
    mlSystemInfo: async () => {
      try {
        const [isHealthy, systemInfo] = await Promise.all([
          advancedMLService.healthCheck(),
          advancedMLService.getSystemInfo(),
        ]);

        return {
          healthy: isHealthy,
          ...systemInfo,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to get ML system info', { error: errorMessage });
        return {
          healthy: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        };
      }
    },

    /**
     * List all ML models
     */
    mlModels: async () => {
      try {
        const models = await advancedMLService.listModels();
        return models.map((model) => ({
          id: model.model_id,
          type: model.model_type,
          status: model.status,
          createdAt: model.created_at,
          device: model.device,
          memoryUsage: model.memory_usage,
        }));
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to list ML models', { error: errorMessage });
        throw new Error(`Failed to list ML models: ${errorMessage}`);
      }
    },

    /**
     * Get ML performance metrics
     */
    mlMetrics: async () => {
      try {
        const [systemMetrics, modelMetrics] = await Promise.all([
          advancedMLService.getMetrics(),
          advancedMLService.getModelMetrics(),
        ]);

        return {
          system: systemMetrics,
          models: modelMetrics,
          timestamp: new Date().toISOString(),
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to get ML metrics', { error: errorMessage });
        throw new Error(`Failed to get ML metrics: ${errorMessage}`);
      }
    },
  },

  Mutation: {
    /**
     * Create a new ML model
     */
    createMLModel: async (_: any, { input }: any) => {
      try {
        const modelConfig = {
          model_type: input.modelType || 'accelerated_gnn',
          num_node_features: input.numNodeFeatures || 128,
          hidden_channels: input.hiddenChannels || 256,
          num_classes: input.numClasses || 10,
          architecture: input.architecture || 'gcn',
          use_quantization: input.useQuantization || false,
          quantization_bits: input.quantizationBits || 8,
          use_quantum: input.useQuantum || false,
          quantum_qubits: input.quantumQubits || 4,
        };

        const modelId = await advancedMLService.createModel(modelConfig);

        return {
          success: true,
          modelId,
          message: `ML model created successfully with ID: ${modelId}`,
          config: modelConfig,
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to create ML model', {
          error: errorMessage,
          input,
        });
        return {
          success: false,
          error: errorMessage,
          modelId: null,
        };
      }
    },

    /**
     * Train an ML model
     */
    trainMLModel: async (_: any, { modelId, trainingConfig }: any) => {
      try {
        const config = {
          batch_size: trainingConfig?.batchSize || 32,
          learning_rate: trainingConfig?.learningRate || 0.001,
          num_epochs: trainingConfig?.numEpochs || 100,
          use_mixed_precision: trainingConfig?.useMixedPrecision || true,
          use_distributed: trainingConfig?.useDistributed || false,
        };

        const message = await advancedMLService.trainModel({
          model_id: modelId,
          config: {
            model_type: 'accelerated_gnn',
            num_node_features: 128,
            hidden_channels: 256,
            num_classes: 10,
            architecture: 'gcn',
          },
          training_config: config,
          use_distributed: config.use_distributed,
        });

        return {
          success: true,
          message,
          modelId,
          trainingConfig: config,
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to train ML model', {
          error: errorMessage,
          modelId,
        });
        return {
          success: false,
          error: errorMessage,
          modelId,
        };
      }
    },

    /**
     * Run ML inference on graph data
     */
    predictWithMLModel: async (_: any, { modelId, graphData }: any) => {
      try {
        const nodeFeatures = graphData.nodeFeatures || [];
        const edgeIndex = graphData.edgeIndex || [[], []];
        const batchIndices = graphData.batchIndices;

        const result = await advancedMLService.predict({
          model_id: modelId,
          node_features: nodeFeatures,
          edge_index: edgeIndex,
          batch_indices: batchIndices,
        });

        return {
          success: true,
          modelId,
          predictions: result.predictions,
          confidenceScores: result.confidence_scores,
          inferenceTime: result.inference_time_ms,
          device: result.device,
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('ML inference failed', { error: errorMessage, modelId });
        return {
          success: false,
          error: errorMessage,
          modelId,
        };
      }
    },

    /**
     * Optimize ML model for deployment
     */
    optimizeModel: async (
      _: any,
      { modelId, optimizationType, targetPrecision }: any,
    ) => {
      try {
        const message = await advancedMLService.optimizeModel(
          modelId,
          optimizationType || 'torchscript',
          targetPrecision || 'fp16',
        );

        return {
          success: true,
          message,
          modelId,
          optimizationType: optimizationType || 'torchscript',
          targetPrecision: targetPrecision || 'fp16',
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('ML model optimization failed', {
          error: errorMessage,
          modelId,
        });
        return {
          success: false,
          error: errorMessage,
          modelId,
        };
      }
    },

    /**
     * Run quantum optimization on graph problems
     */
    detectAnomalies: async (_: any, { input }: any) => {
      try {
        const result = await advancedMLService.quantumOptimize({
          problem_type: input.problemType || 'combinatorial',
          cost_function: input.costFunction || {},
          num_qubits: input.numQubits || 8,
          num_iterations: input.numIterations || 100,
        });

        return {
          success: true,
          optimalParameters: result.optimal_parameters,
          finalCost: result.final_cost,
          numQubits: result.num_qubits,
          numIterations: result.num_iterations,
          problemType: input.problemType,
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Quantum optimization failed', {
          error: errorMessage,
          input,
        });
        return {
          success: false,
          error: errorMessage,
          problemType: input.problemType,
        };
      }
    },

    /**
     * Enhanced graph analysis using advanced ML
     */
    analyzeGraphStructure: async (_: any, { graphId, analysisType }: any) => {
      try {
        // This would typically fetch graph data from Neo4j
        // For now, we'll simulate with sample data
        const nodeFeatures = Array(100)
          .fill(0)
          .map(() =>
            Array(128)
              .fill(0)
              .map(() => Math.random()),
          );
        const edgeIndex = [
          Array(200)
            .fill(0)
            .map(() => Math.floor(Math.random() * 100)),
          Array(200)
            .fill(0)
            .map(() => Math.floor(Math.random() * 100)),
        ];

        const result = await advancedMLService.analyzeGraphWithML(
          nodeFeatures,
          edgeIndex,
          analysisType || 'node_classification',
        );

        return {
          success: true,
          graphId,
          analysisType: result.analysisType,
          predictions: result.predictions,
          confidenceScores: result.confidence_scores,
          inferenceTime: result.inference_time_ms,
          modelInfo: result.model_info,
          insights: generateInsights(result),
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Graph ML analysis failed', {
          error: errorMessage,
          graphId,
        });
        return {
          success: false,
          error: errorMessage,
          graphId,
        };
      }
    },

    /**
     * Quantum-enhanced graph optimization
     */
    optimizeQuantumCircuit: async (
      _: any,
      { graphId, optimizationType, numQubits }: any,
    ) => {
      try {
        // Simulate graph data - in production this would come from Neo4j
        const graphData = {
          nodes: Array(50)
            .fill(0)
            .map((_, i) => ({ id: i, label: `Node${i}` })),
          edges: Array(100)
            .fill(0)
            .map(() => ({
              source: Math.floor(Math.random() * 50),
              target: Math.floor(Math.random() * 50),
            })),
        };

        const result = await advancedMLService.optimizeGraphWithQuantum(
          graphData,
          optimizationType || 'graph_coloring',
          numQubits || 8,
        );

        return {
          success: true,
          graphId,
          optimizationType: result.optimization_type,
          optimalSolution: result.optimal_solution,
          finalCost: result.final_cost,
          quantumAdvantage: result.quantum_advantage,
          graphInfo: result.graph_info,
          recommendations: generateOptimizationRecommendations(result),
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Quantum graph optimization failed', {
          error: errorMessage,
          graphId,
        });
        return {
          success: false,
          error: errorMessage,
          graphId,
        };
      }
    },

    /**
     * Delete ML model
     */
    deleteMLModel: async (_: any, { modelId }: any) => {
      try {
        await advancedMLService.deleteModel(modelId);

        return {
          success: true,
          message: `Model ${modelId} deleted successfully`,
          modelId,
        };
      } catch (error: any) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Failed to delete ML model', {
          error: errorMessage,
          modelId,
        });
        return {
          success: false,
          error: errorMessage,
          modelId,
        };
      }
    },
  },
};

export const advancedMLResolvers = wrapResolversWithPolicy(
  'AdvancedML',
  resolvers,
);

/**
 * Generate insights from ML analysis results
 */
function generateInsights(result: any): string[] {
  const insights = [];

  if (result.confidence_scores) {
    const avgConfidence =
      result.confidence_scores.reduce((a: number, b: number) => a + b, 0) /
      result.confidence_scores.length;
    insights.push(
      `Average prediction confidence: ${(avgConfidence * 100).toFixed(1)}%`,
    );

    if (avgConfidence > 0.9) {
      insights.push(
        'High confidence predictions indicate strong model performance',
      );
    } else if (avgConfidence < 0.7) {
      insights.push('Low confidence predictions may require model retraining');
    }
  }

  if (result.inference_time_ms) {
    if (result.inference_time_ms < 100) {
      insights.push('Fast inference time suitable for real-time applications');
    } else if (result.inference_time_ms > 1000) {
      insights.push('Consider model optimization for better performance');
    }
  }

  if (result.model_info?.quantized) {
    insights.push('Model uses quantization for optimized memory usage');
  }

  return insights;
}

/**
 * Generate optimization recommendations
 */
function generateOptimizationRecommendations(result: any): string[] {
  const recommendations = [];

  if (result.quantum_advantage) {
    recommendations.push(
      'Quantum optimization provides advantage for this problem size',
    );
  } else {
    recommendations.push(
      'Consider classical optimization for smaller problems',
    );
  }

  if (result.final_cost < 0.1) {
    recommendations.push('Excellent optimization result achieved');
  } else if (result.final_cost > 0.5) {
    recommendations.push(
      'Consider increasing quantum iterations for better results',
    );
  }

  if (result.graph_info.nodes > 100) {
    recommendations.push(
      'Large graph detected - consider distributed quantum processing',
    );
  }

  return recommendations;
}
