import numpy as np
from sklearn.linear_model import SGDRegressor

X = np.load("hazard_X.npy")
y = np.load("hazard_y.npy")  # log-hazard proxy
m = SGDRegressor(alpha=1e-4).fit(X, y)
np.save("artifacts/hazard_coef.npy", m.coef_)
