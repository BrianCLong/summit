const crypto = require('crypto');

const DEFAULT_EMBEDDING_SIZE = 32;

class MultimodalFusionLayer {
  constructor(options = {}) {
    this.embeddingSize = options.embeddingSize || DEFAULT_EMBEDDING_SIZE;
    this.similarityThreshold = options.similarityThreshold || 0.72;
  }

  generateEntityEmbeddings(entity = {}, mediaDescriptors = []) {
    const modalVectors = [];

    const textSources = [
      entity.label,
      entity.description,
      entity.summary,
      entity.properties ? JSON.stringify(entity.properties) : null,
    ]
      .filter(Boolean)
      .join(' ');

    if (textSources) {
      modalVectors.push({
        modality: 'TEXT',
        vector: this.#vectorFromSeed(textSources),
        confidence: entity.confidence ?? 0.6,
      });
    }

    for (const descriptor of mediaDescriptors) {
      const seed = `${descriptor.mediaType || 'UNKNOWN'}::${
        descriptor.filename || descriptor.uri || ''
      }::${JSON.stringify(descriptor.metadata || {})}`;
      modalVectors.push({
        modality: descriptor.mediaType || 'MULTIMODAL',
        vector: this.#vectorFromSeed(seed),
        confidence: this.#confidenceFromQuality(descriptor.quality),
      });
    }

    if (Array.isArray(entity.boundingBoxes) && entity.boundingBoxes.length > 0) {
      modalVectors.push({
        modality: 'IMAGE',
        vector: this.#vectorFromSeed(JSON.stringify(entity.boundingBoxes)),
        confidence: 0.7,
      });
    }

    if (Array.isArray(entity.temporalBounds) && entity.temporalBounds.length > 0) {
      modalVectors.push({
        modality: 'VIDEO',
        vector: this.#vectorFromSeed(JSON.stringify(entity.temporalBounds)),
        confidence: 0.65,
      });
    }

    if (modalVectors.length === 0) {
      modalVectors.push({
        modality: 'TEXT',
        vector: this.#vectorFromSeed(entity.id || 'unknown'),
        confidence: entity.confidence ?? 0.5,
      });
    }

    const combined = this.#combineVectors(modalVectors.map((entry) => entry.vector));

    return {
      combined,
      modalities: modalVectors,
    };
  }

  computeFusedConfidence(baseConfidence = 0.5, modalityVectors = [], crossModalSignals = []) {
    const base = this.#clamp(baseConfidence, 0, 1);
    const modalityScores = modalityVectors.map((entry) =>
      this.#clamp(entry.confidence ?? base, 0, 1),
    );
    const modalityAverage =
      modalityScores.length > 0
        ? modalityScores.reduce((sum, score) => sum + score, 0) / modalityScores.length
        : base;

    const crossModalAverage =
      crossModalSignals.length > 0
        ? crossModalSignals.reduce((sum, signal) => sum + this.#clamp(signal, 0, 1), 0) /
          crossModalSignals.length
        : 0;

    const overall = this.#clamp(base * 0.35 + modalityAverage * 0.5 + crossModalAverage * 0.2, 0, 0.99);

    const breakdown = {
      baseConfidence: base,
      modalityConfidence: modalityAverage,
      crossModalBoost: Number((crossModalAverage * 0.2).toFixed(3)),
      modalities: modalityVectors.reduce((acc, entry) => {
        acc[entry.modality] = this.#clamp(entry.confidence ?? base, 0, 1);
        return acc;
      }, {}),
    };

    return { overall, breakdown };
  }

  computeSimilarity(vectorA, vectorB) {
    if (!Array.isArray(vectorA) || !Array.isArray(vectorB) || vectorA.length === 0 || vectorB.length === 0) {
      return 0;
    }

    const minLength = Math.min(vectorA.length, vectorB.length);
    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < minLength; i += 1) {
      const a = vectorA[i];
      const b = vectorB[i];
      dot += a * b;
      magA += a * a;
      magB += b * b;
    }

    if (magA === 0 || magB === 0) {
      return 0;
    }

    return this.#clamp(dot / (Math.sqrt(magA) * Math.sqrt(magB)), -1, 1);
  }

  unifySearchScores(queryEmbedding, entities = []) {
    return entities.map((entity) => {
      const similarity = this.computeSimilarity(queryEmbedding, entity.embedding || []);
      return {
        entityId: entity.id,
        similarity,
        confidence: entity.fusionConfidence ?? entity.confidence ?? 0.5,
      };
    });
  }

  inferCorrelations(entities = [], options = {}) {
    const threshold = options.similarityThreshold ?? this.similarityThreshold;
    const correlations = [];

    for (let i = 0; i < entities.length; i += 1) {
      for (let j = i + 1; j < entities.length; j += 1) {
        const a = entities[i];
        const b = entities[j];
        const similarity = this.computeSimilarity(a.embedding || [], b.embedding || []);
        if (similarity < threshold) {
          continue;
        }

        const sharedModalities = this.#sharedModalities(a, b);
        correlations.push({
          id: `fusion:${a.id}:${b.id}`,
          sourceId: a.id,
          targetId: b.id,
          type: 'FUSED_CORRELATION',
          label: `${a.label} ↔ ${b.label}`,
          similarity,
          sharedModalities,
          confidence: this.#clamp((a.fusionConfidence ?? a.confidence ?? 0.5 + (b.fusionConfidence ?? b.confidence ?? 0.5)) / 2, 0, 0.99),
        });
      }
    }

    return correlations;
  }

  buildTimeline(events = [], options = {}) {
    const windowHours = options.windowHours ?? null;
    const now = Date.now();
    const filtered = events.filter((event) => {
      if (!event.timestamp) {
        return false;
      }
      if (!windowHours) {
        return true;
      }
      const deltaHours = Math.abs(now - event.timestamp.getTime()) / (1000 * 60 * 60);
      return deltaHours <= windowHours;
    });

    filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return filtered.map((event, index) => ({
      ...event,
      id: event.id || this.#timelineEventId(event, index),
      sequence: index + 1,
    }));
  }

  projectEntityTimeline(entity, options = {}) {
    const events = [];
    const baseTimestamp = this.#parseDate(entity.updatedAt || entity.createdAt || new Date());
    const mediaModalities = this.#extractModalities(entity);

    if (Array.isArray(entity.temporalBounds) && entity.temporalBounds.length > 0) {
      for (const bound of entity.temporalBounds) {
        const timestamp = new Date(baseTimestamp.getTime() + (bound.startTime || 0) * 1000);
        events.push({
          entityId: entity.id,
          label: entity.label,
          description: entity.description || null,
          timestamp,
          modalities: mediaModalities,
          confidence: entity.fusionConfidence ?? entity.confidence ?? 0.5,
          context: {
            temporalBound: bound,
            properties: entity.properties || {},
          },
        });
      }
    } else {
      events.push({
        entityId: entity.id,
        label: entity.label,
        description: entity.description || null,
        timestamp: baseTimestamp,
        modalities: mediaModalities,
        confidence: entity.fusionConfidence ?? entity.confidence ?? 0.5,
        context: {
          properties: entity.properties || {},
        },
      });
    }

    return this.buildTimeline(events, options);
  }

  embedQuery(query, mediaTypes = []) {
    const seed = `${query}::${mediaTypes.sort().join('|')}`;
    return this.#vectorFromSeed(seed);
  }

  #sharedModalities(entityA, entityB) {
    const a = new Set(this.#extractModalities(entityA));
    const b = new Set(this.#extractModalities(entityB));
    return [...a].filter((item) => b.has(item));
  }

  #extractModalities(entity) {
    const modalities = new Set();
    if (Array.isArray(entity.mediaSources)) {
      for (const media of entity.mediaSources) {
        if (media.mediaType) {
          modalities.add(media.mediaType);
        }
      }
    }

    if (entity.properties?.sources) {
      for (const source of entity.properties.sources) {
        modalities.add(source.toString().toUpperCase());
      }
    }

    if (modalities.size === 0) {
      modalities.add('TEXT');
    }

    return [...modalities];
  }

  #vectorFromSeed(seed) {
    const hash = crypto.createHash('sha256').update(seed).digest();
    const vector = [];
    for (let i = 0; i < this.embeddingSize; i += 1) {
      const byte = hash[i % hash.length];
      const normalized = (byte / 255) * 2 - 1;
      vector.push(Number(normalized.toFixed(6)));
    }
    return this.#normalize(vector);
  }

  #combineVectors(vectors) {
    if (!vectors.length) {
      return new Array(this.embeddingSize).fill(0);
    }
    const combined = new Array(this.embeddingSize).fill(0);
    for (const vector of vectors) {
      for (let i = 0; i < this.embeddingSize; i += 1) {
        combined[i] += vector[i] ?? 0;
      }
    }
    const averaged = combined.map((value) => value / vectors.length);
    return this.#normalize(averaged);
  }

  #normalize(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (magnitude === 0) {
      return vector.map(() => 0);
    }
    return vector.map((value) => Number((value / magnitude).toFixed(6)));
  }

  #confidenceFromQuality(quality) {
    switch (quality) {
      case 'REFERENCE_QUALITY':
        return 0.95;
      case 'HIGH':
        return 0.85;
      case 'MEDIUM':
        return 0.7;
      case 'LOW':
        return 0.5;
      default:
        return 0.6;
    }
  }

  #clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  #parseDate(value) {
    if (value instanceof Date) {
      return value;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }

  #timelineEventId(event, index) {
    const seed = `${event.entityId || 'event'}:${event.label || ''}:${event.timestamp.toISOString()}:${index}`;
    return crypto.createHash('sha1').update(seed).digest('hex');
  }
}

module.exports = MultimodalFusionLayer;
