# IntelGraph Advanced ML Service

A next-generation machine learning service featuring GPU acceleration, quantum computing integration, distributed training, and enterprise-grade monitoring.

## 🚀 Features

### Core ML Capabilities

- **GPU-Accelerated GNNs**: High-performance Graph Neural Networks with CUDA support
- **Model Quantization**: INT8/FP16 precision optimization for deployment
- **Distributed Training**: Multi-GPU and multi-node training with Accelerate/DeepSpeed
- **Quantum ML Integration**: Quantum-enhanced algorithms with classical fallbacks
- **Advanced Monitoring**: Real-time performance metrics and health checks
- **Edge Deployment**: On-device image, audio, and text analysis with offline-first pipelines

### Architecture Support

- **Multiple GNN Types**: GCN, GraphSAGE, GAT architectures
- **Hybrid Models**: Classical-quantum hybrid neural networks
- **TensorRT Optimization**: Production-ready inference acceleration
- **Mixed Precision**: FP16/BF16 training for memory efficiency

## 📁 Project Structure

```
ml/
├── app/
│   ├── api.py                      # FastAPI service endpoints
│   ├── models/
│   │   ├── accelerated_gnn.py      # GPU-accelerated GNN models
│   │   └── gnn_model.py           # Base GNN implementations
│   ├── quantum/
│   │   └── quantum_ml.py          # Quantum ML framework
│   ├── training/
│   │   └── distributed_trainer.py # Distributed training infrastructure
│   ├── monitoring/
│   │   ├── metrics.py             # Performance metrics collection
│   │   └── health.py              # Health check systems
│   ├── tasks/
│   └── edge/                     # Offline processors & sync utilities
├── pyproject.toml                  # Python dependencies
├── simple_test.py                  # Concept verification tests
└── README.md                       # This file
```

## 🛠️ Installation

### 1. Basic Setup

```bash
# Install basic dependencies
pip install torch numpy scikit-learn

# Install PyTorch Geometric for GNN support
pip install torch-geometric

# Install monitoring dependencies
pip install psutil prometheus-client

# Install API framework
pip install fastapi uvicorn pydantic
```

### 2. GPU Acceleration (Optional)

```bash
# For NVIDIA GPUs with CUDA
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# For advanced GPU features
pip install tensorrt torch-tensorrt  # Requires NVIDIA TensorRT
pip install bitsandbytes            # For quantization
pip install pynvml                  # For GPU monitoring
```

### 3. Quantum Computing (Optional)

```bash
# For quantum features
pip install qiskit qiskit-aer       # IBM Qiskit
pip install cirq                    # Google Cirq
```

### 4. Distributed Training (Optional)

```bash
# For large-scale training
pip install accelerate             # Hugging Face Accelerate
pip install deepspeed              # Microsoft DeepSpeed
```

## 🚀 Quick Start

### 1. Verify Installation

```bash
python3 simple_test.py
```

### 2. Start the ML Service

```bash
# Development mode
python -m uvicorn app.api:app --reload --host 0.0.0.0 --port 8000

# Production mode
python -m uvicorn app.api:app --host 0.0.0.0 --port 8000 --workers 4
```

### 3. Access the API

- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **System Info**: http://localhost:8000/system/info

## 📖 Usage Examples

### Creating a GPU-Accelerated GNN Model

```python
from app.models.accelerated_gnn import GPUAcceleratedGNN

# Create model
model = GPUAcceleratedGNN(
    num_node_features=128,
    hidden_channels=256,
    num_classes=10,
    architecture="gcn",
    use_quantization=True,
    quantization_bits=8
)

# Run inference
import torch
x = torch.randn(100, 128)
edge_index = torch.randint(0, 100, (2, 200))

with torch.no_grad():
    predictions = model(x, edge_index)
```

### Quantum-Enhanced GNN

```python
from app.quantum.quantum_ml import QuantumGraphNeuralNetwork

model = QuantumGraphNeuralNetwork(
    num_node_features=64,
    hidden_channels=128,
    num_classes=5,
    num_qubits=4
)

# Works with classical fallback if quantum backend unavailable
output = model(x, edge_index)
```

### Distributed Training

```python
from app.training.distributed_trainer import DistributedTrainingManager, TrainingConfig

config = TrainingConfig(
    model_name="production_gnn",
    batch_size=64,
    learning_rate=0.001,
    use_mixed_precision=True,
    use_distributed=True
)

trainer = DistributedTrainingManager(config)
trainer.train(model, train_dataset, eval_dataset)
```

## 🔌 API Endpoints

### Model Management

- `POST /models` - Create new model
- `GET /models` - List all models
- `GET /models/{model_id}` - Get model info
- `DELETE /models/{model_id}` - Delete model

### Training & Inference

- `POST /models/{model_id}/train` - Start training
- `POST /models/{model_id}/predict` - Run inference
- `POST /models/{model_id}/optimize` - Optimize model

### Quantum Computing

- `POST /quantum/optimize` - Run quantum optimization
- `POST /quantum/feature_map` - Apply quantum feature mapping

### Monitoring

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system health
- `GET /metrics` - Performance metrics
- `GET /system/info` - System information

## 📊 Performance Features

### GPU Acceleration

- **CUDA Support**: Automatic GPU detection and utilization
- **Memory Optimization**: Efficient GPU memory management
- **Batch Processing**: Optimized batch inference
- **TensorRT Integration**: Production inference acceleration

### Model Optimization

- **Quantization**: INT8/FP16 precision reduction
- **TorchScript Compilation**: JIT optimization
- **Memory Profiling**: Real-time memory usage tracking
- **Benchmark Tools**: Performance measurement utilities

### Distributed Training

- **Multi-GPU**: Data parallel training across GPUs
- **Multi-Node**: Distributed training across machines
- **Mixed Precision**: FP16/BF16 memory optimization
- **Gradient Accumulation**: Large batch simulation
- **Checkpointing**: Automatic model saving/loading

## 🔬 Quantum Computing Features

### Quantum Algorithms

- **QAOA**: Quantum Approximate Optimization Algorithm
- **VQE**: Variational Quantum Eigensolver
- **Quantum Neural Networks**: Hybrid classical-quantum models
- **Feature Mapping**: Quantum feature encoding

### Backend Support

- **Qiskit**: IBM quantum framework
- **Classical Simulation**: Automatic fallback for development
- **Noise Models**: Realistic quantum device simulation

## 📈 Monitoring & Observability

### System Metrics

- **CPU/Memory Usage**: Real-time system monitoring
- **GPU Metrics**: Utilization, memory, temperature
- **Network I/O**: Data transfer monitoring
- **Disk Usage**: Storage utilization

### ML Metrics

- **Inference Time**: Per-model performance tracking
- **Throughput**: Samples per second measurement
- **Accuracy**: Model performance metrics
- **Memory Usage**: Model-specific memory consumption

### Health Checks

- **Component Status**: Individual system component health
- **Service Connectivity**: External service monitoring
- **GPU Health**: Temperature, power, utilization checks
- **PyTorch Status**: CUDA availability and functionality

## 🛡️ Production Considerations

### Security

- **Input Validation**: Comprehensive request validation
- **Error Handling**: Graceful error management
- **Resource Limits**: Memory and computation bounds
- **Authentication**: API key support (when configured)

### Scalability

- **Horizontal Scaling**: Multiple service instances
- **Load Balancing**: Request distribution
- **Caching**: Model and result caching
- **Resource Management**: Automatic cleanup

### Reliability

- **Health Monitoring**: Continuous system health checks
- **Graceful Degradation**: Fallback mechanisms
- **Error Recovery**: Automatic retry logic
- **Logging**: Comprehensive operation logging

## 🔧 Configuration

### Environment Variables

```bash
# Service configuration
ML_SERVICE_PORT=8000
ML_SERVICE_HOST=0.0.0.0

# GPU settings
CUDA_VISIBLE_DEVICES=0,1,2,3
PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512

# Monitoring
ENABLE_METRICS_COLLECTION=true
METRICS_COLLECTION_INTERVAL=1.0

# Quantum computing
QUANTUM_BACKEND=qiskit
QUANTUM_SIMULATOR=aer
```

### Model Configuration

```python
# GPU Accelerated GNN
model_config = {
    "num_node_features": 128,
    "hidden_channels": 256,
    "num_classes": 10,
    "architecture": "gcn",  # gcn, sage, gat
    "use_quantization": True,
    "quantization_bits": 8,
    "use_mixed_precision": True
}

# Training Configuration
training_config = {
    "batch_size": 32,
    "learning_rate": 0.001,
    "num_epochs": 100,
    "use_distributed": True,
    "gradient_accumulation_steps": 4,
    "max_grad_norm": 1.0
}
```

## 🧪 Testing

### Run All Tests

```bash
# Basic concept verification
python3 simple_test.py

# Full implementation test (requires all dependencies)
python3 test_implementation.py
```

### Performance Benchmarking

```bash
# Model performance benchmarking
python -c "
from app.models.accelerated_gnn import ModelOptimizer, GPUAcceleratedGNN
import torch

model = GPUAcceleratedGNN(64, 128, 10)
x = torch.randn(100, 64)
edge_index = torch.randint(0, 100, (2, 200))

results = ModelOptimizer.benchmark_model(model, (x, edge_index))
print(f'Benchmark results: {results}')
"
```

## 📚 Advanced Topics

### Custom Model Architectures

- Extend `GPUAcceleratedGNN` for custom architectures
- Implement custom quantum layers
- Add new optimization techniques

### Integration with Existing Systems

- Neo4j graph database integration
- Redis caching layer
- Prometheus metrics export
- Grafana dashboard setup

### Deployment Strategies

- Docker containerization
- Kubernetes orchestration
- Cloud provider integration
- Edge device deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Projects

- **IntelGraph Server**: Main intelligence analysis platform
- **IntelGraph Client**: Web-based user interface
- **IntelGraph Python**: Python SDK for data processing

## 📞 Support

For technical support, please:

1. Check the documentation
2. Run diagnostic tests
3. Review system logs
4. Contact the development team

---

**Built with ❤️ for next-generation intelligence analysis**
