"""
Validation Suite for Adversarial Misinformation Defense Platform

This module implements comprehensive validation of the platform against
state-of-the-art attacks and real-world adversarial examples.
"""
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from typing import List, Dict, Any, Optional, Tuple, Union
from pathlib import Path
import random
import json
import logging
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.model_selection import train_test_split
import warnings
warnings.filterwarnings('ignore')

# Import our modules
from detection_modules.main_detector import AdversarialMisinfoDetector
from detection_modules.text_detector import TextDetector
from detection_modules.image_detector import ImageDetector
from detection_modules.audio_detector import AudioDetector
from detection_modules.video_detector import VideoDetector
from detection_modules.meme_detector import MemeDetector
from detection_modules.deepfake_detector import DeepfakeDetector


class ValidationBenchmark:
    """
    Benchmark for validating detection capabilities
    """
    
    def __init__(self):
        """
        Initialize the validation benchmark
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Initialize detectors
        self.detector = AdversarialMisinfoDetector()
        
        # Test datasets
        self.test_datasets = {}
        
        # Results storage
        self.validation_results = {}
        self.benchmark_history = []
        
        # Initialize with sample test data
        self._initialize_sample_datasets()
    
    def _initialize_sample_datasets(self):
        """
        Initialize with sample test datasets
        """
        # Sample text test data (in practice, you would load real datasets)
        self.test_datasets['text'] = {
            'samples': [
                "This shocking revelation will change everything you thought you knew!",
                "Scientists have confirmed that this ONE WEIRD TRICK works!",
                "BREAKING: Government conspiracy exposed by anonymous whistleblower",
                "You won't believe what happened next - banned by Big Tech",
                "The truth about climate change that they don't want you to know",
                "This is just a normal, factual statement about everyday topics.",
                "Research shows that balanced diets and regular exercise are beneficial.",
                "According to peer-reviewed studies, vaccination has saved millions of lives.",
                "Historical analysis reveals complex factors in geopolitical events.",
                "Economic data indicates mixed trends in various market sectors."
            ],
            'labels': [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]  # 1 = misinfo, 0 = legitimate
        }
        
        # Sample image test data paths (in practice, you would have actual image files)
        self.test_datasets['image'] = {
            'paths': [
                "/path/to/sample/image1.jpg",
                "/path/to/sample/image2.png",
                "/path/to/sample/meme1.jpg",
                "/path/to/sample/photo1.jpg"
            ],
            'labels': [1, 1, 1, 0]  # 1 = manipulated/suspicious, 0 = legitimate
        }
        
        # Sample audio test data paths
        self.test_datasets['audio'] = {
            'paths': [
                "/path/to/sample/audio1.wav",
                "/path/to/sample/recording1.mp3"
            ],
            'labels': [1, 0]  # 1 = suspicious, 0 = legitimate
        }
        
        # Sample video test data paths
        self.test_datasets['video'] = {
            'paths': [
                "/path/to/sample/video1.mp4",
                "/path/to/sample/recording1.avi"
            ],
            'labels': [1, 0]  # 1 = suspicious, 0 = legitimate
        }
        
        # Sample meme test data paths
        self.test_datasets['meme'] = {
            'paths': [
                "/path/to/sample/meme1.jpg",
                "/path/to/sample/meme2.png",
                "/path/to/sample/legitimate_meme.jpg"
            ],
            'labels': [1, 1, 0]  # 1 = suspicious, 0 = legitimate
        }
        
        # Sample deepfake test data
        self.test_datasets['deepfake'] = {
            'media': {
                'paths': [
                    "/path/to/sample/deepfake1.mp4",
                    "/path/to/sample/real1.mp4"
                ],
                'types': ['video', 'video']
            },
            'labels': [1, 0]  # 1 = deepfake, 0 = real
        }
    
    def run_comprehensive_validation(self) -> Dict[str, Any]:
        """
        Run comprehensive validation across all modalities
        """
        self.logger.info("Starting comprehensive validation")
        
        validation_start_time = datetime.now()
        results = {
            'validation_id': str(validation_start_time.timestamp()),
            'start_time': validation_start_time.isoformat(),
            'modality_results': {},
            'overall_metrics': {},
            'recommendations': []
        }
        
        # Validate each modality
        modalities = ['text', 'image', 'audio', 'video', 'meme', 'deepfake']
        
        for modality in modalities:
            if modality in self.test_datasets:
                modality_results = self.validate_modality(modality)
                results['modality_results'][modality] = modality_results
        
        # Calculate overall metrics
        results['overall_metrics'] = self._calculate_overall_metrics(results['modality_results'])
        
        # Generate recommendations
        results['recommendations'] = self._generate_recommendations(results['modality_results'])
        
        # Record completion
        results['end_time'] = datetime.now().isoformat()
        results['duration_seconds'] = (
            datetime.fromisoformat(results['end_time']) - 
            datetime.fromisoformat(results['start_time'])
        ).total_seconds()
        
        # Store results
        self.validation_results = results
        self.benchmark_history.append(results)
        
        self.logger.info("Completed comprehensive validation")
        return results
    
    def validate_modality(self, modality: str) -> Dict[str, Any]:
        """
        Validate detection capabilities for a specific modality
        """
        self.logger.info(f"Validating {modality} modality")
        
        if modality not in self.test_datasets:
            return {'error': f"No test data for {modality} modality"}
        
        dataset = self.test_datasets[modality]
        results = {
            'modality': modality,
            'test_samples': len(dataset.get('samples', dataset.get('paths', []))),
            'detection_results': [],
            'performance_metrics': {},
            'false_positives': [],
            'false_negatives': [],
            'confidence_analysis': {}
        }
        
        try:
            # Run detection based on modality
            if modality == 'text':
                detection_results = self.detector.detect_text_misinfo(dataset['samples'])
            elif modality == 'image':
                detection_results = self.detector.detect_image_misinfo(dataset['paths'])
            elif modality == 'audio':
                detection_results = self.detector.detect_audio_misinfo(dataset['paths'])
            elif modality == 'video':
                detection_results = self.detector.detect_video_misinfo(dataset['paths'])
            elif modality == 'meme':
                detection_results = self.detector.detect_meme_misinfo(dataset['paths'])
            elif modality == 'deepfake':
                detection_results = self.detector.detect_deepfake_misinfo(
                    dataset['media']['paths'], dataset['media']['types'])
            else:
                return {'error': f"Unknown modality: {modality}"}
            
            results['detection_results'] = detection_results
            
            # Analyze performance
            performance_metrics = self._analyze_performance(
                detection_results, dataset['labels'], modality)
            results['performance_metrics'] = performance_metrics
            
            # Identify false positives and negatives
            false_positives, false_negatives = self._identify_errors(
                detection_results, dataset['labels'])
            results['false_positives'] = false_positives
            results['false_negatives'] = false_negatives
            
            # Analyze confidence distributions
            confidence_analysis = self._analyze_confidence(detection_results)
            results['confidence_analysis'] = confidence_analysis
            
        except Exception as e:
            self.logger.error(f"Error validating {modality} modality: {str(e)}")
            results['error'] = str(e)
        
        return results
    
    def _analyze_performance(self, detection_results: List[Dict[str, Any]], 
                            true_labels: List[int], modality: str) -> Dict[str, Any]:
        """
        Analyze performance metrics for detection results
        """
        if not detection_results or not true_labels:
            return {'error': 'No data to analyze'}
        
        # Extract predictions
        predictions = []
        scores = []
        
        for result in detection_results:
            # Different modalities may have different score keys
            misinfo_score = result.get('misinfo_score', 
                                     result.get('deepfake_score', 
                                              result.get('overall_score', 0.0)))
            predictions.append(1 if misinfo_score > 0.5 else 0)
            scores.append(misinfo_score)
        
        # Ensure we have the same number of predictions and labels
        min_len = min(len(predictions), len(true_labels))
        predictions = predictions[:min_len]
        true_labels_trimmed = true_labels[:min_len]
        scores = scores[:min_len]
        
        if min_len == 0:
            return {'error': 'No matching data for analysis'}
        
        # Calculate metrics
        metrics = {
            'accuracy': np.mean([p == t for p, t in zip(predictions, true_labels_trimmed)]),
            'precision': np.sum([1 for p, t in zip(predictions, true_labels_trimmed) if p == 1 and t == 1]) / 
                        np.sum(predictions) if np.sum(predictions) > 0 else 0,
            'recall': np.sum([1 for p, t in zip(predictions, true_labels_trimmed) if p == 1 and t == 1]) / 
                     np.sum(true_labels_trimmed) if np.sum(true_labels_trimmed) > 0 else 0,
            'f1_score': 0.0,
            'auc_roc': 0.0
        }
        
        # Calculate F1 score
        if metrics['precision'] + metrics['recall'] > 0:
            metrics['f1_score'] = 2 * (metrics['precision'] * metrics['recall']) / (
                metrics['precision'] + metrics['recall'])
        
        # Calculate AUC-ROC if we have scores
        try:
            if len(set(true_labels_trimmed)) > 1 and len(scores) == len(true_labels_trimmed):
                metrics['auc_roc'] = roc_auc_score(true_labels_trimmed, scores)
        except:
            metrics['auc_roc'] = 0.0
        
        # Add supporting metrics
        metrics['true_positives'] = np.sum([1 for p, t in zip(predictions, true_labels_trimmed) if p == 1 and t == 1])
        metrics['true_negatives'] = np.sum([1 for p, t in zip(predictions, true_labels_trimmed) if p == 0 and t == 0])
        metrics['false_positives'] = np.sum([1 for p, t in zip(predictions, true_labels_trimmed) if p == 1 and t == 0])
        metrics['false_negatives'] = np.sum([1 for p, t in zip(predictions, true_labels_trimmed) if p == 0 and t == 1])
        
        return metrics
    
    def _identify_errors(self, detection_results: List[Dict[str, Any]], 
                        true_labels: List[int]) -> Tuple[List[Dict], List[Dict]]:
        """
        Identify false positives and false negatives
        """
        false_positives = []
        false_negatives = []
        
        # Ensure we have the same number of results and labels
        min_len = min(len(detection_results), len(true_labels))
        
        for i in range(min_len):
            result = detection_results[i]
            true_label = true_labels[i]
            
            # Extract prediction
            misinfo_score = result.get('misinfo_score', 
                                     result.get('deepfake_score', 
                                              result.get('overall_score', 0.0)))
            prediction = 1 if misinfo_score > 0.5 else 0
            
            # Identify errors
            if prediction == 1 and true_label == 0:
                false_positives.append({
                    'index': i,
                    'result': result,
                    'score': misinfo_score,
                    'reason': 'Incorrectly flagged as misinformation'
                })
            elif prediction == 0 and true_label == 1:
                false_negatives.append({
                    'index': i,
                    'result': result,
                    'score': misinfo_score,
                    'reason': 'Failed to detect misinformation'
                })
        
        return false_positives, false_negatives
    
    def _analyze_confidence(self, detection_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze confidence distributions in detection results
        """
        confidences = []
        scores = []
        
        for result in detection_results:
            confidence = result.get('confidence', 0.0)
            misinfo_score = result.get('misinfo_score', 
                                     result.get('deepfake_score', 
                                              result.get('overall_score', 0.0)))
            confidences.append(confidence)
            scores.append(misinfo_score)
        
        if not confidences:
            return {'error': 'No data to analyze'}
        
        analysis = {
            'mean_confidence': np.mean(confidences),
            'std_confidence': np.std(confidences),
            'min_confidence': np.min(confidences),
            'max_confidence': np.max(confidences),
            'confidence_distribution': np.histogram(confidences, bins=10)[0].tolist(),
            'score_correlation': np.corrcoef(confidences, scores)[0, 1] if len(confidences) > 1 else 0.0
        }
        
        return analysis
    
    def _calculate_overall_metrics(self, modality_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate overall metrics across all modalities
        """
        overall_metrics = {
            'total_modalities_tested': len(modality_results),
            'average_accuracy': 0.0,
            'average_precision': 0.0,
            'average_recall': 0.0,
            'average_f1_score': 0.0,
            'average_auc_roc': 0.0,
            'modality_accuracies': {}
        }
        
        accuracies = []
        precisions = []
        recalls = []
        f1_scores = []
        auc_rocs = []
        
        for modality, results in modality_results.items():
            if 'performance_metrics' in results and 'error' not in results['performance_metrics']:
                metrics = results['performance_metrics']
                overall_metrics['modality_accuracies'][modality] = metrics.get('accuracy', 0.0)
                
                accuracies.append(metrics.get('accuracy', 0.0))
                precisions.append(metrics.get('precision', 0.0))
                recalls.append(metrics.get('recall', 0.0))
                f1_scores.append(metrics.get('f1_score', 0.0))
                auc_rocs.append(metrics.get('auc_roc', 0.0))
        
        if accuracies:
            overall_metrics['average_accuracy'] = np.mean(accuracies)
            overall_metrics['average_precision'] = np.mean(precisions)
            overall_metrics['average_recall'] = np.mean(recalls)
            overall_metrics['average_f1_score'] = np.mean(f1_scores)
            overall_metrics['average_auc_roc'] = np.mean(auc_rocs)
        
        return overall_metrics
    
    def _generate_recommendations(self, modality_results: Dict[str, Any]) -> List[str]:
        """
        Generate recommendations based on validation results
        """
        recommendations = []
        
        for modality, results in modality_results.items():
            if 'performance_metrics' in results and 'error' not in results['performance_metrics']:
                metrics = results['performance_metrics']
                
                # Accuracy-based recommendations
                if metrics.get('accuracy', 0.0) < 0.7:
                    recommendations.append(f"Low accuracy in {modality} detection - consider retraining")
                
                # Precision-based recommendations
                if metrics.get('precision', 0.0) < 0.6:
                    recommendations.append(f"High false positive rate in {modality} detection - tune thresholds")
                
                # Recall-based recommendations
                if metrics.get('recall', 0.0) < 0.6:
                    recommendations.append(f"High false negative rate in {modality} detection - improve sensitivity")
                
                # Confidence analysis
                if 'confidence_analysis' in results:
                    conf_analysis = results['confidence_analysis']
                    if conf_analysis.get('score_correlation', 0.0) < 0.3:
                        recommendations.append(f"Poor confidence calibration in {modality} - recalibrate scores")
        
        # General recommendations
        recommendations.append("Regular validation against new adversarial samples is recommended")
        recommendations.append("Consider expanding test datasets with real-world examples")
        recommendations.append("Implement continuous learning from false positives/negatives")
        
        return list(set(recommendations))  # Remove duplicates
    
    def generate_validation_report(self, results: Optional[Dict[str, Any]] = None) -> str:
        """
        Generate a comprehensive validation report
        """
        if results is None:
            results = self.validation_results
        
        if not results:
            return "No validation results available"
        
        report_lines = []
        report_lines.append("# Adversarial Misinformation Defense Platform - Validation Report")
        report_lines.append("")
        report_lines.append(f"**Validation ID:** {results.get('validation_id', 'N/A')}")
        report_lines.append(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report_lines.append(f"**Duration:** {results.get('duration_seconds', 0):.2f} seconds")
        report_lines.append("")
        
        # Overall metrics
        report_lines.append("## Overall Performance Metrics")
        overall_metrics = results.get('overall_metrics', {})
        report_lines.append(f"- **Modalities Tested:** {overall_metrics.get('total_modalities_tested', 0)}")
        report_lines.append(f"- **Average Accuracy:** {overall_metrics.get('average_accuracy', 0.0):.3f}")
        report_lines.append(f"- **Average Precision:** {overall_metrics.get('average_precision', 0.0):.3f}")
        report_lines.append(f"- **Average Recall:** {overall_metrics.get('average_recall', 0.0):.3f}")
        report_lines.append(f"- **Average F1-Score:** {overall_metrics.get('average_f1_score', 0.0):.3f}")
        report_lines.append(f"- **Average AUC-ROC:** {overall_metrics.get('average_auc_roc', 0.0):.3f}")
        report_lines.append("")
        
        # Modality-specific results
        report_lines.append("## Modality-Specific Results")
        for modality, mod_results in results.get('modality_results', {}).items():
            report_lines.append(f"### {modality.capitalize()} Detection")
            
            if 'error' in mod_results:
                report_lines.append(f"- **Error:** {mod_results['error']}")
                continue
            
            metrics = mod_results.get('performance_metrics', {})
            report_lines.append(f"- **Samples Tested:** {mod_results.get('test_samples', 0)}")
            report_lines.append(f"- **Accuracy:** {metrics.get('accuracy', 0.0):.3f}")
            report_lines.append(f"- **Precision:** {metrics.get('precision', 0.0):.3f}")
            report_lines.append(f"- **Recall:** {metrics.get('recall', 0.0):.3f}")
            report_lines.append(f"- **F1-Score:** {metrics.get('f1_score', 0.0):.3f}")
            report_lines.append(f"- **AUC-ROC:** {metrics.get('auc_roc', 0.0):.3f}")
            
            # Error analysis
            false_positives = len(mod_results.get('false_positives', []))
            false_negatives = len(mod_results.get('false_negatives', []))
            report_lines.append(f"- **False Positives:** {false_positives}")
            report_lines.append(f"- **False Negatives:** {false_negatives}")
            report_lines.append("")
        
        # Recommendations
        report_lines.append("## Recommendations")
        recommendations = results.get('recommendations', [])
        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                report_lines.append(f"{i}. {rec}")
        else:
            report_lines.append("No specific recommendations at this time.")
        
        return "\n".join(report_lines)
    
    def save_validation_results(self, filepath: Union[str, Path], 
                                results: Optional[Dict[str, Any]] = None):
        """
        Save validation results to file
        """
        if results is None:
            results = self.validation_results
        
        try:
            with open(str(filepath), 'w') as f:
                json.dump(results, f, indent=2, default=str)
            self.logger.info(f"Saved validation results to {filepath}")
        except Exception as e:
            self.logger.error(f"Failed to save validation results: {str(e)}")
    
    def load_validation_results(self, filepath: Union[str, Path]) -> Dict[str, Any]:
        """
        Load validation results from file
        """
        try:
            with open(str(filepath), 'r') as f:
                results = json.load(f)
            self.validation_results = results
            self.logger.info(f"Loaded validation results from {filepath}")
            return results
        except Exception as e:
            self.logger.error(f"Failed to load validation results: {str(e)}")
            return {}
    
    def compare_with_benchmarks(self, benchmark_name: str = "state_of_the_art") -> Dict[str, Any]:
        """
        Compare performance with established benchmarks
        """
        comparison_results = {
            'benchmark_name': benchmark_name,
            'comparison_date': datetime.now().isoformat(),
            'current_performance': {},
            'benchmark_performance': {},
            'performance_gap': {},
            'improvement_needed': {}
        }
        
        # Simulated state-of-the-art benchmarks (these would come from real benchmarks)
        sota_benchmarks = {
            'text': {'accuracy': 0.92, 'precision': 0.90, 'recall': 0.88, 'f1_score': 0.89},
            'image': {'accuracy': 0.88, 'precision': 0.85, 'recall': 0.87, 'f1_score': 0.86},
            'audio': {'accuracy': 0.85, 'precision': 0.82, 'recall': 0.83, 'f1_score': 0.82},
            'video': {'accuracy': 0.83, 'precision': 0.80, 'recall': 0.81, 'f1_score': 0.80},
            'meme': {'accuracy': 0.80, 'precision': 0.78, 'recall': 0.77, 'f1_score': 0.77},
            'deepfake': {'accuracy': 0.95, 'precision': 0.94, 'recall': 0.93, 'f1_score': 0.93}
        }
        
        # Current performance
        current_results = self.run_comprehensive_validation()
        
        for modality in sota_benchmarks.keys():
            if modality in current_results['modality_results']:
                current_metrics = current_results['modality_results'][modality].get('performance_metrics', {})
                
                comparison_results['current_performance'][modality] = {
                    'accuracy': current_metrics.get('accuracy', 0.0),
                    'precision': current_metrics.get('precision', 0.0),
                    'recall': current_metrics.get('recall', 0.0),
                    'f1_score': current_metrics.get('f1_score', 0.0)
                }
                
                comparison_results['benchmark_performance'][modality] = sota_benchmarks[modality]
                
                # Calculate performance gap
                gap_metrics = {}
                improvement_needed = {}
                
                for metric in ['accuracy', 'precision', 'recall', 'f1_score']:
                    current_val = current_metrics.get(metric, 0.0)
                    benchmark_val = sota_benchmarks[modality][metric]
                    gap = current_val - benchmark_val
                    gap_metrics[metric] = gap
                    
                    if gap < 0:
                        improvement_needed[metric] = abs(gap)
                    else:
                        improvement_needed[metric] = 0.0
                
                comparison_results['performance_gap'][modality] = gap_metrics
                comparison_results['improvement_needed'][modality] = improvement_needed
        
        return comparison_results
    
    def generate_comparison_report(self, comparison_results: Dict[str, Any]) -> str:
        """
        Generate a comparison report against benchmarks
        """
        report_lines = []
        report_lines.append("# Performance Comparison Report")
        report_lines.append("")
        report_lines.append(f"**Benchmark:** {comparison_results.get('benchmark_name', 'N/A')}")
        report_lines.append(f"**Comparison Date:** {comparison_results.get('comparison_date', 'N/A')}")
        report_lines.append("")
        
        report_lines.append("## Performance Comparison by Modality")
        report_lines.append("| Modality | Current Acc | SOTA Acc | Gap | Status |")
        report_lines.append("|----------|-------------|----------|-----|--------|")
        
        for modality in comparison_results.get('current_performance', {}).keys():
            current_acc = comparison_results['current_performance'][modality].get('accuracy', 0.0)
            sota_acc = comparison_results['benchmark_performance'][modality].get('accuracy', 0.0)
            gap = comparison_results['performance_gap'][modality].get('accuracy', 0.0)
            
            status = "✅ Good" if gap >= 0 else "⚠️ Needs Improvement"
            report_lines.append(f"| {modality.capitalize()} | {current_acc:.3f} | {sota_acc:.3f} | {gap:+.3f} | {status} |")
        
        report_lines.append("")
        report_lines.append("## Improvement Recommendations")
        
        for modality, improvements in comparison_results.get('improvement_needed', {}).items():
            total_improvement = sum(improvements.values())
            if total_improvement > 0:
                report_lines.append(f"- **{modality.capitalize()}:** Needs {total_improvement:.3f} overall improvement")
                for metric, improvement in improvements.items():
                    if improvement > 0:
                        report_lines.append(f"  - Improve {metric}: +{improvement:.3f}")
        
        return "\n".join(report_lines)


# Convenience function for easy usage
def create_validation_benchmark() -> ValidationBenchmark:
    """
    Factory function to create and initialize the validation benchmark
    """
    return ValidationBenchmark()


def run_validation_suite() -> Dict[str, Any]:
    """
    Run the complete validation suite
    """
    benchmark = ValidationBenchmark()
    results = benchmark.run_comprehensive_validation()
    return results