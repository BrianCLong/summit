import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

import numpy as np
import torch
from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import our new ML components
from .inference.pipeline import InferencePipeline
from .models.accelerated_gnn import GPUAcceleratedGNN, ModelOptimizer
from .monitoring.health import HealthCheck
from .monitoring.metrics import MLMetrics
from .quantum.quantum_ml import QuantumFeatureMap, QuantumGraphNeuralNetwork, QuantumOptimizer
from .training.distributed_trainer import DistributedTrainingManager, TrainingConfig

logger = logging.getLogger(__name__)


# Pydantic models for API
class ModelConfig(BaseModel):
    """Configuration for ML model creation"""

    model_type: str = Field(
        ..., description="Type of model: 'accelerated_gnn', 'quantum_gnn', 'hybrid'"
    )
    num_node_features: int = Field(128, description="Number of input node features")
    hidden_channels: int = Field(256, description="Hidden layer dimensions")
    num_classes: int = Field(10, description="Number of output classes")
    architecture: str = Field("gcn", description="GNN architecture: gcn, sage, gat")
    use_quantization: bool = Field(False, description="Enable model quantization")
    quantization_bits: int = Field(8, description="Quantization bit depth: 8 or 16")
    use_quantum: bool = Field(False, description="Enable quantum enhancements")
    quantum_qubits: int = Field(4, description="Number of quantum qubits")


class TrainingRequest(BaseModel):
    """Request for model training"""

    model_id: str = Field(..., description="Unique model identifier")
    config: ModelConfig
    training_config: dict[str, Any] = Field(default_factory=dict)
    dataset_path: str | None = Field(None, description="Path to training dataset")
    use_distributed: bool = Field(False, description="Enable distributed training")


class InferenceRequest(BaseModel):
    """Request for model inference"""

    model_id: str = Field(..., description="Model identifier")
    node_features: list[list[float]] = Field(..., description="Node feature matrix")
    edge_index: list[list[int]] = Field(..., description="Edge connectivity")
    batch_indices: list[int] | None = Field(None, description="Batch assignment for nodes")
    batch_size: int | None = Field(
        None, description="Optional micro-batch size for large graphs"
    )


class OptimizationRequest(BaseModel):
    """Request for model optimization"""

    model_id: str = Field(..., description="Model identifier")
    optimization_type: str = Field(
        "tensorrt", description="Optimization type: tensorrt, quantization, torchscript"
    )
    target_precision: str = Field("fp16", description="Target precision: fp16, int8")


class QuantumOptimizationRequest(BaseModel):
    """Request for quantum optimization"""

    problem_type: str = Field(..., description="Problem type: combinatorial, graph_coloring, tsp")
    cost_function: dict[str, Any] = Field(..., description="Cost function parameters")
    num_qubits: int = Field(8, description="Number of qubits for optimization")
    num_iterations: int = Field(100, description="Number of optimization iterations")


class ModelResponse(BaseModel):
    """Response containing model information"""

    model_id: str
    status: str
    model_type: str
    created_at: datetime
    metrics: dict[str, float] | None = None
    device: str
    memory_usage: dict[str, float] | None = None


class InferenceResponse(BaseModel):
    """Response for inference requests"""

    model_id: str
    predictions: list[list[float]]
    inference_time_ms: float
    confidence_scores: list[float] | None = None
    device: str
    cache_hit: bool | None = None


# Global state management
class MLServiceState:
    def __init__(self):
        # Initialize device early so downstream components can reference it
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        logger.info(f"ML Service initialized on device: {self.device}")

        self.models: dict[str, Any] = {}
        self.optimizers: dict[str, Any] = {}
        self.training_managers: dict[str, DistributedTrainingManager] = {}
        self.metrics = MLMetrics()
        self.health_check = HealthCheck()
        self.quantum_optimizer = QuantumOptimizer()
        self.inference_pipeline = InferencePipeline(self.device)


# Global state instance
ml_state = MLServiceState()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting ML Service...")

    # Initialize monitoring
    await ml_state.health_check.initialize()

    # Log system information
    system_info = ml_state.health_check.get_system_info()
    logger.info(f"System Info: {system_info}")

    yield

    # Shutdown
    logger.info("Shutting down ML Service...")

    # Cleanup models
    for model_id in list(ml_state.models.keys()):
        del ml_state.models[model_id]

    # Clear CUDA cache
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


# Create FastAPI app
app = FastAPI(
    title="IntelGraph ML Service",
    description="Advanced ML service with GPU acceleration, quantization, and quantum computing",
    version="2.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/health")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "timestamp": datetime.now()}


@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with system metrics"""
    health_status = await ml_state.health_check.check_health()
    return health_status


@app.get("/system/info")
async def system_info():
    """Get system information"""
    return ml_state.health_check.get_system_info()


# Model management endpoints
@app.post("/models", response_model=ModelResponse)
async def create_model(config: ModelConfig):
    """Create a new ML model"""
    try:
        model_id = f"{config.model_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Create model based on type
        if config.model_type == "accelerated_gnn":
            model = GPUAcceleratedGNN(
                num_node_features=config.num_node_features,
                hidden_channels=config.hidden_channels,
                num_classes=config.num_classes,
                architecture=config.architecture,
                use_quantization=config.use_quantization,
                quantization_bits=config.quantization_bits,
            )
        elif config.model_type == "quantum_gnn":
            model = QuantumGraphNeuralNetwork(
                num_node_features=config.num_node_features,
                hidden_channels=config.hidden_channels,
                num_classes=config.num_classes,
                num_qubits=config.quantum_qubits,
            )
        elif config.model_type == "hybrid":
            # Create hybrid quantum-classical model
            base_model = GPUAcceleratedGNN(
                num_node_features=config.num_node_features,
                hidden_channels=config.hidden_channels,
                num_classes=config.num_classes,
                architecture=config.architecture,
            )

            # Add quantum enhancement layer
            quantum_layer = QuantumGraphNeuralNetwork(
                num_node_features=config.hidden_channels,
                hidden_channels=config.hidden_channels,
                num_classes=config.num_classes,
                num_qubits=config.quantum_qubits,
            )

            # Combine models (simplified hybrid approach)
            model = base_model  # In practice, would create proper hybrid architecture
        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported model type: {config.model_type}"
            )

        # Move to device
        model = model.to(ml_state.device)

        # Store model
        ml_state.models[model_id] = {
            "model": model,
            "config": config,
            "created_at": datetime.now(),
            "status": "ready",
        }

        await ml_state.inference_pipeline.refresh_model(
            model_id, ml_state.models[model_id]
        )

        # Get memory usage
        memory_usage = model.get_memory_usage() if hasattr(model, "get_memory_usage") else None

        logger.info(f"Created model {model_id} on device {ml_state.device}")

        return ModelResponse(
            model_id=model_id,
            status="ready",
            model_type=config.model_type,
            created_at=datetime.now(),
            device=str(ml_state.device),
            memory_usage=memory_usage,
        )

    except Exception as e:
        logger.error(f"Failed to create model: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Model creation failed: {str(e)}")


@app.get("/models")
async def list_models():
    """List all created models"""
    models = []
    for model_id, model_data in ml_state.models.items():
        memory_usage = None
        if hasattr(model_data["model"], "get_memory_usage"):
            memory_usage = model_data["model"].get_memory_usage()

        models.append(
            ModelResponse(
                model_id=model_id,
                status=model_data["status"],
                model_type=model_data["config"].model_type,
                created_at=model_data["created_at"],
                device=str(ml_state.device),
                memory_usage=memory_usage,
            )
        )

    return {"models": models}


@app.get("/models/{model_id}")
async def get_model(model_id: str):
    """Get information about a specific model"""
    if model_id not in ml_state.models:
        raise HTTPException(status_code=404, detail="Model not found")

    model_data = ml_state.models[model_id]
    memory_usage = None
    if hasattr(model_data["model"], "get_memory_usage"):
        memory_usage = model_data["model"].get_memory_usage()

    return ModelResponse(
        model_id=model_id,
        status=model_data["status"],
        model_type=model_data["config"].model_type,
        created_at=model_data["created_at"],
        device=str(ml_state.device),
        memory_usage=memory_usage,
    )


@app.delete("/models/{model_id}")
async def delete_model(model_id: str):
    """Delete a model"""
    if model_id not in ml_state.models:
        raise HTTPException(status_code=404, detail="Model not found")

    # Clean up model
    del ml_state.models[model_id]

    await ml_state.inference_pipeline.evict_model(model_id)

    # Clean up associated training manager
    if model_id in ml_state.training_managers:
        del ml_state.training_managers[model_id]

    # Clear CUDA cache
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    logger.info(f"Deleted model {model_id}")
    return {"message": "Model deleted successfully"}


# Training endpoints
@app.post("/models/{model_id}/train")
async def train_model(model_id: str, request: TrainingRequest, background_tasks: BackgroundTasks):
    """Start training a model"""
    if model_id not in ml_state.models:
        raise HTTPException(status_code=404, detail="Model not found")

    model_data = ml_state.models[model_id]

    # Create training configuration
    training_config = TrainingConfig(**request.training_config)

    # Create training manager
    if request.use_distributed:
        training_manager = DistributedTrainingManager(training_config)
        ml_state.training_managers[model_id] = training_manager

    # Update model status
    ml_state.models[model_id]["status"] = "training"

    # Start training in background
    background_tasks.add_task(
        _train_model_background, model_id, model, training_config, request.use_distributed
    )

    return {"message": "Training started", "model_id": model_id}


async def _train_model_background(
    model_id: str, model: torch.nn.Module, config: TrainingConfig, use_distributed: bool
):
    """Background task for model training"""
    try:
        logger.info(f"Starting training for model {model_id}")

        if use_distributed and model_id in ml_state.training_managers:
            training_manager = ml_state.training_managers[model_id]

            # Create dummy dataset for demonstration
            # In practice, would load real dataset
            train_dataset = _create_dummy_dataset(config.batch_size * 10)
            eval_dataset = _create_dummy_dataset(config.batch_size * 2)

            # Start distributed training
            training_manager.train(model, train_dataset, eval_dataset)
        else:
            # Simple training loop
            optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
            criterion = torch.nn.CrossEntropyLoss()

            for epoch in range(min(config.num_epochs, 10)):  # Limit for demo
                # Dummy training step
                model.train()

                # Create dummy batch
                dummy_x = torch.randn(32, config.num_node_features, device=ml_state.device)
                dummy_edge_index = torch.randint(0, 32, (2, 64), device=ml_state.device)
                dummy_y = torch.randint(0, config.num_classes, (32,), device=ml_state.device)

                # Forward pass
                outputs = model(dummy_x, dummy_edge_index)
                loss = criterion(outputs, dummy_y)

                # Backward pass
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()

                if epoch % 5 == 0:
                    logger.info(f"Model {model_id} - Epoch {epoch}, Loss: {loss.item():.4f}")

        # Update model status
        ml_state.models[model_id]["status"] = "trained"
        await ml_state.inference_pipeline.refresh_model(model_id, ml_state.models[model_id])
        logger.info(f"Training completed for model {model_id}")

    except Exception as e:
        logger.error(f"Training failed for model {model_id}: {str(e)}")
        ml_state.models[model_id]["status"] = "error"


def _create_dummy_dataset(size: int):
    """Create dummy dataset for training demonstration"""
    # This would be replaced with real dataset loading
    return [torch.randn(10) for _ in range(size)]


# Inference endpoints
@app.post("/models/{model_id}/predict", response_model=InferenceResponse)
async def predict(model_id: str, request: InferenceRequest):
    """Run inference on a model"""
    if model_id not in ml_state.models:
        raise HTTPException(status_code=404, detail="Model not found")

    model_data = ml_state.models[model_id]
    model = model_data["model"]

    if model_data["status"] != "ready" and model_data["status"] != "trained":
        raise HTTPException(
            status_code=400, detail=f"Model not ready for inference. Status: {model_data['status']}"
        )

    try:
        inference_result = await ml_state.inference_pipeline.run_inference(
            model_id=model_id,
            model_data=model_data,
            node_features=request.node_features,
            edge_index=request.edge_index,
            batch_indices=request.batch_indices,
            requested_batch_size=request.batch_size,
        )

        return InferenceResponse(
            model_id=model_id,
            predictions=inference_result.predictions,
            inference_time_ms=inference_result.duration_ms,
            confidence_scores=inference_result.confidence_scores,
            device=str(ml_state.device),
            cache_hit=inference_result.cache_hit,
        )

    except Exception as e:
        logger.error(f"Inference failed for model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")


# Optimization endpoints
@app.post("/models/{model_id}/optimize")
async def optimize_model(model_id: str, request: OptimizationRequest):
    """Optimize a model for deployment"""
    if model_id not in ml_state.models:
        raise HTTPException(status_code=404, detail="Model not found")

    model_data = ml_state.models[model_id]
    model = model_data["model"]

    try:
        if request.optimization_type == "torchscript":
            # Create example input for tracing
            example_x = torch.randn(
                1, model_data["config"].num_node_features, device=ml_state.device
            )
            example_edge_index = torch.randint(0, 1, (2, 2), device=ml_state.device)

            optimized_model = ModelOptimizer.compile_for_inference(
                model, (example_x, example_edge_index)
            )

        elif request.optimization_type == "tensorrt":
            # TensorRT optimization
            example_x = torch.randn(
                1, model_data["config"].num_node_features, device=ml_state.device
            )
            example_edge_index = torch.randint(0, 1, (2, 2), device=ml_state.device)

            # First compile to TorchScript
            traced_model = ModelOptimizer.compile_for_inference(
                model, (example_x, example_edge_index)
            )

            # Then apply TensorRT
            optimized_model = ModelOptimizer.apply_tensorrt_optimization(
                traced_model, (example_x, example_edge_index), request.target_precision
            )

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported optimization type: {request.optimization_type}",
            )

        # Replace original model with optimized version
        ml_state.models[model_id]["model"] = optimized_model
        ml_state.models[model_id]["status"] = "optimized"

        logger.info(f"Model {model_id} optimized with {request.optimization_type}")

        await ml_state.inference_pipeline.refresh_model(model_id, ml_state.models[model_id])

        return {
            "message": f"Model optimized with {request.optimization_type}",
            "model_id": model_id,
        }

    except Exception as e:
        logger.error(f"Optimization failed for model {model_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


# Quantum computing endpoints
@app.post("/quantum/optimize")
async def quantum_optimize(request: QuantumOptimizationRequest):
    """Run quantum optimization algorithm"""
    try:
        # Define cost function based on problem type
        if request.problem_type == "combinatorial":

            def cost_function(params):
                return np.sum(params * np.random.random(len(params)))

        elif request.problem_type == "graph_coloring":

            def cost_function(params):
                # Simplified graph coloring cost
                return np.sum((params[:-1] - params[1:]) ** 2)

        else:
            raise HTTPException(
                status_code=400, detail=f"Unsupported problem type: {request.problem_type}"
            )

        # Run quantum optimization
        optimal_params = ml_state.quantum_optimizer.qaoa_optimization(
            cost_function=cost_function, num_parameters=request.num_qubits
        )

        # Calculate final cost
        final_cost = cost_function(optimal_params)

        return {
            "optimal_parameters": optimal_params.tolist(),
            "final_cost": float(final_cost),
            "num_qubits": request.num_qubits,
            "num_iterations": request.num_iterations,
        }

    except Exception as e:
        logger.error(f"Quantum optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quantum optimization failed: {str(e)}")


@app.post("/quantum/feature_map")
async def quantum_feature_mapping(data: dict[str, list[list[float]]]):
    """Apply quantum feature mapping to classical data"""
    try:
        input_data = np.array(data["features"])

        # Create quantum feature mapper
        num_qubits = min(8, input_data.shape[1])  # Limit qubits for practical reasons
        feature_mapper = QuantumFeatureMap(num_qubits=num_qubits, num_layers=2)

        # Apply quantum feature mapping
        quantum_features = feature_mapper.encode_classical_data(input_data)

        return {
            "quantum_features": quantum_features.tolist(),
            "original_shape": input_data.shape,
            "quantum_shape": quantum_features.shape,
            "num_qubits_used": num_qubits,
        }

    except Exception as e:
        logger.error(f"Quantum feature mapping failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Quantum feature mapping failed: {str(e)}")


# Metrics and monitoring endpoints
@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return ml_state.metrics.get_all_metrics()


@app.get("/metrics/models")
async def get_model_metrics():
    """Get metrics for all models"""
    model_metrics = {}

    for model_id, model_data in ml_state.models.items():
        model = model_data["model"]

        metrics = {
            "status": model_data["status"],
            "created_at": model_data["created_at"].isoformat(),
            "model_type": model_data["config"].model_type,
        }

        # Add memory usage if available
        if hasattr(model, "get_memory_usage"):
            metrics["memory_usage"] = model.get_memory_usage()

        model_metrics[model_id] = metrics

    return {"model_metrics": model_metrics}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
