"use strict";
/**
 * @intelgraph/data-augmentation
 * Comprehensive data augmentation pipelines
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AugmentationStrategy = exports.AudioAugmentor = exports.TextAugmentor = exports.ImageAugmentor = exports.DataAugmentor = void 0;
class DataAugmentor {
    /**
     * Augment tabular data
     */
    augmentTabular(data, factor) {
        const augmented = [...data.data];
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
    augmentRow(row, columns) {
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
    balanceClasses(data, targetColumn) {
        const targetIdx = data.columns.indexOf(targetColumn);
        const classCounts = new Map();
        // Group by class
        data.data.forEach(row => {
            const classValue = row[targetIdx];
            if (!classCounts.has(classValue)) {
                classCounts.set(classValue, []);
            }
            classCounts.get(classValue).push(row);
        });
        // Find max class size
        const maxSize = Math.max(...Array.from(classCounts.values()).map(rows => rows.length));
        // Oversample minority classes
        const balanced = [];
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
    smote(data, targetColumn, k = 5) {
        // Simplified SMOTE implementation
        return this.balanceClasses(data, targetColumn);
    }
    /**
     * Mixup augmentation
     */
    mixup(data, alpha = 0.2) {
        const mixed = [];
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
    sampleBeta(alpha, beta) {
        // Simplified beta distribution sampling
        return Math.random(); // Placeholder
    }
}
exports.DataAugmentor = DataAugmentor;
class ImageAugmentor {
    rotate(degrees) {
        return { type: 'rotate', params: { degrees }, probability: 1.0 };
    }
    flip(direction) {
        return { type: 'flip', params: { direction }, probability: 1.0 };
    }
    crop(size) {
        return { type: 'crop', params: { size }, probability: 1.0 };
    }
    brightness(factor) {
        return { type: 'brightness', params: { factor }, probability: 1.0 };
    }
    contrast(factor) {
        return { type: 'contrast', params: { factor }, probability: 1.0 };
    }
    gaussianBlur(sigma) {
        return { type: 'blur', params: { sigma }, probability: 1.0 };
    }
    randomErasing(probability = 0.5, scale = [0.02, 0.33]) {
        return { type: 'random_erasing', params: { scale }, probability };
    }
    cutout(size) {
        return { type: 'cutout', params: { size }, probability: 1.0 };
    }
    colorJitter(brightness = 0.2, contrast = 0.2, saturation = 0.2) {
        return { type: 'color_jitter', params: { brightness, contrast, saturation }, probability: 1.0 };
    }
}
exports.ImageAugmentor = ImageAugmentor;
class TextAugmentor {
    synonymReplacement(n = 1) {
        return { type: 'synonym_replacement', params: { n }, probability: 1.0 };
    }
    randomInsertion(n = 1) {
        return { type: 'random_insertion', params: { n }, probability: 1.0 };
    }
    randomSwap(n = 1) {
        return { type: 'random_swap', params: { n }, probability: 1.0 };
    }
    randomDeletion(p = 0.1) {
        return { type: 'random_deletion', params: { p }, probability: 1.0 };
    }
    backTranslation(language = 'es') {
        return { type: 'back_translation', params: { language }, probability: 1.0 };
    }
    paraphrasing() {
        return { type: 'paraphrasing', params: {}, probability: 1.0 };
    }
    contextualWordEmbeddings() {
        return { type: 'contextual_embeddings', params: {}, probability: 1.0 };
    }
}
exports.TextAugmentor = TextAugmentor;
class AudioAugmentor {
    addNoise(snr = 20) {
        return { type: 'add_noise', params: { snr }, probability: 1.0 };
    }
    pitchShift(semitones) {
        return { type: 'pitch_shift', params: { semitones }, probability: 1.0 };
    }
    timeStretch(rate) {
        return { type: 'time_stretch', params: { rate }, probability: 1.0 };
    }
    volumeChange(gain) {
        return { type: 'volume_change', params: { gain }, probability: 1.0 };
    }
    roomSimulation(roomSize = 'medium') {
        return { type: 'room_simulation', params: { roomSize }, probability: 1.0 };
    }
}
exports.AudioAugmentor = AudioAugmentor;
class AugmentationStrategy {
    /**
     * AutoAugment - automatically select augmentation policies
     */
    static autoAugment(dataType) {
        const policies = {
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
    static randAugment(n, m) {
        // n: number of augmentations to apply
        // m: magnitude of augmentations
        const allTransforms = [
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
exports.AugmentationStrategy = AugmentationStrategy;
exports.default = DataAugmentor;
