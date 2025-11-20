/**
 * Example: Text Generation with GPT
 *
 * This example demonstrates:
 * - Creating a GPT model
 * - Fine-tuning for domain-specific text
 * - Text generation with various strategies
 */

import { createGPT, TransformerFineTuning } from '@intelgraph/transformers';
import type { TrainingConfig } from '@intelgraph/deep-learning-core';

async function main() {
  console.log('=== Text Generation with GPT ===\n');

  // 1. Create GPT model
  console.log('Step 1: Creating GPT model...');
  const gptModel = createGPT({
    numLayers: 12,
    dModel: 768,
    numHeads: 12,
    dff: 3072,
    vocabSize: 50257,
    maxLength: 1024,
  });

  console.log(`✓ Created ${gptModel.name}`);
  console.log(`  - Layers: 12`);
  console.log(`  - Hidden size: 768`);
  console.log(`  - Attention heads: 12`);
  console.log(`  - Max length: 1024 tokens\n`);

  // 2. Configure fine-tuning
  console.log('Step 2: Configuring fine-tuning for intelligence reports...');
  const fineTuneConfig = TransformerFineTuning.createFineTuneConfig({
    baseModelId: 'gpt2-medium',
    taskType: 'generation',
    learningRate: 0.00005,
    warmupSteps: 500,
    frozenLayers: [0, 1, 2], // Freeze first 3 layers
  });

  const trainingConfig: TrainingConfig = {
    modelId: 'gpt-intel-analyst',
    batchSize: 8,
    epochs: 10,
    learningRate: fineTuneConfig.learningRate,
    optimizer: 'adamw',
    lossFunction: 'causal_lm',
    metrics: ['perplexity', 'loss'],

    distributed: {
      strategy: 'data_parallel',
      numWorkers: 4,
    },
  };

  console.log('✓ Fine-tuning configured\n');

  // 3. Generate text samples
  console.log('Step 3: Generating intelligence report summaries...\n');

  const prompts = [
    'Intelligence Summary: Recent activity in region alpha indicates',
    'Threat Assessment: Analysis of intercepted communications reveals',
    'Strategic Outlook: Based on geospatial intelligence, we assess that',
  ];

  for (const prompt of prompts) {
    console.log(`Prompt: "${prompt}"`);
    const generated = await generateText(prompt, {
      maxTokens: 50,
      temperature: 0.8,
      topP: 0.9,
    });
    console.log(`Generated: "${generated}"\n`);
  }

  console.log('✓ Text generation complete');
}

async function generateText(
  prompt: string,
  options: { maxTokens: number; temperature: number; topP: number }
): Promise<string> {
  // Simulate text generation
  const continuations = [
    'increased military movements near the border.',
    'a coordinated effort to evade surveillance systems.',
    'the situation remains fluid but within acceptable risk parameters.',
  ];

  return continuations[Math.floor(Math.random() * continuations.length)];
}

main().catch(console.error);
