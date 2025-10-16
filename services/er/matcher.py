# services/er/matcher.py
import torch
import torch.nn as nn


class PairNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.mlp = nn.Sequential(
            nn.Linear(2, 16), nn.ReLU(), nn.Linear(16, 8), nn.ReLU(), nn.Linear(8, 1), nn.Sigmoid()
        )

    def forward(self, x):
        return self.mlp(x)


def train(model, X, y, epochs=20):
    opt = torch.optim.Adam(model.parameters(), 1e-3)
    lossf = nn.BCELoss()
    for _ in range(epochs):
        opt.zero_grad()
        pred = model(torch.tensor(X, dtype=torch.float32)).squeeze(1)
        loss = lossf(pred, torch.tensor(y, dtype=torch.float32))
        loss.backward()
        opt.step()


def predict(model, X):
    with torch.no_grad():
        return model(torch.tensor(X, dtype=torch.float32)).squeeze(1).numpy()
