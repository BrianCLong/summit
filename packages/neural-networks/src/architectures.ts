/**
 * Pre-built neural network architectures
 */

import type { NeuralNetworkArchitecture, Layer } from './index';

/**
 * VGG-16 architecture
 */
export function createVGG16(inputShape: [number, number, number], numClasses: number): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input', config: { shape: inputShape } },

    // Block 1
    { type: 'conv2d', name: 'block1_conv1', config: { filters: 64, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block1_conv2', config: { filters: 64, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'max_pooling2d', name: 'block1_pool', config: { poolSize: 2 } },

    // Block 2
    { type: 'conv2d', name: 'block2_conv1', config: { filters: 128, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block2_conv2', config: { filters: 128, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'max_pooling2d', name: 'block2_pool', config: { poolSize: 2 } },

    // Block 3
    { type: 'conv2d', name: 'block3_conv1', config: { filters: 256, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block3_conv2', config: { filters: 256, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block3_conv3', config: { filters: 256, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'max_pooling2d', name: 'block3_pool', config: { poolSize: 2 } },

    // Block 4
    { type: 'conv2d', name: 'block4_conv1', config: { filters: 512, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block4_conv2', config: { filters: 512, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block4_conv3', config: { filters: 512, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'max_pooling2d', name: 'block4_pool', config: { poolSize: 2 } },

    // Block 5
    { type: 'conv2d', name: 'block5_conv1', config: { filters: 512, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block5_conv2', config: { filters: 512, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'block5_conv3', config: { filters: 512, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'max_pooling2d', name: 'block5_pool', config: { poolSize: 2 } },

    // Classification
    { type: 'flatten', name: 'flatten', config: {} },
    { type: 'dense', name: 'fc1', config: { units: 4096, activation: 'relu' } },
    { type: 'dropout', name: 'dropout1', config: { rate: 0.5 } },
    { type: 'dense', name: 'fc2', config: { units: 4096, activation: 'relu' } },
    { type: 'dropout', name: 'dropout2', config: { rate: 0.5 } },
    { type: 'dense', name: 'output', config: { units: numClasses, activation: 'softmax' } },
  ];

  return {
    name: 'VGG-16',
    type: 'convolutional',
    layers,
    inputShape,
    outputShape: [numClasses],
    parameters: 138357544,
    description: 'VGG-16 architecture for image classification',
  };
}

/**
 * Inception module
 */
export function createInceptionV3(inputShape: [number, number, number], numClasses: number): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input', config: { shape: inputShape } },

    // Stem
    { type: 'conv2d', name: 'stem_conv1', config: { filters: 32, kernelSize: 3, strides: 2, padding: 'valid', activation: 'relu' } },
    { type: 'conv2d', name: 'stem_conv2', config: { filters: 32, kernelSize: 3, padding: 'valid', activation: 'relu' } },
    { type: 'conv2d', name: 'stem_conv3', config: { filters: 64, kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'max_pooling2d', name: 'stem_pool1', config: { poolSize: 3, strides: 2 } },

    // Simplified representation - in production would include full inception modules
    { type: 'conv2d', name: 'conv_out', config: { filters: 2048, kernelSize: 1, activation: 'relu' } },
    { type: 'global_average_pooling2d', name: 'global_pool', config: {} },
    { type: 'dropout', name: 'dropout', config: { rate: 0.4 } },
    { type: 'dense', name: 'output', config: { units: numClasses, activation: 'softmax' } },
  ];

  return {
    name: 'Inception-v3',
    type: 'convolutional',
    layers,
    inputShape,
    outputShape: [numClasses],
    description: 'Inception v3 architecture with factorized convolutions',
  };
}

/**
 * MobileNet architecture for mobile deployment
 */
export function createMobileNetV2(inputShape: [number, number, number], numClasses: number): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input', config: { shape: inputShape } },

    // Initial conv
    { type: 'conv2d', name: 'conv_init', config: { filters: 32, kernelSize: 3, strides: 2, padding: 'same', activation: 'relu' } },

    // Inverted residual blocks (simplified)
    { type: 'depthwise_conv2d', name: 'dw_conv1', config: { kernelSize: 3, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'pw_conv1', config: { filters: 64, kernelSize: 1, activation: 'relu' } },

    { type: 'depthwise_conv2d', name: 'dw_conv2', config: { kernelSize: 3, strides: 2, padding: 'same', activation: 'relu' } },
    { type: 'conv2d', name: 'pw_conv2', config: { filters: 128, kernelSize: 1, activation: 'relu' } },

    // Final layers
    { type: 'conv2d', name: 'conv_out', config: { filters: 1280, kernelSize: 1, activation: 'relu' } },
    { type: 'global_average_pooling2d', name: 'global_pool', config: {} },
    { type: 'dense', name: 'output', config: { units: numClasses, activation: 'softmax' } },
  ];

  return {
    name: 'MobileNet-v2',
    type: 'convolutional',
    layers,
    inputShape,
    outputShape: [numClasses],
    parameters: 3504872,
    description: 'Efficient mobile architecture with inverted residuals',
  };
}

/**
 * EfficientNet architecture
 */
export function createEfficientNetB0(inputShape: [number, number, number], numClasses: number): NeuralNetworkArchitecture {
  const layers: Layer[] = [
    { type: 'input', name: 'input', config: { shape: inputShape } },

    // Stem
    { type: 'conv2d', name: 'stem_conv', config: { filters: 32, kernelSize: 3, strides: 2, padding: 'same', activation: 'swish' } },
    { type: 'batch_normalization', name: 'stem_bn', config: {} },

    // MBConv blocks (simplified)
    { type: 'conv2d', name: 'block1_expand', config: { filters: 96, kernelSize: 1, activation: 'swish' } },
    { type: 'depthwise_conv2d', name: 'block1_dw', config: { kernelSize: 3, padding: 'same', activation: 'swish' } },
    { type: 'conv2d', name: 'block1_project', config: { filters: 24, kernelSize: 1 } },

    // Head
    { type: 'conv2d', name: 'head_conv', config: { filters: 1280, kernelSize: 1, activation: 'swish' } },
    { type: 'batch_normalization', name: 'head_bn', config: {} },
    { type: 'global_average_pooling2d', name: 'global_pool', config: {} },
    { type: 'dropout', name: 'dropout', config: { rate: 0.2 } },
    { type: 'dense', name: 'output', config: { units: numClasses, activation: 'softmax' } },
  ];

  return {
    name: 'EfficientNet-B0',
    type: 'convolutional',
    layers,
    inputShape,
    outputShape: [numClasses],
    parameters: 5288548,
    description: 'Efficient architecture with compound scaling',
  };
}
