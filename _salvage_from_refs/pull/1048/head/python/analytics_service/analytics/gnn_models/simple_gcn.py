import torch
import torch.nn.functional as F
from torch_geometric.nn import GCNConv

class SimpleGCN(torch.nn.Module):
    def __init__(self, num_node_features: int, num_classes: int):
        super().__init__()
        self.conv1 = GCNConv(num_node_features, 16)
        self.conv2 = GCNConv(16, num_classes)

    def forward(self, data):
        x, edge_index = data.x, data.edge_index

        x = self.conv1(x, edge_index)
        x = F.relu(x)
        x = F.dropout(x, training=self.training)
        x = self.conv2(x, edge_index)

        return F.log_softmax(x, dim=1)

def load_simple_gcn_model(num_node_features: int, num_classes: int, model_path: str = None) -> SimpleGCN:
    """
    Loads a SimpleGCN model. If model_path is provided, attempts to load state_dict.
    Otherwise, returns a new untrained model.
    """
    model = SimpleGCN(num_node_features, num_classes)
    if model_path and os.path.exists(model_path):
        try:
            model.load_state_dict(torch.load(model_path))
            model.eval() # Set to evaluation mode
            print(f"Loaded GCN model from {model_path}")
        except Exception as e:
            print(f"Warning: Could not load GCN model from {model_path}. Error: {e}. Returning new model.")
    else:
        print("No model path provided or model not found. Returning new untrained GCN model.")
    return model

if __name__ == '__main__':
    # Example Usage
    from torch_geometric.data import Data
    
    # Dummy data
    x = torch.randn(10, 5) # 10 nodes, 5 features per node
    edge_index = torch.tensor([[0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
                               [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]], dtype=torch.long)
    data = Data(x=x, edge_index=edge_index)

    # Initialize model
    num_node_features = x.shape[1]
    num_classes = 2 # Example: binary classification
    model = SimpleGCN(num_node_features, num_classes)

    # Forward pass
    out = model(data)
    print("Model output shape:", out.shape)

    # Example of loading (will return new model as no path is given)
    loaded_model = load_simple_gcn_model(num_node_features, num_classes)
