import os, mlflow, torch
from torch import nn, optim
from torch_geometric.nn import SAGEConv
from torch_geometric.utils import negative_sampling
from torch_geometric.data import HeteroData
import polars as pl

RUN_NAME = os.getenv("RUN_NAME","graphsage-lp")
DATA = os.getenv("DATA","/data/datasets/linkpred_train.parquet")
MLFLOW = os.getenv("MLFLOW","http://mlflow:5000")
os.environ["MLFLOW_TRACKING_URI"] = MLFLOW

class SAGE(nn.Module):
    def __init__(self, in_dim=128, hid=128):
        super().__init__()
        self.g1, self.g2 = SAGEConv(in_dim, hid), SAGEConv(hid, hid)
        self.scorer = nn.Sequential(nn.Linear(hid*2, 64), nn.ReLU(), nn.Linear(64,1))
    def embed(self, x, edge_index):
        h = torch.relu(self.g1(x, edge_index))
        h = self.g2(h, edge_index)
        return h
    def forward(self, x, edge_index, pairs):
        h = self.embed(x, edge_index)
        a, b = h[pairs[0]], h[pairs[1]]
        return torch.sigmoid(self.scorer(torch.cat([a,b], dim=-1))).squeeze(-1)

def load_dataset():
    df = pl.read_parquet(DATA)
    # Toy graph: map node ids to indices, random init node features
    nodes = pl.concat([df.select(pl.col("src").alias("id")), df.select(pl.col("dst").alias("id"))]).unique()
    nid = {n:i for i,n in enumerate(nodes.get_column("id").to_list())}
    src = torch.tensor([nid[s] for s in df["src"].to_list()], dtype=torch.long)
    dst = torch.tensor([nid[d] for d in df["dst"].to_list()], dtype=torch.long)
    edge_index = torch.stack([src, dst], dim=0)
    x = torch.randn(len(nid), 128)
    pos = edge_index
    neg = negative_sampling(edge_index, num_nodes=len(nid), num_neg_samples=pos.size(1))
    return x, edge_index, pos, neg

def train():
    x, edge_index, pos, neg = load_dataset()
    model, opt = SAGE(), optim.AdamW([p for p in SAGE().parameters()], lr=1e-3)
    model.train()
    for epoch in range(5):
        opt.zero_grad()
        y_pos = model(x, edge_index, pos)
        y_neg = model(x, edge_index, neg)
        loss = -(torch.log(y_pos+1e-6).mean() + torch.log(1 - y_neg + 1e-6).mean())
        loss.backward(); opt.step()

    # Metrics (toy): AUC surrogate
    with torch.no_grad():
        auc = float((y_pos.mean() - y_neg.mean()).clamp(min=0.0, max=1.0))
    return model.state_dict(), {"auc_surrogate": auc}

if __name__ == "__main__":
    with mlflow.start_run(run_name=RUN_NAME):
        state, metrics = train()
        mlflow.log_metrics(metrics)
        path = "artifacts/graphsage_linkpred.pt"
        os.makedirs("artifacts", exist_ok=True)
        torch.save(state, path)
        mlflow.log_artifact(path)
        # Model signature + params
        mlflow.log_params({"epochs": 5, "in_dim": 128})
