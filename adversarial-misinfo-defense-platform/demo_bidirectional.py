#!/usr/bin/env python3
"""
Demo Script for Bidirectional Processing and Temperature Controls

This script demonstrates the advanced bidirectional processing and temperature control
capabilities of the Adversarial Misinformation Defense Platform.
"""

import json
import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Import platform components
from adversarial_misinfo_defense import (
    create_platform,
    BidirectionalConfig,
    BidirectionalProcessor,
    BidirectionalTemperatureController
)


def demo_basic_bidirectional_processing():
    """
    Demo basic bidirectional processing capabilities
    """
    print("=" * 70)
    print("DEMO: Basic Bidirectional Processing")
    print("=" * 70)

    # Create a simple bidirectional processor
    config = BidirectionalConfig(
        default_temperature=1.0,
        enable_adaptive_temperature=True,
        confidence_threshold_low=0.3,
        confidence_threshold_high=0.8
    )
    processor = BidirectionalProcessor(config)

    print(f"Initial temperature settings: {processor.modality_temperatures}")
    
    # Apply temperature scaling
    sample_logits = [0.1, 0.7, 0.4, 0.9, 0.2]
    print(f"\nOriginal logits: {sample_logits}")
    
    # Different temperatures
    for temp in [0.5, 1.0, 1.5, 2.0]:
        scaled = processor.apply_temperature_scaling(
            logits=sample_logits, 
            temperature=temp
        )
        print(f"T={temp}: {scaled}")


def demo_temperature_adjustment_by_confidence():
    """
    Demo temperature adjustment based on detection confidence
    """
    print("\n" + "=" * 70)
    print("DEMO: Temperature Adjustment by Confidence")
    print("=" * 70)

    config = BidirectionalConfig(
        default_temperature=1.0,
        enable_adaptive_temperature=True,
        confidence_threshold_low=0.3,
        confidence_threshold_high=0.8
    )
    processor = BidirectionalProcessor(config)

    # Simulate detection confidence levels
    confidence_levels = [0.2, 0.4, 0.6, 0.75, 0.9]
    modalities = ["text", "image", "audio", "video", "meme"]
    
    print("Temperature adjustments based on confidence:")
    for modality, confidence in zip(modalities, confidence_levels):
        old_temp = processor.modality_temperatures[modality]
        new_temp = processor.adjust_temperature_by_confidence(modality, confidence)
        
        print(f"  {modality:6s} confidence {confidence:.2f} -> temp adjusted from {old_temp:.2f} to {new_temp:.2f}")


def demo_comprehensive_bidirectional_workflow():
    """
    Demo a comprehensive workflow using bidirectional processing
    """
    print("\n" + "=" * 70)
    print("DEMO: Comprehensive Bidirectional Workflow")
    print("=" * 70)

    # Create the complete platform
    platform = create_platform()
    detector = platform["detector"]
    controller = platform["bidirectional_controller"]

    # Create multimodal content
    content_dict = {
        'text': [
            "BREAKING: Scientists shocked by this one weird trick governments don't want you to know!",
            "Scientific study confirms benefits of balanced nutrition and exercise.",
            "Experts recommend evidence-based approaches to health and wellness."
        ]
    }

    print("Running comprehensive bidirectional analysis with temperature controls...")
    print(f"Input content: {len(content_dict['text'])} text samples")

    # Run bidirectional detection
    results = detector.detect_with_bidirectional_control(
        content_dict=content_dict,
        temperature=1.1,  # Slightly higher temperature for more exploration
        enable_bidirectional=True
    )

    print("\nAnalysis Results:")
    print(f"  Timestamp: {results.get('timestamp', 'N/A')}")
    print(f"  Aggregated Score: {results.get('aggregated_score', 0.0):.3f}")
    print(f"  Overall Confidence: {results.get('overall_confidence', 0.0):.3f}")
    print(f"  Risk Level: {results.get('risk_level', 'N/A')}")

    # Show temperature adjustments
    print(f"\nTemperature Summary:")
    temp_summary = results.get('temperature_summary', {})
    for modality, temp in temp_summary.items():
        print(f"  {modality}: {temp:.3f}")

    # Show detailed breakdown
    print(f"\nDetailed Results by Modality:")
    processed_modalities = results.get('processed_modalities', {})
    for modality, modality_results in processed_modalities.items():
        print(f"  {modality.upper()}:")
        forward_results = modality_results.get('forward_results', [])
        backward_results = modality_results.get('backward_results', [])
        combined_results = modality_results.get('combined_results', [])
        
        print(f"    Forward pass: {len(forward_results)} results")
        print(f"    Backward pass: {len(backward_results)} results")
        print(f"    Combined: {len(combined_results)} results")


def demo_temperature_analytics():
    """
    Demo temperature analytics and insights
    """
    print("\n" + "=" * 70)
    print("DEMO: Temperature Analytics and Insights")
    print("=" * 70)

    # Create the complete platform
    platform = create_platform()
    controller = platform["bidirectional_controller"]

    # Run some detections to generate temperature history
    content_dict = {'text': ["This is a test for temperature analytics."]}
    _ = controller.detect_with_bidirectional_control(
        content_dict=content_dict,
        temperature=1.2,
        enable_bidirectional=True
    )

    # Get analytics
    analytics = controller.get_temperature_analytics()
    
    print("Current System State:")
    print(f"  Timestamp: {analytics.get('timestamp', 'N/A')}")
    print(f"  Current Temperatures: {json.dumps(analytics.get('current_temperatures', {}), indent=2)}")
    print(f"  Adjustment Counts: {analytics.get('adjustment_counts', {})}")

    print("\nTemperature Ranges (min, max, avg):")
    temp_ranges = analytics.get('temperature_ranges', {})
    for modality, ranges in temp_ranges.items():
        print(f"  {modality:8s}: {ranges['min']:.3f} - {ranges['max']:.3f} (avg: {ranges['avg']:.3f})")


def demo_comparison_different_temperature_settings():
    """
    Demo comparison of different temperature settings
    """
    print("\n" + "=" * 70)
    print("DEMO: Comparison Across Different Temperature Settings")
    print("=" * 70)

    # Create the complete platform
    platform = create_platform()
    detector = platform["detector"]

    # Content to analyze
    content_dict = {
        'text': [
            "This content seems suspicious but might be legitimate",
            "This content appears to be factual and well-sourced"
        ]
    }

    # Test different temperature settings
    temperatures = [0.5, 1.0, 1.5, 2.0]
    
    print(f"Analyzing content across {len(temperatures)} temperature settings:\n")
    
    for temp in temperatures:
        print(f"Temperature Setting: {temp}")
        
        # Simulate applying temperature to detection (this would be different in practice)
        # Here we'll just show the concept of how temperature affects processing
        sample_logits = [0.3, 0.7]  # Example detection outputs
        scaled_probs = detector.apply_temperature_scaling(sample_logits, temp)
        
        print(f"  Original scores: {sample_logits}")
        print(f"  Scaled scores:   {scaled_probs}")
        print(f"  Max probability: {max(scaled_probs):.3f}")
        print()


def main():
    """
    Main demo function
    """
    print("ADVERSARIAL MISINFORMATION DEFENSE PLATFORM - BIDIRECTIONAL DEMO")
    print("=" * 70)
    print("This demo showcases the bidirectional processing and temperature")
    print("control capabilities of the platform.")
    print("=" * 70)

    # Run all demos
    demo_basic_bidirectional_processing()
    demo_temperature_adjustment_by_confidence()
    demo_comprehensive_bidirectional_workflow()
    demo_temperature_analytics()
    demo_comparison_different_temperature_settings()

    print("\n" + "=" * 70)
    print("BIDIRECTIONAL DEMO COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print("\nThe platform now supports:")
    print("  • Bidirectional processing (forward and backward passes)")
    print("  • Dynamic temperature controls for nuanced detection")
    print("  • Adaptive temperature adjustment based on confidence")
    print("  • Temperature analytics and monitoring")
    print("  • Temperature scaling for probabilistic outputs")


if __name__ == "__main__":
    main()