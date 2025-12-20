/**
 * @intelgraph/generative-models
 * Generative model and synthesis platform
 */

import type { NeuralNetworkArchitecture } from '@intelgraph/deep-learning-core';

// GAN architecture
export interface GANConfig {
  latentDim: number;
  imageShape: [number, number, number];
}

export function createGAN(config: GANConfig): {
  generator: NeuralNetworkArchitecture;
  discriminator: NeuralNetworkArchitecture;
} {
  const generator: NeuralNetworkArchitecture = {
    name: 'Generator',
    type: 'convolutional',
    layers: [
      { type: 'input', name: 'latent', config: { shape: [config.latentDim] } },
      { type: 'dense', name: 'dense1', config: { units: 7 * 7 * 256 } },
      { type: 'reshape', name: 'reshape', config: { targetShape: [7, 7, 256] } },
      { type: 'conv2d_transpose', name: 'deconv1', config: { filters: 128, kernelSize: 5, strides: 2, activation: 'relu' } },
      { type: 'conv2d_transpose', name: 'deconv2', config: { filters: 64, kernelSize: 5, strides: 2, activation: 'relu' } },
      { type: 'conv2d', name: 'output', config: { filters: config.imageShape[2], kernelSize: 5, activation: 'tanh' } },
    ],
    inputShape: [config.latentDim],
    outputShape: config.imageShape,
  };

  const discriminator: NeuralNetworkArchitecture = {
    name: 'Discriminator',
    type: 'convolutional',
    layers: [
      { type: 'input', name: 'image', config: { shape: config.imageShape } },
      { type: 'conv2d', name: 'conv1', config: { filters: 64, kernelSize: 5, strides: 2, activation: 'leaky_relu' } },
      { type: 'conv2d', name: 'conv2', config: { filters: 128, kernelSize: 5, strides: 2, activation: 'leaky_relu' } },
      { type: 'flatten', name: 'flatten', config: {} },
      { type: 'dense', name: 'output', config: { units: 1, activation: 'sigmoid' } },
    ],
    inputShape: config.imageShape,
    outputShape: [1],
  };

  return { generator, discriminator };
}

// VAE architecture
export function createVAE(config: { inputDim: number; latentDim: number }): NeuralNetworkArchitecture {
  return {
    name: 'VAE',
    type: 'hybrid',
    layers: [
      { type: 'input', name: 'input', config: { shape: [config.inputDim] } },
      { type: 'dense', name: 'encoder1', config: { units: 512, activation: 'relu' } },
      { type: 'dense', name: 'encoder2', config: { units: 256, activation: 'relu' } },
      { type: 'vae_sampling', name: 'sampling', config: { latentDim: config.latentDim } },
      { type: 'dense', name: 'decoder1', config: { units: 256, activation: 'relu' } },
      { type: 'dense', name: 'decoder2', config: { units: 512, activation: 'relu' } },
      { type: 'dense', name: 'output', config: { units: config.inputDim, activation: 'sigmoid' } },
    ],
    inputShape: [config.inputDim],
    outputShape: [config.inputDim],
    description: 'Variational Autoencoder',
  };
}

// Diffusion model
export function createDiffusionModel(config: { imageShape: [number, number, number]; timesteps: number }): NeuralNetworkArchitecture {
  return {
    name: 'DiffusionModel',
    type: 'convolutional',
    layers: [
      { type: 'input', name: 'noisy_image', config: { shape: config.imageShape } },
      { type: 'input', name: 'timestep', config: { shape: [1] } },
      { type: 'unet', name: 'unet', config: { channels: [64, 128, 256, 512] } },
      { type: 'output', name: 'noise_pred', config: { shape: config.imageShape } },
    ],
    inputShape: config.imageShape,
    outputShape: config.imageShape,
    description: 'Denoising diffusion probabilistic model',
  };
}
