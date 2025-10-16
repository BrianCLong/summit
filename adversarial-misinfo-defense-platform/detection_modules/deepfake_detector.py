"""
Deepfake Detection Module for Adversarial Misinformation Defense Platform

This module implements comprehensive detection of deepfake content across multiple modalities
including facial analysis, temporal consistency checks, and adversarial sample generation.
"""
import numpy as np
import torch
import torch.nn as nn
import cv2
from PIL import Image
import librosa
import soundfile as sf
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import logging
import random
import hashlib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json


class DeepfakeDetector:
    """
    Comprehensive deepfake detection module for multiple modalities
    """
    
    def __init__(self):
        """
        Initialize the deepfake detector with default models
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Initialize isolation forest for anomaly detection
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        
        # Initialize adversarial GAN
        self.adversarial_gan = None
        
        # Common deepfake artifacts and patterns
        self.artifact_patterns = {
            'facial_inconsistencies': 0.8,
            'temporal_artifacts': 0.75,
            'eye_blink_irregularities': 0.85,
            'lip_sync_anomalies': 0.8,
            'skin_texture_abnormalities': 0.7,
            'hair_artifacts': 0.65,
            'background_inconsistencies': 0.6,
            'audio_visual_sync_issues': 0.75,
            'compression_artifacts': 0.6,
            'edge_discontinuities': 0.7
        }
        
        self.logger.info("DeepfakeDetector initialized successfully")
    
    def load_media(self, media_path: Union[str, Path], media_type: str) -> Any:
        """
        Load media from file path based on type
        """
        try:
            if media_type.lower() == 'image':
                return Image.open(str(media_path))
            elif media_type.lower() == 'video':
                return cv2.VideoCapture(str(media_path))
            elif media_type.lower() == 'audio':
                return librosa.load(str(media_path), sr=None)
            else:
                self.logger.warning(f"Unsupported media type: {media_type}")
                return None
        except Exception as e:
            self.logger.error(f"Error loading {media_type} {media_path}: {str(e)}")
            return None
    
    def extract_features(self, media_data: Any, media_type: str) -> Dict[str, Any]:
        """
        Extract features from media for analysis
        """
        features = {}
        
        try:
            if media_type.lower() == 'image':
                features = self._extract_image_features(media_data)
            elif media_type.lower() == 'video':
                features = self._extract_video_features(media_data)
            elif media_type.lower() == 'audio':
                features = self._extract_audio_features(media_data)
            else:
                features['error'] = f"Unsupported media type: {media_type}"
        except Exception as e:
            self.logger.error(f"Error extracting features from {media_type}: {str(e)}")
            features['error'] = str(e)
        
        return features
    
    def _extract_image_features(self, image: Image.Image) -> Dict[str, Any]:
        """
        Extract features from image for deepfake analysis
        """
        features = {}
        
        try:
            # Convert PIL image to numpy array
            img_array = np.array(image)
            
            # Basic image properties
            features['width'] = img_array.shape[1] if len(img_array.shape) >= 2 else 0
            features['height'] = img_array.shape[0] if len(img_array.shape) >= 2 else 0
            features['channels'] = img_array.shape[2] if len(img_array.shape) == 3 else 1
            
            # Convert to grayscale for analysis
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            # Edge analysis
            edges = cv2.Canny(gray, 50, 150)
            features['edge_density'] = np.sum(edges > 0) / (gray.shape[0] * gray.shape[1]) if gray.size > 0 else 0
            
            # Texture analysis
            features['texture_complexity'] = float(np.mean(cv2.Laplacian(gray, cv2.CV_64F))) if gray.size > 0 else 0
            
            # Color analysis
            if len(img_array.shape) == 3:
                features['avg_red'] = float(np.mean(img_array[:, :, 0]))
                features['avg_green'] = float(np.mean(img_array[:, :, 1]))
                features['avg_blue'] = float(np.mean(img_array[:, :, 2]))
                features['color_variance'] = float(np.var(img_array.reshape(-1, 3), axis=0).mean())
            else:
                features['avg_red'] = features['avg_green'] = features['avg_blue'] = float(np.mean(img_array)) if img_array.size > 0 else 0
                features['color_variance'] = 0
            
            # Brightness and contrast
            features['brightness'] = float(np.mean(gray)) if gray.size > 0 else 0
            features['contrast'] = float(np.std(gray)) if gray.size > 0 else 0
            
            # Compression artifacts (simplified JPEG detection)
            features['compression_artifacts'] = self._detect_compression_artifacts(img_array)
            
            # Facial features (if face is present)
            features['facial_features'] = self._extract_facial_features(img_array)
            
        except Exception as e:
            self.logger.error(f"Error extracting image features: {str(e)}")
            features['error'] = str(e)
        
        return features
    
    def _extract_video_features(self, video_capture: cv2.VideoCapture) -> Dict[str, Any]:
        """
        Extract features from video for deepfake analysis
        """
        features = {}
        
        try:
            # Basic video properties
            features['frame_count'] = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
            features['fps'] = video_capture.get(cv2.CAP_PROP_FPS)
            features['width'] = int(video_capture.get(cv2.CAP_PROP_FRAME_WIDTH))
            features['height'] = int(video_capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Sample frames for analysis
            frame_interval = max(1, features['frame_count'] // 30)  # Sample up to 30 frames
            frames = []
            
            for i in range(0, features['frame_count'], frame_interval):
                video_capture.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = video_capture.read()
                if ret:
                    frames.append(frame)
            
            if not frames:
                return features
            
            # Temporal consistency analysis
            features['temporal_features'] = self._analyze_temporal_consistency(frames)
            
            # Frame-level analysis
            frame_features = []
            for frame in frames[:10]:  # Analyze first 10 frames
                img_features = self._extract_image_features(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
                frame_features.append(img_features)
            
            # Aggregate frame features
            if frame_features:
                features['frame_analysis'] = {
                    'avg_edge_density': float(np.mean([f.get('edge_density', 0) for f in frame_features])),
                    'avg_texture_complexity': float(np.mean([f.get('texture_complexity', 0) for f in frame_features])),
                    'avg_brightness': float(np.mean([f.get('brightness', 0) for f in frame_features])),
                    'avg_contrast': float(np.mean([f.get('contrast', 0) for f in frame_features])),
                    'avg_compression_artifacts': float(np.mean([f.get('compression_artifacts', 0) for f in frame_features]))
                }
            
            # Facial tracking consistency
            features['facial_tracking'] = self._analyze_facial_tracking_consistency(frames)
            
        except Exception as e:
            self.logger.error(f"Error extracting video features: {str(e)}")
            features['error'] = str(e)
        
        return features
    
    def _extract_audio_features(self, audio_data: tuple) -> Dict[str, Any]:
        """
        Extract features from audio for deepfake analysis
        """
        features = {}
        
        try:
            audio_signal, sr = audio_data
            
            # Basic audio properties
            features['duration'] = len(audio_signal) / sr if sr > 0 else 0
            features['sample_rate'] = sr
            features['channels'] = 1  # librosa loads mono by default
            
            # Energy features
            features['rms_energy'] = float(np.sqrt(np.mean(audio_signal ** 2)))
            features['zero_crossing_rate'] = float(np.mean(librosa.feature.zero_crossing_rate(audio_signal)))
            
            # Spectral features
            stft = np.abs(librosa.stft(audio_signal))
            features['spectral_centroid'] = float(np.mean(librosa.feature.spectral_centroid(S=stft, sr=sr)))
            features['spectral_rolloff'] = float(np.mean(librosa.feature.spectral_rolloff(S=stft, sr=sr)))
            features['spectral_bandwidth'] = float(np.mean(librosa.feature.spectral_bandwidth(S=stft, sr=sr)))
            
            # MFCC features (first 13 coefficients)
            mfccs = librosa.feature.mfcc(y=audio_signal, sr=sr, n_mfcc=13)
            features['mfcc_mean'] = [float(np.mean(mfcc)) for mfcc in mfccs]
            features['mfcc_std'] = [float(np.std(mfcc)) for mfcc in mfccs]
            
            # Pitch features
            pitches, magnitudes = librosa.piptrack(y=audio_signal, sr=sr)
            pitch_values = pitches[magnitudes > np.median(magnitudes)]
            pitch_values = pitch_values[pitch_values > 0]  # Remove zero values
            
            if len(pitch_values) > 0:
                features['pitch_mean'] = float(np.mean(pitch_values))
                features['pitch_std'] = float(np.std(pitch_values))
                features['pitch_median'] = float(np.median(pitch_values))
            else:
                features['pitch_mean'] = 0.0
                features['pitch_std'] = 0.0
                features['pitch_median'] = 0.0
            
            # Deepfake-specific features
            features['deepfake_indicators'] = self._detect_audio_deepfake_indicators(audio_signal, sr)
            
        except Exception as e:
            self.logger.error(f"Error extracting audio features: {str(e)}")
            features['error'] = str(e)
        
        return features
    
    def _detect_compression_artifacts(self, img_array: np.ndarray) -> float:
        """
        Detect compression artifacts in image
        """
        try:
            # Convert to grayscale if needed
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY) if len(img_array.shape) == 3 else img_array
            
            # Calculate variance of Laplacian (blur detection)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Lower variance indicates more blur (potential compression)
            return min(1.0, max(0.0, 1 - laplacian_var / 1000))
        except:
            return 0.5
    
    def _extract_facial_features(self, img_array: np.ndarray) -> Dict[str, Any]:
        """
        Extract facial features for deepfake analysis
        """
        facial_features = {}
        
        try:
            # Use Haar cascades to detect faces
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY) if len(img_array.shape) == 3 else img_array
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                # Analyze first detected face
                x, y, w, h = faces[0]
                face_region = img_array[y:y+h, x:x+w]
                
                # Extract eye regions
                eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
                eyes = eye_cascade.detectMultiScale(face_region, 1.1, 4)
                
                facial_features['face_detected'] = True
                facial_features['face_count'] = len(faces)
                facial_features['eye_count'] = len(eyes)
                facial_features['face_area_ratio'] = (w * h) / (img_array.shape[0] * img_array.shape[1]) if img_array.size > 0 else 0
                
                # Analyze facial landmarks (simplified)
                facial_features['landmark_consistency'] = self._analyze_landmark_consistency(face_region)
                
                # Analyze facial boundaries
                facial_features['boundary_artifacts'] = self._analyze_boundary_artifacts(img_array, x, y, w, h)
                
                # Analyze skin texture
                facial_features['skin_texture'] = self._analyze_skin_texture(face_region)
                
                # Analyze hair region
                facial_features['hair_artifacts'] = self._analyze_hair_artifacts(img_array, x, y, w, h)
            else:
                facial_features['face_detected'] = False
                facial_features['face_count'] = 0
                facial_features['eye_count'] = 0
                facial_features['face_area_ratio'] = 0.0
                facial_features['landmark_consistency'] = 0.5
                facial_features['boundary_artifacts'] = 0.3
                facial_features['skin_texture'] = 0.5
                facial_features['hair_artifacts'] = 0.3
        
        except Exception as e:
            self.logger.error(f"Error extracting facial features: {str(e)}")
            facial_features['error'] = str(e)
        
        return facial_features
    
    def _analyze_landmark_consistency(self, face_region: np.ndarray) -> float:
        """
        Analyze consistency of facial landmarks
        """
        try:
            # Simplified landmark consistency analysis
            # In practice, use dlib or mediapipe for actual landmark detection
            
            # For this demonstration, we'll use a statistical approach
            gray = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY) if len(face_region.shape) == 3 else face_region
            
            # Calculate local standard deviation of brightness
            kernel = np.ones((5, 5), np.float32) / 25
            smoothed = cv2.filter2D(gray, -1, kernel)
            local_std = np.sqrt(cv2.filter2D((gray - smoothed)**2, -1, kernel))
            
            # Natural faces have consistent landmark patterns
            std_mean = np.mean(local_std)
            
            # Normalize to 0-1 range
            return min(1.0, max(0.0, 1 - std_mean / 50))
        except:
            return 0.5  # Neutral score
    
    def _analyze_boundary_artifacts(self, img_array: np.ndarray, x: int, y: int, w: int, h: int) -> float:
        """
        Analyze artifacts around face boundaries
        """
        try:
            # Check for discontinuities at face boundary
            if y > 0 and y+h < img_array.shape[0] and x > 0 and x+w < img_array.shape[1]:
                # Extract face region with margin
                margin = min(w, h) // 4
                x1 = max(0, x - margin)
                y1 = max(0, y - margin)
                x2 = min(img_array.shape[1], x + w + margin)
                y2 = min(img_array.shape[0], y + h + margin)
                
                face_region = img_array[y1:y2, x1:x2]
                
                # Check for blending artifacts around face boundary
                # Compare statistics inside and outside face boundary
                top_region = img_array[y1:y, x1:x2]
                bottom_region = img_array[y+h:y2, x1:x2]
                left_region = img_array[y:y+h, x1:x]
                right_region = img_array[y:y+h, x+w:x2]
                
                # Calculate statistics for boundary regions
                boundary_stats = []
                for region in [top_region, bottom_region, left_region, right_region]:
                    if region.size > 0:
                        boundary_stats.append(np.mean(region, axis=(0, 1)) if len(region.shape) == 3 else np.mean(region))
                
                if boundary_stats:
                    boundary_mean = np.mean(boundary_stats)
                    face_mean = np.mean(face_region, axis=(0, 1)) if len(face_region.shape) == 3 else np.mean(face_region)
                    
                    # Difference in statistics might indicate artifacts
                    color_diff = np.mean(np.abs(face_mean - boundary_mean)) if np.isscalar(face_mean) and np.isscalar(boundary_mean) else 0
                    return min(1.0, color_diff / 50)  # Adjust threshold
                else:
                    return 0.3  # Default score
            else:
                return 0.2  # Low score for edge cases
        except:
            return 0.25  # Default score
    
    def _analyze_skin_texture(self, face_region: np.ndarray) -> float:
        """
        Analyze skin texture for unnatural patterns
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(face_region, cv2.COLOR_RGB2GRAY) if len(face_region.shape) == 3 else face_region
            
            # Calculate Local Binary Pattern (simplified)
            lbp = self._calculate_simple_lbp(gray)
            
            # Analyze LBP histogram for uniformity
            hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256))
            hist_normalized = hist / np.sum(hist) if np.sum(hist) > 0 else np.zeros_like(hist)
            
            # Calculate entropy of texture distribution
            entropy = -np.sum(hist_normalized * np.log2(hist_normalized + 1e-10))
            
            # Natural skin has certain texture complexity
            # Too uniform or too complex might indicate artifacts
            if entropy < 2 or entropy > 6:
                return min(1.0, entropy / 8)  # Adjust scaling
            else:
                return 0.4  # Normal range
        except:
            return 0.35
    
    def _calculate_simple_lbp(self, img: np.ndarray) -> np.ndarray:
        """
        Simple LBP calculation (simplified for example)
        """
        # This is a very simplified LBP implementation
        # In practice, use scikit-image's local_binary_pattern function
        lbp = np.zeros_like(img)
        for i in range(1, img.shape[0] - 1):
            for j in range(1, img.shape[1] - 1):
                center = img[i, j]
                code = 0
                code |= (img[i-1, j-1] >= center) << 0
                code |= (img[i-1, j] >= center) << 1
                code |= (img[i-1, j+1] >= center) << 2
                code |= (img[i, j+1] >= center) << 3
                code |= (img[i+1, j+1] >= center) << 4
                code |= (img[i+1, j] >= center) << 5
                code |= (img[i+1, j-1] >= center) << 6
                code |= (img[i, j-1] >= center) << 7
                lbp[i, j] = code
        return lbp
    
    def _analyze_hair_artifacts(self, img_array: np.ndarray, x: int, y: int, w: int, h: int) -> float:
        """
        Analyze hair artifacts around face
        """
        try:
            # Focus on upper portion of face where hair typically is
            hair_region_y1 = max(0, y - h // 4)
            hair_region_y2 = y
            hair_region_x1 = x
            hair_region_x2 = x + w
            
            if (hair_region_y2 <= img_array.shape[0] and 
                hair_region_x2 <= img_array.shape[1] and
                hair_region_y1 < hair_region_y2):
                
                hair_region = img_array[hair_region_y1:hair_region_y2, hair_region_x1:hair_region_x2]
                
                # Analyze hair boundary for artifacts
                if len(hair_region.shape) == 3:
                    # Check for inconsistent edges
                    edges = cv2.Canny(cv2.cvtColor(hair_region, cv2.COLOR_RGB2GRAY), 50, 150)
                    edge_density = np.sum(edges > 0) / (hair_region.shape[0] * hair_region.shape[1]) if hair_region.size > 0 else 0
                    
                    # Natural hair has certain edge patterns
                    if edge_density > 0.3:
                        return 0.8  # High artifact likelihood
                    elif edge_density > 0.1:
                        return 0.5  # Moderate artifact likelihood
                    else:
                        return 0.2  # Low artifact likelihood
                else:
                    return 0.3  # Default for grayscale
            else:
                return 0.25  # Default score
        except:
            return 0.3  # Default score
    
    def _analyze_temporal_consistency(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """
        Analyze temporal consistency across video frames
        """
        temporal_features = {}
        
        try:
            if len(frames) < 2:
                temporal_features['error'] = "Not enough frames for temporal analysis"
                return temporal_features
            
            # Calculate frame differences
            frame_diffs = []
            for i in range(1, len(frames)):
                prev_gray = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY) if len(frames[i-1].shape) == 3 else frames[i-1]
                curr_gray = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY) if len(frames[i].shape) == 3 else frames[i]
                diff = cv2.absdiff(prev_gray, curr_gray)
                frame_diffs.append(float(np.mean(diff)))
            
            # Calculate temporal metrics
            temporal_features['avg_frame_diff'] = float(np.mean(frame_diffs)) if frame_diffs else 0.0
            temporal_features['std_frame_diff'] = float(np.std(frame_diffs)) if frame_diffs else 0.0
            temporal_features['max_frame_diff'] = float(np.max(frame_diffs)) if frame_diffs else 0.0
            temporal_features['min_frame_diff'] = float(np.min(frame_diffs)) if frame_diffs else 0.0
            
            # Temporal consistency score (lower variance = more consistent)
            if temporal_features['std_frame_diff'] > 0:
                temporal_features['temporal_consistency'] = min(1.0, 1 - temporal_features['std_frame_diff'] / 100)
            else:
                temporal_features['temporal_consistency'] = 0.5  # Neutral score
        
        except Exception as e:
            self.logger.error(f"Error analyzing temporal consistency: {str(e)}")
            temporal_features['error'] = str(e)
        
        return temporal_features
    
    def _analyze_facial_tracking_consistency(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """
        Analyze consistency of facial tracking across video frames
        """
        tracking_features = {}
        
        try:
            # Use Haar cascades to detect faces in each frame
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            face_positions = []
            for frame in frames[:20]:  # Analyze first 20 frames
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
                faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                
                if len(faces) > 0:
                    # Track first detected face
                    x, y, w, h = faces[0]
                    face_positions.append((x + w/2, y + h/2))  # Center position
                else:
                    face_positions.append(None)
            
            # Calculate tracking consistency
            valid_positions = [pos for pos in face_positions if pos is not None]
            if len(valid_positions) > 1:
                # Calculate movement smoothness
                movements = []
                for i in range(1, len(valid_positions)):
                    dx = valid_positions[i][0] - valid_positions[i-1][0]
                    dy = valid_positions[i][1] - valid_positions[i-1][1]
                    movement = np.sqrt(dx**2 + dy**2)
                    movements.append(movement)
                
                avg_movement = np.mean(movements) if movements else 0.0
                std_movement = np.std(movements) if movements else 0.0
                
                tracking_features['avg_movement'] = float(avg_movement)
                tracking_features['std_movement'] = float(std_movement)
                
                # Consistency score (lower std = more consistent)
                if avg_movement > 0:
                    tracking_features['tracking_consistency'] = min(1.0, 1 - std_movement / (avg_movement + 1e-6))
                else:
                    tracking_features['tracking_consistency'] = 0.5  # Neutral score
            else:
                tracking_features['tracking_consistency'] = 0.3  # Low consistency if few faces detected
            
            # Face detection consistency
            face_detection_rate = len(valid_positions) / len(face_positions) if face_positions else 0.0
            tracking_features['face_detection_consistency'] = face_detection_rate
            
        except Exception as e:
            self.logger.error(f"Error analyzing facial tracking consistency: {str(e)}")
            tracking_features['error'] = str(e)
        
        return tracking_features
    
    def _detect_audio_deepfake_indicators(self, audio_signal: np.ndarray, sr: int) -> Dict[str, Any]:
        """
        Detect deepfake indicators in audio
        """
        indicators = {}
        
        try:
            # Spectral artifacts detection
            indicators['spectral_artifacts'] = self._detect_spectral_artifacts(audio_signal, sr)
            
            # Temporal inconsistencies detection
            indicators['temporal_inconsistencies'] = self._detect_temporal_inconsistencies(audio_signal, sr)
            
            # Pitch artifacts detection
            indicators['pitch_artifacts'] = self._detect_pitch_artifacts(audio_signal, sr)
            
            # Formant distortions detection
            indicators['formant_distortions'] = self._detect_formant_distortions(audio_signal, sr)
            
            # Breathing pattern analysis
            indicators['breathing_patterns'] = self._detect_breathing_patterns(audio_signal, sr)
            
            # Overall deepfake score
            scores = list(indicators.values())
            if scores:
                indicators['overall_deepfake_score'] = float(np.mean(scores))
            else:
                indicators['overall_deepfake_score'] = 0.5  # Neutral score
                
        except Exception as e:
            self.logger.error(f"Error detecting audio deepfake indicators: {str(e)}")
            indicators['error'] = str(e)
            indicators['overall_deepfake_score'] = 0.5  # Default score
        
        return indicators
    
    def _detect_spectral_artifacts(self, audio_signal: np.ndarray, sr: int) -> float:
        """
        Detect spectral artifacts that may indicate synthetic generation
        """
        try:
            # Compute spectrogram
            frequencies, times, Sxx = librosa.stft(audio_signal)
            
            # Calculate spectral flatness (a measure of noisiness)
            geometric_mean = np.exp(np.mean(np.log(np.abs(Sxx) + 1e-10), axis=0))
            arithmetic_mean = np.mean(np.abs(Sxx), axis=0)
            spectral_flatness = np.mean(geometric_mean / (arithmetic_mean + 1e-10)) if arithmetic_mean.any() else 0
            
            # Synthetic audio often has unnaturally flat spectra
            # Normalize to 0-1 range (higher = more synthetic)
            return min(1.0, max(0.0, spectral_flatness * 2))  # Adjust scaling factor
        except:
            return 0.3  # Default score
    
    def _detect_temporal_inconsistencies(self, audio_signal: np.ndarray, sr: int) -> float:
        """
        Detect temporal inconsistencies in audio
        """
        try:
            # Analyze zero crossing rate variability
            frame_length = 2048
            hop_length = 512
            zcr_frames = librosa.feature.zero_crossing_rate(audio_signal, 
                                                          frame_length=frame_length, 
                                                          hop_length=hop_length)
            
            # Calculate variability in zero crossing rate
            zcr_variability = np.std(zcr_frames)
            
            # Natural speech has consistent zero crossing patterns
            # High variability might indicate synthetic generation
            return min(1.0, max(0.0, zcr_variability * 10))  # Adjust scaling factor
        except:
            return 0.4  # Default score
    
    def _detect_pitch_artifacts(self, audio_signal: np.ndarray, sr: int) -> float:
        """
        Detect pitch artifacts in audio
        """
        try:
            # Extract pitch track
            pitches, magnitudes = librosa.piptrack(y=audio_signal, sr=sr)
            
            # Select pitches with significant magnitude
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:  # Only consider non-zero pitches
                    pitch_values.append(pitch)
            
            if len(pitch_values) < 2:
                return 0.5  # Neutral score
            
            # Calculate pitch variability
            pitch_variability = np.std(pitch_values)
            pitch_mean = np.mean(pitch_values)
            
            # Natural speech has certain pitch patterns
            # Very high or very low variability might indicate synthetic generation
            if pitch_mean > 0:
                relative_variability = pitch_variability / pitch_mean
                # Natural speech typically has relative variability between 0.1-0.5
                if relative_variability < 0.1 or relative_variability > 0.8:
                    return min(1.0, relative_variability)
                else:
                    return 0.3  # Normal range
            else:
                return 0.5  # Neutral score
        except:
            return 0.35  # Default score
    
    def _detect_formant_distortions(self, audio_signal: np.ndarray, sr: int) -> float:
        """
        Detect formant distortions in audio
        """
        try:
            # Estimate formants (simplified approach)
            # In practice, use specialized formant extraction tools
            
            # For this demonstration, check for consistent spectral peaks
            # which might be missing in synthetic voices
            
            # Compute spectrogram
            S = np.abs(librosa.stft(audio_signal))
            
            # Find spectral peaks
            peak_frequencies = []
            for frame in S.T:
                peaks = librosa.util.peak_pick(frame, 3, 3, 3, 3, 0.5, 10)
                if len(peaks) > 0:
                    peak_frequencies.extend(peaks)
            
            # Analyze peak consistency
            if peak_frequencies:
                peak_std = np.std(peak_frequencies)
                # Unnaturally consistent peaks might indicate synthetic generation
                return min(1.0, max(0.0, peak_std / 100))  # Normalize
            else:
                return 0.5  # Neutral score
        except:
            return 0.4  # Default score
    
    def _detect_breathing_patterns(self, audio_signal: np.ndarray, sr: int) -> float:
        """
        Detect breathing pattern anomalies in audio
        """
        try:
            # Look for silence gaps that might indicate unnatural breathing
            # or lack of natural breathing patterns
            
            # Calculate RMS energy in short frames
            frame_length = int(0.1 * sr)  # 100ms frames
            hop_length = frame_length // 2
            rms_frames = librosa.feature.rms(y=audio_signal, 
                                           frame_length=frame_length, 
                                           hop_length=hop_length)
            
            # Find silent frames (below threshold)
            silence_threshold = np.mean(rms_frames) * 0.1  # 10% of mean
            silent_frames = np.sum(rms_frames < silence_threshold)
            total_frames = rms_frames.shape[1]
            
            # Calculate silence ratio
            silence_ratio = silent_frames / total_frames if total_frames > 0 else 0
            
            # Natural speech has characteristic silence patterns
            # Too much or too little silence might indicate synthetic generation
            if silence_ratio < 0.05 or silence_ratio > 0.3:
                return min(1.0, max(0.0, silence_ratio * 3))  # Scale factor
            else:
                return 0.2  # Normal range
        except:
            return 0.25  # Default score
    
    def detect_misinfo(self, media_paths: List[Union[str, Path]], 
                      media_types: List[str]) -> List[Dict[str, Any]]:
        """
        Main detection function for deepfake misinformation
        """
        self.logger.info(f"Analyzing {len(media_paths)} media files for deepfake misinformation")
        results = []
        
        for media_path, media_type in zip(media_paths, media_types):
            try:
                # Load media
                media_data = self.load_media(media_path, media_type)
                if media_data is None:
                    results.append({
                        'media_path': str(media_path),
                        'media_type': media_type,
                        'misinfo_score': 0.5,
                        'confidence': 0.0,
                        'is_misinfo': False,
                        'error': 'Could not load media'
                    })
                    continue
                
                # Extract features
                features = self.extract_features(media_data, media_type)
                
                # Detect artifacts
                artifact_results = self.detect_deepfake_artifacts(media_data, media_type)
                
                # Calculate misinfo score
                misinfo_score = artifact_results.get('overall_deepfake_score', 0.5)
                
                # Calculate confidence
                confidence = self._calculate_confidence(artifact_results)
                
                result = {
                    'media_path': str(media_path),
                    'media_type': media_type,
                    'misinfo_score': misinfo_score,
                    'features': features,
                    'artifact_analysis': artifact_results,
                    'confidence': confidence,
                    'is_misinfo': misinfo_score > 0.5
                }
                
                results.append(result)
                
                # Release media resources
                if media_type.lower() == 'video' and hasattr(media_data, 'release'):
                    media_data.release()
                
            except Exception as e:
                self.logger.error(f"Error analyzing {media_type} {media_path}: {str(e)}")
                results.append({
                    'media_path': str(media_path),
                    'media_type': media_type,
                    'misinfo_score': 0.5,
                    'confidence': 0.0,
                    'is_misinfo': False,
                    'error': str(e)
                })
        
        self.logger.info(f"Completed deepfake analysis with {len(results)} results")
        return results
    
    def detect_deepfake_artifacts(self, media_data: Any, media_type: str) -> Dict[str, Any]:
        """
        Detect specific deepfake artifacts in media
        """
        results = {}
        
        try:
            if media_type.lower() == 'image':
                results = self._detect_image_deepfake_artifacts(media_data)
            elif media_type.lower() == 'video':
                results = self._detect_video_deepfake_artifacts(media_data)
            elif media_type.lower() == 'audio':
                results = self._detect_audio_deepfake_artifacts(media_data)
            else:
                results['error'] = f"Unsupported media type: {media_type}"
                results['overall_deepfake_score'] = 0.5  # Neutral score
        except Exception as e:
            self.logger.error(f"Error detecting deepfake artifacts in {media_type}: {str(e)}")
            results['error'] = str(e)
            results['overall_deepfake_score'] = 0.5  # Default score
        
        return results
    
    def _detect_image_deepfake_artifacts(self, image: Image.Image) -> Dict[str, Any]:
        """
        Detect deepfake artifacts in image
        """
        results = {}
        
        try:
            # Convert PIL image to numpy array
            img_array = np.array(image)
            
            # Detect facial inconsistencies
            facial_results = self._extract_facial_features(img_array)
            results['facial_inconsistencies'] = facial_results.get('landmark_consistency', 0.5)
            
            # Detect boundary artifacts
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY) if len(img_array.shape) == 3 else img_array
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) > 0:
                x, y, w, h = faces[0]
                results['boundary_artifacts'] = self._analyze_boundary_artifacts(img_array, x, y, w, h)
                results['skin_texture_abnormalities'] = facial_results.get('skin_texture', 0.5)
                results['hair_artifacts'] = facial_results.get('hair_artifacts', 0.3)
            else:
                results['boundary_artifacts'] = 0.3
                results['skin_texture_abnormalities'] = 0.5
                results['hair_artifacts'] = 0.3
            
            # Detect compression artifacts
            results['compression_artifacts'] = self._detect_compression_artifacts(img_array)
            
            # Detect edge discontinuities
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY) if len(img_array.shape) == 3 else img_array
            edges = cv2.Canny(gray, 50, 150)
            results['edge_discontinuities'] = np.sum(edges > 0) / (gray.shape[0] * gray.shape[1]) if gray.size > 0 else 0
            
            # Calculate overall score
            scores = [
                results['facial_inconsistencies'],
                results['boundary_artifacts'],
                results['skin_texture_abnormalities'],
                results['hair_artifacts'],
                results['compression_artifacts'],
                results['edge_discontinuities']
            ]
            
            results['overall_deepfake_score'] = float(np.mean(scores)) if scores else 0.5
            
        except Exception as e:
            self.logger.error(f"Error detecting image deepfake artifacts: {str(e)}")
            results['error'] = str(e)
            results['overall_deepfake_score'] = 0.5  # Default score
        
        return results
    
    def _detect_video_deepfake_artifacts(self, video_capture: cv2.VideoCapture) -> Dict[str, Any]:
        """
        Detect deepfake artifacts in video
        """
        results = {}
        
        try:
            # Analyze temporal consistency
            temporal_features = self._analyze_temporal_consistency_from_video(video_capture)
            results['temporal_artifacts'] = temporal_features.get('temporal_consistency', 0.5)
            
            # Analyze facial tracking consistency
            tracking_features = self._analyze_facial_tracking_consistency_from_video(video_capture)
            results['face_tracking_artifacts'] = tracking_features.get('tracking_consistency', 0.5)
            
            # Analyze frame-level artifacts
            frame_artifacts = self._analyze_frame_artifacts_from_video(video_capture)
            results['frame_artifacts'] = frame_artifacts.get('average_artifacts', 0.5)
            
            # Calculate overall score
            scores = [
                results['temporal_artifacts'],
                results['face_tracking_artifacts'],
                results['frame_artifacts']
            ]
            
            results['overall_deepfake_score'] = float(np.mean(scores)) if scores else 0.5
            
        except Exception as e:
            self.logger.error(f"Error detecting video deepfake artifacts: {str(e)}")
            results['error'] = str(e)
            results['overall_deepfake_score'] = 0.5  # Default score
        
        return results
    
    def _analyze_temporal_consistency_from_video(self, video_capture: cv2.VideoCapture) -> Dict[str, Any]:
        """
        Analyze temporal consistency from video capture
        """
        temporal_features = {}
        
        try:
            frame_count = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_interval = max(1, frame_count // 30)  # Sample up to 30 frames
            
            frames = []
            for i in range(0, frame_count, frame_interval):
                video_capture.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = video_capture.read()
                if ret:
                    frames.append(frame)
            
            temporal_features = self._analyze_temporal_consistency(frames)
        except Exception as e:
            self.logger.error(f"Error analyzing temporal consistency: {str(e)}")
            temporal_features['error'] = str(e)
        
        return temporal_features
    
    def _analyze_facial_tracking_consistency_from_video(self, video_capture: cv2.VideoCapture) -> Dict[str, Any]:
        """
        Analyze facial tracking consistency from video capture
        """
        tracking_features = {}
        
        try:
            frame_count = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_interval = max(1, frame_count // 20)  # Sample up to 20 frames
            
            frames = []
            for i in range(0, frame_count, frame_interval):
                video_capture.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = video_capture.read()
                if ret:
                    frames.append(frame)
            
            tracking_features = self._analyze_facial_tracking_consistency(frames)
        except Exception as e:
            self.logger.error(f"Error analyzing facial tracking consistency: {str(e)}")
            tracking_features['error'] = str(e)
        
        return tracking_features
    
    def _analyze_frame_artifacts_from_video(self, video_capture: cv2.VideoCapture) -> Dict[str, Any]:
        """
        Analyze frame-level artifacts from video capture
        """
        frame_features = {
            'average_artifacts': 0.5,
            'artifact_variance': 0.3
        }
        
        try:
            frame_count = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_interval = max(1, frame_count // 15)  # Sample up to 15 frames
            
            artifact_scores = []
            for i in range(0, frame_count, frame_interval):
                video_capture.set(cv2.CAP_PROP_POS_FRAMES, i)
                ret, frame = video_capture.read()
                if ret:
                    # Convert to PIL for processing
                    pil_frame = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                    
                    # Analyze frame for artifacts
                    frame_artifacts = self._detect_image_deepfake_artifacts(pil_frame)
                    artifact_scores.append(frame_artifacts.get('overall_deepfake_score', 0.5))
            
            if artifact_scores:
                frame_features['average_artifacts'] = float(np.mean(artifact_scores))
                frame_features['artifact_variance'] = float(np.var(artifact_scores))
        except Exception as e:
            self.logger.error(f"Error analyzing frame artifacts: {str(e)}")
        
        return frame_features
    
    def _detect_audio_deepfake_artifacts(self, audio_data: tuple) -> Dict[str, Any]:
        """
        Detect deepfake artifacts in audio
        """
        audio_signal, sr = audio_data
        return self._detect_audio_deepfake_indicators(audio_signal, sr)
    
    def _calculate_confidence(self, artifact_results: Dict[str, Any]) -> float:
        """
        Calculate confidence based on artifact analysis results
        """
        try:
            # Count artifacts that exceed threshold
            artifact_count = sum(1 for score in artifact_results.values() 
                               if isinstance(score, (int, float)) and score > 0.5)
            
            # Calculate confidence based on number of detected artifacts
            total_artifacts = len([k for k in artifact_results.keys() if k != 'overall_deepfake_score'])
            if total_artifacts > 0:
                confidence = min(1.0, 0.3 + (artifact_count / total_artifacts) * 0.7)
            else:
                confidence = 0.5  # Neutral confidence
            
            return float(confidence)
        except:
            return 0.4  # Default confidence
    
    def generate_adversarial_samples(self, base_media: List[Union[str, Path]], 
                                   media_types: List[str],
                                   num_samples: int = 5) -> List[Dict[str, Any]]:
        """
        Generate adversarial samples for training improvement
        """
        self.logger.info(f"Generating {num_samples} adversarial samples")
        
        adversarial_samples = []
        
        for _ in range(num_samples):
            # Select a random base media
            if base_media and media_types:
                idx = random.randint(0, len(base_media) - 1)
                base_path = base_media[idx]
                media_type = media_types[idx]
                
                # Create adversarial variants
                adversarial_variant = self._create_adversarial_variant(base_path, media_type)
                adversarial_samples.append({
                    'original_path': str(base_path),
                    'adversarial_sample': adversarial_variant,
                    'media_type': media_type
                })
        
        self.logger.info(f"Generated {len(adversarial_samples)} adversarial samples")
        return adversarial_samples
    
    def _create_adversarial_variant(self, media_path: Union[str, Path], 
                                   media_type: str) -> Any:
        """
        Create an adversarial variant of the media
        """
        if media_type.lower() == 'image':
            # Load image
            image = Image.open(str(media_path))
            
            # Apply adversarial transformations
            transformations = [
                self._add_image_noise,
                self._modify_image_colors,
                self._apply_image_blur,
                self._add_image_compression
            ]
            
            # Randomly select and apply transformation
            transform = random.choice(transformations)
            return transform(image)
            
        elif media_type.lower() == 'video':
            # For video, we'll create adversarial frame modifications
            cap = cv2.VideoCapture(str(media_path))
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Select a random frame
            frame_idx = random.randint(0, frame_count - 1)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            cap.release()
            
            if ret:
                # Convert to PIL Image for easier manipulation
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)
                
                # Apply adversarial transformations
                transformations = [
                    self._add_image_noise,
                    self._modify_image_colors,
                    self._apply_image_blur
                ]
                
                transform = random.choice(transformations)
                return transform(pil_image)
            else:
                return None
                
        elif media_type.lower() == 'audio':
            # For audio, we'll apply adversarial modifications
            try:
                audio_data, sr = librosa.load(str(media_path), sr=None)
                
                # Apply adversarial transformations
                transformations = [
                    self._add_audio_noise,
                    self._modify_audio_pitch,
                    self._apply_audio_compression
                ]
                
                transform = random.choice(transformations)
                modified_audio = transform(audio_data)
                
                # Save to temporary file
                import tempfile
                with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
                    sf.write(tmp_file.name, modified_audio, sr)
                    return tmp_file.name
            except:
                return str(media_path)  # Return original if modification fails
        
        return str(media_path)  # Fallback
    
    def _add_image_noise(self, image: Image.Image) -> Image.Image:
        """Add noise to image"""
        img_array = np.array(image)
        noise = np.random.normal(0, random.uniform(5, 20), img_array.shape)
        noisy_img = np.clip(img_array.astype(np.float32) + noise, 0, 255)
        return Image.fromarray(noisy_img.astype(np.uint8))
    
    def _modify_image_colors(self, image: Image.Image) -> Image.Image:
        """Modify image colors"""
        img_array = np.array(image)
        
        # Apply random color adjustments
        if len(img_array.shape) == 3:
            r_factor = random.uniform(0.8, 1.2)
            g_factor = random.uniform(0.8, 1.2)
            b_factor = random.uniform(0.8, 1.2)
            
            img_array = img_array.astype(np.float32)
            img_array[:, :, 0] = np.clip(img_array[:, :, 0] * r_factor, 0, 255)
            img_array[:, :, 1] = np.clip(img_array[:, :, 1] * g_factor, 0, 255)
            img_array[:, :, 2] = np.clip(img_array[:, :, 2] * b_factor, 0, 255)
        
        return Image.fromarray(img_array.astype(np.uint8))
    
    def _apply_image_blur(self, image: Image.Image) -> Image.Image:
        """Apply blur to image"""
        # Convert to OpenCV format
        img_array = np.array(image)
        kernel_size = random.choice([3, 5, 7])
        if kernel_size % 2 == 0:
            kernel_size += 1  # Ensure odd kernel size
        
        blurred = cv2.GaussianBlur(img_array, (kernel_size, kernel_size), 0)
        return Image.fromarray(blurred)
    
    def _add_image_compression(self, image: Image.Image) -> Image.Image:
        """Simulate compression artifacts"""
        # Save as JPEG with low quality to simulate compression
        import io
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=random.randint(10, 50))
        buffer.seek(0)
        return Image.open(buffer)
    
    def _add_audio_noise(self, audio_data: np.ndarray) -> np.ndarray:
        """Add noise to audio"""
        noise_factor = random.uniform(0.001, 0.01)
        noise = np.random.normal(0, noise_factor, audio_data.shape)
        return audio_data + noise
    
    def _modify_audio_pitch(self, audio_data: np.ndarray) -> np.ndarray:
        """Modify audio pitch"""
        # Simple pitch shifting (in practice, use librosa.effects.pitch_shift)
        return audio_data * random.uniform(0.95, 1.05)
    
    def _apply_audio_compression(self, audio_data: np.ndarray) -> np.ndarray:
        """Apply audio compression effects"""
        # Simple compression simulation
        threshold = random.uniform(0.1, 0.3)
        compressed = np.clip(audio_data, -threshold, threshold)
        return compressed


# Convenience function for easy usage
def create_deepfake_detector() -> DeepfakeDetector:
    """
    Factory function to create and initialize the deepfake detector
    """
    return DeepfakeDetector()


if __name__ == '__main__':
    print("Adversarial Misinformation Defense Platform - Deepfake Detector")
    print("Use 'python main.py' to run the complete platform")