# Deep Learning Architectures

This document provides detailed information about the neural network architectures available in Summit's deep learning platform.

## Table of Contents

- [Transformer Architectures](#transformer-architectures)
- [Convolutional Networks](#convolutional-networks)
- [Recurrent Networks](#recurrent-networks)
- [Generative Models](#generative-models)
- [Custom Architectures](#custom-architectures)

## Transformer Architectures

### BERT (Bidirectional Encoder Representations from Transformers)

**Use Cases:** Text classification, named entity recognition, question answering

**Architecture:**
- **Layers:** 12 (base) or 24 (large)
- **Hidden Size:** 768 (base) or 1024 (large)
- **Attention Heads:** 12 (base) or 16 (large)
- **Parameters:** 110M (base) or 340M (large)

**Configuration:**
```typescript
import { createBERT } from '@intelgraph/transformers';

const bert = createBERT({
  numLayers: 12,
  dModel: 768,
  numHeads: 12,
  dff: 3072,
  vocabSize: 30522,
  maxLength: 512,
  dropout: 0.1,
});
```

**Key Features:**
- Masked language modeling pre-training
- Next sentence prediction
- Bidirectional context
- Fine-tunable for downstream tasks

### GPT (Generative Pre-trained Transformer)

**Use Cases:** Text generation, completion, dialogue systems

**Architecture:**
- **Layers:** 12-96 (depending on variant)
- **Hidden Size:** 768-12288
- **Attention Heads:** 12-96
- **Parameters:** 117M-175B

**Configuration:**
```typescript
import { createGPT } from '@intelgraph/transformers';

const gpt = createGPT({
  numLayers: 12,
  dModel: 768,
  numHeads: 12,
  dff: 3072,
  vocabSize: 50257,
  maxLength: 1024,
});
```

**Key Features:**
- Autoregressive generation
- Causal (unidirectional) attention
- Zero-shot and few-shot learning
- Prompt engineering capabilities

### T5 (Text-to-Text Transfer Transformer)

**Use Cases:** Translation, summarization, question answering

**Architecture:**
- **Encoder Layers:** 6-24
- **Decoder Layers:** 6-24
- **Hidden Size:** 512-1024
- **Parameters:** 60M-11B

**Configuration:**
```typescript
import { createT5 } from '@intelgraph/transformers';

const t5 = createT5({
  numLayers: 6,
  dModel: 512,
  numHeads: 8,
  dff: 2048,
  vocabSize: 32128,
  maxLength: 512,
  numDecoderLayers: 6,
});
```

**Key Features:**
- Unified text-to-text format
- Encoder-decoder architecture
- Relative position embeddings
- Multi-task training

### Efficient Transformers

#### Linformer
- **Complexity:** O(n) instead of O(n²)
- **Method:** Low-rank projection of attention
- **Use Case:** Long sequence processing

#### Reformer
- **Complexity:** O(n log n)
- **Method:** Locality-sensitive hashing
- **Use Case:** Very long sequences (64K+ tokens)

## Convolutional Networks

### ResNet (Residual Network)

**Use Cases:** Image classification, feature extraction

**Variants:** ResNet-18, 34, 50, 101, 152

**Architecture (ResNet-50):**
- **Layers:** 50 convolutional layers
- **Parameters:** 25.6M
- **Input:** 224x224x3

**Configuration:**
```typescript
import { createResNet } from '@intelgraph/neural-networks';

const resnet = createResNet({
  inputShape: [224, 224, 3],
  blocks: [
    { filters: 64, kernelSize: 3, strides: 1 },
    { filters: 128, kernelSize: 3, strides: 2 },
    { filters: 256, kernelSize: 3, strides: 2 },
    { filters: 512, kernelSize: 3, strides: 2 },
  ],
  numClasses: 1000,
});
```

**Key Features:**
- Skip connections
- Batch normalization
- Deep architecture (50-152 layers)
- Transfer learning ready

### VGG-16/19

**Use Cases:** Image classification, style transfer

**Architecture:**
- **Layers:** 16 or 19 layers
- **Parameters:** 138M (VGG-16)
- **Filter Size:** 3x3 throughout

**Key Features:**
- Simple architecture
- Small filters
- Deep stacks

### U-Net

**Use Cases:** Image segmentation, medical imaging

**Architecture:**
- **Encoder:** Contracting path
- **Decoder:** Expanding path
- **Skip Connections:** Concatenation

**Configuration:**
```typescript
import { createUNet } from '@intelgraph/neural-networks';

const unet = createUNet({
  inputShape: [256, 256, 1],
  numClasses: 2,
  depth: 4,
  filters: 64,
});
```

**Key Features:**
- Symmetric encoder-decoder
- Skip connections
- Small dataset training
- Precise localization

### YOLO (You Only Look Once)

**Use Cases:** Real-time object detection

**Variants:** YOLOv3, YOLOv4, YOLOv5, YOLOv8

**Architecture:**
- **Backbone:** CSPDarknet
- **Neck:** PANet
- **Head:** YOLO detection head

**Configuration:**
```typescript
import { createYOLOv5 } from '@intelgraph/cnn-framework';

const yolo = createYOLOv5([640, 640, 3], 80); // 80 COCO classes
```

**Key Features:**
- Single-stage detector
- Real-time performance (60+ FPS)
- Multi-scale predictions
- Anchor-based detection

### Faster R-CNN

**Use Cases:** Accurate object detection

**Architecture:**
- **Backbone:** ResNet-50/101
- **RPN:** Region Proposal Network
- **RoI Pooling:** Feature extraction

**Key Features:**
- Two-stage detector
- High accuracy
- Region proposals
- Class-specific bounding boxes

## Recurrent Networks

### LSTM (Long Short-Term Memory)

**Use Cases:** Time series, sequence modeling, NLP

**Architecture:**
- **Gates:** Input, forget, output
- **Memory:** Cell state
- **Units:** 128-512 typical

**Configuration:**
```typescript
import { createLSTM } from '@intelgraph/rnn-platform';

const lstm = createLSTM({
  inputDim: 100,
  units: 256,
  numLayers: 2,
  dropout: 0.3,
  bidirectional: true,
});
```

**Key Features:**
- Long-term dependencies
- Gradient flow control
- Bidirectional variants
- Stacked layers

### GRU (Gated Recurrent Unit)

**Use Cases:** Similar to LSTM, faster training

**Architecture:**
- **Gates:** Update, reset
- **Parameters:** 25% fewer than LSTM

**Key Features:**
- Simplified architecture
- Faster training
- Similar performance to LSTM

### Seq2Seq with Attention

**Use Cases:** Machine translation, summarization

**Architecture:**
- **Encoder:** LSTM/GRU
- **Decoder:** LSTM/GRU with attention
- **Attention:** Bahdanau or Luong

**Configuration:**
```typescript
import { createSeq2Seq } from '@intelgraph/rnn-platform';

const seq2seq = createSeq2Seq({
  encoderInputDim: 10000,
  decoderInputDim: 8000,
  latentDim: 512,
});
```

## Generative Models

### GAN (Generative Adversarial Network)

**Use Cases:** Image generation, data augmentation

**Architecture:**
- **Generator:** Deconvolutional network
- **Discriminator:** Convolutional network
- **Training:** Adversarial

**Configuration:**
```typescript
import { createGAN } from '@intelgraph/generative-models';

const { generator, discriminator } = createGAN({
  latentDim: 100,
  imageShape: [64, 64, 3],
});
```

**Variants:**
- **DCGAN:** Deep Convolutional GAN
- **StyleGAN:** Style-based generator
- **CycleGAN:** Unpaired image translation
- **Pix2Pix:** Paired image translation

### VAE (Variational Autoencoder)

**Use Cases:** Dimensionality reduction, anomaly detection

**Architecture:**
- **Encoder:** Neural network → latent distribution
- **Decoder:** Latent vector → reconstruction
- **Loss:** Reconstruction + KL divergence

**Configuration:**
```typescript
import { createVAE } from '@intelgraph/generative-models';

const vae = createVAE({
  inputDim: 784,
  latentDim: 32,
});
```

### Diffusion Models

**Use Cases:** High-quality image generation

**Architecture:**
- **Forward Process:** Add noise gradually
- **Reverse Process:** Denoise with U-Net
- **Training:** Noise prediction

**Configuration:**
```typescript
import { createDiffusionModel } from '@intelgraph/generative-models';

const diffusion = createDiffusionModel({
  imageShape: [256, 256, 3],
  timesteps: 1000,
});
```

## Custom Architectures

### Architecture Builder

Create custom architectures by composing layers:

```typescript
import type { NeuralNetworkArchitecture } from '@intelgraph/neural-networks';

const customArch: NeuralNetworkArchitecture = {
  name: 'CustomNet',
  type: 'hybrid',
  layers: [
    { type: 'input', name: 'input', config: { shape: [224, 224, 3] } },
    { type: 'conv2d', name: 'conv1', config: { filters: 32, kernelSize: 3, activation: 'relu' } },
    { type: 'max_pooling2d', name: 'pool1', config: { poolSize: 2 } },
    { type: 'flatten', name: 'flatten', config: {} },
    { type: 'dense', name: 'fc1', config: { units: 128, activation: 'relu' } },
    { type: 'dropout', name: 'dropout', config: { rate: 0.5 } },
    { type: 'dense', name: 'output', config: { units: 10, activation: 'softmax' } },
  ],
  inputShape: [224, 224, 3],
  outputShape: [10],
};
```

### Neural Architecture Search (NAS)

Automatically discover optimal architectures:

```typescript
import { NeuralArchitectureSearch } from '@intelgraph/neural-networks';

const nas = new NeuralArchitectureSearch({
  searchSpace: {
    minLayers: 5,
    maxLayers: 20,
    allowedLayerTypes: ['conv2d', 'dense', 'lstm', 'attention'],
    hiddenUnitsRange: [64, 1024],
    activations: ['relu', 'gelu', 'swish'],
  },
  strategy: 'evolutionary',
  budget: {
    maxTrials: 100,
    maxDuration: 3600000,
  },
  objective: {
    metric: 'val_accuracy',
    direction: 'maximize',
  },
});

const { architecture, score } = await nas.search(evaluationFn);
```

## Architecture Selection Guide

### By Task Type

| Task | Recommended Architecture |
|------|-------------------------|
| Image Classification | ResNet, EfficientNet, ViT |
| Object Detection | YOLO, Faster R-CNN, DETR |
| Semantic Segmentation | U-Net, DeepLab, Mask R-CNN |
| Text Classification | BERT, RoBERTa, DistilBERT |
| Text Generation | GPT, T5, BART |
| Machine Translation | T5, MarianMT, mBART |
| Time Series | LSTM, Temporal Conv Nets |
| Anomaly Detection | Autoencoder, VAE, Isolation Forest |

### By Resource Constraints

| Constraint | Recommended Approach |
|-----------|---------------------|
| Limited Data | Transfer learning, data augmentation |
| Limited Compute | MobileNet, DistilBERT, pruning |
| Real-time Inference | YOLO, MobileNet, quantization |
| High Accuracy | Ensemble, large models, longer training |
| Interpretability | Attention models, SHAP, LIME |

## Performance Benchmarks

### ImageNet Classification (Top-1 Accuracy)

| Model | Accuracy | Parameters | Inference Time (GPU) |
|-------|----------|-----------|---------------------|
| ResNet-50 | 76.0% | 25.6M | 5ms |
| EfficientNet-B0 | 77.3% | 5.3M | 4ms |
| ViT-Base | 81.3% | 86M | 8ms |

### COCO Object Detection (mAP)

| Model | mAP | FPS (GPU) |
|-------|-----|----------|
| YOLOv5s | 37.4 | 140 |
| YOLOv5m | 45.4 | 99 |
| Faster R-CNN | 42.0 | 25 |

## References

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762) - Transformer paper
- [BERT: Pre-training of Deep Bidirectional Transformers](https://arxiv.org/abs/1810.04805)
- [Deep Residual Learning for Image Recognition](https://arxiv.org/abs/1512.03385)
- [U-Net: Convolutional Networks for Biomedical Image Segmentation](https://arxiv.org/abs/1505.04597)
- [Generative Adversarial Networks](https://arxiv.org/abs/1406.2661)
