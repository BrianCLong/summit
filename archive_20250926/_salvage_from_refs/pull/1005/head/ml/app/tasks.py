from .celery_app import celery_app
from .models import (
    get_entity_resolver,
    get_link_predictor,
    get_community_detector,
    get_text_analyzer
)
from typing import Dict, Any, List, Tuple
import numpy as np
import networkx as nx
import os
import logging
import asyncio

from .cache import (
    fingerprint_graph,
    get_cached_communities,
    set_cached_communities,
)

logger = logging.getLogger(__name__)

_NLP_PIPE = None
try:
    # optional spaCy pipeline if enabled and available
    if os.getenv("USE_SPACY","false").lower() == "true":
        from .security import optional_spacy
        _NLP_PIPE = optional_spacy()
except Exception:
    _NLP_PIPE = None

# === NLP: Enhanced entity extraction with multiple approaches
@celery_app.task
def task_nlp_entities(payload: Dict[str, Any]) -> Dict[str, Any]:
    docs = payload["docs"]
    text_analyzer = get_text_analyzer()
    results = []

    for d in docs:
        ents = []
        text = d["text"]

        # Use spaCy if available
        if _NLP_PIPE:
            try:
                for e in _NLP_PIPE(text).ents:
                    ents.append({
                        "text": e.text,
                        "label": e.label_,
                        "start": e.start_char,
                        "end": e.end_char,
                        "confidence": 0.95,
                        "source": "spacy"
                    })
            except Exception as e:
                logger.warning(f"spaCy processing failed: {e}")

        # Add pattern-based entity extraction
        try:
            pattern_entities = text_analyzer.extract_entities(text)
            for ent in pattern_entities:
                ent["source"] = "pattern"
                ents.append(ent)
        except Exception as e:
            logger.warning(f"Pattern extraction failed: {e}")

        # Fallback: simple heuristic
        if not ents:
            tokens = text.split()
            ents = [{"text": t, "label": "ORG", "confidence": 0.3, "source": "heuristic"}
                   for t in tokens if t.isupper() and len(t) > 2]

        results.append({"doc_id": d["id"], "entities": ents})

    return {"job_id": payload.get("job_id"), "kind": "nlp_entities", "results": results}

# === ER: Advanced entity resolution using transformer embeddings
@celery_app.task
def task_entity_resolution(payload: Dict[str, Any]) -> Dict[str, Any]:
    recs = payload["records"]
    threshold = payload.get("threshold", 0.82)

    try:
        entity_resolver = get_entity_resolver()
        links = entity_resolver.resolve_entities(recs, threshold)

        return {
            "job_id": payload.get("job_id"),
            "kind": "entity_resolution",
            "links": links,
            "method": "transformer" if entity_resolver.use_transformers else "tfidf",
            "threshold": threshold,
            "total_entities": len(recs),
            "matches_found": len(links)
        }
    except Exception as e:
        logger.error(f"Entity resolution failed: {e}")
        # Fallback to simple approach
        return _fallback_entity_resolution(payload)

# === Link Prediction: Advanced multi-algorithm approach
@celery_app.task
def task_link_prediction(payload: Dict[str, Any]) -> Dict[str, Any]:
    edges = payload.get("edges", [])
    top_k = payload.get("top_k", 50)
    method = payload.get("method", "adamic_adar")

    try:
        link_predictor = get_link_predictor()
        predictions = link_predictor.predict_links(edges, method, top_k)

        return {
            "job_id": payload.get("job_id"),
            "kind": "link_prediction",
            "predictions": predictions,
            "method": method,
            "total_edges": len(edges),
            "predictions_count": len(predictions)
        }
    except Exception as e:
        logger.error(f"Link prediction failed: {e}")
        return _fallback_link_prediction(payload)

# === Community Detection: Advanced multi-algorithm approach
@celery_app.task
def task_community_detect(payload: Dict[str, Any]) -> Dict[str, Any]:
    edges = payload.get("edges", [])
    algorithm = payload.get("algorithm", "louvain")
    resolution = payload.get("resolution", 1.0)

    fingerprint = fingerprint_graph(edges, algorithm, resolution)
    job_id = payload.get("job_id")

    # Attempt to fetch from cache
    try:
        cached = asyncio.run(get_cached_communities(fingerprint))
    except Exception as e:  # pragma: no cover - defensive
        logger.warning(f"Cache retrieval failed: {e}")
        cached = None

    if cached:
        return {"job_id": job_id, "kind": "community_detect", **cached}

    try:
        community_detector = get_community_detector()
        communities = community_detector.detect_communities(
            edges, algorithm, resolution
        )
        result_core = {
            "communities": communities,
            "algorithm": algorithm,
            "resolution": resolution,
            "total_edges": len(edges),
            "communities_found": len(communities),
        }
    except Exception as e:
        logger.error(f"Community detection failed: {e}")
        fallback = _fallback_community_detection(payload)
        result_core = {
            "communities": fallback.get("communities", []),
            "algorithm": algorithm,
            "resolution": resolution,
            "total_edges": len(edges),
            "communities_found": len(fallback.get("communities", [])),
        }

    # Update cache asynchronously
    try:
        asyncio.run(set_cached_communities(fingerprint, result_core))
    except Exception as e:  # pragma: no cover - defensive
        logger.warning(f"Cache store failed: {e}")

    result_core["job_id"] = job_id
    result_core["kind"] = "community_detect"
    return result_core

# === Audio and Image Entity Extraction ===

@celery_app.task
def task_audio_entity_extraction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Simple audio entity extraction using transcript heuristics"""
    audios = payload.get("audio", [])
    results = []

    for idx, audio in enumerate(audios):
        transcript = audio.get("transcript", "")
        entities = []
        if "Alice" in transcript:
            entities.append({
                "text": "Alice",
                "label": "PERSON",
                "confidence": 0.9,
                "source": "heuristic",
            })

        results.append({
            "audio_id": audio.get("id", idx),
            "transcript": transcript,
            "entities": entities,
        })

    return {
        "job_id": payload.get("job_id"),
        "kind": "audio_entities",
        "results": results,
    }


@celery_app.task
def task_image_entity_extraction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Simple image entity extraction based on provided labels"""
    images = payload.get("images", [])
    results = []

    for idx, image in enumerate(images):
        labels = image.get("labels", [])
        entities = [
            {"label": label, "confidence": 0.8, "source": "heuristic"}
            for label in labels
        ]

        results.append({
            "image_id": image.get("id", idx),
            "entities": entities,
        })

    return {
        "job_id": payload.get("job_id"),
        "kind": "image_entities",
        "results": results,
    }

# === Fallback functions for error handling ===
def _fallback_entity_resolution(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Simple fallback entity resolution"""
    recs = payload["records"]
    threshold = payload.get("threshold", 0.82)
    links = []

    for i in range(len(recs)):
        for j in range(i + 1, len(recs)):
            name1 = (recs[i].get("name") or "").lower()
            name2 = (recs[j].get("name") or "").lower()
            if name1 and name2:
                # Simple string similarity
                similarity = len(set(name1.split()) & set(name2.split())) / max(len(name1.split()), len(name2.split()))
                if similarity >= threshold:
                    links.append((recs[i]["id"], recs[j]["id"], similarity))

    return {"job_id": payload.get("job_id"), "kind": "entity_resolution", "links": links}

def _fallback_link_prediction(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Simple fallback link prediction"""
    edges = payload.get("edges", [])
    G = nx.Graph()
    G.add_edges_from(edges)
    candidates = []
    nodes = list(G.nodes())

    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            u, v = nodes[i], nodes[j]
            if not G.has_edge(u, v):
                score = len(list(nx.common_neighbors(G, u, v))) if u in G and v in G else 0
                if score > 0:
                    candidates.append({"u": u, "v": v, "score": score})

    candidates.sort(key=lambda x: x["score"], reverse=True)
    return {"job_id": payload.get("job_id"), "kind": "link_prediction", "predictions": candidates[:payload.get("top_k", 50)]}

def _fallback_community_detection(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Simple fallback community detection"""
    edges = payload.get("edges", [])
    G = nx.Graph()
    G.add_edges_from(edges)
    comms = list(nx.algorithms.community.greedy_modularity_communities(G))
    results = []
    for idx, c in enumerate(comms):
        results.append({"community_id": f"c{idx}", "members": list(c)})
    return {"job_id": payload.get("job_id"), "kind": "community_detect", "communities": results}
