"""
Video Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of adversarial video-based misinformation including
deepfake videos, temporal inconsistencies, and visual manipulation techniques.
"""
import numpy as np
import torch
import torch.nn as nn
import cv2
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import logging
import random
import hashlib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler


class VideoDetector:
    """
    Detection module for video-based misinformation and adversarial samples
    """
    
    def __init__(self):
        """
        Initialize the video detector
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Initialize detection models
        self.scaler = StandardScaler()
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        
        # Initialize adversarial GAN
        self.adversarial_gan = None
        
        # Common artifacts and patterns for video manipulation detection
        self.video_artifacts = {
            'temporal_inconsistencies': 0.8,
            'face_swap_artifacts': 0.75,
            'lip_sync_anomalies': 0.8,
            'eye_blink_irregularities': 0.85,
            'skin_texture_abnormalities': 0.7,
            'hair_artifacts': 0.65,
            'background_inconsistencies': 0.6
        }
        
        self.logger.info("VideoDetector initialized successfully")
    
    def load_video(self, video_path: Union[str, Path]) -> Optional[cv2.VideoCapture]:
        """
        Load video from file path
        """
        try:
            cap = cv2.VideoCapture(str(video_path))
            if cap.isOpened():
                return cap
            else:
                self.logger.warning(f"Could not open video: {video_path}")
                return None
        except Exception as e:
            self.logger.error(f"Error loading video {video_path}: {str(e)}")
            return None
    
    def extract_frames(self, video_capture: cv2.VideoCapture, 
                      max_frames: int = 30) -> List[np.ndarray]:
        """
        Extract frames from video for analysis
        """
        frames = []
        frame_count = 0
        
        try:
            total_frames = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_interval = max(1, total_frames // max_frames)  # Sample evenly
            
            while True:
                ret, frame = video_capture.read()
                if not ret:
                    break
                
                # Only save frames at regular intervals to limit memory usage
                if frame_count % frame_interval == 0:
                    frames.append(frame)
                
                frame_count += 1
                
                # Stop if we have enough frames
                if len(frames) >= max_frames:
                    break
                    
        except Exception as e:
            self.logger.error(f"Error extracting frames: {str(e)}")
        
        return frames
    
    def extract_features(self, frames: List[np.ndarray]) -> Dict[str, Any]:
        """
        Extract features from video frames for analysis
        """
        features = {}
        
        try:
            if not frames:
                return features
            
            # Basic video properties
            features['frame_count'] = len(frames)
            features['height'] = frames[0].shape[0] if frames else 0
            features['width'] = frames[0].shape[1] if frames else 0
            features['channels'] = frames[0].shape[2] if frames and len(frames[0].shape) > 2 else 1
            
            # Frame-level statistics
            frame_brightness = []
            frame_contrast = []
            frame_edges = []
            
            for frame in frames:
                # Convert to grayscale for analysis
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
                
                # Brightness
                frame_brightness.append(float(np.mean(gray)))
                
                # Contrast
                frame_contrast.append(float(np.std(gray)))
                
                # Edges
                edges = cv2.Canny(gray, 50, 150)
                frame_edges.append(float(np.sum(edges > 0) / (gray.shape[0] * gray.shape[1])))
            
            # Aggregate frame statistics
            features['avg_brightness'] = float(np.mean(frame_brightness))
            features['std_brightness'] = float(np.std(frame_brightness))
            features['avg_contrast'] = float(np.mean(frame_contrast))
            features['std_contrast'] = float(np.std(frame_contrast))
            features['avg_edge_density'] = float(np.mean(frame_edges))
            features['std_edge_density'] = float(np.std(frame_edges))
            
            # Temporal consistency
            if len(frame_brightness) > 1:
                brightness_changes = [abs(frame_brightness[i] - frame_brightness[i-1]) 
                                    for i in range(1, len(frame_brightness))]
                features['avg_brightness_change'] = float(np.mean(brightness_changes))
                features['std_brightness_change'] = float(np.std(brightness_changes))
            else:
                features['avg_brightness_change'] = 0.0
                features['std_brightness_change'] = 0.0
            
            if len(frame_contrast) > 1:
                contrast_changes = [abs(frame_contrast[i] - frame_contrast[i-1]) 
                                 for i in range(1, len(frame_contrast))]
                features['avg_contrast_change'] = float(np.mean(contrast_changes))
                features['std_contrast_change'] = float(np.std(contrast_changes))
            else:
                features['avg_contrast_change'] = 0.0
                features['std_contrast_change'] = 0.0
        
        except Exception as e:
            self.logger.error(f"Error extracting video features: {str(e)}")
            features['error'] = str(e)
        
        return features
    
    def detect_deepfake_artifacts(self, frames: List[np.ndarray]) -> Dict[str, float]:
        """
        Detect specific deepfake artifacts in video frames
        """
        results = {}
        
        try:
            if not frames:
                return results
            
            # Temporal inconsistencies
            results['temporal_inconsistencies'] = self._detect_temporal_inconsistencies(frames)
            
            # Face swap artifacts
            results['face_swap_artifacts'] = self._detect_face_swap_artifacts(frames)
            
            # Lip sync anomalies
            results['lip_sync_anomalies'] = self._detect_lip_sync_anomalies(frames)
            
            # Eye blink irregularities
            results['eye_blink_irregularities'] = self._detect_eye_blink_irregularities(frames)
            
            # Skin texture abnormalities
            results['skin_texture_abnormalities'] = self._detect_skin_texture_abnormalities(frames)
            
            # Hair artifacts
            results['hair_artifacts'] = self._detect_hair_artifacts(frames)
            
            # Background inconsistencies
            results['background_inconsistencies'] = self._detect_background_inconsistencies(frames)
            
            # Overall deepfake score
            scores = [score for score in results.values() if isinstance(score, (int, float))]
            if scores:
                results['overall_deepfake_score'] = float(np.mean(scores))
            else:
                results['overall_deepfake_score'] = 0.5  # Neutral score
                
        except Exception as e:
            self.logger.error(f"Error detecting deepfake artifacts: {str(e)}")
            results['error'] = str(e)
            results['overall_deepfake_score'] = 0.5  # Default score
        
        return results
    
    def _detect_temporal_inconsistencies(self, frames: List[np.ndarray]) -> float:
        """
        Detect temporal inconsistencies in video frames
        """
        try:
            if len(frames) < 2:
                return 0.5  # Neutral score
            
            # Calculate frame differences
            frame_diffs = []
            for i in range(1, len(frames)):
                # Convert frames to grayscale
                gray1 = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY) if len(frames[i-1].shape) == 3 else frames[i-1]
                gray2 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY) if len(frames[i].shape) == 3 else frames[i]
                
                # Calculate absolute difference
                diff = cv2.absdiff(gray1, gray2)
                frame_diffs.append(float(np.mean(diff)))
            
            # Calculate variance in frame differences
            if frame_diffs:
                diff_variance = np.var(frame_diffs)
                # Normalize to 0-1 range
                normalized_variance = min(1.0, diff_variance / 1000)  # Adjust threshold as needed
                return float(normalized_variance)
            else:
                return 0.5  # Neutral score
        except:
            return 0.3  # Default score
    
    def _detect_face_swap_artifacts(self, frames: List[np.ndarray]) -> float:
        """
        Detect face swap artifacts in video frames
        """
        try:
            if not frames:
                return 0.3  # Default score
            
            # Use face detection to identify faces
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            face_artifacts = []
            for frame in frames[:10]:  # Sample first 10 frames
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
                faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                
                for (x, y, w, h) in faces:
                    # Extract face region
                    face_region = frame[y:y+h, x:x+w]
                    
                    # Look for boundary artifacts (common in face swaps)
                    # Check edges around face boundary
                    if y > 10 and y+h < frame.shape[0]-10 and x > 10 and x+w < frame.shape[1]-10:
                        # Sample regions around face boundary
                        top_region = frame[y-5:y, x:x+w]
                        bottom_region = frame[y+h:y+h+5, x:x+w]
                        left_region = frame[y:y+h, x-5:x]
                        right_region = frame[y:y+h, x+w:x+w+5]
                        
                        # Compare statistics around boundary
                        face_mean = np.mean(face_region)
                        boundary_means = [
                            np.mean(top_region) if top_region.size > 0 else face_mean,
                            np.mean(bottom_region) if bottom_region.size > 0 else face_mean,
                            np.mean(left_region) if left_region.size > 0 else face_mean,
                            np.mean(right_region) if right_region.size > 0 else face_mean
                        ]
                        
                        # Calculate boundary discontinuity
                        boundary_discontinuity = np.std([abs(bm - face_mean) for bm in boundary_means])
                        face_artifacts.append(min(1.0, boundary_discontinuity / 50))  # Normalize
            
            if face_artifacts:
                return float(np.mean(face_artifacts))
            else:
                return 0.2  # Default score for no faces detected
        except:
            return 0.25  # Default score
    
    def _detect_lip_sync_anomalies(self, frames: List[np.ndarray]) -> float:
        """
        Detect lip sync anomalies (simplified for demonstration)
        """
        try:
            # In a real implementation, this would use specialized lip sync detection
            # For this demonstration, we'll use a statistical approach
            
            if len(frames) < 3:
                return 0.4  # Default score
            
            # Look for mouth movement patterns that might be inconsistent
            # This is a simplified approach - real implementations would use facial landmark tracking
            
            # Sample approach: Look at brightness changes in lower face region
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            mouth_movement_scores = []
            for frame in frames[:15]:  # Sample first 15 frames
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
                faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                
                for (x, y, w, h) in faces:
                    # Focus on lower portion of face where mouth typically is
                    mouth_region_y1 = y + int(h * 0.6)
                    mouth_region_y2 = y + h
                    mouth_region_x1 = x
                    mouth_region_x2 = x + w
                    
                    if (mouth_region_y2 <= frame.shape[0] and 
                        mouth_region_x2 <= frame.shape[1]):
                        mouth_region = gray[mouth_region_y1:mouth_region_y2, 
                                          mouth_region_x1:mouth_region_x2]
                        
                        # Calculate edge density in mouth region (indicates movement)
                        edges = cv2.Canny(mouth_region, 50, 150)
                        edge_density = np.sum(edges > 0) / (mouth_region.shape[0] * mouth_region.shape[1])
                        mouth_movement_scores.append(edge_density)
            
            if mouth_movement_scores:
                # Look for inconsistent movement patterns
                movement_variance = np.var(mouth_movement_scores)
                return min(1.0, movement_variance * 10)  # Adjust scaling factor
            else:
                return 0.3  # Default score
        except:
            return 0.35  # Default score
    
    def _detect_eye_blink_irregularities(self, frames: List[np.ndarray]) -> float:
        """
        Detect eye blink irregularities
        """
        try:
            # Use eye detection to identify blink patterns
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            
            blink_patterns = []
            for frame in frames[:20]:  # Sample first 20 frames
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
                faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                
                for (x, y, w, h) in faces:
                    # Extract face region
                    face_region = gray[y:y+h, x:x+w]
                    eyes = eye_cascade.detectMultiScale(face_region, 1.1, 4)
                    
                    # Count eyes detected (indicates open/closed state)
                    blink_patterns.append(len(eyes))
            
            if blink_patterns and len(blink_patterns) > 5:
                # Calculate blink rate and regularity
                blink_rate = np.mean(blink_patterns)
                blink_variance = np.var(blink_patterns)
                
                # Natural blink rate is typically 15-20 blinks per minute
                # In a short video segment, we expect some variation
                # Too consistent or too inconsistent might indicate deepfake
                if blink_rate < 0.5 or blink_rate > 1.5:
                    return min(1.0, max(0.0, abs(blink_rate - 1.0)))
                else:
                    return 0.2  # Normal range
            else:
                return 0.3  # Default score
        except:
            return 0.25  # Default score
    
    def _detect_skin_texture_abnormalities(self, frames: List[np.ndarray]) -> float:
        """
        Detect skin texture abnormalities
        """
        try:
            if not frames:
                return 0.4  # Default score
            
            # Use Local Binary Pattern (simplified implementation)
            texture_scores = []
            for frame in frames[:10]:  # Sample first 10 frames
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
                
                # Calculate Local Binary Pattern (very simplified)
                lbp = np.zeros_like(gray)
                for i in range(1, gray.shape[0] - 1):
                    for j in range(1, gray.shape[1] - 1):
                        center = gray[i, j]
                        code = 0
                        code |= (gray[i-1, j-1] >= center) << 0
                        code |= (gray[i-1, j] >= center) << 1
                        code |= (gray[i-1, j+1] >= center) << 2
                        code |= (gray[i, j+1] >= center) << 3
                        code |= (gray[i+1, j+1] >= center) << 4
                        code |= (gray[i+1, j] >= center) << 5
                        code |= (gray[i+1, j-1] >= center) << 6
                        code |= (gray[i, j-1] >= center) << 7
                        lbp[i, j] = code
                
                # Calculate texture uniformity (simplified)
                hist, _ = np.histogram(lbp.ravel(), bins=256, range=(0, 256))
                hist_normalized = hist / np.sum(hist)
                
                # Calculate entropy of texture distribution
                entropy = -np.sum(hist_normalized * np.log2(hist_normalized + 1e-10))
                texture_scores.append(entropy)
            
            if texture_scores:
                avg_entropy = np.mean(texture_scores)
                # Natural skin has certain texture complexity
                # Too uniform or too complex might indicate artifacts
                if avg_entropy < 2 or avg_entropy > 6:
                    return min(1.0, avg_entropy / 8)  # Adjust scaling
                else:
                    return 0.3  # Normal range
            else:
                return 0.35  # Default score
        except:
            return 0.3  # Default score
    
    def _detect_hair_artifacts(self, frames: List[np.ndarray]) -> float:
        """
        Detect hair artifacts (common in face swaps)
        """
        try:
            # Look for inconsistent hair boundaries
            hair_artifact_scores = []
            
            for frame in frames[:10]:  # Sample first 10 frames
                # Convert to HSV to analyze saturation (hair often has distinct saturation patterns)
                hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV) if len(frame.shape) == 3 else None
                
                if hsv is not None:
                    # Focus on saturation channel
                    saturation = hsv[:, :, 1]
                    
                    # Calculate local standard deviation of saturation
                    kernel = np.ones((5, 5), np.float32) / 25
                    smoothed_sat = cv2.filter2D(saturation, -1, kernel)
                    local_std = np.sqrt(cv2.filter2D((saturation - smoothed_sat)**2, -1, kernel))
                    
                    # High local variance might indicate inconsistent hair patterns
                    std_mean = np.mean(local_std)
                    hair_artifact_scores.append(min(1.0, std_mean / 50))  # Normalize
            
            if hair_artifact_scores:
                return float(np.mean(hair_artifact_scores))
            else:
                return 0.25  # Default score
        except:
            return 0.2  # Default score
    
    def _detect_background_inconsistencies(self, frames: List[np.ndarray]) -> float:
        """
        Detect background inconsistencies
        """
        try:
            if len(frames) < 2:
                return 0.3  # Default score
            
            # Calculate background consistency across frames
            background_differences = []
            
            for i in range(1, min(len(frames), 10)):  # Compare up to 10 frames
                # Convert to grayscale
                gray1 = cv2.cvtColor(frames[i-1], cv2.COLOR_BGR2GRAY) if len(frames[i-1].shape) == 3 else frames[i-1]
                gray2 = cv2.cvtColor(frames[i], cv2.COLOR_BGR2GRAY) if len(frames[i].shape) == 3 else frames[i]
                
                # Focus on background regions (avoid faces/foreground objects)
                # Simple approach: analyze corners and edges of frame
                h, w = gray1.shape
                
                # Define background regions (corners and edges)
                background_regions1 = [
                    gray1[:h//4, :w//4],           # Top-left corner
                    gray1[:h//4, 3*w//4:],         # Top-right corner
                    gray1[3*h//4:, :w//4],         # Bottom-left corner
                    gray1[3*h//4:, 3*w//4:],       # Bottom-right corner
                    gray1[h//4:h//2, :w//8],       # Left edge
                    gray1[h//4:h//2, 7*w//8:]      # Right edge
                ]
                
                background_regions2 = [
                    gray2[:h//4, :w//4],           # Top-left corner
                    gray2[:h//4, 3*w//4:],         # Top-right corner
                    gray2[3*h//4:, :w//4],         # Bottom-left corner
                    gray2[3*h//4:, 3*w//4:],       # Bottom-right corner
                    gray2[h//4:h//2, :w//8],       # Left edge
                    gray2[h//4:h//2, 7*w//8:]      # Right edge
                ]
                
                # Calculate average difference in background regions
                region_diffs = []
                for reg1, reg2 in zip(background_regions1, background_regions2):
                    if reg1.size > 0 and reg2.size > 0:
                        diff = np.mean(np.abs(reg1.astype(np.float32) - reg2.astype(np.float32)))
                        region_diffs.append(diff)
                
                if region_diffs:
                    background_differences.append(np.mean(region_diffs))
            
            if background_differences:
                avg_background_diff = np.mean(background_differences)
                # Normalize to 0-1 range
                return min(1.0, avg_background_diff / 100)  # Adjust threshold as needed
            else:
                return 0.25  # Default score
        except:
            return 0.2  # Default score
    
    def detect_misinfo(self, video_paths: List[Union[str, Path]]) -> List[Dict[str, Any]]:
        """
        Main detection function for video misinformation
        """
        self.logger.info(f"Analyzing {len(video_paths)} video files for misinformation")
        results = []
        
        for video_path in video_paths:
            try:
                # Load video
                cap = self.load_video(video_path)
                if cap is None:
                    results.append({
                        'video_path': str(video_path),
                        'misinfo_score': 0.5,
                        'confidence': 0.0,
                        'is_misinfo': False,
                        'error': 'Could not load video'
                    })
                    continue
                
                # Extract frames
                frames = self.extract_frames(cap, max_frames=30)
                cap.release()
                
                if not frames:
                    results.append({
                        'video_path': str(video_path),
                        'misinfo_score': 0.5,
                        'confidence': 0.0,
                        'is_misinfo': False,
                        'error': 'Could not extract frames'
                    })
                    continue
                
                # Extract features
                features = self.extract_features(frames)
                
                # Detect deepfake artifacts
                artifact_results = self.detect_deepfake_artifacts(frames)
                
                # Calculate misinfo score
                misinfo_score = artifact_results.get('overall_deepfake_score', 0.5)
                
                # Calculate confidence
                confidence = self._calculate_confidence(artifact_results)
                
                result = {
                    'video_path': str(video_path),
                    'misinfo_score': misinfo_score,
                    'features': features,
                    'artifact_analysis': artifact_results,
                    'confidence': confidence,
                    'is_misinfo': misinfo_score > 0.5
                }
                
                results.append(result)
                
            except Exception as e:
                self.logger.error(f"Error analyzing video {video_path}: {str(e)}")
                results.append({
                    'video_path': str(video_path),
                    'misinfo_score': 0.5,
                    'confidence': 0.0,
                    'is_misinfo': False,
                    'error': str(e)
                })
        
        self.logger.info(f"Completed video analysis with {len(results)} results")
        return results
    
    def _calculate_confidence(self, artifact_results: Dict[str, float]) -> float:
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
    
    def generate_adversarial_samples(self, base_videos: List[Union[str, Path]], 
                                   num_samples: int = 3) -> List[str]:
        """
        Generate adversarial video samples for training improvement
        """
        self.logger.info(f"Generating {num_samples} adversarial video samples")
        
        adversarial_samples = []
        
        for _ in range(num_samples):
            # Select a random base video
            if base_videos:
                base_path = random.choice(base_videos)
                
                # Create adversarial variants
                variants = [
                    self._add_noise_to_video(base_path),
                    self._modify_colors_of_video(base_path),
                    self._add_compression_artifacts_to_video(base_path),
                    self._apply_blur_to_video(base_path),
                    self._add_temporal_distortions_to_video(base_path)
                ]
                
                # Randomly select one variant
                selected_variant = random.choice(variants)
                adversarial_samples.append(selected_variant)
        
        self.logger.info(f"Generated {len(adversarial_samples)} adversarial samples")
        return adversarial_samples
    
    def _add_noise_to_video(self, video_path: Union[str, Path]) -> str:
        """
        Add random noise to video
        """
        try:
            # In a real implementation, you would modify the actual video
            # For this demonstration, we'll just return the original path
            return str(video_path)
        except Exception as e:
            self.logger.error(f"Error adding noise to video: {str(e)}")
            return str(video_path)
    
    def _modify_colors_of_video(self, video_path: Union[str, Path]) -> str:
        """
        Modify colors of video to create adversarial sample
        """
        try:
            # In a real implementation, you would modify the actual video
            # For this demonstration, we'll just return the original path
            return str(video_path)
        except Exception as e:
            self.logger.error(f"Error modifying colors of video: {str(e)}")
            return str(video_path)
    
    def _add_compression_artifacts_to_video(self, video_path: Union[str, Path]) -> str:
        """
        Add compression artifacts to video
        """
        try:
            # In a real implementation, you would modify the actual video
            # For this demonstration, we'll just return the original path
            return str(video_path)
        except Exception as e:
            self.logger.error(f"Error adding compression artifacts to video: {str(e)}")
            return str(video_path)
    
    def _apply_blur_to_video(self, video_path: Union[str, Path]) -> str:
        """
        Apply blur to video
        """
        try:
            # In a real implementation, you would modify the actual video
            # For this demonstration, we'll just return the original path
            return str(video_path)
        except Exception as e:
            self.logger.error(f"Error applying blur to video: {str(e)}")
            return str(video_path)
    
    def _add_temporal_distortions_to_video(self, video_path: Union[str, Path]) -> str:
        """
        Add temporal distortions to video
        """
        try:
            # In a real implementation, you would modify the actual video
            # For this demonstration, we'll just return the original path
            return str(video_path)
        except Exception as e:
            self.logger.error(f"Error adding temporal distortions to video: {str(e)}")
            return str(video_path)


# Convenience function for easy usage
def create_video_detector() -> VideoDetector:
    """
    Factory function to create and initialize the video detector
    """
    return VideoDetector()


__all__ = [
    'VideoDetector',
    'create_video_detector'
]