/**
 * Example: Advanced - Neural Architecture Search
 *
 * This example demonstrates:
 * - Automated architecture discovery
 * - Multi-objective optimization
 * - Architecture comparison and benchmarking
 */

import { NeuralArchitectureSearch, ArchitectureBenchmark } from '@intelgraph/neural-networks';
import type { NeuralNetworkArchitecture } from '@intelgraph/neural-networks';

async function main() {
  console.log('=== Neural Architecture Search ===\n');

  // Step 1: Define search space
  console.log('Step 1: Defining search space...');
  const nas = new NeuralArchitectureSearch({
    searchSpace: {
      minLayers: 5,
      maxLayers: 15,
      allowedLayerTypes: ['dense', 'conv2d', 'lstm', 'attention'],
      hiddenUnitsRange: [128, 512],
      activations: ['relu', 'gelu', 'swish', 'selu'],
    },
    strategy: 'evolutionary',
    budget: {
      maxTrials: 50,
      maxDuration: 7200000, // 2 hours
      maxParametersPerModel: 10000000, // 10M params max
    },
    objective: {
      metric: 'val_accuracy',
      direction: 'maximize',
    },
  });

  console.log('Search Configuration:');
  console.log(`  - Strategy: Evolutionary`);
  console.log(`  - Max trials: 50`);
  console.log(`  - Max duration: 2 hours`);
  console.log(`  - Layers: 5-15`);
  console.log(`  - Hidden units: 128-512\n`);

  // Step 2: Run architecture search
  console.log('Step 2: Running architecture search...');
  console.log('(This will take some time...)\n');

  let trialsCompleted = 0;
  const startTime = Date.now();

  const { architecture: bestArchitecture, score: bestScore } = await nas.search(
    async (arch: NeuralNetworkArchitecture) => {
      trialsCompleted++;
      const score = await evaluateArchitecture(arch);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      process.stdout.write(
        `\r  Trial ${trialsCompleted}/50 | Best: ${bestScore.toFixed(4)} | ` +
          `Current: ${score.toFixed(4)} | Time: ${elapsed}s`
      );

      return score;
    }
  );

  console.log('\n');
  console.log('✓ Architecture search complete!\n');

  // Step 3: Display best architecture
  console.log('Best Architecture Found:');
  console.log(`  - Name: ${bestArchitecture.name}`);
  console.log(`  - Type: ${bestArchitecture.type}`);
  console.log(`  - Layers: ${bestArchitecture.layers.length}`);
  console.log(`  - Score: ${bestScore.toFixed(4)}`);
  console.log('\nLayer Details:');
  bestArchitecture.layers.forEach((layer, i) => {
    console.log(`  ${i + 1}. ${layer.type} (${layer.name})`);
  });

  // Step 4: Benchmark against baseline architectures
  console.log('\nStep 3: Benchmarking against baseline architectures...');
  const benchmark = new ArchitectureBenchmark();

  // Add baseline architectures
  const baselines = [
    { name: 'ResNet-50', accuracy: 0.759, params: 25600000 },
    { name: 'MobileNet-v2', accuracy: 0.719, params: 3504872 },
    { name: 'EfficientNet-B0', accuracy: 0.773, params: 5288548 },
  ];

  baselines.forEach((baseline) => {
    benchmark.addResult({
      modelId: baseline.name,
      architecture: baseline.name,
      dataset: 'ImageNet',
      metrics: { accuracy: baseline.accuracy },
      inferenceTime: 5,
      throughput: 200,
      parameters: baseline.params,
      modelSize: baseline.params * 4,
      timestamp: new Date().toISOString(),
    });
  });

  // Add discovered architecture
  benchmark.addResult({
    modelId: bestArchitecture.name,
    architecture: bestArchitecture.name,
    dataset: 'ImageNet',
    metrics: { accuracy: bestScore },
    inferenceTime: 4,
    throughput: 250,
    parameters: bestArchitecture.parameters || 8000000,
    modelSize: (bestArchitecture.parameters || 8000000) * 4,
    timestamp: new Date().toISOString(),
  });

  console.log('\nPerformance Comparison:');
  console.log('┌──────────────────┬──────────┬────────────┬──────────┐');
  console.log('│ Architecture     │ Accuracy │ Parameters │ Inf Time │');
  console.log('├──────────────────┼──────────┼────────────┼──────────┤');

  const leaderboard = benchmark.getLeaderboard('accuracy', 10);
  leaderboard.forEach((result) => {
    console.log(
      `│ ${padRight(result.architecture, 16)} │ ${padRight((result.metrics.accuracy * 100).toFixed(2) + '%', 8)} │ ` +
        `${padRight(formatParams(result.parameters), 10)} │ ${padRight(result.inferenceTime + 'ms', 8)} │`
    );
  });
  console.log('└──────────────────┴──────────┴────────────┴──────────┘\n');

  // Step 5: Multi-objective comparison
  console.log('Step 4: Multi-objective analysis...');
  const paretoFront = computeParetoFront(leaderboard);

  console.log('Pareto-optimal architectures (accuracy vs efficiency):');
  paretoFront.forEach((result, i) => {
    console.log(`  ${i + 1}. ${result.architecture}`);
    console.log(`     - Accuracy: ${(result.metrics.accuracy * 100).toFixed(2)}%`);
    console.log(`     - Params: ${formatParams(result.parameters)}`);
    console.log(`     - Efficiency: ${((result.metrics.accuracy * 1000000) / result.parameters).toFixed(2)}`);
  });

  console.log('\n✓ Architecture search and benchmarking complete!');
}

async function evaluateArchitecture(arch: NeuralNetworkArchitecture): Promise<number> {
  // Simulate architecture evaluation
  // In practice, this would train and validate the model
  await new Promise((resolve) => setTimeout(resolve, 50));

  // Generate score based on architecture complexity
  const numLayers = arch.layers.length;
  const baseScore = 0.7 + Math.random() * 0.2;
  const complexityBonus = Math.min(0.05, numLayers * 0.003);

  return Math.min(0.95, baseScore + complexityBonus);
}

function computeParetoFront(results: any[]): any[] {
  // Simple Pareto front computation
  return results.filter((r1) => {
    return !results.some((r2) => {
      const r2Better =
        r2.metrics.accuracy > r1.metrics.accuracy && r2.parameters < r1.parameters;
      return r2Better;
    });
  });
}

function formatParams(params: number): string {
  if (params >= 1000000) {
    return `${(params / 1000000).toFixed(1)}M`;
  } else if (params >= 1000) {
    return `${(params / 1000).toFixed(0)}K`;
  }
  return params.toString();
}

function padRight(str: string, length: number): string {
  return str + ' '.repeat(Math.max(0, length - str.length));
}

main().catch(console.error);
