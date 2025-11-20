# Computer Vision Models

Model management and deployment infrastructure for IntelGraph computer vision platform.

## Model Directory Structure

```
cv-models/
├── object-detection/
│   ├── yolov8n.pt
│   ├── yolov8s.pt
│   ├── yolov8m.pt
│   ├── yolov8l.pt
│   ├── yolov8x.pt
│   ├── yolov9c.pt
│   ├── faster_rcnn_r50.pth
│   └── efficientdet_d0.pth
├── face-analysis/
│   ├── mtcnn.pth
│   ├── facenet_vggface2.pth
│   ├── age_gender_model.pth
│   ├── emotion_detection.pth
│   └── face_landmarks_68.dat
├── ocr/
│   ├── tesseract/
│   │   └── tessdata/
│   ├── paddleocr/
│   └── scene_text_recognition.pth
├── satellite/
│   ├── building_detection.pth
│   ├── land_use_classification.pth
│   ├── change_detection.pth
│   └── vehicle_detection_aerial.pth
├── video/
│   ├── action_recognition.pth
│   ├── crowd_counting.pth
│   └── anomaly_detection.pth
├── forensics/
│   ├── deepfake_xception.pth
│   ├── deepfake_efficientnet.pth
│   ├── manipulation_detection.pth
│   └── gan_detection.pth
└── optimization/
    ├── tensorrt/
    ├── onnx/
    └── quantized/
```

## Model Downloads

### Object Detection Models

```bash
# YOLO models (auto-download on first use)
yolo download yolov8n.pt
yolo download yolov8s.pt
yolo download yolov8m.pt
yolo download yolov8l.pt
yolo download yolov8x.pt
```

### Face Analysis Models

```bash
# Download from model zoo
wget https://github.com/facenet-pytorch/models/releases/download/v1.0/vggface2.pt
```

### Custom Model Training

See `docs/computer-vision/TRAINING.md` for instructions on training custom models.

## Model Optimization

### TensorRT Optimization

```python
from ultralytics import YOLO

model = YOLO('yolov8m.pt')
model.export(format='engine', device=0)  # Export to TensorRT
```

### ONNX Export

```python
model.export(format='onnx', dynamic=True)
```

### INT8 Quantization

```python
model.export(format='engine', device=0, int8=True)
```

## Performance Benchmarks

| Model | Size | GPU (ms) | CPU (ms) | Accuracy |
|-------|------|----------|----------|----------|
| YOLOv8n | 3.2MB | 2-5 | 50-100 | 37.3 mAP |
| YOLOv8s | 11.2MB | 3-8 | 100-200 | 44.9 mAP |
| YOLOv8m | 25.9MB | 5-15 | 200-400 | 50.2 mAP |
| YOLOv8l | 43.7MB | 8-25 | 400-800 | 52.9 mAP |
| YOLOv8x | 68.2MB | 12-40 | 800-1600 | 53.9 mAP |

## GPU Requirements

- **Minimum**: NVIDIA GTX 1060 (6GB VRAM)
- **Recommended**: NVIDIA RTX 3080 (10GB VRAM)
- **Production**: NVIDIA A100 (40GB VRAM)

## Model Versioning

Models are versioned using semantic versioning:
- `model-name-v1.0.0.pt`
- `model-name-v1.1.0.pt`
- `model-name-v2.0.0.pt`

## License

See individual model licenses in their respective directories.
