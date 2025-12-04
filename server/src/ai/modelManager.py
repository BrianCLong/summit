import os
import torch
import spacy
from ultralytics import YOLO
import whisper
from sentence_transformers import SentenceTransformer
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ModelManager:
    _instance = None

    def __new__(cls, config):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance.config = config
            cls._instance.models = {}
            cls._instance.device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"ModelManager initialized. Device: {cls._instance.device}")
        return cls._instance

    def get_model(self, model_type):
        """Lazy load models based on type."""
        if model_type in self.models:
            return self.models[model_type]

        logger.info(f"Loading model: {model_type}")

        try:
            if model_type == 'yolo':
                config = self.config.get('models', {}).get('yolo', {})
                model_id = config.get('model_id', 'yolov8n.pt')
                model = YOLO(model_id)
                # Export to TensorRT if needed/configured (simplified here)
                self.models[model_type] = model

            elif model_type == 'whisper':
                config = self.config.get('models', {}).get('whisper', {})
                model_id = config.get('model_id', 'tiny')
                model = whisper.load_model(model_id, device=self.device)
                self.models[model_type] = model

            elif model_type == 'spacy':
                config = self.config.get('models', {}).get('spacy', {})
                model_id = config.get('model_id', 'en_core_web_sm')
                disable = config.get('disable_pipes', [])
                model = spacy.load(model_id, disable=disable)
                self.models[model_type] = model

            elif model_type == 'sentence_transformer':
                config = self.config.get('models', {}).get('sentence_transformer', {})
                model_id = config.get('model_id', 'all-MiniLM-L6-v2')
                model = SentenceTransformer(model_id, device=self.device)
                # Quantization could be applied here
                self.models[model_type] = model

            else:
                raise ValueError(f"Unknown model type: {model_type}")

            logger.info(f"Model loaded: {model_type}")
            return self.models[model_type]

        except Exception as e:
            logger.error(f"Failed to load model {model_type}: {e}")
            raise

    def unload_model(self, model_type):
        """Unload model to free memory."""
        if model_type in self.models:
            del self.models[model_type]
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            logger.info(f"Unloaded model: {model_type}")

    def get_config(self, model_type):
        return self.config.get('models', {}).get(model_type, {})
