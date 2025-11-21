/**
 * @intelgraph/cnn-framework
 * Convolutional Neural Network framework with object detection and segmentation
 */

import type { NeuralNetworkArchitecture, Layer } from '@intelgraph/neural-networks';

// YOLO object detection
export function createYOLOv5(inputShape: [number, number, number], numClasses: number): NeuralNetworkArchitecture {
  return {
    name: 'YOLOv5',
    type: 'convolutional',
    layers: [
      { type: 'input', name: 'input', config: { shape: inputShape } },
      { type: 'conv2d', name: 'backbone_conv', config: { filters: 64, kernelSize: 3, activation: 'silu' } },
      { type: 'yolo_neck', name: 'neck', config: {} },
      { type: 'yolo_head', name: 'head', config: { numClasses } },
    ],
    inputShape,
    outputShape: [numClasses + 5],
    description: 'YOLOv5 for real-time object detection',
  };
}

// Faster R-CNN
export function createFasterRCNN(inputShape: [number, number, number], numClasses: number): NeuralNetworkArchitecture {
  return {
    name: 'Faster-RCNN',
    type: 'convolutional',
    layers: [
      { type: 'input', name: 'input', config: { shape: inputShape } },
      { type: 'resnet_backbone', name: 'backbone', config: { depth: 50 } },
      { type: 'rpn', name: 'rpn', config: {} },
      { type: 'roi_pooling', name: 'roi_pool', config: { poolSize: 7 } },
      { type: 'dense', name: 'classifier', config: { units: numClasses, activation: 'softmax' } },
    ],
    inputShape,
    outputShape: [numClasses],
    description: 'Faster R-CNN for accurate object detection',
  };
}

// DeepLab semantic segmentation
export function createDeepLabV3Plus(inputShape: [number, number, number], numClasses: number): NeuralNetworkArchitecture {
  return {
    name: 'DeepLabV3+',
    type: 'convolutional',
    layers: [
      { type: 'input', name: 'input', config: { shape: inputShape } },
      { type: 'resnet_backbone', name: 'backbone', config: { depth: 101, outputStride: 16 } },
      { type: 'aspp', name: 'aspp', config: { rates: [6, 12, 18] } },
      { type: 'decoder', name: 'decoder', config: {} },
      { type: 'conv2d', name: 'output', config: { filters: numClasses, kernelSize: 1, activation: 'softmax' } },
    ],
    inputShape,
    outputShape: [inputShape[0], inputShape[1], numClasses],
    description: 'DeepLabV3+ for semantic segmentation',
  };
}

// Data augmentation strategies
export interface AugmentationConfig {
  horizontalFlip: boolean;
  verticalFlip: boolean;
  rotation: { enabled: boolean; maxDegrees: number };
  zoom: { enabled: boolean; range: [number, number] };
  brightness: { enabled: boolean; range: [number, number] };
  mixup: boolean;
  cutout: boolean;
}

export const defaultAugmentationConfig: AugmentationConfig = {
  horizontalFlip: true,
  verticalFlip: false,
  rotation: { enabled: true, maxDegrees: 15 },
  zoom: { enabled: true, range: [0.8, 1.2] },
  brightness: { enabled: true, range: [0.8, 1.2] },
  mixup: false,
  cutout: false,
};
