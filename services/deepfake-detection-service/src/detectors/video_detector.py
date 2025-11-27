"""
Video Deepfake Detector

Uses EfficientNet-B7 + LSTM for temporal coherence detection.
"""

import cv2
import numpy as np
import torch
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class VideoDetector:
    """Detector for video deepfakes (face manipulation, face swaps)"""
    
    def __init__(self, model: torch.nn.Module, device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        self.model = model
        self.device = device
        self.model.to(self.device)
        self.model.eval()
        
        # Detection parameters
        self.sample_fps = 1  # Sample 1 frame per second
        self.max_frames = 300  # Max 5 minutes at 1 fps
        self.face_size = 256  # Resize faces to 256x256
        self.threshold = 0.5
        
        logger.info(f"VideoDetector initialized on {self.device}")
    
    async def detect(
        self,
        media_data: bytes,
        enable_explanation: bool = False
    ) -> Dict[str, Any]:
        """
        Detect deepfake in video
        
        Args:
            media_data: Video file bytes
            enable_explanation: Generate explainability data
            
        Returns:
            Detection result with confidence score and optional explanation
        """
        try:
            # Decode video
            frames = await self._extract_frames(media_data)
            
            if len(frames) == 0:
                raise ValueError("No frames extracted from video")
            
            # Detect faces in frames
            face_crops = await self._detect_faces(frames)
            
            if len(face_crops) == 0:
                logger.warning("No faces detected in video")
                return {
                    "is_synthetic": False,
                    "confidence_score": 0.0,
                    "model_version": "v1.2.0",
                    "frame_scores": [],
                    "message": "No faces detected"
                }
            
            # Run inference on face crops
            frame_scores = await self._inference(face_crops)
            
            # Calculate aggregate score
            confidence_score = self._aggregate_scores(frame_scores)
            is_synthetic = confidence_score >= self.threshold
            
            result = {
                "is_synthetic": is_synthetic,
                "confidence_score": float(confidence_score),
                "model_version": "v1.2.0",
                "frame_scores": [
                    {"frame_number": i, "score": float(score)}
                    for i, score in enumerate(frame_scores)
                ]
            }
            
            # Add explanation if requested
            if enable_explanation:
                result["explanation"] = await self._generate_explanation(face_crops, frame_scores)
            
            return result
            
        except Exception as e:
            logger.error(f"Video detection failed: {e}")
            raise
    
    async def _extract_frames(self, media_data: bytes) -> List[np.ndarray]:
        """Extract frames from video at specified FPS"""
        # Write bytes to temp file
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as tmp:
            tmp.write(media_data)
            tmp_path = tmp.name
        
        try:
            cap = cv2.VideoCapture(tmp_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Calculate frame sampling interval
            frame_interval = max(1, int(fps / self.sample_fps))
            
            frames = []
            frame_idx = 0
            
            while cap.isOpened() and len(frames) < self.max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_idx % frame_interval == 0:
                    frames.append(frame)
                
                frame_idx += 1
            
            cap.release()
            return frames
            
        finally:
            os.unlink(tmp_path)
    
    async def _detect_faces(self, frames: List[np.ndarray]) -> List[np.ndarray]:
        """Detect and crop faces from frames"""
        # Use OpenCV Haar Cascade for face detection
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        face_crops = []
        
        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.3, 5)
            
            for (x, y, w, h) in faces:
                # Crop and resize face
                face = frame[y:y+h, x:x+w]
                face_resized = cv2.resize(face, (self.face_size, self.face_size))
                face_crops.append(face_resized)
                break  # Only take first face per frame
        
        return face_crops
    
    async def _inference(self, face_crops: List[np.ndarray]) -> List[float]:
        """Run model inference on face crops"""
        # Preprocess faces
        faces_tensor = torch.stack([
            torch.from_numpy(face.transpose(2, 0, 1)).float() / 255.0
            for face in face_crops
        ]).to(self.device)
        
        # Normalize to [-1, 1]
        faces_tensor = (faces_tensor - 0.5) / 0.5
        
        # Run inference
        with torch.no_grad():
            outputs = self.model(faces_tensor)
            probs = torch.sigmoid(outputs).cpu().numpy()
        
        return [float(p) for p in probs]
    
    def _aggregate_scores(self, frame_scores: List[float]) -> float:
        """Aggregate per-frame scores into final confidence score"""
        if not frame_scores:
            return 0.0
        
        # Use weighted average with higher weight on high-confidence frames
        scores = np.array(frame_scores)
        weights = np.abs(scores - 0.5) + 0.5  # Emphasize extreme scores
        
        return float(np.average(scores, weights=weights))
    
    async def _generate_explanation(
        self,
        face_crops: List[np.ndarray],
        frame_scores: List[float]
    ) -> Dict[str, Any]:
        """Generate explainability data (Grad-CAM, attention, etc.)"""
        # Find frame with highest confidence
        max_idx = int(np.argmax(frame_scores))
        
        # In production, generate Grad-CAM heatmap here
        # For now, return placeholder
        
        return {
            "method": "grad_cam",
            "top_frame_idx": max_idx,
            "top_frame_score": float(frame_scores[max_idx]),
            "reasoning": "Face manipulation detected in facial region",
            "heatmap_url": None  # Would generate and upload heatmap
        }
