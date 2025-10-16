import pandas as pd
from sklearn.linear_model import PoissonRegressor


def attribute(df: pd.DataFrame):
    # df columns: time, metric, dep_upgraded, cache_hit, env_change, ...
    X = df[[c for c in df.columns if c not in ("time", "metric")]]
    y = df["metric"]
    model = PoissonRegressor(alpha=0.1).fit(X, y)
    return pd.Series(model.coef_, index=X.columns).sort_values(key=abs, ascending=False)
