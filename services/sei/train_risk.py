# services/sei/train_risk.py
import pandas as pd
from joblib import dump
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split

X = pd.read_parquet("sei/features.parquet")
y = X.pop("label")  # 1 if post-merge incident/regression
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=44)
model = CalibratedClassifierCV(GradientBoostingClassifier(), method="isotonic")
model.fit(X_train, y_train)
print("AUC ~", model.score(X_test, y_test))
dump(model, "artifacts/risk_v2.joblib")
