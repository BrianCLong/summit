from fastapi import FastAPI
import torch, json
from torch_geometric.nn import SAGEConv

app = FastAPI()
class SAGE(torch.nn.Module):
    def __init__(self, in_dim, h=128):
        super().__init__()
        self.conv1 = SAGEConv(in_dim, h); self.conv2 = SAGEConv(h, h)
        self.scorer = torch.nn.Sequential(torch.nn.Linear(2*h, h), torch.nn.ReLU(), torch.nn.Linear(h,1))
    def forward(self, x, edge_index, pairs):
        h=torch.relu(self.conv1(x, edge_index)); h=torch.relu(self.conv2(h, edge_index))
        a=h[pairs[:,0]]; b=h[pairs[:,1]]
        return torch.sigmoid(self.scorer(torch.cat([a,b],1))).squeeze()

with open("models/meta.json") as f: meta=json.load(f)
model=SAGE(meta["in_dim"]); model.load_state_dict(torch.load("models/link_pred.pt", map_location="cpu", weights_only=True)); model.eval()

# TODO: inject real features/edges via shared store; simplified stub:
import torch
x=torch.randn(10000, meta["in_dim"])
edge_index=torch.randint(0,10000,(2,50000))

@app.post("/score")
def score(pairs: dict):
    ps=torch.tensor(pairs["pairs"], dtype=torch.long)
    scores=model(x, edge_index, ps).detach().tolist()
    return {"scores": scores}
