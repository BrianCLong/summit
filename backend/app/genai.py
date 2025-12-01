from ctransformers import AutoModelForCausalLM
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

# --- 1. Load the Local LLM ---
# This will be loaded on application startup.
llm = None

def load_llm():
    """Loads the local LLM."""
    global llm
    if llm is None:
        llm = AutoModelForCausalLM.from_pretrained(
            "backend/models/llama-2-7b-chat.Q2_K.gguf",
            model_type="llama",
            temperature=0.2,
            max_new_tokens=1024,
        )

# --- 2. Set up the Vector Store (RAG) ---
# For the MVP, we'll use a simple in-memory FAISS index.
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
# A real implementation would have a more sophisticated document store.
documents = [
    "Malware IOCs are indicators of compromise related to malicious software.",
    "Phishing IOCs are indicators of compromise related to phishing attacks.",
    "C2 IOCs are indicators of compromise related to command and control servers.",
    "High threat scores indicate a high probability of maliciousness.",
    "Low threat scores indicate a low probability of maliciousness.",
]
document_embeddings = embedding_model.encode(documents)
index = faiss.IndexFlatL2(document_embeddings.shape[1])
index.add(document_embeddings)

# --- 3. Prediction Generation ---
def generate_prediction(ioc_name):
    """
    Generates a threat score and prediction for a given IOC name.
    """
    if llm is None:
        load_llm()

    # --- RAG ---
    # 1. Create an embedding for the IOC name.
    ioc_embedding = embedding_model.encode([ioc_name])

    # 2. Search for the most similar document in the vector store.
    D, I = index.search(ioc_embedding, 1)
    context = documents[I[0][0]]

    # --- Prompt Engineering ---
    prompt = f"""
    Context: {context}

    You are a cybersecurity analyst. Based on the context and the following Indicator of Compromise (IOC), provide a threat score (1-100) and a brief prediction (1-2 sentences).

    IOC: {ioc_name}

    Response (in JSON format):
    {{
        "threat_score": <score>,
        "prediction": "<prediction>"
    }}
    """

    # --- LLM Inference ---
    response = llm(prompt)

    # --- Output Parsing ---
    # A real implementation would have more robust parsing and error handling.
    try:
        import json
        return json.loads(response.strip())
    except Exception:
        return {
            "threat_score": random.randint(1, 100),
            "prediction": "Could not parse LLM response.",
        }
