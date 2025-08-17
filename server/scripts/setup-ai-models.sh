#!/bin/bash

# IntelGraph AI Models Setup Script
# This script downloads and configures all required AI models for the multimodal extraction engine

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PYTHON_VERSION="3.9"
MODELS_DIR="src/ai/models"
TEMP_DIR="/tmp/intelgraph-models"
VENV_DIR="venv"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check Python version
check_python_version() {
    if command_exists python3; then
        local version=$(python3 --version 2>&1 | cut -d" " -f2 | cut -d"." -f1,2)
        local major=$(echo $version | cut -d"." -f1)
        local minor=$(echo $version | cut -d"." -f2)
        
        if [[ $major -eq 3 && $minor -ge 8 ]]; then
            return 0
        fi
    fi
    return 1
}

# Function to install system dependencies
install_system_dependencies() {
    print_status "Installing system dependencies..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Ubuntu/Debian
        if command_exists apt-get; then
            sudo apt-get update
            sudo apt-get install -y \
                python3 python3-pip python3-venv python3-dev \
                tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu tesseract-ocr-fra tesseract-ocr-spa \
                libtesseract-dev libleptonica-dev \
                ffmpeg libsm6 libxext6 libfontconfig1 libxrender1 libgl1-mesa-glx \
                libsndfile1 portaudio19-dev \
                build-essential cmake \
                wget curl git
        # CentOS/RHEL/Fedora
        elif command_exists yum; then
            sudo yum install -y \
                python3 python3-pip python3-devel \
                tesseract tesseract-langpack-eng tesseract-langpack-deu tesseract-langpack-fra tesseract-langpack-spa \
                tesseract-devel leptonica-devel \
                ffmpeg libXext libSM libXrender \
                libsndfile portaudio-devel \
                gcc gcc-c++ cmake \
                wget curl git
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command_exists brew; then
            brew install python@3.9 tesseract tesseract-lang ffmpeg portaudio cmake
        else
            print_error "Homebrew not found. Please install Homebrew first: https://brew.sh/"
            exit 1
        fi
    else
        print_warning "Unsupported operating system. Please install dependencies manually."
    fi
    
    print_success "System dependencies installed"
}

# Function to setup Python virtual environment
setup_python_env() {
    print_status "Setting up Python virtual environment..."
    
    if ! check_python_version; then
        print_error "Python 3.8+ is required. Please install Python 3.8 or higher."
        exit 1
    fi
    
    # Create virtual environment
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv $VENV_DIR
    fi
    
    # Activate virtual environment
    source $VENV_DIR/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip setuptools wheel
    
    print_success "Python virtual environment ready"
}

# Function to install Python dependencies
install_python_dependencies() {
    print_status "Installing Python AI/ML dependencies..."
    
    # Activate virtual environment
    source $VENV_DIR/bin/activate
    
    # Install PyTorch first (with appropriate CUDA support)
    if command_exists nvidia-smi; then
        print_status "NVIDIA GPU detected, installing PyTorch with CUDA support..."
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    else
        print_status "Installing CPU-only PyTorch..."
        pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    fi
    
    # Install other dependencies
    pip install -r requirements.txt
    
    print_success "Python dependencies installed"
}

# Function to download spaCy models
download_spacy_models() {
    print_status "Downloading spaCy language models..."
    
    source $VENV_DIR/bin/activate
    
    # Download spaCy models for multiple languages
    python -m spacy download en_core_web_lg
    python -m spacy download en_core_web_sm
    python -m spacy download de_core_news_lg
    python -m spacy download fr_core_news_lg
    python -m spacy download es_core_news_lg
    
    print_success "spaCy models downloaded"
}

# Function to download NLTK data
download_nltk_data() {
    print_status "Downloading NLTK data..."
    
    source $VENV_DIR/bin/activate
    
    python -c "
import nltk
import ssl

# Handle SSL certificate issues
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Download NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
nltk.download('vader_lexicon')
nltk.download('averaged_perceptron_tagger')
nltk.download('maxent_ne_chunker')
nltk.download('words')
print('NLTK data downloaded successfully')
"
    
    print_success "NLTK data downloaded"
}

# Function to download Whisper models
download_whisper_models() {
    print_status "Downloading Whisper speech recognition models..."
    
    source $VENV_DIR/bin/activate
    
    python -c "
import whisper

# Download different sized Whisper models
models = ['tiny', 'base', 'small', 'medium']

for model_name in models:
    try:
        print(f'Downloading Whisper {model_name} model...')
        model = whisper.load_model(model_name)
        print(f'Whisper {model_name} model downloaded successfully')
    except Exception as e:
        print(f'Failed to download Whisper {model_name} model: {e}')
"
    
    print_success "Whisper models downloaded"
}

# Function to download Sentence Transformers models
download_sentence_transformer_models() {
    print_status "Downloading Sentence Transformer models..."
    
    source $VENV_DIR/bin/activate
    
    python -c "
from sentence_transformers import SentenceTransformer

# Download popular sentence transformer models
models = [
    'all-MiniLM-L6-v2',
    'all-mpnet-base-v2',
    'paraphrase-multilingual-MiniLM-L12-v2'
]

for model_name in models:
    try:
        print(f'Downloading {model_name}...')
        model = SentenceTransformer(model_name)
        print(f'{model_name} downloaded successfully')
    except Exception as e:
        print(f'Failed to download {model_name}: {e}')
"
    
    print_success "Sentence Transformer models downloaded"
}

# Function to download YOLO models
download_yolo_models() {
    print_status "Downloading YOLO object detection models..."
    
    source $VENV_DIR/bin/activate
    
    python -c "
from ultralytics import YOLO

# Download YOLO models
models = ['yolov8n.pt', 'yolov8s.pt', 'yolov8m.pt']

for model_name in models:
    try:
        print(f'Downloading {model_name}...')
        model = YOLO(model_name)
        print(f'{model_name} downloaded successfully')
    except Exception as e:
        print(f'Failed to download {model_name}: {e}')
"
    
    print_success "YOLO models downloaded"
}

# Function to test model installations
test_model_installations() {
    print_status "Testing model installations..."
    
    source $VENV_DIR/bin/activate
    
    python -c "
import sys

def test_import(module_name, description):
    try:
        __import__(module_name)
        print(f'✓ {description}')
        return True
    except ImportError as e:
        print(f'✗ {description}: {e}')
        return False

def test_model_load(model_loader, description):
    try:
        model_loader()
        print(f'✓ {description}')
        return True
    except Exception as e:
        print(f'✗ {description}: {e}')
        return False

print('Testing Python packages...')
results = []

# Test basic packages
results.append(test_import('torch', 'PyTorch'))
results.append(test_import('cv2', 'OpenCV'))
results.append(test_import('spacy', 'spaCy'))
results.append(test_import('transformers', 'Transformers'))
results.append(test_import('sentence_transformers', 'Sentence Transformers'))
results.append(test_import('whisper', 'Whisper'))
results.append(test_import('ultralytics', 'Ultralytics YOLO'))
results.append(test_import('mtcnn', 'MTCNN'))
results.append(test_import('librosa', 'Librosa'))
results.append(test_import('sklearn', 'Scikit-learn'))

print('\\nTesting model loading...')

# Test model loading
def load_spacy():
    import spacy
    return spacy.load('en_core_web_sm')

def load_whisper():
    import whisper
    return whisper.load_model('tiny')

def load_yolo():
    from ultralytics import YOLO
    return YOLO('yolov8n.pt')

def load_sentence_transformer():
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer('all-MiniLM-L6-v2')

results.append(test_model_load(load_spacy, 'spaCy English model'))
results.append(test_model_load(load_whisper, 'Whisper tiny model'))
results.append(test_model_load(load_yolo, 'YOLO v8 nano model'))
results.append(test_model_load(load_sentence_transformer, 'Sentence Transformer model'))

success_count = sum(results)
total_count = len(results)

print(f'\\nTest Results: {success_count}/{total_count} successful')

if success_count == total_count:
    print('🎉 All tests passed! AI models are ready.')
    sys.exit(0)
else:
    print('⚠️  Some tests failed. Please check the error messages above.')
    sys.exit(1)
"
    
    if [ $? -eq 0 ]; then
        print_success "All model tests passed!"
    else
        print_warning "Some model tests failed. Check the output above for details."
    fi
}

# Function to create model configuration
create_model_config() {
    print_status "Creating model configuration..."
    
    cat > src/ai/config.json << EOF
{
  "models": {
    "ocr": {
      "engines": ["tesseract", "paddleocr", "easyocr"],
      "default": "tesseract",
      "languages": ["eng", "deu", "fra", "spa", "chi_sim"]
    },
    "object_detection": {
      "models": ["yolov8n.pt", "yolov8s.pt", "yolov8m.pt"],
      "default": "yolov8n.pt",
      "confidence_threshold": 0.5,
      "nms_threshold": 0.4
    },
    "face_detection": {
      "models": ["mtcnn", "retinaface"],
      "default": "mtcnn",
      "min_face_size": 20,
      "confidence_threshold": 0.7
    },
    "speech_recognition": {
      "models": ["whisper-tiny", "whisper-base", "whisper-small", "whisper-medium"],
      "default": "whisper-base",
      "languages": ["en", "de", "fr", "es", "auto"]
    },
    "text_analysis": {
      "spacy_models": {
        "en": "en_core_web_lg",
        "de": "de_core_news_lg", 
        "fr": "fr_core_news_lg",
        "es": "es_core_news_lg"
      },
      "default_language": "en"
    },
    "embeddings": {
      "text_models": [
        "all-MiniLM-L6-v2",
        "all-mpnet-base-v2",
        "paraphrase-multilingual-MiniLM-L12-v2"
      ],
      "default": "all-MiniLM-L6-v2"
    }
  },
  "paths": {
    "models_dir": "src/ai/models",
    "temp_dir": "/tmp/intelgraph",
    "python_path": "venv/bin/python"
  },
  "performance": {
    "enable_gpu": true,
    "max_concurrent_jobs": 5,
    "batch_size": 32
  }
}
EOF
    
    print_success "Model configuration created"
}

# Function to setup directories
setup_directories() {
    print_status "Setting up directories..."
    
    mkdir -p src/ai/models
    mkdir -p src/ai/engines
    mkdir -p src/ai/services
    mkdir -p temp/uploads
    mkdir -p temp/processed
    mkdir -p logs
    
    print_success "Directories created"
}

# Function to create test script
create_test_script() {
    print_status "Creating AI test script..."
    
    cat > scripts/test-ai-extraction.py << 'EOF'
#!/usr/bin/env python3
"""
AI Extraction Test Script
Tests all AI extraction engines with sample data
"""

import os
import sys
import json
import tempfile
from pathlib import Path

# Add the parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent / "src" / "ai" / "models"))

def test_text_embedding():
    """Test text embedding generation"""
    try:
        from text_embedding import TextEmbeddingGenerator
        
        generator = TextEmbeddingGenerator()
        result = generator.generate_embedding("This is a test sentence for embedding generation.")
        
        if result.get("embedding") and len(result["embedding"]) > 0:
            print("✓ Text embedding generation: PASSED")
            return True
        else:
            print("✗ Text embedding generation: FAILED")
            return False
            
    except Exception as e:
        print(f"✗ Text embedding generation: FAILED - {e}")
        return False

def test_object_detection():
    """Test object detection with a sample image"""
    try:
        # Create a simple test image
        import cv2
        import numpy as np
        
        # Create a simple test image (100x100 white square)
        test_image = np.ones((100, 100, 3), dtype=np.uint8) * 255
        
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
            cv2.imwrite(tmp_file.name, test_image)
            
            from yolo_detection import YOLODetection
            
            detector = YOLODetection()
            result = detector.detect_objects(tmp_file.name)
            
            os.unlink(tmp_file.name)
            
            if "detections" in result:
                print("✓ Object detection: PASSED")
                return True
            else:
                print("✗ Object detection: FAILED")
                return False
                
    except Exception as e:
        print(f"✗ Object detection: FAILED - {e}")
        return False

def test_whisper_transcription():
    """Test Whisper transcription with silence"""
    try:
        # Create a short silent audio file for testing
        import numpy as np
        import soundfile as sf
        
        # Generate 1 second of silence
        sample_rate = 16000
        duration = 1  # seconds
        silence = np.zeros(sample_rate * duration, dtype=np.float32)
        
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            sf.write(tmp_file.name, silence, sample_rate)
            
            from whisper_transcription import WhisperTranscription
            
            transcriber = WhisperTranscription()
            result = transcriber.transcribe_audio(tmp_file.name)
            
            os.unlink(tmp_file.name)
            
            if "segments" in result:
                print("✓ Whisper transcription: PASSED")
                return True
            else:
                print("✗ Whisper transcription: FAILED")
                return False
                
    except Exception as e:
        print(f"✗ Whisper transcription: FAILED - {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing IntelGraph AI Extraction Engines\n")
    
    tests = [
        test_text_embedding,
        test_object_detection,
        test_whisper_transcription
    ]
    
    results = []
    for test in tests:
        results.append(test())
    
    print(f"\n📊 Test Results: {sum(results)}/{len(results)} passed")
    
    if all(results):
        print("🎉 All AI extraction tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Check the error messages above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
EOF
    
    chmod +x scripts/test-ai-extraction.py
    print_success "AI test script created"
}

# Main installation function
main() {
    echo "🚀 IntelGraph AI Models Setup"
    echo "================================"
    echo ""
    
    # Check if running from correct directory
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the server directory (where package.json is located)"
        exit 1
    fi
    
    # Check for required tools
    if ! command_exists python3; then
        print_error "Python 3 is required but not installed"
        exit 1
    fi
    
    # Installation steps
    setup_directories
    install_system_dependencies
    setup_python_env
    install_python_dependencies
    download_spacy_models
    download_nltk_data
    download_whisper_models
    download_sentence_transformer_models
    download_yolo_models
    create_model_config
    create_test_script
    test_model_installations
    
    echo ""
    echo "🎉 AI Models Setup Complete!"
    echo ""
    echo "Next steps:"
    echo "1. Activate the virtual environment: source venv/bin/activate"
    echo "2. Test the AI engines: python scripts/test-ai-extraction.py"
    echo "3. Start the IntelGraph server: npm run dev"
    echo ""
    echo "For GPU acceleration (optional):"
    echo "- Install NVIDIA drivers and CUDA toolkit"
    echo "- Reinstall PyTorch with CUDA: pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118"
    echo ""
    print_success "Setup completed successfully!"
}

# Run main function
main "$@"
EOF