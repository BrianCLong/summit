import numpy as np
from sklearn.linear_model import SGDClassifier

X = np.load("pairs_X.npy")  # diff features
y = np.load("pairs_y.npy")  # 1 if A>B else 0
clf = SGDClassifier(loss="log", alpha=1e-4).fit(X, y)
np.save("artifacts/pairwise_coef.npy", clf.coef_)
