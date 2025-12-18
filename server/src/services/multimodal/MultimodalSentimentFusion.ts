import { AudioAnalysisResult, VisualAnalysisResult, TextAnalysisResult, MultimodalFusionResult, EmotionScores } from './types.js';

/**
 * MultimodalSentimentFusion
 *
 * Combines analysis results from Audio, Visual, and Text modalities.
 * Uses a late-fusion strategy with weighted attention.
 */
export class MultimodalSentimentFusion {

  // Weights for each modality (tunable)
  private weights = {
    text: 0.4,
    audio: 0.35,
    visual: 0.25
  };

  /**
   * Fuse results from available modalities
   */
  public fuse(
    audio?: AudioAnalysisResult,
    visual?: VisualAnalysisResult,
    text?: TextAnalysisResult
  ): MultimodalFusionResult {

    // Normalize weights based on available inputs
    const available = {
      text: !!text,
      audio: !!audio,
      visual: !!visual
    };

    const totalWeight =
      (available.text ? this.weights.text : 0) +
      (available.audio ? this.weights.audio : 0) +
      (available.visual ? this.weights.visual : 0);

    const normWeights = {
      text: available.text ? this.weights.text / totalWeight : 0,
      audio: available.audio ? this.weights.audio / totalWeight : 0,
      visual: available.visual ? this.weights.visual / totalWeight : 0
    };

    // Calculate fused emotion scores
    const fusedEmotions: EmotionScores = {
      neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0
    };

    if (text) this.addScores(fusedEmotions, text.emotions, normWeights.text);
    if (audio) this.addScores(fusedEmotions, audio.emotions, normWeights.audio);
    if (visual && visual.faces.length > 0) {
      // Average face emotions for frame
      const avgFace = this.averageEmotions(visual.faces.map(f => f.emotions));
      this.addScores(fusedEmotions, avgFace, normWeights.visual);
    } else if (visual) {
      // Fallback if no faces but scene sentiment exists (heuristic mapping)
      // If scene is positive -> happy, negative -> sad/fearful
      const sceneScores: EmotionScores = { neutral: 0.2, happy: 0, sad: 0, angry: 0, fearful: 0 };
      if (visual.scene.sentiment.label === 'positive') {
        sceneScores.happy = 0.8;
      } else if (visual.scene.sentiment.label === 'negative') {
        sceneScores.fearful = 0.4;
        sceneScores.sad = 0.4;
      } else {
        sceneScores.neutral = 0.8;
      }
      this.addScores(fusedEmotions, sceneScores, normWeights.visual);
    }

    // Determine primary emotion
    const primaryEmotion = Object.entries(fusedEmotions).sort((a, b) => b[1] - a[1])[0][0];

    // Calculate sentiment score
    const positive = fusedEmotions.happy;
    const negative = fusedEmotions.angry + fusedEmotions.sad + fusedEmotions.fearful;
    const sentimentScore = positive - negative;

    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (sentimentScore > 0.1) label = 'positive';
    if (sentimentScore < -0.1) label = 'negative';

    // Calculate Coherence (Variance between modalities)
    // Low variance = High coherence
    const coherence = this.calculateCoherence(fusedEmotions, audio, visual, text);

    return {
      timestamp: Date.now(),
      duration: audio?.duration || 0,
      primaryEmotion,
      emotions: fusedEmotions,
      sentiment: {
        score: sentimentScore,
        label,
        confidence: Math.max(positive, negative, fusedEmotions.neutral)
      },
      modalities: { audio, visual, text },
      coherence
    };
  }

  private addScores(target: EmotionScores, source: EmotionScores, weight: number) {
    for (const key in target) {
      target[key] += (source[key] || 0) * weight;
    }
  }

  private averageEmotions(list: EmotionScores[]): EmotionScores {
    const res: EmotionScores = { neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0 };
    if (list.length === 0) return res;

    for (const item of list) {
      for (const k in res) {
        res[k] += item[k];
      }
    }
    for (const k in res) {
      res[k] /= list.length;
    }
    return res;
  }

  private calculateCoherence(
    fused: EmotionScores,
    audio?: AudioAnalysisResult,
    visual?: VisualAnalysisResult,
    text?: TextAnalysisResult
  ): number {
    // Simple implementation: 1 - Average Euclidean distance from fused result
    // Higher is better
    let distanceSum = 0;
    let count = 0;

    const dist = (a: EmotionScores, b: EmotionScores) => {
      let d = 0;
      for (const k in a) d += Math.pow(a[k] - b[k], 2);
      return Math.sqrt(d);
    };

    if (audio) { distanceSum += dist(fused, audio.emotions); count++; }
    if (text) { distanceSum += dist(fused, text.emotions); count++; }
    if (visual && visual.faces.length > 0) {
        distanceSum += dist(fused, this.averageEmotions(visual.faces.map(f => f.emotions)));
        count++;
    }

    if (count === 0) return 1;
    const avgDist = distanceSum / count;
    return Math.max(0, 1 - avgDist); // Normalize roughly
  }
}
