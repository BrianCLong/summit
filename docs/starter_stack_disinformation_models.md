# Starter stack for disinformation monitoring

This document summarizes a curated starter stack of Hugging Face models for disinformation monitoring. The list is grouped by task with operational notes, quickstart snippets, and sizing guidance so teams can stand up a minimal-but-complete pipeline quickly.

## Prioritized models by task

Each table is ordered for practical rollout: start at the top and expand downward as you scale coverage or need more capability.

### Text classifiers (disinformation, stance, sentiment)

| Priority | Model                                                  | Typical role                      | Notes                                             |
| -------- | ------------------------------------------------------ | --------------------------------- | ------------------------------------------------- |
| 1        | `Pulk17/Fake-News-Detection`                           | English fake/real classifier      | Good baseline; fine-tune on your feeds.           |
| 2        | `mrm8488/bert-tiny-finetuned-fake-news`                | Low-latency fake-news filter      | Tiny; useful at the edge.                         |
| 3        | `WilliamO/roberta-base-fake-news-stance`               | Stance (agree/disagree/unrelated) | Helps link posts to known narratives.             |
| 4        | `marianna13/Multilingual-Fake-News-Dataset-Bert-Base`  | Multilingual fake-news baseline   | Extend with Slavic/Central Asian data.            |
| 5        | `cardiffnlp/twitter-xlm-roberta-base-sentiment`        | Multilingual sentiment            | Track sentiment swings around campaigns.          |
| 6        | `facebook/bart-large-mnli`                             | Zero-shot topic/stance            | Classify against custom labels without fine-tune. |
| 7        | `joeddav/xlm-roberta-large-xnli`                       | Multilingual zero-shot            | Same as above for non-English.                    |
| 8        | `typeform/distilbert-base-uncased-mnli`                | Fast zero-shot                    | CPU-friendly routing model.                       |
| 9        | `cross-encoder/nli-deberta-v3-base`                    | Pairwise stance/NLI               | Good for claim vs evidence checks.                |
| 10       | `ynie/roberta-large-snli_mnli_fever_anli_R1_R2_R3-nli` | Robust NLI ensemble               | Stronger but heavier stance signal.               |
| 11       | `LauraRuis/roberta-base-openai-detector`               | AI-generation detector            | Heuristic flag for synthetic drops.               |
| 12       | `unitary/toxic-bert`                                   | Toxicity/abuse filter             | Useful pre-filter for human review.               |

### Translators (many-to-many and pairwise)

| Priority | Model                              | Typical role            | Notes                                         |
| -------- | ---------------------------------- | ----------------------- | --------------------------------------------- |
| 1        | `facebook/nllb-200-distilled-600M` | Broad coverage          | Higher quality; reserve for high-value items. |
| 2        | `alirezamsh/small100`              | Efficient many-to-many  | Good first-pass in constrained environments.  |
| 3        | `facebook/m2m100-418M`             | Mid-weight many-to-many | Balance of quality and speed.                 |
| 4        | `facebook/wmt19-ru-en`             | RU→EN high quality      | Strong for Russian content.                   |
| 5        | `facebook/wmt19-en-ru`             | EN→RU high quality      | For back-translation/data augmentation.       |
| 6        | `Helsinki-NLP/opus-mt-ru-en`       | RU→EN lightweight       | CPU-friendly routing.                         |
| 7        | `Helsinki-NLP/opus-mt-uk-en`       | UK→EN lightweight       | Ukrainian coverage.                           |
| 8        | `Helsinki-NLP/opus-mt-fa-en`       | FA→EN lightweight       | Farsi coverage.                               |
| 9        | `Helsinki-NLP/opus-mt-kk-en`       | KK→EN lightweight       | Kazakh coverage.                              |
| 10       | `Helsinki-NLP/opus-mt-uz-en`       | UZ→EN lightweight       | Uzbek coverage.                               |
| 11       | `Helsinki-NLP/opus-mt-ky-en`       | KY→EN lightweight       | Kyrgyz coverage.                              |
| 12       | `Helsinki-NLP/opus-mt-tr-en`       | TR→EN lightweight       | Turkish coverage.                             |

### Embedders (cross-lingual retrieval & clustering)

| Priority | Model                                                         | Typical role                    | Notes                                |
| -------- | ------------------------------------------------------------- | ------------------------------- | ------------------------------------ |
| 1        | `sentence-transformers/paraphrase-multilingual-mpnet-base-v2` | Cross-lingual semantic search   | Strong multilingual baseline.        |
| 2        | `sentence-transformers/LaBSE`                                 | Language-agnostic embeddings    | Good for low-resource languages.     |
| 3        | `sentence-transformers/all-mpnet-base-v2`                     | High-quality English embeddings | Use after translation for precision. |
| 4        | `sentence-transformers/all-distilroberta-v1`                  | Lightweight English embeddings  | CPU-friendly.                        |
| 5        | `sentence-transformers/multi-qa-mpnet-base-dot-v1`            | QA-focused embeddings           | Good for retrieval-style matching.   |
| 6        | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` | Efficient multilingual          | Balanced quality/speed.              |
| 7        | `intfloat/multilingual-e5-base`                               | Retrieval-tuned multilingual    | Consistent across languages.         |
| 8        | `intfloat/multilingual-e5-large`                              | Higher quality retrieval        | Use where GPUs available.            |
| 9        | `sentence-transformers/all-MiniLM-L6-v2`                      | Very small English              | Edge deployment.                     |
| 10       | `sentence-transformers/all-MiniLM-L12-v2`                     | Small English                   | Slightly better quality.             |
| 11       | `sentence-transformers/msmarco-distilbert-dot-v5`             | Passage retrieval               | Good for evidence lookups.           |
| 12       | `sentence-transformers/gtr-t5-base`                           | T5-based dual encoder           | Balanced quality and speed.          |

### Multimodal checks (image/video + text)

| Priority | Model                                     | Typical role             | Notes                                  |
| -------- | ----------------------------------------- | ------------------------ | -------------------------------------- |
| 1        | `MischaQI/SNIFFER`                        | Out-of-context detection | Combines text+image consistency.       |
| 2        | `openai/clip-vit-large-patch14`           | Cross-modal embedding    | Strong baseline for similarity search. |
| 3        | `openai/clip-vit-base-patch32`            | Lighter CLIP             | Faster, lower memory.                  |
| 4        | `laion/CLIP-ViT-B-32-laion2B-s34B-b79K`   | Open CLIP variant        | Good for meme search at scale.         |
| 5        | `microsoft/xclip-base-patch32`            | Video-text retrieval     | Short video caption alignment.         |
| 6        | `Salesforce/blip-image-captioning-large`  | Image captioning         | Generates text for downstream checks.  |
| 7        | `Salesforce/blip-itm-base-coco`           | Image-text matching      | Detects mismatched captions.           |
| 8        | `google/vit-base-patch16-224-in21k`       | Vision backbone          | Fine-tune for meme taxonomy/features.  |
| 9        | `microsoft/vision-text-dual-encoder-base` | Image-text dual encoder  | Alternative cross-modal embedder.      |
| 10       | `OpenGVLab/InternVL-Chat-V1-5`            | Vision-language chat     | Heavy; use for analyst deep dives.     |
| 11       | `OFA-Sys/OFA-tiny`                        | Small multimodal model   | Lightweight captioning/checks.         |
| 12       | `Falconsai/nsfw_image_detection`          | NSFW filter              | Pre-filter before analyst review.      |

## Quickstart pipeline snippets

```python
from transformers import pipeline

# 1) Text triage (zero-shot or fake-news)
zero_shot = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
print(zero_shot("Claim text here", candidate_labels=["disinformation", "benign", "needs review"]))

# 2) Translation routing
translator = pipeline("translation", model="alirezamsh/small100", src_lang="ru", tgt_lang="en")
print(translator("Введите текст для перевода", max_length=512)[0]["translation_text"])

# 3) Embedding for clustering/search
from sentence_transformers import SentenceTransformer
embedder = SentenceTransformer("sentence-transformers/paraphrase-multilingual-mpnet-base-v2")
vector = embedder.encode(["translated or original text"], normalize_embeddings=True)

# 4) Multimodal similarity (image + caption)
clip = pipeline("feature-extraction", model="openai/clip-vit-base-patch32")
image_vector = clip(images="meme.png")
text_vector = clip(text=["caption or claim"])
```

## Deployment and sizing cheatsheet

| Stage                                   | Baseline hardware                                 | Notes                                              |
| --------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Ingestion + language ID + routing       | 2–4 vCPU, 8 GB RAM                                | CPU-only is fine.                                  |
| Translation (small100/Opus-MT)          | CPU (8 vCPU) or single T4/A10                     | Use GPU for higher throughput; bucket by language. |
| High-fidelity translation (NLLB/M2M100) | Single A10/A100 or better                         | NLLB benefits from larger memory (24–40 GB).       |
| Text classifiers (BERT/Distil)          | CPU (8 vCPU) for small; T4/A10 for heavier        | Batch inputs for throughput.                       |
| Embeddings (MiniLM/E5/MPNet)            | CPU for MiniLM; T4/A10 for E5-large               | Enable faiss/HNSW for vector DB.                   |
| Multimodal (CLIP/BLIP)                  | T4/A10 minimum; A100 for InternVL/large BLIP      | Precompute image embeddings to save GPU.           |
| Storage/serving                         | Vector DB (e.g., pgvector, qdrant) + object store | Keep provenance metadata alongside vectors.        |
| Ops                                     | Prometheus/Grafana + audit logging                | Track model versions and decisions.                |

## Minimal rollout order

1. Deploy language detection and translation routing (small100 + Opus-MT pair models).
2. Add zero-shot stance (`facebook/bart-large-mnli`) and fake-news baselines (`Pulk17/Fake-News-Detection`).
3. Stand up embeddings (`paraphrase-multilingual-mpnet-base-v2`) and vector search with clustering.
4. Layer in multimodal checks: CLIP similarity + BLIP caption matching; add SNIFFER for out-of-context detection.
5. Close the loop with analyst feedback and periodic fine-tuning on your own corpus.
