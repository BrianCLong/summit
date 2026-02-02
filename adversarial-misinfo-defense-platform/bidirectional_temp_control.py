"""
Bidirectional Processing and Temperature Control Module for Adversarial Misinformation Defense Platform

This module implements bidirectional processing and temperature controls to enable more nuanced
and adaptive detection of adversarial misinformation across all modalities.
"""

import json
import logging
import random
from copy import deepcopy
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import torch


class TemperatureScale(Enum):
    """Enumeration of temperature scales for different sensitivity levels"""
    LOW = 0.1
    MEDIUM = 0.5
    HIGH = 1.0
    VERY_HIGH = 2.0


@dataclass
class BidirectionalConfig:
    """Configuration for bidirectional processing and temperature controls"""
    # Temperature control settings
    default_temperature: float = 1.0
    min_temperature: float = 0.1
    max_temperature: float = 2.0
    
    # Bidirectional processing settings
    enable_forward_pass: bool = True
    enable_backward_pass: bool = True
    pass_combination_method: str = "weighted_average"  # "weighted_average", "max", "min", "concat"
    
    # Adaptive settings
    enable_adaptive_temperature: bool = True
    temperature_adjustment_factor: float = 0.1
    confidence_threshold_low: float = 0.3
    confidence_threshold_high: float = 0.8
    
    # Modality-specific settings
    modality_weights: Dict[str, float] = field(default_factory=lambda: {
        'text': 1.0,
        'image': 1.0,
        'audio': 1.0,
        'video': 1.0,
        'meme': 1.0,
        'deepfake': 1.0
    })


class BidirectionalProcessor:
    """
    Processor for bidirectional detection with temperature controls
    """
    
    def __init__(self, config: Optional[BidirectionalConfig] = None):
        self.config = config or BidirectionalConfig()
        self.logger = logging.getLogger(__name__)
        
        # Initialize temperature adjustments for each modality
        self.modality_temperatures = {
            modality: self.config.default_temperature 
            for modality in self.config.modality_weights.keys()
        }
        
        # History of temperature adjustments
        self.temperature_history = {modality: [] for modality in self.config.modality_weights.keys()}
        
        # Forward and backward pass results cache
        self.forward_results = {}
        self.backward_results = {}
        
    def apply_temperature_scaling(self, logits: np.ndarray, temperature: float) -> np.ndarray:
        """
        Apply temperature scaling to logits
        
        Args:
            logits: Input logits from detection model
            temperature: Temperature value to apply
            
        Returns:
            Temperature-scaled probabilities
        """
        if temperature == 0:
            # Return argmax (greedy selection)
            scaled_logits = np.zeros_like(logits)
            scaled_logits[np.argmax(logits)] = 1.0
            return scaled_logits
        
        # Apply temperature scaling
        scaled_logits = logits / temperature
        
        # Convert to probabilities using softmax
        exp_scaled = np.exp(scaled_logits - np.max(scaled_logits))  # Numerical stability
        probs = exp_scaled / np.sum(exp_scaled)
        
        return probs
    
    def adjust_temperature_by_confidence(self, modality: str, confidence: float) -> float:
        """
        Adjust temperature based on detection confidence
        
        Args:
            modality: The modality being processed
            confidence: Current detection confidence score
            
        Returns:
            Adjusted temperature value
        """
        current_temp = self.modality_temperatures[modality]
        
        # If confidence is low, increase temperature to encourage exploration
        if confidence < self.config.confidence_threshold_low:
            new_temp = min(
                current_temp + self.config.temperature_adjustment_factor,
                self.config.max_temperature
            )
            self.logger.debug(f"Low confidence ({confidence:.3f}) detected for {modality}. "
                             f"Increasing temperature from {current_temp:.3f} to {new_temp:.3f}")
            
        # If confidence is high, decrease temperature for more conservative detection
        elif confidence > self.config.confidence_threshold_high:
            new_temp = max(
                current_temp - self.config.temperature_adjustment_factor,
                self.config.min_temperature
            )
            self.logger.debug(f"High confidence ({confidence:.3f}) detected for {modality}. "
                             f"Decreasing temperature from {current_temp:.3f} to {new_temp:.3f}")
        else:
            # Confidence is in acceptable range, keep current temperature
            new_temp = current_temp
            
        self.modality_temperatures[modality] = new_temp
        self.temperature_history[modality].append({
            'timestamp': np.datetime64('now'),
            'old_temp': current_temp,
            'new_temp': new_temp,
            'confidence': confidence
        })
        
        return new_temp
    
    def bidirectional_detection_single_modality(
        self,
        detector_method,
        content: Union[str, List[str]],
        modality: str
    ) -> Dict[str, Any]:
        """
        Perform bidirectional detection with temperature controls for a single modality
        """
        # Get current temperature for this modality
        current_temp = self.modality_temperatures[modality]
        
        # Forward pass: normal detection
        if self.config.enable_forward_pass:
            # Perform initial detection
            forward_results_raw = detector_method([content] if isinstance(content, str) else content)
            
            # Apply temperature scaling to forward results
            forward_processed_results = []
            for result in forward_results_raw:
                # Adjust temperature based on confidence if enabled
                if self.config.enable_adaptive_temperature:
                    adjusted_temp = self.adjust_temperature_by_confidence(modality, result.get('confidence', 0.5))
                    
                    # Apply temperature scaling to relevant scores
                    if 'misinfo_score' in result:
                        original_score = result['misinfo_score']
                        # Apply temperature scaling effect to the score
                        if isinstance(original_score, (float, int)):
                            # Use temperature as a factor to adjust the score's certainty
                            temp_factor = 1.0 + (adjusted_temp - 1.0) * 0.1  # Small adjustment factor
                            temperature_affected_score = min(max(original_score * temp_factor, 0.0), 1.0)
                            
                            # Create a copy of the result with adjusted score
                            adjusted_result = deepcopy(result)
                            adjusted_result['misinfo_score'] = temperature_affected_score
                            adjusted_result['temperature_used'] = adjusted_temp
                            forward_processed_results.append(adjusted_result)
                        else:
                            forward_processed_results.append(result)
                    else:
                        forward_processed_results.append(result)
                else:
                    forward_processed_results.append(result)
        else:
            forward_processed_results = []
        
        # Backward pass: reverse or perturbed processing
        if self.config.enable_backward_pass:
            # For the backward pass, we'll slightly modify the input or processing approach
            # This could mean adding noise, perturbation, or reversing processing order
            
            # Create perturbed version of content for backward pass
            if isinstance(content, str):
                # Add slight perturbation to text content
                perturbed_content = self._perturb_content(content, modality)
                backward_results_raw = detector_method([perturbed_content])
            else:
                # For list inputs, perturb each element slightly
                perturbed_contents = [self._perturb_content(item, modality) for item in content]
                backward_results_raw = detector_method(perturbed_contents)
            
            # Apply temperature scaling to backward results
            backward_processed_results = []
            for result in backward_results_raw:
                if self.config.enable_adaptive_temperature:
                    # Use confidence from the corresponding forward result if available
                    base_confidence = result.get('confidence', 0.5)
                    adjusted_temp = self.adjust_temperature_by_confidence(modality, base_confidence)
                    
                    if 'misinfo_score' in result:
                        original_score = result['misinfo_score']
                        if isinstance(original_score, (float, int)):
                            temp_factor = 1.0 + (adjusted_temp - 1.0) * 0.1
                            temperature_affected_score = min(max(original_score * temp_factor, 0.0), 1.0)
                            
                            adjusted_result = deepcopy(result)
                            adjusted_result['misinfo_score'] = temperature_affected_score
                            adjusted_result['temperature_used'] = adjusted_temp
                            backward_processed_results.append(adjusted_result)
                        else:
                            backward_processed_results.append(result)
                    else:
                        backward_processed_results.append(result)
                else:
                    backward_processed_results.append(result)
        else:
            backward_processed_results = []
        
        # Combine forward and backward results based on configured method
        combined_results = self._combine_bidirectional_results(
            forward_processed_results, 
            backward_processed_results, 
            modality
        )
        
        return {
            'forward_results': forward_processed_results,
            'backward_results': backward_processed_results,
            'combined_results': combined_results,
            'temperature_used': self.modality_temperatures[modality]
        }
    
    def _perturb_content(self, content: str, modality: str) -> str:
        """
        Create a slightly perturbed version of content for backward pass
        """
        if modality == 'text':
            # Apply minor text perturbations
            words = content.split()
            if len(words) > 1:
                # Randomly shuffle or modify a few words
                if random.random() < 0.3:  # 30% chance to make a small change
                    idx = random.randint(0, len(words)-1)
                    if len(words[idx]) > 3:
                        # Slightly modify a word to create a perturbation
                        char_pos = random.randint(1, len(words[idx])-2)
                        new_char = random.choice('abcdefghijklmnopqrstuvwxyz')
                        words[idx] = words[idx][:char_pos] + new_char + words[idx][char_pos+1:]
                
                return ' '.join(words)
            else:
                return content
        
        elif modality in ['image', 'audio', 'video', 'meme', 'deepfake']:
            # For media files, we might return the same path but with a flag
            # In a real implementation, actual perturbations would be applied
            return content
        
        else:
            return content
    
    def _combine_bidirectional_results(
        self, 
        forward_results: List[Dict[str, Any]], 
        backward_results: List[Dict[str, Any]], 
        modality: str
    ) -> List[Dict[str, Any]]:
        """
        Combine forward and backward results using the configured combination method
        """
        if not forward_results and not backward_results:
            return []
        
        # If only forward results exist
        if not backward_results:
            return forward_results
            
        # If only backward results exist  
        if not forward_results:
            return backward_results
            
        # Both exist, combine based on method
        combined_results = []
        
        for i in range(min(len(forward_results), len(backward_results))):
            forward_res = forward_results[i]
            backward_res = backward_results[i]
            
            if self.config.pass_combination_method == "weighted_average":
                # Weighted average of scores
                combined_result = deepcopy(forward_res)
                
                if 'misinfo_score' in forward_res and 'misinfo_score' in backward_res:
                    forward_score = forward_res['misinfo_score']
                    backward_score = backward_res['misinfo_score']
                    weight_forward = self.config.modality_weights[modality]
                    weight_backward = weight_forward  # Same weight for now, could vary
                    
                    combined_score = (
                        (weight_forward * forward_score + weight_backward * backward_score) / 
                        (weight_forward + weight_backward)
                    )
                    combined_result['misinfo_score'] = combined_score
                
                if 'confidence' in forward_res and 'confidence' in backward_res:
                    combined_result['confidence'] = (
                        (forward_res['confidence'] + backward_res['confidence']) / 2.0
                    )
                    
                # Combine other fields as well
                combined_result['bidirectional_fusion'] = {
                    'forward': forward_res,
                    'backward': backward_res,
                    'method': 'weighted_average'
                }
                
            elif self.config.pass_combination_method == "max":
                # Take the maximum score
                combined_result = deepcopy(forward_res)
                
                if 'misinfo_score' in forward_res and 'misinfo_score' in backward_res:
                    combined_result['misinfo_score'] = max(
                        forward_res['misinfo_score'], 
                        backward_res['misinfo_score']
                    )
                
                if 'confidence' in forward_res and 'confidence' in backward_res:
                    combined_result['confidence'] = max(
                        forward_res['confidence'], 
                        backward_res['confidence']
                    )
                
                combined_result['bidirectional_fusion'] = {
                    'forward': forward_res,
                    'backward': backward_res,
                    'method': 'max'
                }
                
            elif self.config.pass_combination_method == "min":
                # Take the minimum score
                combined_result = deepcopy(forward_res)
                
                if 'misinfo_score' in forward_res and 'misinfo_score' in backward_res:
                    combined_result['misinfo_score'] = min(
                        forward_res['misinfo_score'], 
                        backward_res['misinfo_score']
                    )
                
                if 'confidence' in forward_res and 'confidence' in backward_res:
                    combined_result['confidence'] = min(
                        forward_res['confidence'], 
                        backward_res['confidence']
                    )
                
                combined_result['bidirectional_fusion'] = {
                    'forward': forward_res,
                    'backward': backward_res,
                    'method': 'min'
                }
                
            else:  # Default to concat
                # Simply concatenate the results
                combined_result = {
                    'bidirectional_fusion': {
                        'forward': forward_res,
                        'backward': backward_res,
                        'method': 'concat'
                    },
                    'misinfo_score': forward_res.get('misinfo_score', 0.5),
                    'confidence': (forward_res.get('confidence', 0.0) + 
                                  backward_res.get('confidence', 0.0)) / 2.0
                }
            
            combined_results.append(combined_result)
        
        return combined_results
    
    def process_multimodal_content(
        self,
        content_dict: Dict[str, Union[str, List[str]]]
    ) -> Dict[str, Any]:
        """
        Process multimodal content with bidirectional detection and temperature controls
        
        Args:
            content_dict: Dictionary with modality keys and content values
            
        Returns:
            Dictionary with bidirectional results for each modality
        """
        multimodal_results = {
            'timestamp': np.datetime64('now'),
            'processed_modalities': {},
            'temperature_summary': self.modality_temperatures.copy(),
            'aggregated_score': 0.0,
            'overall_confidence': 0.0
        }
        
        total_weighted_score = 0.0
        total_weight = 0.0
        total_confidence = 0.0
        modality_count = 0
        
        # Process each modality with bidirectional detection
        for modality, content in content_dict.items():
            if modality in self.config.modality_weights:
                # For now, we'll use a placeholder detector method
                # In a real implementation, this would connect to the actual detector
                detector_method = self._get_detector_method(modality)
                
                if detector_method:
                    modality_results = self.bidirectional_detection_single_modality(
                        detector_method, 
                        content, 
                        modality
                    )
                    
                    multimodal_results['processed_modalities'][modality] = modality_results
                    
                    # Update aggregation values
                    combined_results = modality_results['combined_results']
                    if combined_results:
                        # Average the scores from the combined results
                        scores = [r.get('misinfo_score', 0.5) for r in combined_results 
                                 if 'misinfo_score' in r]
                        confidences = [r.get('confidence', 0.5) for r in combined_results 
                                      if 'confidence' in r]
                        
                        if scores:
                            avg_score = sum(scores) / len(scores)
                            weight = self.config.modality_weights[modality]
                            total_weighted_score += avg_score * weight
                            total_weight += weight
                            modality_count += 1
                        
                        if confidences:
                            total_confidence += sum(confidences) / len(confidences)
        
        # Calculate final aggregated values
        if total_weight > 0:
            multimodal_results['aggregated_score'] = total_weighted_score / total_weight
        if modality_count > 0:
            multimodal_results['overall_confidence'] = total_confidence / modality_count
        
        # Determine risk level based on aggregated score
        if multimodal_results['aggregated_score'] > 0.7:
            multimodal_results['risk_level'] = 'HIGH'
        elif multimodal_results['aggregated_score'] > 0.4:
            multimodal_results['risk_level'] = 'MEDIUM'
        else:
            multimodal_results['risk_level'] = 'LOW'
        
        return multimodal_results
    
    def _get_detector_method(self, modality: str):
        """
        Get the appropriate detector method for a modality
        This is a placeholder that would connect to actual detector methods
        """
        # In a real implementation, this would return the actual method from the detector
        def placeholder_detector(content):
            # Generate realistic fake results for demonstration
            if isinstance(content, list):
                results = []
                for i, item in enumerate(content):
                    results.append({
                        'content_id': i,
                        'misinfo_score': random.uniform(0.1, 0.9),
                        'confidence': random.uniform(0.6, 0.95),
                        'modality': modality,
                        'analysis_details': f'Simulated {modality} analysis'
                    })
                return results
            else:
                return [{
                    'content_id': 0,
                    'misinfo_score': random.uniform(0.1, 0.9),
                    'confidence': random.uniform(0.6, 0.95),
                    'modality': modality,
                    'analysis_details': f'Simulated {modality} analysis'
                }]
        
        return placeholder_detector
    
    def reset_temperature_settings(self):
        """Reset temperature settings to default values"""
        for modality in self.modality_temperatures:
            self.modality_temperatures[modality] = self.config.default_temperature
            self.temperature_history[modality] = []
    
    def save_temperature_settings(self, filepath: Union[str, Path]):
        """Save temperature settings to file"""
        settings = {
            'modality_temperatures': self.modality_temperatures,
            'temperature_history': self.temperature_history,
            'config': self.config.__dict__
        }
        
        with open(filepath, 'w') as f:
            json.dump(settings, f, indent=2, default=str)
        
        self.logger.info(f"Temperature settings saved to {filepath}")
    
    def load_temperature_settings(self, filepath: Union[str, Path]):
        """Load temperature settings from file"""
        with open(filepath, 'r') as f:
            settings = json.load(f)
        
        self.modality_temperatures = settings['modality_temperatures']
        self.temperature_history = settings['temperature_history']
        
        # Reload config
        config_data = settings['config']
        self.config = BidirectionalConfig(**{
            k: v for k, v in config_data.items() 
            if hasattr(BidirectionalConfig, '__dataclass_fields__') and k in BidirectionalConfig.__dataclass_fields__
        })
        
        self.logger.info(f"Temperature settings loaded from {filepath}")


class BidirectionalTemperatureController:
    """
    Controller class that integrates bidirectional processing and temperature controls
    into the main adversarial misinformation defense platform
    """
    
    def __init__(self, detector, config: Optional[BidirectionalConfig] = None):
        self.detector = detector
        self.bidirectional_processor = BidirectionalProcessor(config)
        self.logger = logging.getLogger(__name__)
    
    def detect_with_bidirectional_control(
        self,
        content_dict: Dict[str, Union[str, List[str]]],
        temperature_override: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Enhanced detection using bidirectional processing and temperature controls
        """
        # Override temperatures if specified
        if temperature_override:
            for modality, temp in temperature_override.items():
                if modality in self.bidirectional_processor.modality_temperatures:
                    self.bidirectional_processor.modality_temperatures[modality] = temp
                    self.logger.info(f"Overriding temperature for {modality} to {temp}")
        
        # Process using bidirectional processor
        results = self.bidirectional_processor.process_multimodal_content(content_dict)
        
        return results
    
    def adaptive_temperature_update(
        self,
        previous_results: Dict[str, Any],
        performance_feedback: Dict[str, float]
    ):
        """
        Adaptively update temperatures based on performance feedback
        """
        for modality, feedback in performance_feedback.items():
            if modality in self.bidirectional_processor.modality_temperatures:
                current_temp = self.bidirectional_processor.modality_temperatures[modality]
                
                # Adjust temperature based on feedback
                # Positive feedback (good performance) → lower temperature (more conservative)
                # Negative feedback (poor performance) → higher temperature (more exploratory)
                if feedback > 0:
                    # Good performance, be more conservative
                    new_temp = max(current_temp - 0.05, self.bidirectional_processor.config.min_temperature)
                else:
                    # Poor performance, be more exploratory
                    new_temp = min(current_temp + 0.05, self.bidirectional_processor.config.max_temperature)
                
                self.bidirectional_processor.modality_temperatures[modality] = new_temp
                self.logger.info(
                    f"Adjusted {modality} temperature from {current_temp:.3f} to {new_temp:.3f} "
                    f"based on performance feedback: {feedback:.3f}"
                )
    
    def get_temperature_analytics(self) -> Dict[str, Any]:
        """
        Get analytics about temperature adjustments across modalities
        """
        analytics = {
            'timestamp': np.datetime64('now'),
            'current_temperatures': self.bidirectional_processor.modality_temperatures.copy(),
            'temperature_ranges': {},
            'adjustment_counts': {}
        }
        
        for modality, history in self.bidirectional_processor.temperature_history.items():
            if history:
                temps = [entry['new_temp'] for entry in history]
                analytics['temperature_ranges'][modality] = {
                    'min': min(temps),
                    'max': max(temps),
                    'avg': sum(temps) / len(temps)
                }
                analytics['adjustment_counts'][modality] = len(history)
            else:
                analytics['temperature_ranges'][modality] = {
                    'min': self.bidirectional_processor.config.default_temperature,
                    'max': self.bidirectional_processor.config.default_temperature,
                    'avg': self.bidirectional_processor.config.default_temperature
                }
                analytics['adjustment_counts'][modality] = 0
        
        return analytics