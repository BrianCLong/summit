#!/usr/bin/env python3
"""
Test script to verify our advanced ML implementation
"""

import os
import sys
import traceback

import numpy as np
import torch

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))


def test_gpu_accelerated_gnn():
    """Test GPU accelerated GNN model"""
    print("Testing GPU Accelerated GNN...")
    try:
        from models.accelerated_gnn import GPUAcceleratedGNN

        # Create model
        model = GPUAcceleratedGNN(
            num_node_features=64,
            hidden_channels=128,
            num_classes=10,
            architecture="gcn",
            use_quantization=False,
        )

        # Test forward pass
        x = torch.randn(100, 64)
        edge_index = torch.randint(0, 100, (2, 200))

        with torch.no_grad():
            output = model(x, edge_index)

        print("✓ GPU GNN model created successfully")
        print(f"  Input shape: {x.shape}")
        print(f"  Output shape: {output.shape}")
        print(f"  Device: {next(model.parameters()).device}")

        # Test memory usage
        memory_usage = model.get_memory_usage()
        print(f"  Memory usage: {memory_usage}")

        return True

    except Exception as e:
        print(f"✗ GPU GNN test failed: {e}")
        traceback.print_exc()
        return False


def test_quantum_ml():
    """Test quantum ML integration"""
    print("\nTesting Quantum ML Integration...")
    try:
        from quantum.quantum_ml import QuantumGraphNeuralNetwork, QuantumOptimizer

        # Create quantum GNN (will fall back to classical if quantum backend unavailable)
        model = QuantumGraphNeuralNetwork(
            num_node_features=32, hidden_channels=64, num_classes=5, num_qubits=4
        )

        # Test forward pass
        x = torch.randn(50, 32)
        edge_index = torch.randint(0, 50, (2, 100))

        with torch.no_grad():
            output = model(x, edge_index)

        print("✓ Quantum GNN model created successfully")
        print(f"  Input shape: {x.shape}")
        print(f"  Output shape: {output.shape}")

        # Test quantum optimizer
        optimizer = QuantumOptimizer(num_qubits=4, num_iterations=10)

        def simple_cost(params):
            return np.sum(params**2)

        result = optimizer.qaoa_optimization(simple_cost, 4)
        print(f"  Quantum optimization result shape: {result.shape}")

        return True

    except Exception as e:
        print(f"✗ Quantum ML test failed: {e}")
        traceback.print_exc()
        return False


def test_distributed_training():
    """Test distributed training infrastructure"""
    print("\nTesting Distributed Training...")
    try:
        from training.distributed_trainer import DistributedTrainingManager, TrainingConfig

        # Create training configuration
        config = TrainingConfig(
            model_name="test_gnn",
            num_node_features=32,
            hidden_channels=64,
            num_classes=5,
            batch_size=16,
            num_epochs=1,  # Just test setup
            world_size=1,  # Single process for testing
        )

        # Create training manager
        trainer = DistributedTrainingManager(config)

        print("✓ Distributed training manager created successfully")
        print(f"  Configuration: {config.model_name}")
        print(f"  Batch size: {config.batch_size}")
        print(f"  World size: {config.world_size}")

        return True

    except Exception as e:
        print(f"✗ Distributed training test failed: {e}")
        traceback.print_exc()
        return False


def test_monitoring():
    """Test monitoring and health check systems"""
    print("\nTesting Monitoring Systems...")
    try:
        from monitoring.health import HealthCheck
        from monitoring.metrics import MLMetrics

        # Test metrics collection
        metrics = MLMetrics()

        # Record some sample metrics
        metrics.record_inference(
            model_id="test_model", inference_time_ms=50.0, batch_size=32, memory_usage_mb=256.0
        )

        # Get current status
        status = metrics.get_current_status()

        print("✓ Metrics system working")
        print(f"  Status timestamp: {status['timestamp']}")

        # Test health checks
        health_check = HealthCheck()

        print("✓ Health check system initialized")
        print(f"  GPU available: {health_check.gpu_checker.gpu_available}")
        print(f"  Number of GPUs: {health_check.gpu_checker.num_gpus}")

        return True

    except Exception as e:
        print(f"✗ Monitoring test failed: {e}")
        traceback.print_exc()
        return False


def test_api_components():
    """Test API components can be imported"""
    print("\nTesting API Components...")
    try:
        # Test that we can import the API module components
        import torch
        from models.accelerated_gnn import GPUAcceleratedGNN

        # Test model creation for API
        model = GPUAcceleratedGNN(num_node_features=128, hidden_channels=256, num_classes=10)

        print("✓ API model components working")
        print(f"  Model type: {type(model).__name__}")
        print(f"  PyTorch version: {torch.__version__}")
        print(f"  CUDA available: {torch.cuda.is_available()}")

        return True

    except Exception as e:
        print(f"✗ API components test failed: {e}")
        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("🚀 IntelGraph Advanced ML Implementation Test Suite")
    print("=" * 60)

    tests = [
        test_gpu_accelerated_gnn,
        test_quantum_ml,
        test_distributed_training,
        test_monitoring,
        test_api_components,
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 60)
    print(f"Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Advanced ML implementation is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
