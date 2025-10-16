# Graph Neural Networks (GNN) Implementation

This document describes the advanced Graph Neural Network implementation in IntelGraph for deep graph analysis and intelligence operations.

## Overview

The GNN implementation provides state-of-the-art graph deep learning capabilities for:

- **Node Classification**: Classify entities/nodes based on graph structure and features
- **Link Prediction**: Predict missing or future relationships between entities
- **Graph Classification**: Classify entire graph structures or subgraphs
- **Anomaly Detection**: Identify suspicious nodes/patterns in intelligence graphs
- **Embedding Generation**: Create dense vector representations of nodes for downstream tasks

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    IntelGraph GNN Stack                    │
├─────────────────────────────────────────────────────────────┤
│  GraphQL API          │  REST API         │  Node.js       │
│  (gnnResolvers.js)    │  (main.py)        │  (GNNService)  │
├─────────────────────────────────────────────────────────────┤
│                    GNN Model Manager                       │
│  - Model Lifecycle    │  - Training       │  - Inference   │
│  - Persistence        │  - Evaluation     │  - Deployment  │
├─────────────────────────────────────────────────────────────┤
│                      GNN Models                            │
│  GraphSAGE   │  GAT    │  GIN    │  Transformer │  Hierarchical │
├─────────────────────────────────────────────────────────────┤
│                   PyTorch Geometric                        │
│  - Graph Data         │  - Message Passing │  - Pooling    │
│  - Sampling           │  - Batching        │  - Utils      │
├─────────────────────────────────────────────────────────────┤
│                      Celery Tasks                          │
│  - Async Processing   │  - Queue Management │  - Monitoring │
└─────────────────────────────────────────────────────────────┘
```

### Supported GNN Architectures

1. **GraphSAGE**: Scalable graph convolution with neighbor sampling
2. **Graph Attention Networks (GAT)**: Attention-based node aggregation
3. **Graph Transformer**: Transformer architecture adapted for graphs
4. **Graph Isomorphism Networks (GIN)**: Powerful graph classification
5. **Hierarchical GNN**: Multi-scale graph analysis

## Quick Start

### 1. Basic Node Classification

```python
# Python API
from app.models.gnn import gnn_manager

# Create model
model = gnn_manager.create_model(
    model_name='entity_classifier',
    node_feature_dim=64,
    model_type='graphsage',
    task_type='node_classification',
    num_classes=5
)

# Train model (simplified)
# ... training code ...

# Make predictions
result = gnn_manager.predict(
    model_name='entity_classifier',
    graph_data=pyg_data,
    return_embeddings=True
)
```

```javascript
// GraphQL API
mutation {
  gnnNodeClassification(input: {
    investigationId: "inv-123"
    graphData: {
      edges: [["person1", "org1"], ["person1", "loc1"]]
    }
    nodeFeatures: "{\"person1\": [1.0, 2.0], \"org1\": [3.0, 4.0]}"
    modelName: "entity_classifier"
    taskMode: "predict"
  }) {
    success
    jobId
    taskId
    message
  }
}
```

### 2. Link Prediction

```javascript
// Predict missing relationships
mutation {
  gnnLinkPrediction(input: {
    investigationId: "inv-123"
    graphData: {
      edges: [["A", "B"], ["B", "C"], ["C", "D"]]
    }
    candidateEdges: [["A", "C"], ["A", "D"], ["B", "D"]]
    modelName: "relationship_predictor"
    taskMode: "predict"
  }) {
    success
    jobId
    taskId
  }
}
```

### 3. Anomaly Detection

```javascript
// Detect suspicious entities
mutation {
  gnnAnomalyDetection(input: {
    investigationId: "inv-123"
    graphData: {
      edges: [["suspect1", "account1"], ["account1", "bank1"]]
    }
    normalNodes: ["bank1", "account2", "person2"]
    anomalyThreshold: 0.7
    modelName: "fraud_detector"
  }) {
    success
    jobId
    taskId
  }
}
```

## Model Types and Use Cases

### GraphSAGE

- **Best for**: Large-scale graphs, node classification
- **Strengths**: Scalable, inductive learning, handles new nodes
- **Use cases**: Entity classification, social network analysis

### Graph Attention Networks (GAT)

- **Best for**: Finding important neighbors, explainable AI
- **Strengths**: Attention weights, interpretability
- **Use cases**: Anomaly detection, threat analysis, relationship importance

### Graph Transformer

- **Best for**: Long-range dependencies, complex patterns
- **Strengths**: Global attention, powerful representation
- **Use cases**: Complex threat detection, multi-hop reasoning

### Graph Isomorphism Networks (GIN)

- **Best for**: Graph classification, structural analysis
- **Strengths**: Theoretical guarantees, distinguishing power
- **Use cases**: Network topology classification, pattern recognition

### Hierarchical GNN

- **Best for**: Multi-scale analysis, large graphs
- **Strengths**: Hierarchical patterns, scalability
- **Use cases**: Organization analysis, community detection

## Training and Deployment

### Training Workflow

1. **Data Preparation**

   ```python
   # Convert NetworkX to PyTorch Geometric
   pyg_data = GNNDataProcessor.networkx_to_pyg(
       nx_graph,
       node_features=features,
       node_labels=labels
   )
   ```

2. **Model Creation**

   ```python
   model = gnn_manager.create_model(
       model_name='custom_model',
       node_feature_dim=feature_dim,
       model_type='gat',
       task_type='node_classification',
       num_classes=num_classes
   )
   ```

3. **Training**

   ```python
   trainer = GNNTrainer(model)
   results = trainer.train(
       train_loader=train_loader,
       val_loader=val_loader,
       task_type='node_classification',
       num_epochs=100
   )
   ```

4. **Model Persistence**
   ```python
   gnn_manager.save_model('custom_model', metrics=results['final_val_metrics'])
   ```

### Production Deployment

- **Model Serving**: FastAPI endpoints with async processing
- **Scalability**: Celery task queue for batch processing
- **Monitoring**: Prometheus metrics for model performance
- **Version Control**: Model versioning and rollback capability

## API Reference

### REST Endpoints

| Endpoint                    | Method | Description                     |
| --------------------------- | ------ | ------------------------------- |
| `/gnn/node_classification`  | POST   | Queue node classification task  |
| `/gnn/link_prediction`      | POST   | Queue link prediction task      |
| `/gnn/graph_classification` | POST   | Queue graph classification task |
| `/gnn/anomaly_detection`    | POST   | Queue anomaly detection task    |
| `/gnn/generate_embeddings`  | POST   | Queue embedding generation task |
| `/gnn/models`               | GET    | List available models           |
| `/gnn/models/{name}`        | GET    | Get model information           |
| `/gnn/models/{name}`        | DELETE | Delete model                    |

### GraphQL Mutations

- `gnnNodeClassification(input: GNNNodeClassificationInput!): GNNTaskResponse!`
- `gnnLinkPrediction(input: GNNLinkPredictionInput!): GNNTaskResponse!`
- `gnnGraphClassification(input: GNNGraphClassificationInput!): GNNTaskResponse!`
- `gnnAnomalyDetection(input: GNNAnomalyDetectionInput!): GNNTaskResponse!`
- `gnnGenerateEmbeddings(input: GNNEmbeddingGenerationInput!): GNNTaskResponse!`

### GraphQL Queries

- `gnnModels: GNNModelsResponse!`
- `gnnModel(name: String!): GNNModel!`

## Data Formats

### Graph Data Input

```javascript
// Edge list format
{
  "edges": [["node1", "node2"], ["node2", "node3"]]
}

// Full graph format
{
  "nodes": [
    {"id": "node1", "type": "PERSON", "name": "John"},
    {"id": "node2", "type": "ORG", "name": "Acme Corp"}
  ],
  "edges": [
    {"source": "node1", "target": "node2", "type": "WORKS_FOR"}
  ]
}
```

### Node Features

```javascript
// Numeric features per node
{
  "node1": [1.0, 2.5, 0.8],
  "node2": [2.1, 1.3, 0.9],
  "node3": [0.5, 3.2, 1.1]
}
```

### Model Configuration

```javascript
{
  "model_type": "gat",
  "hidden_dim": 256,
  "output_dim": 128,
  "num_layers": 3,
  "num_heads": 8,
  "dropout": 0.2,
  "learning_rate": 0.001
}
```

## Performance Optimization

### Memory Management

- **Batch Processing**: Configurable batch sizes for large graphs
- **Graph Sampling**: Neighbor sampling for scalability
- **Gradient Checkpointing**: Reduce memory during training

### GPU Acceleration

- **CUDA Support**: Automatic GPU utilization when available
- **Mixed Precision**: FP16 training for faster processing
- **Multi-GPU**: Support for distributed training (future)

### Caching

- **Model Caching**: Persistent model storage and loading
- **Feature Caching**: Cache computed node features
- **Result Caching**: Cache predictions for repeated queries

## Monitoring and Observability

### Metrics Tracked

- Model training metrics (loss, accuracy, F1-score)
- Inference latency and throughput
- Memory and GPU utilization
- Queue depth and processing times
- Model accuracy and drift

### Health Checks

- Model availability and loading status
- GPU availability and memory
- Task queue health
- Model performance benchmarks

## Intelligence Use Cases

### 1. Threat Actor Classification

```javascript
// Classify entities in a threat intelligence graph
mutation {
  gnnNodeClassification(input: {
    investigationId: "threat-analysis-001"
    graphData: {
      edges: [
        ["actor1", "malware1"],
        ["malware1", "campaign1"],
        ["campaign1", "target1"]
      ]
    }
    nodeFeatures: "{...}" // TTPs, timestamps, etc.
    modelName: "threat_actor_classifier"
    modelConfig: "{\"num_classes\": 4}" // APT, Cybercriminal, etc.
  })
}
```

### 2. Financial Crime Detection

```javascript
// Detect suspicious financial relationships
mutation {
  gnnAnomalyDetection(input: {
    investigationId: "aml-investigation"
    graphData: {
      edges: [
        ["account1", "account2"],
        ["account2", "shell_company"],
        ["shell_company", "offshore_bank"]
      ]
    }
    normalNodes: ["legitimate_bank", "regulated_entity"]
    anomalyThreshold: 0.8
    modelName: "financial_crime_detector"
  })
}
```

### 3. Social Network Analysis

```javascript
// Predict relationships in social networks
mutation {
  gnnLinkPrediction(input: {
    investigationId: "social-network-analysis"
    graphData: {
      edges: [["person1", "person2"], ["person2", "person3"]]
    }
    candidateEdges: [["person1", "person3"], ["person1", "person4"]]
    modelName: "social_relationship_predictor"
  })
}
```

### 4. Communication Pattern Analysis

```javascript
// Classify communication patterns
mutation {
  gnnGraphClassification(input: {
    investigationId: "comms-analysis"
    graphs: [
      {"edges": [["phone1", "phone2"], ["phone2", "phone3"]]},
      {"edges": [["email1", "email2"], ["email2", "email3"]]}
    ]
    modelName: "communication_pattern_classifier"
    modelConfig: "{\"num_classes\": 3}" // normal, suspicious, criminal
  })
}
```

## Advanced Features

### Custom Loss Functions

- Focal loss for imbalanced datasets
- Contrastive loss for embedding learning
- Multi-task learning objectives

### Ensemble Methods

- Model averaging across different architectures
- Voting schemes for classification
- Uncertainty quantification

### Explainability

- Attention weight visualization
- SHAP values for graph features
- Counterfactual explanations

### Active Learning

- Uncertainty-based sample selection
- Graph-based active learning strategies
- Human-in-the-loop training

## Troubleshooting

### Common Issues

**Out of Memory Errors**:

```python
# Reduce batch size
model_config = {"batch_size": 16}

# Use gradient checkpointing
model_config = {"gradient_checkpointing": True}
```

**Poor Model Performance**:

```python
# Increase model capacity
model_config = {
    "hidden_dim": 512,
    "num_layers": 4,
    "dropout": 0.1
}

# Adjust learning rate
training_config = {"learning_rate": 0.0001}
```

**Slow Training**:

```python
# Enable GPU acceleration
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Use mixed precision
model_config = {"use_amp": True}
```

### Debug Commands

```bash
# Check GPU availability
python -c "import torch; print(torch.cuda.is_available())"

# Monitor GPU usage
nvidia-smi -l 1

# Check model parameters
curl -X GET http://localhost:8001/gnn/models/model_name

# Monitor task queue
celery -A app.celery_app inspect active
```

## Security Considerations

### Model Security

- Input validation and sanitization
- Model versioning and integrity checks
- Access control for model operations
- Audit logging for model usage

### Data Privacy

- Feature anonymization techniques
- Differential privacy during training
- Secure multi-party computation
- Graph anonymization methods

### Infrastructure Security

- Encrypted model storage
- Secure API endpoints
- Network isolation for training
- Container security best practices

## Future Enhancements

### Research Directions

- **Temporal GNNs**: Handle dynamic/evolving graphs
- **Heterogeneous GNNs**: Multi-type nodes and edges
- **Federated GNNs**: Distributed privacy-preserving learning
- **Quantum GNNs**: Quantum computing for graph problems

### Platform Integration

- **Real-time Inference**: Streaming graph analysis
- **Automated ML**: AutoML for GNN architecture search
- **Edge Deployment**: Mobile/edge device inference
- **Cloud Integration**: Multi-cloud GNN services

This implementation provides a comprehensive foundation for advanced graph analysis in intelligence operations, with production-ready scalability, monitoring, and security features.
