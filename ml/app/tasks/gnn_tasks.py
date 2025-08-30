"""
Celery tasks for Graph Neural Network operations in IntelGraph
"""

import os
from datetime import datetime
from typing import Any

import httpx
import networkx as nx
import numpy as np
import torch
from psycopg2 import pool  # For connection pooling
from psycopg2.extras import execute_values  # For efficient bulk inserts

# Get Celery app
from ..celery_app import celery_app
from ..models.gnn import gnn_manager
from ..models.gnn_trainer import GNNDataProcessor, GNNTrainer
from ..monitoring import (
    track_error,
    track_ml_prediction,
    track_task_processing,
)

# Global PostgreSQL connection pool
pg_pool = None


def get_pg_pool():
    global pg_pool
    if pg_pool is None:
        pg_pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=os.getenv(
                "POSTGRES_URL", "postgresql://intelgraph:devpassword@postgres:5432/intelgraph_dev"
            ),
        )
    return pg_pool


@celery_app.task(bind=True)
@track_task_processing
def task_gnn_node_classification(self, payload: dict[str, Any]) -> dict[str, Any]:
    """
    Perform node classification using Graph Neural Networks

    Args:
        payload: {
            'graph_data': networkx graph or edge list,
            'node_features': dict of node features,
            'node_labels': dict of node labels (optional, for training),
            'model_name': str,
            'model_config': dict (for creating new model),
            'task_mode': 'train' or 'predict',
            'job_id': str
        }

    Returns:
        dict with predictions, embeddings, and metadata
    """

    job_id = payload.get("job_id", "unknown")

    try:
        # Extract parameters
        graph_data = payload["graph_data"]
        node_features = payload.get("node_features", {})
        node_labels = payload.get("node_labels", {})
        model_name = payload["model_name"]
        model_config = payload.get("model_config", {})
        task_mode = payload.get("task_mode", "predict")

        # Convert graph data to PyTorch Geometric format
        if isinstance(graph_data, dict) and "edges" in graph_data:
            # Edge list format
            G = nx.Graph()
            G.add_edges_from(graph_data["edges"])
        elif isinstance(graph_data, list):
            # Simple edge list
            G = nx.Graph()
            G.add_edges_from(graph_data)
        else:
            # Assume NetworkX graph
            G = graph_data

        # Convert to PyG data
        pyg_data = GNNDataProcessor.networkx_to_pyg(
            G, node_features=node_features, node_labels=node_labels
        )

        # Add train/val/test masks for node classification
        if task_mode == "train":
            pyg_data = GNNDataProcessor.create_node_classification_masks(pyg_data)

        if task_mode == "train":
            # Training mode
            if model_name not in gnn_manager.list_models():
                # Create new model
                default_config = {
                    "node_feature_dim": pyg_data.x.size(1),
                    "model_type": "graphsage",
                    "task_type": "node_classification",
                    "num_classes": len(set(node_labels.values())) if node_labels else 2,
                    "hidden_dim": 256,
                    "output_dim": 128,
                }
                default_config.update(model_config)

                model = gnn_manager.create_model(model_name, **default_config)
            else:
                model_info = gnn_manager.models[model_name]
                model = model_info["model"]

            # Setup trainer
            trainer = GNNTrainer(model)

            # Create data loaders (simplified for single graph)
            from torch_geometric.data import DataLoader

            train_loader = DataLoader([pyg_data], batch_size=1)
            val_loader = DataLoader([pyg_data], batch_size=1)

            # Train model
            training_results = trainer.train(
                train_loader=train_loader,
                val_loader=val_loader,
                task_type="node_classification",
                num_epochs=payload.get("num_epochs", 50),
                model_name=model_name,
            )

            result = {
                "job_id": job_id,
                "kind": "gnn_node_classification",
                "mode": "training",
                "model_name": model_name,
                "training_results": training_results,
                "num_nodes": pyg_data.num_nodes,
                "num_edges": pyg_data.edge_index.size(1),
                "completed_at": datetime.utcnow().isoformat(),
            }

        else:
            # Prediction mode
            if model_name not in gnn_manager.list_models():
                raise ValueError(f"Model {model_name} not found")

            # Make predictions
            predictions_result = gnn_manager.predict(
                model_name=model_name, graph_data=pyg_data, return_embeddings=True
            )

            # Convert predictions to node-level results
            node_predictions = {}
            node_embeddings = {}

            predictions = predictions_result["predictions"]
            embeddings = predictions_result.get("embeddings")

            for i, node in enumerate(G.nodes()):
                if i < len(predictions):
                    node_predictions[str(node)] = {
                        "class_probabilities": predictions[i].tolist(),
                        "predicted_class": int(np.argmax(predictions[i])),
                        "confidence": float(np.max(predictions[i])),
                    }

                    if embeddings is not None and i < len(embeddings):
                        node_embeddings[str(node)] = embeddings[i].tolist()

            result = {
                "job_id": job_id,
                "kind": "gnn_node_classification",
                "mode": "prediction",
                "model_name": model_name,
                "node_predictions": node_predictions,
                "node_embeddings": node_embeddings,
                "num_nodes": pyg_data.num_nodes,
                "num_edges": pyg_data.edge_index.size(1),
                "model_type": predictions_result["model_type"],
                "completed_at": datetime.utcnow().isoformat(),
            }

        return result

    except Exception as e:
        track_error("gnn_tasks", "NodeClassificationError")
        return {
            "job_id": job_id,
            "kind": "gnn_node_classification",
            "error": str(e),
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
        }


@celery_app.task(bind=True)
@track_task_processing
def task_gnn_link_prediction(self, payload: dict[str, Any]) -> dict[str, Any]:
    """
    Perform link prediction using Graph Neural Networks

    Args:
        payload: {
            'graph_data': networkx graph or edge list,
            'node_features': dict of node features,
            'candidate_edges': list of edge pairs to predict,
            'model_name': str,
            'model_config': dict,
            'task_mode': 'train' or 'predict',
            'job_id': str
        }
    """

    job_id = payload.get("job_id", "unknown")

    try:
        # Extract parameters
        graph_data = payload["graph_data"]
        node_features = payload.get("node_features", {})
        candidate_edges = payload.get("candidate_edges", [])
        model_name = payload["model_name"]
        model_config = payload.get("model_config", {})
        task_mode = payload.get("task_mode", "predict")
        focus_entity_id = payload.get("focus_entity_id")

        # Convert graph data
        if isinstance(graph_data, dict) and "edges" in graph_data:
            G = nx.Graph()
            G.add_edges_from(graph_data["edges"])
        elif isinstance(graph_data, list):
            G = nx.Graph()
            G.add_edges_from(graph_data)
        else:
            G = graph_data

        # Convert to PyG data
        pyg_data = GNNDataProcessor.networkx_to_pyg(G, node_features=node_features)

        if task_mode == "train":
            # Create link prediction splits
            train_data, val_data, test_data = GNNDataProcessor.create_link_prediction_data(pyg_data)

            # Create or get model
            if model_name not in gnn_manager.list_models():
                default_config = {
                    "node_feature_dim": pyg_data.x.size(1),
                    "model_type": "graphsage",
                    "task_type": "link_prediction",
                    "hidden_dim": 256,
                    "output_dim": 128,
                }
                default_config.update(model_config)

                model = gnn_manager.create_model(model_name, **default_config)
            else:
                model_info = gnn_manager.models[model_name]
                model = model_info["model"]

            # Setup trainer
            trainer = GNNTrainer(model)

            # Create data loaders
            from torch_geometric.data import DataLoader

            train_loader = DataLoader([train_data], batch_size=1)
            val_loader = DataLoader([val_data], batch_size=1)

            # Train model
            training_results = trainer.train(
                train_loader=train_loader,
                val_loader=val_loader,
                task_type="link_prediction",
                num_epochs=payload.get("num_epochs", 50),
                model_name=model_name,
            )

            result = {
                "job_id": job_id,
                "kind": "gnn_link_prediction",
                "mode": "training",
                "model_name": model_name,
                "training_results": training_results,
                "num_nodes": pyg_data.num_nodes,
                "num_edges": pyg_data.edge_index.size(1),
                "completed_at": datetime.utcnow().isoformat(),
            }

        else:
            # Prediction mode
            if model_name not in gnn_manager.list_models():
                raise ValueError(f"Model {model_name} not found")

            # Prepare candidate edges for prediction
            if not candidate_edges:
                # Generate all possible edges not in graph
                all_possible_edges = []
                nodes = list(G.nodes())
                for i, u in enumerate(nodes):
                    for v in nodes[i + 1 :]:
                        if not G.has_edge(u, v):
                            all_possible_edges.append((u, v))
                candidate_edges = all_possible_edges[:1000]  # Limit for performance

            # Convert candidate edges to tensor format
            node_mapping = {node: i for i, node in enumerate(G.nodes())}
            edge_candidates = []
            for u, v in candidate_edges:
                if u in node_mapping and v in node_mapping:
                    edge_candidates.append([node_mapping[u], node_mapping[v]])

            if edge_candidates:
                edge_label_index = torch.tensor(edge_candidates, dtype=torch.long).t()

                # Create prediction data
                pred_data = pyg_data.clone()
                pred_data.edge_label_index = edge_label_index

                # Make predictions
                predictions_result = gnn_manager.predict(
                    model_name=model_name, graph_data=pred_data, return_embeddings=False
                )

                # Format results
                edge_predictions = []
                predictions = predictions_result["predictions"]

                for i, (u, v) in enumerate(candidate_edges):
                    if i < len(predictions):
                        edge_predictions.append(
                            {
                                "edge": [str(u), str(v)],
                                "probability": float(predictions[i]),
                                "predicted": bool(predictions[i] > 0.5),
                            }
                        )

                # Sort by probability
                edge_predictions.sort(key=lambda x: x["probability"], reverse=True)

                track_ml_prediction(
                    model_name=model_name,
                    task_type="link_prediction",
                    mode="prediction",
                    num_predictions=len(edge_predictions),
                    job_id=job_id,
                )

                result = {
                    "job_id": job_id,
                    "kind": "gnn_link_prediction",
                    "mode": "prediction",
                    "model_name": model_name,
                    "edge_predictions": edge_predictions,
                    "num_candidates": len(candidate_edges),
                    "num_nodes": pyg_data.num_nodes,
                    "num_edges": pyg_data.edge_index.size(1),
                    "model_type": predictions_result["model_type"],
                    "completed_at": datetime.utcnow().isoformat(),
                }
                # Post suggestions to IntelGraph backend if focus entity provided
                try:
                    if focus_entity_id and edge_predictions:
                        server_url = os.getenv("SERVER_API_URL", "http://localhost:4000")
                        api_key = os.getenv("AI_WEBHOOK_KEY", "")
                        # Convert edge_predictions to recommendations focused on the entity
                        recs = []
                        for ep in edge_predictions[:100]:
                            u, v = ep["edge"]
                            prob = ep["probability"]
                            if str(u) == str(focus_entity_id):
                                recs.append({"from": str(u), "to": str(v), "score": float(prob)})
                            elif str(v) == str(focus_entity_id):
                                recs.append({"from": str(v), "to": str(u), "score": float(prob)})
                        if recs:
                            with httpx.Client(timeout=10.0) as client:
                                client.post(
                                    f"{server_url.rstrip('/')}/api/ai/gnn/suggestions",
                                    json={
                                        "entityId": str(focus_entity_id),
                                        "recommendations": recs[:20],
                                    },
                                    headers={"X-API-Key": api_key} if api_key else None,
                                )
                except Exception:
                    # Don't fail the task if callback fails
                    pass
            else:
                result = {
                    "job_id": job_id,
                    "kind": "gnn_link_prediction",
                    "mode": "prediction",
                    "edge_predictions": [],
                    "error": "No valid candidate edges found",
                    "completed_at": datetime.utcnow().isoformat(),
                }

        return result

    except Exception as e:
        track_error("gnn_tasks", "LinkPredictionError")
        return {
            "job_id": job_id,
            "kind": "gnn_link_prediction",
            "error": str(e),
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
        }


@celery_app.task(bind=True)
@track_task_processing
def task_gnn_graph_classification(self, payload: dict[str, Any]) -> dict[str, Any]:
    """
    Perform graph classification using Graph Neural Networks

    Args:
        payload: {
            'graphs': list of graph data,
            'graph_labels': list of labels (for training),
            'model_name': str,
            'model_config': dict,
            'task_mode': 'train' or 'predict',
            'job_id': str
        }
    """

    job_id = payload.get("job_id", "unknown")

    try:
        # Extract parameters
        graphs_data = payload["graphs"]
        graph_labels = payload.get("graph_labels", [])
        model_name = payload["model_name"]
        model_config = payload.get("model_config", {})
        task_mode = payload.get("task_mode", "predict")

        # Convert graphs to PyG format
        pyg_graphs = []
        for i, graph_data in enumerate(graphs_data):
            if isinstance(graph_data, dict) and "edges" in graph_data:
                G = nx.Graph()
                G.add_edges_from(graph_data["edges"])
                node_features = graph_data.get("node_features", {})
            elif isinstance(graph_data, list):
                G = nx.Graph()
                G.add_edges_from(graph_data)
                node_features = {}
            else:
                G = graph_data
                node_features = {}

            pyg_data = GNNDataProcessor.networkx_to_pyg(G, node_features=node_features)

            # Add graph label if available
            if i < len(graph_labels):
                pyg_data.y = torch.tensor([graph_labels[i]], dtype=torch.long)

            pyg_graphs.append(pyg_data)

        if task_mode == "train":
            # Create or get model
            if model_name not in gnn_manager.list_models():
                # Determine feature dimension from first graph
                node_feature_dim = pyg_graphs[0].x.size(1) if pyg_graphs else 16

                default_config = {
                    "node_feature_dim": node_feature_dim,
                    "model_type": "gin",  # GIN is good for graph classification
                    "task_type": "graph_classification",
                    "num_classes": len(set(graph_labels)) if graph_labels else 2,
                    "hidden_dim": 256,
                    "output_dim": 128,
                }
                default_config.update(model_config)

                model = gnn_manager.create_model(model_name, **default_config)
            else:
                model_info = gnn_manager.models[model_name]
                model = model_info["model"]

            # Split data
            num_graphs = len(pyg_graphs)
            train_size = int(0.8 * num_graphs)
            val_size = int(0.1 * num_graphs)

            train_graphs = pyg_graphs[:train_size]
            val_graphs = pyg_graphs[train_size : train_size + val_size]

            # Setup trainer
            trainer = GNNTrainer(model)

            # Create data loaders
            from torch_geometric.data import DataLoader

            train_loader = DataLoader(train_graphs, batch_size=32, shuffle=True)
            val_loader = DataLoader(val_graphs, batch_size=32, shuffle=False)

            # Train model
            training_results = trainer.train(
                train_loader=train_loader,
                val_loader=val_loader,
                task_type="graph_classification",
                num_epochs=payload.get("num_epochs", 100),
                model_name=model_name,
            )

            result = {
                "job_id": job_id,
                "kind": "gnn_graph_classification",
                "mode": "training",
                "model_name": model_name,
                "training_results": training_results,
                "num_graphs": len(pyg_graphs),
                "completed_at": datetime.utcnow().isoformat(),
            }

        else:
            # Prediction mode
            if model_name not in gnn_manager.list_models():
                raise ValueError(f"Model {model_name} not found")

            # Make predictions on each graph
            graph_predictions = []

            for i, pyg_data in enumerate(pyg_graphs):
                predictions_result = gnn_manager.predict(
                    model_name=model_name, graph_data=pyg_data, return_embeddings=True
                )

                predictions = predictions_result["predictions"]
                embeddings = predictions_result.get("embeddings")

                graph_pred = {
                    "graph_id": i,
                    "class_probabilities": predictions[0].tolist() if len(predictions) > 0 else [],
                    "predicted_class": (
                        int(np.argmax(predictions[0])) if len(predictions) > 0 else 0
                    ),
                    "confidence": float(np.max(predictions[0])) if len(predictions) > 0 else 0.0,
                    "graph_embedding": (
                        embeddings[0].tolist()
                        if embeddings is not None and len(embeddings) > 0
                        else None
                    ),
                    "num_nodes": pyg_data.num_nodes,
                    "num_edges": pyg_data.edge_index.size(1),
                }

                graph_predictions.append(graph_pred)

            result = {
                "job_id": job_id,
                "kind": "gnn_graph_classification",
                "mode": "prediction",
                "model_name": model_name,
                "graph_predictions": graph_predictions,
                "num_graphs": len(pyg_graphs),
                "model_type": predictions_result["model_type"],
                "completed_at": datetime.utcnow().isoformat(),
            }

        return result

    except Exception as e:
        track_error("gnn_tasks", "GraphClassificationError")
        return {
            "job_id": job_id,
            "kind": "gnn_graph_classification",
            "error": str(e),
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
        }


@celery_app.task(bind=True)
@track_task_processing
def task_gnn_anomaly_detection(self, payload: dict[str, Any]) -> dict[str, Any]:
    """
    Perform anomaly detection using Graph Neural Networks

    Args:
        payload: {
            'graph_data': networkx graph or edge list,
            'node_features': dict of node features,
            'normal_nodes': list of known normal nodes (for training),
            'model_name': str,
            'model_config': dict,
            'task_mode': 'train' or 'predict',
            'anomaly_threshold': float,
            'job_id': str
        }
    """

    job_id = payload.get("job_id", "unknown")

    try:
        # Extract parameters
        graph_data = payload["graph_data"]
        node_features = payload.get("node_features", {})
        normal_nodes = payload.get("normal_nodes", [])
        model_name = payload["model_name"]
        model_config = payload.get("model_config", {})
        task_mode = payload.get("task_mode", "predict")
        anomaly_threshold = payload.get("anomaly_threshold", 0.5)

        # Convert graph data
        if isinstance(graph_data, dict) and "edges" in graph_data:
            G = nx.Graph()
            G.add_edges_from(graph_data["edges"])
        elif isinstance(graph_data, list):
            G = nx.Graph()
            G.add_edges_from(graph_data)
        else:
            G = graph_data

        # Create node labels for training (normal=0, anomaly=1)
        node_labels = {}
        if normal_nodes:
            for node in G.nodes():
                node_labels[node] = 0 if node in normal_nodes else 1

        # Convert to PyG data
        pyg_data = GNNDataProcessor.networkx_to_pyg(
            G,
            node_features=node_features,
            node_labels=node_labels if task_mode == "train" else None,
        )

        if task_mode == "train":
            # Create or get model
            if model_name not in gnn_manager.list_models():
                default_config = {
                    "node_feature_dim": pyg_data.x.size(1),
                    "model_type": "gat",  # Attention helps identify anomalies
                    "task_type": "anomaly_detection",
                    "hidden_dim": 256,
                    "output_dim": 128,
                }
                default_config.update(model_config)

                model = gnn_manager.create_model(model_name, **default_config)
            else:
                model_info = gnn_manager.models[model_name]
                model = model_info["model"]

            # Setup trainer
            trainer = GNNTrainer(model)

            # Create data loaders
            from torch_geometric.data import DataLoader

            train_loader = DataLoader([pyg_data], batch_size=1)
            val_loader = DataLoader([pyg_data], batch_size=1)

            # Train model
            training_results = trainer.train(
                train_loader=train_loader,
                val_loader=val_loader,
                task_type="anomaly_detection",
                num_epochs=payload.get("num_epochs", 50),
                model_name=model_name,
            )

            result = {
                "job_id": job_id,
                "kind": "gnn_anomaly_detection",
                "mode": "training",
                "model_name": model_name,
                "training_results": training_results,
                "num_nodes": pyg_data.num_nodes,
                "num_normal_nodes": len(normal_nodes),
                "completed_at": datetime.utcnow().isoformat(),
            }

        else:
            # Prediction mode
            if model_name not in gnn_manager.list_models():
                raise ValueError(f"Model {model_name} not found")

            # Make predictions
            predictions_result = gnn_manager.predict(
                model_name=model_name, graph_data=pyg_data, return_embeddings=True
            )

            # Process anomaly scores
            predictions = predictions_result["predictions"]
            embeddings = predictions_result.get("embeddings")

            node_anomalies = {}
            anomalous_nodes = []

            for i, node in enumerate(G.nodes()):
                if i < len(predictions):
                    anomaly_score = float(predictions[i])
                    is_anomaly = anomaly_score > anomaly_threshold

                    node_anomalies[str(node)] = {
                        "anomaly_score": anomaly_score,
                        "is_anomaly": is_anomaly,
                        "confidence": abs(anomaly_score - 0.5)
                        * 2,  # Distance from decision boundary
                        "embedding": (
                            embeddings[i].tolist()
                            if embeddings is not None and i < len(embeddings)
                            else None
                        ),
                    }

                    if is_anomaly:
                        anomalous_nodes.append(
                            {
                                "node": str(node),
                                "anomaly_score": anomaly_score,
                                "confidence": abs(anomaly_score - 0.5) * 2,
                            }
                        )

            # Sort anomalous nodes by score
            anomalous_nodes.sort(key=lambda x: x["anomaly_score"], reverse=True)

            track_ml_prediction(
                model_name=model_name,
                task_type="anomaly_detection",
                mode="prediction",
                num_predictions=len(anomalous_nodes),
                job_id=job_id,
            )

            result = {
                "job_id": job_id,
                "kind": "gnn_anomaly_detection",
                "mode": "prediction",
                "model_name": model_name,
                "node_anomalies": node_anomalies,
                "anomalous_nodes": anomalous_nodes,
                "anomaly_threshold": anomaly_threshold,
                "num_anomalies": len(anomalous_nodes),
                "num_nodes": pyg_data.num_nodes,
                "model_type": predictions_result["model_type"],
                "completed_at": datetime.utcnow().isoformat(),
            }

        return result

    except Exception as e:
        track_error("gnn_tasks", "AnomalyDetectionError")
        return {
            "job_id": job_id,
            "kind": "gnn_anomaly_detection",
            "error": str(e),
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
        }


# Global PostgreSQL connection pool
pg_pool = None


def get_pg_pool():
    global pg_pool
    if pg_pool is None:
        pg_pool = pool.SimpleConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=os.getenv(
                "POSTGRES_URL", "postgresql://intelgraph:devpassword@postgres:5432/intelgraph_dev"
            ),
        )
    return pg_pool


@celery_app.task(bind=True)
@track_task_processing
def task_gnn_generate_embeddings(self, payload: dict[str, Any]) -> dict[str, Any]:
    # ... existing code ...
    try:
        # ... existing code to generate embeddings ...

        # Store embeddings in PostgreSQL
        conn = None
        try:
            pg_conn_pool = get_pg_pool()
            conn = pg_conn_pool.getconn()
            cur = conn.cursor()

            # Prepare data for bulk insert/update
            values = []
            for node_id, embedding_list in node_embeddings.items():
                # Convert list to pgvector format string
                embedding_vector_str = f"[{','.join(map(str, embedding_list))}]"
                values.append((node_id, embedding_vector_str))

            # Use execute_values for efficient upsert
            execute_values(
                cur,
                """
                INSERT INTO entity_embeddings (entity_id, embedding)
                VALUES %s
                ON CONFLICT (entity_id) DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    updated_at = CURRENT_TIMESTAMP
                """,
                values,
                page_size=1000,
            )
            conn.commit()
            logger.info(f"Stored {len(node_embeddings)} embeddings in PostgreSQL.")

        except Exception as pg_error:
            logger.error({"error": str(pg_error)}, "Failed to store embeddings in PostgreSQL")
            if conn:
                conn.rollback()
            raise pg_error  # Re-raise to fail the Celery task
        finally:
            if conn:
                pg_conn_pool.putconn(conn)

        return result

    except Exception as e:
        track_error("gnn_tasks", "EmbeddingGenerationError")
        return {
            "job_id": job_id,
            "kind": "gnn_generate_embeddings",
            "error": str(e),
            "status": "failed",
            "completed_at": datetime.utcnow().isoformat(),
        }
