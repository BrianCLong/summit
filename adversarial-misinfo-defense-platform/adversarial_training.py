"""
Adversarial Training Engine for Adversarial Misinformation Defense Platform

This module implements adversarial training using GANs and LLMs to extend
detection libraries and continuously improve detection capabilities.
"""
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import random
import json
import logging
from datetime import datetime
from dataclasses import dataclass, asdict
import hashlib


class GenerativeAdversarialNetwork(nn.Module):
    """
    Simple GAN for generating adversarial samples
    """
    
    def __init__(self, input_dim: int = 100, output_dim: int = 784):
        """
        Initialize the GAN
        
        Args:
            input_dim: Dimension of input noise vector
            output_dim: Dimension of generated output
        """
        super(GenerativeAdversarialNetwork, self).__init__()
        
        self.input_dim = input_dim
        self.output_dim = output_dim
        
        # Generator network
        self.generator = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Linear(512, 1024),
            nn.BatchNorm1d(1024),
            nn.ReLU(),
            nn.Linear(1024, output_dim),
            nn.Tanh()
        )
        
        # Discriminator network
        self.discriminator = nn.Sequential(
            nn.Linear(output_dim, 1024),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(1024, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x: torch.Tensor, mode: str = 'generator') -> torch.Tensor:
        """
        Forward pass through the GAN
        
        Args:
            x: Input tensor
            mode: Either 'generator' or 'discriminator'
            
        Returns:
            Output tensor from specified network
        """
        if mode == 'generator':
            return self.generator(x)
        elif mode == 'discriminator':
            return self.discriminator(x)
        else:
            raise ValueError("Mode must be 'generator' or 'discriminator'")


class LargeLanguageModel:
    """
    Simplified LLM for text generation and pattern extension
    """
    
    def __init__(self, model_name: str = "gpt-3.5-turbo"):
        """
        Initialize the LLM
        
        Args:
            model_name: Name of the LLM to use
        """
        self.model_name = model_name
        self.pattern_templates = [
            "Detect patterns related to {concept}",
            "Identify variations of {concept} in text",
            "Find subtle instances of {concept} manipulation",
            "Recognize {concept} in different contexts",
            "Spot {concept} with modified presentation",
            "Identify {concept} disguised as legitimate content"
        ]
    
    def generate_patterns(self, concept: str, num_patterns: int = 5) -> List[str]:
        """
        Generate detection patterns for a given concept
        
        Args:
            concept: Concept to generate patterns for
            num_patterns: Number of patterns to generate
            
        Returns:
            List of generated patterns
        """
        patterns = []
        
        for _ in range(num_patterns):
            template = random.choice(self.pattern_templates)
            pattern = template.format(concept=concept)
            patterns.append(pattern)
        
        return patterns
    
    def extend_detection_library(self, current_patterns: List[str], 
                               target_concepts: List[str]) -> List[str]:
        """
        Extend detection library with new patterns
        
        Args:
            current_patterns: Existing patterns
            target_concepts: Concepts to generate patterns for
            
        Returns:
            Extended list of patterns
        """
        extended_patterns = current_patterns.copy()
        
        for concept in target_concepts:
            new_patterns = self.generate_patterns(concept, num_patterns=3)
            extended_patterns.extend(new_patterns)
        
        # Remove duplicates
        extended_patterns = list(set(extended_patterns))
        
        return extended_patterns


class AdversarialTrainingEngine:
    """
    Engine for adversarial training using GANs and LLMs
    """
    
    def __init__(self):
        """
        Initialize the adversarial training engine
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Initialize GANs for different modalities
        self.gans = {
            'text': GenerativeAdversarialNetwork(input_dim=100, output_dim=1024),
            'image': GenerativeAdversarialNetwork(input_dim=100, output_dim=784),
            'audio': GenerativeAdversarialNetwork(input_dim=100, output_dim=512),
            'video': GenerativeAdversarialNetwork(input_dim=100, output_dim=2048)
        }
        
        # Initialize LLM for pattern generation
        self.llm = LargeLanguageModel()
        
        # Training history
        self.training_history: List[Dict[str, Any]] = []
        
        # Detection libraries
        self.detection_libraries: Dict[str, List[str]] = {
            'text': [
                "clickbait headlines",
                "emotional manipulation language",
                "false authority claims",
                "conspiracy theory terminology",
                "manipulative urgency language"
            ],
            'image': [
                "face swap artifacts",
                "inconsistent lighting",
                "edge discontinuities",
                "compression artifacts",
                "facial boundary inconsistencies"
            ],
            'audio': [
                "spectral artifacts",
                "temporal inconsistencies",
                "pitch manipulation",
                "frequency masking",
                "compression artifacts"
            ],
            'video': [
                "temporal inconsistencies",
                "frame blending artifacts",
                "face boundary artifacts",
                "audio-visual sync issues",
                "motion inconsistencies"
            ]
        }
    
    def train_gan(self, modality: str, epochs: int = 100, 
                 batch_size: int = 32) -> Dict[str, Any]:
        """
        Train GAN for a specific modality
        
        Args:
            modality: Modality to train GAN for
            epochs: Number of training epochs
            batch_size: Batch size for training
            
        Returns:
            Training results
        """
        self.logger.info(f"Training GAN for {modality} modality")
        
        if modality not in self.gans:
            raise ValueError(f"Unknown modality: {modality}")
        
        gan = self.gans[modality]
        
        # Initialize optimizers
        g_optimizer = optim.Adam(gan.generator.parameters(), lr=0.0002, betas=(0.5, 0.999))
        d_optimizer = optim.Adam(gan.discriminator.parameters(), lr=0.0002, betas=(0.5, 0.999))
        
        # Loss function
        criterion = nn.BCELoss()
        
        # Training history
        g_losses = []
        d_losses = []
        
        # Training loop
        for epoch in range(epochs):
            # Generate random noise
            noise = torch.randn(batch_size, gan.input_dim)
            
            # Train Generator
            g_optimizer.zero_grad()
            
            # Generate fake data
            fake_data = gan(noise, mode='generator')
            
            # Try to fool discriminator
            g_loss = criterion(gan(fake_data, mode='discriminator'), 
                              torch.ones(batch_size, 1))
            g_loss.backward()
            g_optimizer.step()
            
            # Train Discriminator
            d_optimizer.zero_grad()
            
            # Real data (we'll use random data for this example)
            real_data = torch.randn(batch_size, gan.output_dim)
            real_labels = torch.ones(batch_size, 1)
            
            # Fake data from generator
            fake_data = gan(noise, mode='generator')
            fake_labels = torch.zeros(batch_size, 1)
            
            # Train on real data
            real_loss = criterion(gan(real_data, mode='discriminator'), real_labels)
            
            # Train on fake data
            fake_loss = criterion(gan(fake_data.detach(), mode='discriminator'), fake_labels)
            
            # Total discriminator loss
            d_loss = real_loss + fake_loss
            d_loss.backward()
            d_optimizer.step()
            
            # Record losses
            g_losses.append(g_loss.item())
            d_losses.append(d_loss.item())
            
            # Log progress
            if epoch % 10 == 0:
                self.logger.info(f"Epoch {epoch}/{epochs} - G Loss: {g_loss.item():.4f}, D Loss: {d_loss.item():.4f}")
        
        # Training results
        results = {
            'modality': modality,
            'epochs': epochs,
            'batch_size': batch_size,
            'final_g_loss': g_losses[-1] if g_losses else 0.0,
            'final_d_loss': d_losses[-1] if d_losses else 0.0,
            'average_g_loss': np.mean(g_losses) if g_losses else 0.0,
            'average_d_loss': np.mean(d_losses) if d_losses else 0.0,
            'training_completed': datetime.now().isoformat()
        }
        
        # Record in training history
        self.training_history.append(results)
        
        self.logger.info(f"Completed GAN training for {modality} modality")
        return results
    
    def generate_adversarial_samples(self, modality: str, 
                                   num_samples: int = 100) -> List[torch.Tensor]:
        """
        Generate adversarial samples using trained GAN
        
        Args:
            modality: Modality to generate samples for
            num_samples: Number of samples to generate
            
        Returns:
            List of generated samples
        """
        self.logger.info(f"Generating {num_samples} adversarial samples for {modality} modality")
        
        if modality not in self.gans:
            raise ValueError(f"Unknown modality: {modality}")
        
        gan = self.gans[modality]
        gan.eval()  # Set to evaluation mode
        
        samples = []
        with torch.no_grad():
            for _ in range(num_samples):
                # Generate random noise
                noise = torch.randn(1, gan.input_dim)
                
                # Generate sample
                sample = gan(noise, mode='generator')
                samples.append(sample)
        
        self.logger.info(f"Generated {len(samples)} adversarial samples for {modality} modality")
        return samples
    
    def extend_detection_libraries_with_llm(self, target_concepts: List[str] = None) -> Dict[str, List[str]]:
        """
        Extend detection libraries using LLM
        
        Args:
            target_concepts: Concepts to generate patterns for (if None, uses existing concepts)
            
        Returns:
            Extended detection libraries
        """
        self.logger.info("Extending detection libraries with LLM")
        
        if target_concepts is None:
            # Use existing concepts from detection libraries
            target_concepts = []
            for modality_patterns in self.detection_libraries.values():
                target_concepts.extend(modality_patterns)
        
        # Extend each modality's detection library
        extended_libraries = {}
        
        for modality, patterns in self.detection_libraries.items():
            self.logger.info(f"Extending {modality} detection library")
            
            # Use LLM to generate additional patterns
            extended_patterns = self.llm.extend_detection_library(patterns, target_concepts)
            extended_libraries[modality] = extended_patterns
            
            self.logger.info(f"Extended {modality} library from {len(patterns)} to {len(extended_patterns)} patterns")
        
        # Update internal libraries
        self.detection_libraries.update(extended_libraries)
        
        self.logger.info("Completed detection library extension")
        return extended_libraries
    
    def run_adversarial_training_cycle(self, modalities: List[str] = None, 
                                     epochs_per_gan: int = 100,
                                     samples_per_modality: int = 100,
                                     target_concepts: List[str] = None) -> Dict[str, Any]:
        """
        Run a complete adversarial training cycle
        
        Args:
            modalities: Modalities to train (if None, trains all)
            epochs_per_gan: Epochs per GAN training
            samples_per_modality: Samples to generate per modality
            target_concepts: Concepts for LLM pattern generation
            
        Returns:
            Training cycle results
        """
        self.logger.info("Starting adversarial training cycle")
        
        if modalities is None:
            modalities = list(self.gans.keys())
        
        training_cycle_start = datetime.now()
        
        results = {
            'cycle_id': str(training_cycle_start.timestamp()),
            'start_time': training_cycle_start.isoformat(),
            'modalities_trained': modalities,
            'gan_training_results': {},
            'adversarial_samples_generated': {},
            'detection_library_extensions': {},
            'cycle_completed': False
        }
        
        # Train GANs for each modality
        for modality in modalities:
            try:
                gan_results = self.train_gan(modality, epochs=epochs_per_gan)
                results['gan_training_results'][modality] = gan_results
            except Exception as e:
                self.logger.error(f"Error training GAN for {modality}: {str(e)}")
                results['gan_training_results'][modality] = {'error': str(e)}
        
        # Generate adversarial samples
        for modality in modalities:
            try:
                samples = self.generate_adversarial_samples(modality, num_samples=samples_per_modality)
                results['adversarial_samples_generated'][modality] = len(samples)
            except Exception as e:
                self.logger.error(f"Error generating samples for {modality}: {str(e)}")
                results['adversarial_samples_generated'][modality] = 0
        
        # Extend detection libraries with LLM
        try:
            extended_libraries = self.extend_detection_libraries_with_llm(target_concepts)
            results['detection_library_extensions'] = {
                modality: len(patterns) 
                for modality, patterns in extended_libraries.items()
            }
        except Exception as e:
            self.logger.error(f"Error extending detection libraries: {str(e)}")
            results['detection_library_extensions'] = {'error': str(e)}
        
        # Record completion
        training_cycle_end = datetime.now()
        results['end_time'] = training_cycle_end.isoformat()
        results['duration_seconds'] = (
            training_cycle_end - training_cycle_start
        ).total_seconds()
        results['cycle_completed'] = True
        
        self.logger.info(f"Completed adversarial training cycle in {results['duration_seconds']:.2f} seconds")
        return results
    
    def get_training_history(self) -> List[Dict[str, Any]]:
        """
        Get training history
        
        Returns:
            List of training history records
        """
        return self.training_history.copy()
    
    def get_detection_libraries(self) -> Dict[str, List[str]]:
        """
        Get current detection libraries
        
        Returns:
            Current detection libraries by modality
        """
        return self.detection_libraries.copy()
    
    def save_training_state(self, filepath: str):
        """
        Save current training state to file
        
        Args:
            filepath: File path to save state to
        """
        state = {
            'training_history': self.training_history,
            'detection_libraries': self.detection_libraries,
            'saved_at': datetime.now().isoformat()
        }
        
        try:
            with open(filepath, 'w') as f:
                json.dump(state, f, indent=2, default=str)
            self.logger.info(f"Saved training state to {filepath}")
        except Exception as e:
            self.logger.error(f"Error saving training state: {str(e)}")
    
    def load_training_state(self, filepath: str):
        """
        Load training state from file
        
        Args:
            filepath: File path to load state from
        """
        try:
            with open(filepath, 'r') as f:
                state = json.load(f)
            
            self.training_history = state.get('training_history', [])
            self.detection_libraries = state.get('detection_libraries', {})
            
            self.logger.info(f"Loaded training state from {filepath}")
        except Exception as e:
            self.logger.error(f"Error loading training state: {str(e)}")


# Convenience function for easy usage
def create_adversarial_training_engine() -> AdversarialTrainingEngine:
    """
    Factory function to create and initialize the adversarial training engine
    """
    return AdversarialTrainingEngine()