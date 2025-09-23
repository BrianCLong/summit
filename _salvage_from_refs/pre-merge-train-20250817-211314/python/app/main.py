from fastapi import FastAPI
from .threat_correlation import ThreatCorrelator
from .wargame_optimizer import WargameOptimizer
from .sentiment_volatility import VolatilityNexus
from .stego_analyzer import StegoAnalyzer

app = FastAPI()

@app.post("/threat_correlation")
async def correlate(data: dict):
    correlator = ThreatCorrelator("bolt://neo4j:7687", "neo4j", "password")
    return correlator.ingest_osint(data)

@app.post("/wargame_optimizer")
async def optimize_wargame(data: dict):
    optimizer = WargameOptimizer()
    return optimizer.analyze_logs(data)

@app.post("/sentiment_volatility")
async def analyze_sentiment_volatility(data: dict):
    nexus = VolatilityNexus()
    return nexus.process_signals(data)

@app.post("/stego_analyzer")
async def analyze_stego(media_data: dict):
    analyzer = StegoAnalyzer()
    # Assuming media_data['data'] contains the base64 encoded bytes and media_data['params'] contains parameters
    return analyzer.analyze_media(media_data['data'], media_data['params'])

@app.get("/")
async def root():
    return {"message": "Strategic Intelligence Suite AI Server is running!"}