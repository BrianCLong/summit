from prometheus_client import Counter, Histogram, Gauge
INF_REQ = Counter("predict_inference_requests_total","count")
INF_LAT = Histogram("predict_inference_latency_ms","lat", buckets=[10,50,100,250,500,1000,2000,5000])
MODEL_VER = Gauge("predict_model_version", "numeric model version")
