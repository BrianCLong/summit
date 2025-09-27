# AI Extraction Capabilities

IntelGraph now leverages real machine learning models for entity extraction:

- **Hugging Face Transformers** via `@xenova/transformers` for NER on text.
- **Tesseract OCR** for text extraction from images and documents.
- Python utilities to download required spaCy and transformer models.

Run `scripts/download_ai_models.py` to fetch the models before executing the
extraction pipelines.
