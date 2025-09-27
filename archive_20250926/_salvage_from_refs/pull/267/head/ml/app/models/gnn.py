"""
Advanced Graph Neural Network models for IntelGraph deep graph analysis
"""
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import (
    GCNConv, 
    GATConv, 
    SAGEConv, 
    TransformerConv,
    GINConv,
    global_mean_pool,
    global_max_pool,
    global_add_pool
)
from torch_geometric.data import Data, Batch
from torch_geometric.utils import to_networkx, from_networkx
import networkx as nx
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
import pickle
import os
from datetime import datetime

from ..monitoring import track_ml_prediction, track_error


class GraphSAGE(nn.Module):
    """
    GraphSAGE model for node representation learning
    Handles large-scale graphs through sampling and aggregation
    """
    
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 256,
        output_dim: int = 128,
        num_layers: int = 3,
        dropout: float = 0.2,
        aggr: str = 'mean'
    ):
        super(GraphSAGE, self).__init__()
        
        self.num_layers = num_layers
        self.dropout = dropout
        
        self.convs = nn.ModuleList()
        self.bns = nn.ModuleList()
        
        # Input layer
        self.convs.append(SAGEConv(input_dim, hidden_dim, aggr=aggr))
        self.bns.append(nn.BatchNorm1d(hidden_dim))
        
        # Hidden layers
        for _ in range(num_layers - 2):
            self.convs.append(SAGEConv(hidden_dim, hidden_dim, aggr=aggr))
            self.bns.append(nn.BatchNorm1d(hidden_dim))
        
        # Output layer
        self.convs.append(SAGEConv(hidden_dim, output_dim, aggr=aggr))
        
    def forward(self, x, edge_index, batch=None):
        for i, conv in enumerate(self.convs[:-1]):
            x = conv(x, edge_index)
            x = self.bns[i](x)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Final layer without activation
        x = self.convs[-1](x, edge_index)
        
        return x


class GraphAttentionNetwork(nn.Module):
    """
    Graph Attention Network (GAT) for learning node importance
    Uses multi-head attention to focus on relevant neighbors
    """
    
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 256,
        output_dim: int = 128,
        num_layers: int = 3,
        num_heads: int = 8,
        dropout: float = 0.2,
        concat: bool = True
    ):
        super(GraphAttentionNetwork, self).__init__()
        
        self.num_layers = num_layers
        self.dropout = dropout
        
        self.convs = nn.ModuleList()
        
        # Input layer
        self.convs.append(GATConv(
            input_dim, 
            hidden_dim, 
            heads=num_heads, 
            dropout=dropout,
            concat=concat
        ))
        
        # Hidden layers
        input_dim_next = hidden_dim * num_heads if concat else hidden_dim
        for _ in range(num_layers - 2):
            self.convs.append(GATConv(
                input_dim_next,
                hidden_dim,
                heads=num_heads,
                dropout=dropout,
                concat=concat
            ))
        
        # Output layer (no concatenation)
        self.convs.append(GATConv(
            input_dim_next,
            output_dim,
            heads=1,
            dropout=dropout,
            concat=False
        ))
        
    def forward(self, x, edge_index, batch=None, return_attention_weights=False):
        attention_weights = []
        
        for i, conv in enumerate(self.convs[:-1]):
            if return_attention_weights:
                x, attn = conv(x, edge_index, return_attention_weights=True)
                attention_weights.append(attn)
            else:
                x = conv(x, edge_index)
            x = F.elu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Final layer
        if return_attention_weights:
            x, attn = self.convs[-1](x, edge_index, return_attention_weights=True)
            attention_weights.append(attn)
            return x, attention_weights
        else:
            x = self.convs[-1](x, edge_index)
            return x


class GraphTransformer(nn.Module):
    """
    Graph Transformer for capturing long-range dependencies
    Uses transformer architecture adapted for graphs
    """
    
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 256,
        output_dim: int = 128,
        num_layers: int = 4,
        num_heads: int = 8,
        dropout: float = 0.1
    ):
        super(GraphTransformer, self).__init__()
        
        self.num_layers = num_layers
        self.dropout = dropout
        
        self.convs = nn.ModuleList()
        
        # Input layer
        self.convs.append(TransformerConv(
            input_dim,
            hidden_dim,
            heads=num_heads,
            dropout=dropout,
            concat=False
        ))
        
        # Hidden layers
        for _ in range(num_layers - 2):
            self.convs.append(TransformerConv(
                hidden_dim,
                hidden_dim,
                heads=num_heads,
                dropout=dropout,
                concat=False
            ))
        
        # Output layer
        self.convs.append(TransformerConv(
            hidden_dim,
            output_dim,
            heads=num_heads,
            dropout=dropout,
            concat=False
        ))
        
    def forward(self, x, edge_index, batch=None):
        for conv in self.convs[:-1]:
            x = conv(x, edge_index)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Final layer
        x = self.convs[-1](x, edge_index)
        return x


class GraphIsomorphismNetwork(nn.Module):
    """
    Graph Isomorphism Network (GIN) for graph classification
    Powerful for distinguishing different graph structures
    """
    
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 256,
        output_dim: int = 128,
        num_layers: int = 5,
        dropout: float = 0.2,
        train_eps: bool = True
    ):
        super(GraphIsomorphismNetwork, self).__init__()
        
        self.num_layers = num_layers
        self.dropout = dropout
        
        self.convs = nn.ModuleList()
        self.bns = nn.ModuleList()
        
        # Input layer
        mlp = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim)
        )
        self.convs.append(GINConv(mlp, train_eps=train_eps))
        self.bns.append(nn.BatchNorm1d(hidden_dim))
        
        # Hidden layers
        for _ in range(num_layers - 2):
            mlp = nn.Sequential(
                nn.Linear(hidden_dim, hidden_dim),
                nn.ReLU(),
                nn.Linear(hidden_dim, hidden_dim)
            )
            self.convs.append(GINConv(mlp, train_eps=train_eps))
            self.bns.append(nn.BatchNorm1d(hidden_dim))
        
        # Output layer
        mlp = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim)
        )
        self.convs.append(GINConv(mlp, train_eps=train_eps))
        
    def forward(self, x, edge_index, batch=None):
        for i, conv in enumerate(self.convs[:-1]):
            x = conv(x, edge_index)
            x = self.bns[i](x)
            x = F.relu(x)
            x = F.dropout(x, p=self.dropout, training=self.training)
        
        # Final layer
        x = self.convs[-1](x, edge_index)
        
        return x


class HierarchicalGraphNetwork(nn.Module):
    """
    Hierarchical Graph Network for multi-scale analysis
    Processes graphs at different granularities
    """
    
    def __init__(
        self,
        input_dim: int,
        hidden_dim: int = 256,
        output_dim: int = 128,
        num_scales: int = 3,
        pool_ratios: List[float] = [0.8, 0.6, 0.4]
    ):
        super(HierarchicalGraphNetwork, self).__init__()
        
        self.num_scales = num_scales
        self.pool_ratios = pool_ratios
        
        # Node-level processing
        self.node_encoder = GraphSAGE(input_dim, hidden_dim, hidden_dim)
        
        # Scale-specific processing
        self.scale_processors = nn.ModuleList([
            GraphAttentionNetwork(hidden_dim, hidden_dim, hidden_dim)
            for _ in range(num_scales)
        ])
        
        # Cross-scale attention
        self.cross_attention = nn.MultiheadAttention(
            hidden_dim, num_heads=8, dropout=0.1
        )
        
        # Final projection
        self.output_proj = nn.Linear(hidden_dim * num_scales, output_dim)
        
    def forward(self, x, edge_index, batch=None):
        # Node-level encoding
        node_features = self.node_encoder(x, edge_index, batch)
        
        scale_features = []
        current_x = node_features
        current_edge_index = edge_index
        
        # Process at different scales
        for i, processor in enumerate(self.scale_processors):
            # Process at current scale
            scale_feat = processor(current_x, current_edge_index, batch)
            scale_features.append(scale_feat)
            
            # Pool for next scale (simplified pooling)
            if i < len(self.scale_processors) - 1:
                # In practice, would use proper graph pooling
                pool_size = int(current_x.size(0) * self.pool_ratios[i])
                if pool_size > 0:
                    indices = torch.randperm(current_x.size(0))[:pool_size]
                    current_x = current_x[indices]
                    # Simplified edge pooling
                    mask = (current_edge_index[0] < pool_size) & (current_edge_index[1] < pool_size)
                    current_edge_index = current_edge_index[:, mask]
        
        # Combine multi-scale features
        if len(scale_features) > 1:
            # Pad features to same length for concatenation
            max_nodes = max(feat.size(0) for feat in scale_features)
            padded_features = []
            for feat in scale_features:
                if feat.size(0) < max_nodes:
                    padding = torch.zeros(max_nodes - feat.size(0), feat.size(1), device=feat.device)
                    feat = torch.cat([feat, padding], dim=0)
                padded_features.append(feat)
            
            combined = torch.cat(padded_features, dim=-1)
        else:
            combined = scale_features[0]
        
        # Final projection
        output = self.output_proj(combined)
        return output


class IntelGraphGNN(nn.Module):
    """
    Main IntelGraph GNN model combining multiple architectures
    Handles various graph analysis tasks for intelligence analysis
    """
    
    def __init__(
        self,
        node_feature_dim: int,
        edge_feature_dim: int = 0,
        hidden_dim: int = 256,
        output_dim: int = 128,
        model_type: str = 'graphsage',
        task_type: str = 'node_classification',
        num_classes: int = None,
        dropout: float = 0.2
    ):
        super(IntelGraphGNN, self).__init__()
        
        self.model_type = model_type
        self.task_type = task_type
        self.num_classes = num_classes
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        
        # Node feature projection
        self.node_proj = nn.Linear(node_feature_dim, hidden_dim)
        
        # Edge feature projection (if available)
        if edge_feature_dim > 0:
            self.edge_proj = nn.Linear(edge_feature_dim, hidden_dim)
            self.use_edge_features = True
        else:
            self.use_edge_features = False
        
        # Select backbone architecture
        if model_type == 'graphsage':
            self.backbone = GraphSAGE(hidden_dim, hidden_dim, output_dim)
        elif model_type == 'gat':
            self.backbone = GraphAttentionNetwork(hidden_dim, hidden_dim, output_dim)
        elif model_type == 'transformer':
            self.backbone = GraphTransformer(hidden_dim, hidden_dim, output_dim)
        elif model_type == 'gin':
            self.backbone = GraphIsomorphismNetwork(hidden_dim, hidden_dim, output_dim)
        elif model_type == 'hierarchical':
            self.backbone = HierarchicalGraphNetwork(hidden_dim, hidden_dim, output_dim)
        else:
            raise ValueError(f"Unknown model type: {model_type}")
        
        # Task-specific heads
        if task_type == 'node_classification' and num_classes:
            self.classifier = nn.Linear(output_dim, num_classes)
        elif task_type == 'link_prediction':
            self.link_predictor = nn.Sequential(
                nn.Linear(output_dim * 2, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden_dim, 1),
                nn.Sigmoid()
            )
        elif task_type == 'graph_classification' and num_classes:
            self.graph_classifier = nn.Sequential(
                nn.Linear(output_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden_dim, num_classes)
            )
        elif task_type == 'anomaly_detection':
            self.anomaly_detector = nn.Sequential(
                nn.Linear(output_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden_dim, 1),
                nn.Sigmoid()
            )
        
    def forward(self, data):
        x, edge_index = data.x, data.edge_index
        batch = getattr(data, 'batch', None)
        
        # Project node features
        x = self.node_proj(x)
        
        # Get node embeddings from backbone
        node_embeddings = self.backbone(x, edge_index, batch)
        
        # Task-specific processing
        if self.task_type == 'node_classification':
            return self.classifier(node_embeddings)
        
        elif self.task_type == 'link_prediction':
            # Expecting edge pairs in data.edge_label_index
            edge_pairs = data.edge_label_index
            src_embeddings = node_embeddings[edge_pairs[0]]
            dst_embeddings = node_embeddings[edge_pairs[1]]
            edge_embeddings = torch.cat([src_embeddings, dst_embeddings], dim=1)
            return self.link_predictor(edge_embeddings)
        
        elif self.task_type == 'graph_classification':
            # Global pooling for graph-level prediction
            if batch is not None:
                graph_embeddings = global_mean_pool(node_embeddings, batch)
            else:
                graph_embeddings = global_mean_pool(node_embeddings, torch.zeros(node_embeddings.size(0), dtype=torch.long))
            return self.graph_classifier(graph_embeddings)
        
        elif self.task_type == 'anomaly_detection':
            return self.anomaly_detector(node_embeddings)
        
        else:
            # Return raw embeddings
            return node_embeddings


class GNNModelManager:
    """
    Manager for GNN models in IntelGraph
    Handles model loading, training, and inference
    """
    
    def __init__(self, model_dir: str = "models/gnn"):
        self.model_dir = model_dir
        self.models = {}
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Create model directory
        os.makedirs(model_dir, exist_ok=True)
        
    def create_model(
        self,
        model_name: str,
        node_feature_dim: int,
        edge_feature_dim: int = 0,
        model_type: str = 'graphsage',
        task_type: str = 'node_classification',
        num_classes: int = None,
        **kwargs
    ) -> IntelGraphGNN:
        """Create a new GNN model"""
        
        model = IntelGraphGNN(
            node_feature_dim=node_feature_dim,
            edge_feature_dim=edge_feature_dim,
            model_type=model_type,
            task_type=task_type,
            num_classes=num_classes,
            **kwargs
        ).to(self.device)
        
        self.models[model_name] = {
            'model': model,
            'config': {
                'node_feature_dim': node_feature_dim,
                'edge_feature_dim': edge_feature_dim,
                'model_type': model_type,
                'task_type': task_type,
                'num_classes': num_classes,
                **kwargs
            },
            'created_at': datetime.now(),
            'trained': False
        }
        
        return model
    
    def load_model(self, model_name: str, model_path: str = None) -> IntelGraphGNN:
        """Load a pre-trained model"""
        
        if model_path is None:
            model_path = os.path.join(self.model_dir, f"{model_name}.pt")
        
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # Create model from config
            model = IntelGraphGNN(**checkpoint['config']).to(self.device)
            model.load_state_dict(checkpoint['model_state'])
            
            self.models[model_name] = {
                'model': model,
                'config': checkpoint['config'],
                'created_at': checkpoint.get('created_at', datetime.now()),
                'trained': True,
                'metrics': checkpoint.get('metrics', {})
            }
            
            return model
            
        except Exception as e:
            track_error('gnn_manager', 'ModelLoadError')
            raise Exception(f"Failed to load model {model_name}: {str(e)}")
    
    def save_model(self, model_name: str, model_path: str = None, metrics: Dict = None):
        """Save a trained model"""
        
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not found")
        
        if model_path is None:
            model_path = os.path.join(self.model_dir, f"{model_name}.pt")
        
        model_info = self.models[model_name]
        
        checkpoint = {
            'model_state': model_info['model'].state_dict(),
            'config': model_info['config'],
            'created_at': model_info['created_at'],
            'saved_at': datetime.now(),
            'metrics': metrics or {}
        }
        
        torch.save(checkpoint, model_path)
        self.models[model_name]['trained'] = True
        if metrics:
            self.models[model_name]['metrics'] = metrics
    
    @track_ml_prediction
    def predict(
        self, 
        model_name: str, 
        graph_data: Data,
        return_embeddings: bool = False
    ) -> Dict[str, Any]:
        """Make predictions using a trained model"""
        
        if model_name not in self.models:
            raise ValueError(f"Model {model_name} not found")
        
        model_info = self.models[model_name]
        model = model_info['model']
        
        model.eval()
        with torch.no_grad():
            # Move data to device
            graph_data = graph_data.to(self.device)
            
            # Get predictions
            if model_info['config']['model_type'] == 'gat' and return_embeddings:
                output, attention_weights = model.backbone(
                    graph_data.x, 
                    graph_data.edge_index,
                    return_attention_weights=True
                )
                predictions = model(graph_data)
                
                return {
                    'predictions': predictions.cpu().numpy(),
                    'embeddings': output.cpu().numpy() if return_embeddings else None,
                    'attention_weights': [attn.cpu().numpy() for attn in attention_weights],
                    'model_type': model_info['config']['model_type'],
                    'task_type': model_info['config']['task_type']
                }
            else:
                predictions = model(graph_data)
                embeddings = None
                
                if return_embeddings:
                    # Get embeddings from backbone
                    x = model.node_proj(graph_data.x)
                    embeddings = model.backbone(x, graph_data.edge_index, getattr(graph_data, 'batch', None))
                
                return {
                    'predictions': predictions.cpu().numpy(),
                    'embeddings': embeddings.cpu().numpy() if embeddings is not None else None,
                    'model_type': model_info['config']['model_type'],
                    'task_type': model_info['config']['task_type']
                }
    
    def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get information about a model"""
        
        if model_name not in self.models:
            return None
        
        model_info = self.models[model_name].copy()
        
        # Add model size and parameter count
        model = model_info['model']
        total_params = sum(p.numel() for p in model.parameters())
        trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
        
        model_info.update({
            'total_parameters': total_params,
            'trainable_parameters': trainable_params,
            'device': str(next(model.parameters()).device),
            'model_size_mb': total_params * 4 / (1024 * 1024)  # Assuming float32
        })
        
        # Remove the actual model object for serialization
        del model_info['model']
        
        return model_info
    
    def list_models(self) -> List[str]:
        """List all available models"""
        return list(self.models.keys())
    
    def delete_model(self, model_name: str):
        """Delete a model from memory and disk"""
        
        if model_name in self.models:
            del self.models[model_name]
        
        model_path = os.path.join(self.model_dir, f"{model_name}.pt")
        if os.path.exists(model_path):
            os.remove(model_path)


# Global model manager instance
gnn_manager = GNNModelManager()