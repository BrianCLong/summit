import polars as pl, numpy as np
from scipy.stats import ks_2samp
def ks_drift(ref: pl.Series, cur: pl.Series):
    r, c = ref.drop_nulls().to_numpy(), cur.drop_nulls().to_numpy()
    if len(r)<50 or len(c)<50: return {"p":1.0,"drift":False}
    stat,p = ks_2samp(r,c)
    return {"p": float(p), "drift": p < 0.01, "stat": float(stat)}
