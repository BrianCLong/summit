/**
 * @intelgraph/data-augmentation
 * Comprehensive data augmentation pipelines
 */

import { TabularData } from '@intelgraph/synthetic-data';

export interface AugmentationPipeline {
  transforms: Transform[];
  randomOrder?: boolean;
  probability?: number;
}

export interface Transform {
  type: string;
  params: Record<string, any>;
  probability?: number;
}

export class DataAugmentor {
  /**
   * Augment tabular data
   */
  augmentTabular(data: TabularData, factor: number): TabularData {
    const augmented: any[][] = [...data.data];

    for (let i = 0; i < data.data.length * (factor - 1); i++) {
      const original = data.data[Math.floor(Math.random() * data.data.length)];
      const augmentedRow = this.augmentRow(original, data.columns);
      augmented.push(augmentedRow);
    }

    return {
      ...data,
      data: augmented
    };
  }

  private augmentRow(row: any[], columns: string[]): any[] {
    return row.map((value, idx) => {
      if (typeof value === 'number') {
        // Add Gaussian noise
        const noise = (Math.random() - 0.5) * 0.1 * value;
        return value + noise;
      }
      return value;
    });
  }

  /**
   * Class balancing
   */
  balanceClasses(data: TabularData, targetColumn: string): TabularData {
    const targetIdx = data.columns.indexOf(targetColumn);
    const classCounts = new Map<any, any[][]>();

    // Group by class
    data.data.forEach(row => {
      const classValue = row[targetIdx];
      if (!classCounts.has(classValue)) {
        classCounts.set(classValue, []);
      }
      classCounts.get(classValue)!.push(row);
    });

    // Find max class size
    const maxSize = Math.max(...Array.from(classCounts.values()).map(rows => rows.length));

    // Oversample minority classes
    const balanced: any[][] = [];

    classCounts.forEach((rows, classValue) => {
      balanced.push(...rows);

      // Oversample to reach maxSize
      const toAdd = maxSize - rows.length;
      for (let i = 0; i < toAdd; i++) {
        const sample = rows[Math.floor(Math.random() * rows.length)];
        const augmented = this.augmentRow(sample, data.columns);
        balanced.push(augmented);
      }
    });

    return {
      ...data,
      data: balanced
    };
  }

  /**
   * SMOTE (Synthetic Minority Over-sampling Technique)
   */
  smote(data: TabularData, targetColumn: string, k: number = 5): TabularData {
    // Simplified SMOTE implementation
    return this.balanceClasses(data, targetColumn);
  }

  /**
   * Mixup augmentation
   */
  mixup(data: TabularData, alpha: number = 0.2): TabularData {
    const mixed: any[][] = [];

    for (let i = 0; i < data.data.length; i++) {
      const row1 = data.data[i];
      const row2 = data.data[Math.floor(Math.random() * data.data.length)];

      const lambda = this.sampleBeta(alpha, alpha);

      const mixedRow = row1.map((val, idx) => {
        if (typeof val === 'number' && typeof row2[idx] === 'number') {
          return lambda * val + (1 - lambda) * row2[idx];
        }
        return val;
      });

      mixed.push(mixedRow);
    }

    return {
      ...data,
      data: [...data.data, ...mixed]
    };
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Simplified beta distribution sampling
    return Math.random(); // Placeholder
  }
}

export class ImageAugmentor {
  rotate(degrees: number): Transform {
    return { type: 'rotate', params: { degrees }, probability: 1.0 };
  }

  flip(direction: 'horizontal' | 'vertical' | 'both'): Transform {
    return { type: 'flip', params: { direction }, probability: 1.0 };
  }

  crop(size: [number, number]): Transform {
    return { type: 'crop', params: { size }, probability: 1.0 };
  }

  brightness(factor: number): Transform {
    return { type: 'brightness', params: { factor }, probability: 1.0 };
  }

  contrast(factor: number): Transform {
    return { type: 'contrast', params: { factor }, probability: 1.0 };
  }

  gaussianBlur(sigma: number): Transform {
    return { type: 'blur', params: { sigma }, probability: 1.0 };
  }

  randomErasing(probability: number = 0.5, scale: [number, number] = [0.02, 0.33]): Transform {
    return { type: 'random_erasing', params: { scale }, probability };
  }

  cutout(size: number): Transform {
    return { type: 'cutout', params: { size }, probability: 1.0 };
  }

  colorJitter(brightness: number = 0.2, contrast: number = 0.2, saturation: number = 0.2): Transform {
    return { type: 'color_jitter', params: { brightness, contrast, saturation }, probability: 1.0 };
  }
}

export class TextAugmentor {
  synonymReplacement(n: number = 1): Transform {
    return { type: 'synonym_replacement', params: { n }, probability: 1.0 };
  }

  randomInsertion(n: number = 1): Transform {
    return { type: 'random_insertion', params: { n }, probability: 1.0 };
  }

  randomSwap(n: number = 1): Transform {
    return { type: 'random_swap', params: { n }, probability: 1.0 };
  }

  randomDeletion(p: number = 0.1): Transform {
    return { type: 'random_deletion', params: { p }, probability: 1.0 };
  }

  backTranslation(language: string = 'es'): Transform {
    return { type: 'back_translation', params: { language }, probability: 1.0 };
  }

  paraphrasing(): Transform {
    return { type: 'paraphrasing', params: {}, probability: 1.0 };
  }

  contextualWordEmbeddings(): Transform {
    return { type: 'contextual_embeddings', params: {}, probability: 1.0 };
  }
}

export class AudioAugmentor {
  addNoise(snr: number = 20): Transform {
    return { type: 'add_noise', params: { snr }, probability: 1.0 };
  }

  pitchShift(semitones: number): Transform {
    return { type: 'pitch_shift', params: { semitones }, probability: 1.0 };
  }

  timeStretch(rate: number): Transform {
    return { type: 'time_stretch', params: { rate }, probability: 1.0 };
  }

  volumeChange(gain: number): Transform {
    return { type: 'volume_change', params: { gain }, probability: 1.0 };
  }

  roomSimulation(roomSize: string = 'medium'): Transform {
    return { type: 'room_simulation', params: { roomSize }, probability: 1.0 };
  }
}

export class AugmentationStrategy {
  /**
   * AutoAugment - automatically select augmentation policies
   */
  static autoAugment(dataType: 'image' | 'text' | 'tabular'): AugmentationPipeline {
    const policies: Record<string, Transform[]> = {
      image: [
        { type: 'rotate', params: { degrees: 15 }, probability: 0.5 },
        { type: 'flip', params: { direction: 'horizontal' }, probability: 0.5 },
        { type: 'color_jitter', params: { brightness: 0.2 }, probability: 0.7 }
      ],
      text: [
        { type: 'synonym_replacement', params: { n: 2 }, probability: 0.5 },
        { type: 'back_translation', params: { language: 'es' }, probability: 0.3 }
      ],
      tabular: [
        { type: 'gaussian_noise', params: { std: 0.1 }, probability: 0.5 },
        { type: 'mixup', params: { alpha: 0.2 }, probability: 0.3 }
      ]
    };

    return {
      transforms: policies[dataType] || [],
      randomOrder: true,
      probability: 0.8
    };
  }

  /**
   * RandAugment - uniform sampling of augmentations
   */
  static randAugment(n: number, m: number): AugmentationPipeline {
    // n: number of augmentations to apply
    // m: magnitude of augmentations

    const allTransforms: Transform[] = [
      { type: 'rotate', params: { degrees: m * 3 }, probability: 1.0 },
      { type: 'translate', params: { pixels: m * 2 }, probability: 1.0 },
      { type: 'brightness', params: { factor: 1 + m * 0.1 }, probability: 1.0 },
      { type: 'contrast', params: { factor: 1 + m * 0.1 }, probability: 1.0 }
    ];

    return {
      transforms: allTransforms.slice(0, n),
      randomOrder: true,
      probability: 1.0
    };
  }
}

export default DataAugmentor;
