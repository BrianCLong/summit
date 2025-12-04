import { AudioSentimentAnalyzer } from '../server/src/services/audio/AudioSentimentAnalyzer.js';
import { VisualEmotionAnalyzer } from '../server/src/services/vision/VisualEmotionAnalyzer.js';
import { MultimodalSentimentFusion } from '../server/src/services/multimodal/MultimodalSentimentFusion.js';
import { AudioAnalysisResult, VisualAnalysisResult, TextAnalysisResult } from '../server/src/services/multimodal/types.js';

/**
 * Multimodal Fusion Demo
 *
 * This script demonstrates the end-to-end flow of multimodal sentiment analysis:
 * 1. Simulates Audio, Visual, and Text input data.
 * 2. Runs independent analysis on each modality.
 * 3. Fuses the results to determine the overall emotional state.
 *
 * Usage:
 * npx ts-node examples/multimodal_fusion_demo.ts
 */

async function main() {
  console.log('=== Multimodal Sentiment Analysis Demo ===\n');

  // --- Initialize Analyzers ---
  const audioAnalyzer = new AudioSentimentAnalyzer();
  const visualAnalyzer = new VisualEmotionAnalyzer();
  const fuser = new MultimodalSentimentFusion();

  // --- 1. Simulate Input Data ---
  console.log('1. Simulating Input Data...');

  // Audio: Synthesize a "happy" signal (High Pitch, High Energy)
  const audioBuffer = Buffer.alloc(44100 * 2); // 1 second
  // Inject some noise to generate "features"
  for (let i = 0; i < audioBuffer.length; i++) {
    audioBuffer[i] = Math.floor(Math.random() * 255);
  }

  // Video: A random frame buffer
  const frameBuffer = Buffer.alloc(1920 * 1080 * 4); // 1080p RGBA
  frameBuffer.fill(200); // Bright frame -> likely positive scene

  // Text: A transcript
  const transcript = "I am absolutely thrilled with the results we achieved today!";
  console.log(`   Transcript: "${transcript}"`);

  // --- 2. Independent Analysis ---
  console.log('\n2. Running Independent Analysis...');

  // Audio Analysis
  const audioFeatures = await audioAnalyzer.extractFeatures(audioBuffer);
  // Hack: Force features for demonstration purposes to ensure "Happy"
  audioFeatures.rms = 0.8;
  audioFeatures.pitch = 600;
  const audioResult = await audioAnalyzer.classifyEmotion(audioFeatures);
  console.log(`   Audio Emotion: ${getDominantEmotion(audioResult.emotions)} (Confidence: ${audioResult.sentiment.confidence.toFixed(2)})`);

  // Visual Analysis
  const visualResult = await visualAnalyzer.analyzeFrame(frameBuffer);
  // Hack: Ensure visual is "Happy" for demo consistency
  visualResult.faces = [{
    box: { x:0, y:0, w:0, h:0 },
    emotions: { happy: 0.9, neutral: 0.1, sad: 0, angry: 0, fearful: 0 }
  }];
  const visualDominant = visualResult.faces[0]
    ? getDominantEmotion(visualResult.faces[0].emotions)
    : visualResult.scene.sentiment.label;
  console.log(`   Visual Emotion: ${visualDominant}`);

  // Text Analysis (Mocked)
  const textResult: TextAnalysisResult = {
    timestamp: Date.now(),
    content: transcript,
    sentiment: { score: 0.8, label: 'positive', confidence: 0.9 },
    emotions: { happy: 0.9, neutral: 0.1, sad: 0, angry: 0, fearful: 0 },
    entities: []
  };
  console.log(`   Text Emotion:  ${getDominantEmotion(textResult.emotions)}`);

  // --- 3. Fusion ---
  console.log('\n3. Fusing Modalities...');

  const fusionResult = fuser.fuse(audioResult, visualResult, textResult);

  console.log(`\n=== FUSION RESULT ===`);
  console.log(`Primary Emotion: ${fusionResult.primaryEmotion.toUpperCase()}`);
  console.log(`Sentiment:       ${fusionResult.sentiment.label.toUpperCase()} (Score: ${fusionResult.sentiment.score.toFixed(2)})`);
  console.log(`Coherence:       ${(fusionResult.coherence * 100).toFixed(1)}%`);
  console.log(`\nDetailed Scores:`, JSON.stringify(fusionResult.emotions, null, 2));
}

function getDominantEmotion(scores: any) {
  return Object.entries(scores).sort((a: any, b: any) => b[1] - a[1])[0][0];
}

main().catch(console.error);
