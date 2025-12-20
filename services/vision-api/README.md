# Vision API Service

Unified REST API for all IntelGraph computer vision capabilities.

## Features

- **Object Detection** - YOLO v8/v9, multi-object tracking
- **Face Analysis** - Detection, recognition, demographics, emotions
- **OCR** - Multi-language text extraction, document analysis
- **Satellite Imagery** - Change detection, building detection, land use
- **Video Analysis** - Action recognition, crowd analysis, key frames
- **Image Forensics** - Deepfake detection, manipulation detection

## Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Build packages
pnpm run build --filter=@intelgraph/vision-api

# Install Python dependencies
pip install -r requirements.txt

# Start service
pnpm --filter=@intelgraph/vision-api dev
```

### Docker

```bash
# Build image
docker build -t intelgraph/vision-api:latest -f Dockerfile ../..

# Run container
docker run --gpus all -p 8080:8080 intelgraph/vision-api:latest
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f vision-api

# Stop services
docker-compose down
```

### Kubernetes

```bash
# Deploy to Kubernetes
kubectl apply -f k8s-deployment.yaml

# Check status
kubectl get pods -n intelgraph-vision

# View logs
kubectl logs -f deployment/vision-api -n intelgraph-vision
```

## API Endpoints

### Object Detection

```bash
# Detect objects in image
curl -X POST -F "image=@photo.jpg" \
  -F "confidence_threshold=0.6" \
  http://localhost:8080/api/v1/detect/objects

# Batch detection
curl -X POST \
  -F "images=@img1.jpg" \
  -F "images=@img2.jpg" \
  http://localhost:8080/api/v1/detect/objects/batch
```

### Face Analysis

```bash
# Detect faces
curl -X POST -F "image=@photo.jpg" \
  -F "extract_embeddings=true" \
  -F "analyze_demographics=true" \
  http://localhost:8080/api/v1/face/detect

# Compare faces
curl -X POST \
  -F "images=@person1.jpg" \
  -F "images=@person2.jpg" \
  http://localhost:8080/api/v1/face/compare
```

### OCR

```bash
# Extract text
curl -X POST -F "image=@document.jpg" \
  -F "languages=eng,spa" \
  http://localhost:8080/api/v1/ocr/extract

# Document analysis
curl -X POST -F "image=@receipt.jpg" \
  -F "document_type=receipt" \
  http://localhost:8080/api/v1/ocr/document
```

### Satellite Imagery

```bash
# Analyze satellite image
curl -X POST -F "image=@satellite.tif" \
  http://localhost:8080/api/v1/satellite/analyze

# Change detection
curl -X POST \
  -F "images=@before.tif" \
  -F "images=@after.tif" \
  http://localhost:8080/api/v1/satellite/change-detection
```

### Video Analysis

```bash
# Analyze video
curl -X POST -F "video=@video.mp4" \
  -F "detect_actions=true" \
  -F "extract_key_frames=true" \
  http://localhost:8080/api/v1/video/analyze
```

### Image Forensics

```bash
# Detect manipulation
curl -X POST -F "image=@suspect.jpg" \
  http://localhost:8080/api/v1/forensics/analyze

# Deepfake detection
curl -X POST -F "image=@face.jpg" \
  http://localhost:8080/api/v1/forensics/deepfake
```

### Health Check

```bash
# Check service health
curl http://localhost:8080/health

# Get model information
curl http://localhost:8080/api/v1/models/info
```

## Configuration

### Environment Variables

```bash
NODE_ENV=production
VISION_API_PORT=8080
UPLOAD_DIR=/tmp/vision-uploads
YOLO_SCRIPT_PATH=/app/server/src/ai/models/yolo_detection.py
FACE_SCRIPT_PATH=/app/server/src/ai/models/face_detection.py
OCR_SCRIPT_PATH=/app/server/src/ai/models/ocr_engine.py
```

## Performance

### Throughput

- **Object Detection**: 50-100 images/sec (GPU)
- **Face Analysis**: 30-60 images/sec (GPU)
- **OCR**: 10-20 images/sec (CPU)
- **Video Analysis**: 30-60 FPS (GPU)

### Latency

- **Object Detection**: 20-50ms (GPU)
- **Face Analysis**: 30-70ms (GPU)
- **OCR**: 100-300ms (CPU)
- **Forensics**: 200-500ms (GPU)

## Scaling

### Horizontal Scaling

```bash
# Scale to 5 replicas
kubectl scale deployment vision-api --replicas=5 -n intelgraph-vision

# Auto-scaling is configured with HPA (2-10 replicas)
```

### GPU Optimization

- Use NVIDIA A100 for production (40GB VRAM)
- Enable TensorRT optimization for 2-3x speedup
- Use FP16 precision for faster inference
- Batch requests when possible

## Monitoring

Prometheus metrics available at `/metrics`:

- Request count and latency
- Model inference time
- GPU utilization
- Error rates

## Security

- File upload size limited to 100MB
- Helmet.js for security headers
- CORS enabled (configure in production)
- Input validation on all endpoints

## License

Proprietary - IntelGraph Platform
