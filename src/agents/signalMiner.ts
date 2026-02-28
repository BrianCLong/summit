/**
 * Agent role:
 * - Extract text events
 * - Classify
 * - Embed
 * - Link to entity
 */
export class SignalMiner {
  async run() {
    if (!process.env.FEATURE_EMBEDDED_FORECASTING || process.env.FEATURE_EMBEDDED_FORECASTING === 'false') {
      return;
    }
    // Flagged only logic for extracting, classifying, and embedding events
  }
}
