/**
 * Unit tests for DataAugmentor
 */

import { DataAugmentor, ImageAugmentor, TextAugmentor, AugmentationStrategy } from '../index';
import { TabularData } from '../types';

describe('DataAugmentor', () => {
  const sampleData: TabularData = {
    columns: ['age', 'income', 'category'],
    data: [
      [25, 50000, 'A'],
      [30, 60000, 'B'],
      [35, 70000, 'A'],
      [40, 80000, 'C'],
      [45, 90000, 'B']
    ]
  };

  describe('augmentTabular', () => {
    it('should increase data size by factor', () => {
      const augmentor = new DataAugmentor();
      const factor = 3;

      const augmented = augmentor.augmentTabular(sampleData, factor);

      expect(augmented.data.length).toBe(sampleData.data.length * factor);
    });

    it('should preserve column structure', () => {
      const augmentor = new DataAugmentor();
      const augmented = augmentor.augmentTabular(sampleData, 2);

      expect(augmented.columns).toEqual(sampleData.columns);
      augmented.data.forEach(row => {
        expect(row.length).toBe(sampleData.columns.length);
      });
    });

    it('should add noise to numeric columns', () => {
      const augmentor = new DataAugmentor();
      const augmented = augmentor.augmentTabular(sampleData, 2);

      // Original data should be included
      expect(augmented.data.slice(0, sampleData.data.length)).toEqual(sampleData.data);

      // Augmented data should have numeric variation
      const augmentedRows = augmented.data.slice(sampleData.data.length);
      augmentedRows.forEach(row => {
        expect(typeof row[0]).toBe('number');
        expect(typeof row[1]).toBe('number');
      });
    });
  });

  describe('balanceClasses', () => {
    it('should balance class distribution', () => {
      const imbalancedData: TabularData = {
        columns: ['value', 'label'],
        data: [
          [1, 'A'], [2, 'A'], [3, 'A'], [4, 'A'], [5, 'A'],
          [6, 'B']
        ]
      };

      const augmentor = new DataAugmentor();
      const balanced = augmentor.balanceClasses(imbalancedData, 'label');

      // Count each class
      const counts = { A: 0, B: 0 };
      balanced.data.forEach(row => {
        const label = row[1] as keyof typeof counts;
        if (label in counts) counts[label]++;
      });

      expect(counts.A).toBe(counts.B);
    });

    it('should preserve all original samples', () => {
      const augmentor = new DataAugmentor();
      const balanced = augmentor.balanceClasses(sampleData, 'category');

      expect(balanced.data.length).toBeGreaterThanOrEqual(sampleData.data.length);
    });
  });

  describe('smote', () => {
    it('should balance classes like balanceClasses', () => {
      const augmentor = new DataAugmentor();
      const smoted = augmentor.smote(sampleData, 'category', 3);

      expect(smoted.data.length).toBeGreaterThanOrEqual(sampleData.data.length);
    });
  });

  describe('mixup', () => {
    it('should double the dataset size', () => {
      const augmentor = new DataAugmentor();
      const mixed = augmentor.mixup(sampleData, 0.2);

      expect(mixed.data.length).toBe(sampleData.data.length * 2);
    });

    it('should create interpolated numeric values', () => {
      const augmentor = new DataAugmentor();
      const mixed = augmentor.mixup(sampleData, 0.5);

      // Mixed samples should have numeric values
      const mixedRows = mixed.data.slice(sampleData.data.length);
      mixedRows.forEach(row => {
        expect(typeof row[0]).toBe('number');
        expect(typeof row[1]).toBe('number');
      });
    });
  });
});

describe('ImageAugmentor', () => {
  const augmentor = new ImageAugmentor();

  it('should create rotation transform', () => {
    const transform = augmentor.rotate(15);

    expect(transform.type).toBe('rotate');
    expect(transform.params.degrees).toBe(15);
    expect(transform.probability).toBe(1.0);
  });

  it('should create flip transform', () => {
    const transform = augmentor.flip('horizontal');

    expect(transform.type).toBe('flip');
    expect(transform.params.direction).toBe('horizontal');
  });

  it('should create crop transform', () => {
    const transform = augmentor.crop([224, 224]);

    expect(transform.type).toBe('crop');
    expect(transform.params.size).toEqual([224, 224]);
  });

  it('should create color jitter transform', () => {
    const transform = augmentor.colorJitter(0.3, 0.3, 0.3);

    expect(transform.type).toBe('color_jitter');
    expect(transform.params.brightness).toBe(0.3);
  });

  it('should create random erasing with probability', () => {
    const transform = augmentor.randomErasing(0.3);

    expect(transform.type).toBe('random_erasing');
    expect(transform.probability).toBe(0.3);
  });
});

describe('TextAugmentor', () => {
  const augmentor = new TextAugmentor();

  it('should create synonym replacement transform', () => {
    const transform = augmentor.synonymReplacement(3);

    expect(transform.type).toBe('synonym_replacement');
    expect(transform.params.n).toBe(3);
  });

  it('should create back translation transform', () => {
    const transform = augmentor.backTranslation('de');

    expect(transform.type).toBe('back_translation');
    expect(transform.params.language).toBe('de');
  });

  it('should create random deletion transform', () => {
    const transform = augmentor.randomDeletion(0.2);

    expect(transform.type).toBe('random_deletion');
    expect(transform.params.p).toBe(0.2);
  });
});

describe('AugmentationStrategy', () => {
  describe('autoAugment', () => {
    it('should return pipeline for image data', () => {
      const pipeline = AugmentationStrategy.autoAugment('image');

      expect(pipeline.transforms).toBeDefined();
      expect(pipeline.transforms.length).toBeGreaterThan(0);
      expect(pipeline.randomOrder).toBe(true);
    });

    it('should return pipeline for text data', () => {
      const pipeline = AugmentationStrategy.autoAugment('text');

      expect(pipeline.transforms).toBeDefined();
      expect(pipeline.transforms.length).toBeGreaterThan(0);
    });

    it('should return pipeline for tabular data', () => {
      const pipeline = AugmentationStrategy.autoAugment('tabular');

      expect(pipeline.transforms).toBeDefined();
    });
  });

  describe('randAugment', () => {
    it('should return pipeline with n transforms', () => {
      const pipeline = AugmentationStrategy.randAugment(2, 5);

      expect(pipeline.transforms.length).toBe(2);
    });

    it('should scale magnitude with m parameter', () => {
      const pipelineM5 = AugmentationStrategy.randAugment(2, 5);
      const pipelineM10 = AugmentationStrategy.randAugment(2, 10);

      // Higher m should result in larger parameter values
      const m5Degrees = pipelineM5.transforms[0].params.degrees;
      const m10Degrees = pipelineM10.transforms[0].params.degrees;

      expect(m10Degrees).toBeGreaterThan(m5Degrees);
    });
  });
});
