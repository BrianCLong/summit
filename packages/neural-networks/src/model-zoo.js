"use strict";
/**
 * Model zoo with pre-trained models and transfer learning utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelZoo = exports.TransferLearning = exports.ModelZoo = void 0;
/**
 * Model zoo registry
 */
class ModelZoo {
    models = new Map();
    constructor() {
        this.initializeModels();
    }
    initializeModels() {
        // ImageNet classification models
        this.registerModel({
            id: 'resnet50-imagenet',
            name: 'ResNet-50 (ImageNet)',
            architecture: { name: 'ResNet-50', type: 'convolutional', layers: [], inputShape: [224, 224, 3], outputShape: [1000] },
            dataset: 'ImageNet',
            taskType: 'classification',
            metrics: { top1_accuracy: 0.759, top5_accuracy: 0.929 },
            license: 'Apache-2.0',
            citation: 'He et al., Deep Residual Learning for Image Recognition, 2015',
        });
        this.registerModel({
            id: 'vgg16-imagenet',
            name: 'VGG-16 (ImageNet)',
            architecture: { name: 'VGG-16', type: 'convolutional', layers: [], inputShape: [224, 224, 3], outputShape: [1000] },
            dataset: 'ImageNet',
            taskType: 'classification',
            metrics: { top1_accuracy: 0.715, top5_accuracy: 0.901 },
            license: 'MIT',
            citation: 'Simonyan & Zisserman, Very Deep Convolutional Networks, 2014',
        });
        this.registerModel({
            id: 'efficientnet-b0-imagenet',
            name: 'EfficientNet-B0 (ImageNet)',
            architecture: { name: 'EfficientNet-B0', type: 'convolutional', layers: [], inputShape: [224, 224, 3], outputShape: [1000] },
            dataset: 'ImageNet',
            taskType: 'classification',
            metrics: { top1_accuracy: 0.773, top5_accuracy: 0.936 },
            license: 'Apache-2.0',
            citation: 'Tan & Le, EfficientNet: Rethinking Model Scaling, 2019',
        });
        // Object detection models
        this.registerModel({
            id: 'yolov5-coco',
            name: 'YOLOv5 (COCO)',
            architecture: { name: 'YOLOv5', type: 'convolutional', layers: [], inputShape: [640, 640, 3], outputShape: [80] },
            dataset: 'COCO',
            taskType: 'detection',
            metrics: { map: 0.456, map50: 0.632 },
            license: 'GPL-3.0',
            citation: 'Ultralytics YOLOv5, 2020',
        });
        // Segmentation models
        this.registerModel({
            id: 'unet-medical',
            name: 'U-Net (Medical Imaging)',
            architecture: { name: 'U-Net', type: 'convolutional', layers: [], inputShape: [256, 256, 1], outputShape: [256, 256, 2] },
            dataset: 'Medical Segmentation',
            taskType: 'segmentation',
            metrics: { dice_coefficient: 0.923, iou: 0.857 },
            license: 'MIT',
            citation: 'Ronneberger et al., U-Net: Convolutional Networks for Biomedical Image Segmentation, 2015',
        });
        // Embedding models
        this.registerModel({
            id: 'facenet',
            name: 'FaceNet',
            architecture: { name: 'Inception', type: 'convolutional', layers: [], inputShape: [160, 160, 3], outputShape: [128] },
            dataset: 'Face Recognition',
            taskType: 'embedding',
            metrics: { accuracy: 0.9965 },
            license: 'Apache-2.0',
            citation: 'Schroff et al., FaceNet: A Unified Embedding for Face Recognition, 2015',
        });
    }
    /**
     * Register a new model
     */
    registerModel(model) {
        this.models.set(model.id, model);
    }
    /**
     * Get model by ID
     */
    getModel(id) {
        return this.models.get(id);
    }
    /**
     * List all models
     */
    listModels(filter) {
        let models = Array.from(this.models.values());
        if (filter?.taskType) {
            models = models.filter((m) => m.taskType === filter.taskType);
        }
        if (filter?.dataset) {
            models = models.filter((m) => m.dataset === filter.dataset);
        }
        return models;
    }
    /**
     * Search models by name or description
     */
    searchModels(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.models.values()).filter((m) => m.name.toLowerCase().includes(lowerQuery) ||
            m.architecture.name.toLowerCase().includes(lowerQuery) ||
            m.dataset.toLowerCase().includes(lowerQuery));
    }
}
exports.ModelZoo = ModelZoo;
/**
 * Transfer learning utilities
 */
class TransferLearning {
    /**
     * Freeze layers for transfer learning
     */
    static freezeLayers(architecture, numLayersToFreeze) {
        const frozenLayers = architecture.layers.map((layer, index) => ({
            ...layer,
            config: {
                ...layer.config,
                trainable: index >= architecture.layers.length - numLayersToFreeze,
            },
        }));
        return {
            ...architecture,
            layers: frozenLayers,
        };
    }
    /**
     * Replace classification head
     */
    static replaceHead(architecture, numClasses) {
        const layers = architecture.layers.slice(0, -1);
        layers.push({
            type: 'dense',
            name: 'new_output',
            config: { units: numClasses, activation: 'softmax' },
        });
        return {
            ...architecture,
            layers,
            outputShape: [numClasses],
        };
    }
    /**
     * Fine-tune from checkpoint
     */
    static createFineTuneConfig(baseModelId, numClasses, learningRate, frozenLayers) {
        return {
            baseModelId,
            numClasses,
            learningRate,
            frozenLayers,
        };
    }
}
exports.TransferLearning = TransferLearning;
// Global model zoo instance
exports.modelZoo = new ModelZoo();
