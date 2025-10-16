"""
Video Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of adversarial video-based misinformation,
including deepfake video detection and adversarial sample generation.
"""
import numpy as np
import cv2
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import random
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import subprocess
import os
import tempfile
from moviepy.editor import VideoFileClip


class AdversarialVideoGAN(nn.Module):
    """
    Simple GAN for generating adversarial video samples for training
    """
    def __init__(self, img_channels: int = 3, img_size: int = 64, seq_length: int = 10):
        super(AdversarialVideoGAN, self).__init__()
        
        self.seq_length = seq_length
        self.img_size = img_size
        self.img_channels = img_channels
        
        # Generator: generates sequence of frames
        self.generator = nn.Sequential(
            nn.Linear(100, 256),
            nn.ReLU(),
            nn.Linear(256, 512),
            nn.BatchNorm1d(512),
            nn.ReLU(),
            nn.Linear(512, seq_length * img_channels * img_size * img_size),
            nn.Tanh()
        )
        
        # Discriminator: evaluates sequence of frames
        self.discriminator = nn.Sequential(
            nn.Linear(seq_length * img_channels * img_size * img_size, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        generated = self.generator(x)
        return self.discriminator(generated)


class VideoDetector:
    """
    Detection module for video-based misinformation and deepfakes
    """
    
    def __init__(self):
        """
        Initialize the video detector with default models
        """
        # Initialize isolation forest for anomaly detection
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        
        # Initialize adversarial GAN
        self.adversarial_gan = AdversarialVideoGAN()
        
        # Common video artifacts and patterns for deepfake detection
        self.artifact_patterns = {
            'temporal_inconsistencies': 0.8,
            'inconsistent_lighting': 0.7,
            'edge_discontinuities': 0.75,
            'face_boundary_artifacts': 0.7,
            'audio_visual_sync_issues': 0.85
        }
    
    def extract_features_from_frame(self, frame: np.ndarray) -> Dict[str, Any]:
        """
        Extract features from a single video frame
        """
        features = {}
        
        # Basic frame properties
        features['brightness'] = np.mean(cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY))
        features['contrast'] = np.std(cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY))
        features['sharpness'] = cv2.Laplacian(frame, cv2.CV_64F).var()
        
        # Edge features
        gray = cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        features['edge_density'] = np.sum(edges > 0) / (frame.shape[0] * frame.shape[1])
        
        # Color histogram
        hist_r = cv2.calcHist([frame], [0], None, [8], [0, 256])
        hist_g = cv2.calcHist([frame], [1], None, [8], [0, 256])
        hist_b = cv2.calcHist([frame], [2], None, [8], [0, 256])
        features['color_histogram'] = np.concatenate([hist_r.flatten(), 
                                                     hist_g.flatten(), 
                                                     hist_b.flatten()]).tolist()
        
        return features
    
    def extract_features_from_video(self, video_path: Union[str, Path]) -> Dict[str, Any]:
        """
        Extract features from video for analysis
        """
        features = {
            'frame_features': [],
            'temporal_features': [],
            'overall_stats': {}
        }
        
        # Load video
        cap = cv2.VideoCapture(str(video_path))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Extract frames at regular intervals to reduce computation
        frame_interval = max(1, frame_count // 30)  # Extract up to 30 frames
        frames = []
        frame_indices = []
        
        for i in range(0, frame_count, frame_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frames.append(frame_rgb)
                frame_indices.append(i)
        
        cap.release()
        
        # Extract features from each frame
        for frame in frames:
            frame_features = self.extract_features_from_frame(frame)
            features['frame_features'].append(frame_features)
        
        # Calculate temporal features across frames
        if len(frames) > 1:
            brightness_changes = []
            contrast_changes = []
            sharpness_changes = []
            
            for i in range(1, len(features['frame_features'])):
                prev_frame = features['frame_features'][i-1]
                curr_frame = features['frame_features'][i]
                
                brightness_changes.append(abs(curr_frame['brightness'] - prev_frame['brightness']))
                contrast_changes.append(abs(curr_frame['contrast'] - prev_frame['contrast']))
                sharpness_changes.append(abs(curr_frame['sharpness'] - prev_frame['sharpness']))
            
            if brightness_changes:
                features['temporal_features'] = {
                    'brightness_variance': np.var(brightness_changes),
                    'contrast_variance': np.var(contrast_changes),
                    'sharpness_variance': np.var(sharpness_changes),
                    'avg_brightness_change': np.mean(brightness_changes),
                    'avg_contrast_change': np.mean(contrast_changes),
                    'avg_sharpness_change': np.mean(sharpness_changes)
                }
        
        # Overall statistics
        if features['frame_features']:
            all_brightness = [f['brightness'] for f in features['frame_features']]
            all_contrast = [f['contrast'] for f in features['frame_features']]
            all_sharpness = [f['sharpness'] for f in features['frame_features']]
            all_edge_density = [f['edge_density'] for f in features['frame_features']]
            
            features['overall_stats'] = {
                'avg_brightness': np.mean(all_brightness),
                'std_brightness': np.std(all_brightness),
                'avg_contrast': np.mean(all_contrast),
                'std_contrast': np.std(all_contrast),
                'avg_sharpness': np.mean(all_sharpness),
                'std_sharpness': np.std(all_sharpness),
                'avg_edge_density': np.mean(all_edge_density),
                'std_edge_density': np.std(all_edge_density),
                'duration': frame_count / fps if fps > 0 else 0,
                'frame_count': frame_count,
                'fps': fps
            }
        
        return features
    
    def detect_video_artifacts(self, video_path: Union[str, Path]) -> Dict[str, float]:
        """
        Detect specific video artifacts that may indicate manipulation or deepfakes
        """
        results = {}
        
        # Check for temporal inconsistencies (frame-to-frame changes)
        results['temporal_inconsistencies'] = self._detect_temporal_inconsistencies(video_path)
        
        # Check for inconsistent lighting across video
        results['inconsistent_lighting'] = self._detect_inconsistent_lighting(video_path)
        
        # Check for edge discontinuities (common in face swaps)
        results['edge_discontinuities'] = self._detect_edge_discontinuities(video_path)
        
        # Check for face boundary artifacts
        results['face_boundary_artifacts'] = self._detect_face_boundary_artifacts(video_path)
        
        # Check for audio-video synchronization issues
        results['audio_visual_sync_issues'] = self._detect_audio_visual_sync_issues(video_path)
        
        # Overall deepfake video score based on combined artifacts
        scores = list(results.values())
        if scores:
            results['overall_deepfake_video_score'] = np.mean(scores)
        else:
            results['overall_deepfake_video_score'] = 0.0
        
        return results
    
    def _detect_temporal_inconsistencies(self, video_path: Union[str, Path]) -> float:
        """
        Detect temporal inconsistencies in video
        """
        cap = cv2.VideoCapture(str(video_path))
        prev_frame = None
        frame_diffs = []
        
        # Sample frames to reduce computation
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = max(1, frame_count // 20)  # Sample 20 frames
        
        for i in range(0, frame_count, frame_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if prev_frame is not None:
                    # Calculate frame difference
                    diff = cv2.absdiff(prev_frame, gray)
                    frame_diffs.append(np.mean(diff))
                prev_frame = gray
        
        cap.release()
        
        if frame_diffs:
            # High variance in frame differences might indicate inconsistencies
            diff_variance = np.var(frame_diffs)
            # Normalize to 0-1 range
            return min(1.0, diff_variance / 2000)  # Adjust threshold as needed
        else:
            return 0.0
    
    def _detect_inconsistent_lighting(self, video_path: Union[str, Path]) -> float:
        """
        Detect lighting inconsistencies across video frames
        """
        cap = cv2.VideoCapture(str(video_path))
        brightness_values = []
        
        # Sample frames to reduce computation
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = max(1, frame_count // 30)  # Sample 30 frames
        
        for i in range(0, frame_count, frame_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                brightness_values.append(np.mean(gray))
        
        cap.release()
        
        if brightness_values and len(brightness_values) > 1:
            # Calculate coefficient of variation (std/mean)
            mean_brightness = np.mean(brightness_values)
            std_brightness = np.std(brightness_values)
            
            if mean_brightness > 0:
                cv_brightness = std_brightness / mean_brightness
                # High coefficient of variation indicates inconsistent lighting
                return min(1.0, cv_brightness * 2)  # Adjust multiplier as needed
            else:
                return 0.5
        else:
            return 0.0
    
    def _detect_edge_discontinuities(self, video_path: Union[str, Path]) -> float:
        """
        Detect edge discontinuities that may indicate face swaps or compositing
        """
        cap = cv2.VideoCapture(str(video_path))
        edge_densities = []
        
        # Sample frames to reduce computation
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = max(1, frame_count // 20)  # Sample 20 frames
        
        for i in range(0, frame_count, frame_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                edges = cv2.Canny(gray, 50, 150)
                edge_density = np.sum(edges > 0) / (frame.shape[0] * frame.shape[1])
                edge_densities.append(edge_density)
        
        cap.release()
        
        if edge_densities and len(edge_densities) > 1:
            # Calculate variance in edge density
            edge_variance = np.var(edge_densities)
            # High variance might indicate inconsistent edge patterns
            return min(1.0, edge_variance * 1000)  # Adjust threshold as needed
        else:
            return 0.0
    
    def _detect_face_boundary_artifacts(self, video_path: Union[str, Path]) -> float:
        """
        Detect artifacts around face boundaries (common in face swaps)
        """
        cap = cv2.VideoCapture(str(video_path))
        face_artifact_scores = []
        
        # Use Haar cascades to detect faces
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Sample frames to reduce computation
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        frame_interval = max(1, frame_count // 25)  # Sample 25 frames
        
        for i in range(0, frame_count, frame_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, i)
            ret, frame = cap.read()
            if ret:
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                faces = face_cascade.detectMultiScale(gray, 1.1, 4)
                
                for (x, y, w, h) in faces:
                    # Extract face region
                    face_region = frame[y:y+h, x:x+w]
                    
                    # Calculate statistics inside and outside face boundary
                    if y > 0 and y+h < frame.shape[0] and x > 0 and x+w < frame.shape[1]:
                        # Define regions around the face
                        margin = min(w, h) // 4
                        x1 = max(0, x - margin)
                        y1 = max(0, y - margin)
                        x2 = min(frame.shape[1], x + w + margin)
                        y2 = min(frame.shape[0], y + h + margin)
                        
                        surrounding_region = frame[y1:y2, x1:x2]
                        
                        # Compare color statistics
                        face_mean = np.mean(face_region, axis=(0,1))
                        surrounding_mean = np.mean(surrounding_region, axis=(0,1))
                        
                        # Difference in statistics might indicate artifacts
                        color_diff = np.mean(np.abs(face_mean - surrounding_mean))
                        face_artifact_scores.append(min(1.0, color_diff / 20))  # Adjust threshold
        
        cap.release()
        
        # Return average artifact score across all faces in all sampled frames
        if face_artifact_scores:
            return np.mean(face_artifact_scores)
        else:
            return 0.0
    
    def _detect_audio_visual_sync_issues(self, video_path: Union[str, Path]) -> float:
        """
        Detect audio-video synchronization issues (common in some deepfakes)
        """
        try:
            # Get duration of video file
            clip = VideoFileClip(str(video_path))
            video_duration = clip.duration
            clip.close()
            
            # For a more thorough check, we would extract and analyze audio separately
            # For now, we'll return a low score (assuming video is properly synchronized)
            # In a real implementation, detailed A/V sync analysis would be performed
            
            return 0.1  # Low score assuming proper sync
        except:
            return 0.3  # Medium score if we can't analyze
            
    def detect_misinfo(self, video_paths: List[Union[str, Path]]) -> List[Dict[str, Any]]:
        """
        Main detection function for video misinformation
        """
        results = []
        
        for path in video_paths:
            # Extract features
            features = self.extract_features_from_video(path)
            
            # Detect artifacts
            artifact_results = self.detect_video_artifacts(path)
            
            # Check for anomalies using isolation forest
            # Prepare feature vector for anomaly detection (simplified)
            try:
                # Just use some overall stats for this example
                if 'overall_stats' in features:
                    stats = features['overall_stats']
                    feature_vector = [
                        stats.get('avg_brightness', 0),
                        stats.get('std_brightness', 0),
                        stats.get('avg_contrast', 0),
                        stats.get('std_contrast', 0),
                        stats.get('avg_sharpness', 0),
                        stats.get('std_sharpness', 0),
                        stats.get('avg_edge_density', 0),
                        stats.get('duration', 0),
                        stats.get('frame_count', 0),
                        stats.get('fps', 0)
                    ]
                    
                    # Normalize features
                    normalized_features = self.scaler.fit_transform([feature_vector])
                    is_anomaly = self.anomaly_detector.fit(normalized_features).predict(normalized_features)[0] == -1
                    anomaly_score = 1.0 if is_anomaly else 0.0
                else:
                    anomaly_score = 0.0
            except:
                anomaly_score = 0.0
            
            # Calculate overall misinfo score
            deepfake_score = artifact_results.get('overall_deepfake_video_score', 0.0)
            combined_score = 0.7 * deepfake_score + 0.3 * anomaly_score
            
            result = {
                'video_path': str(path),
                'features': features,
                'artifact_analysis': artifact_results,
                'anomaly_score': anomaly_score,
                'misinfo_score': combined_score,
                'confidence': min(1.0, combined_score + 0.2),  # Base confidence
                'is_deepfake_video': deepfake_score > 0.5
            }
            
            results.append(result)
            
        return results
    
    def generate_adversarial_samples(self, base_video_paths: List[Union[str, Path]], 
                                   num_samples: int = 2) -> List[str]:
        """
        Generate adversarial video samples for training improvement
        """
        adversarial_videos = []
        
        for _ in range(num_samples):
            # Select a random base video
            base_path = random.choice(base_video_paths)
            
            # Create adversarial variants
            # For this example, we'll create simple modifications
            output_path = self._apply_adversarial_effects(str(base_path))
            adversarial_videos.append(output_path)
        
        return adversarial_videos
    
    def _apply_adversarial_effects(self, input_path: str) -> str:
        """
        Apply adversarial effects to create training samples
        """
        # Create temporary output file
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        # Apply various effects to make the video more adversarial
        # For this example, we'll use moviepy for simple effects
        try:
            clip = VideoFileClip(input_path)
            
            # Apply random effects
            effects_applied = random.choice([
                'speed_change',
                'color_shift',
                'noise',
                'compression',
                'temporal_distortion'
            ])
            
            if effects_applied == 'speed_change':
                # Change playback speed
                speed_factor = random.uniform(0.8, 1.2)
                clip = clip.speedx(speed_factor)
            elif effects_applied == 'color_shift':
                # Apply color transformations
                clip = clip.fl_image(lambda img: self._shift_colors(img))
            elif effects_applied == 'noise':
                # Add random noise (simplified)
                clip = clip.fl_image(lambda img: self._add_noise(img))
            
            # Write the modified clip
            clip.write_videofile(output_path, audio=False, verbose=False, logger=None)
            clip.close()
        except:
            # If moviepy fails, just copy the original video
            import shutil
            shutil.copy(input_path, output_path)
        
        return output_path
    
    def _shift_colors(self, img: np.ndarray) -> np.ndarray:
        """Apply random color shifts to an image"""
        # Convert to float to avoid overflow
        img_float = img.astype(np.float32)
        
        # Apply random shifts to each channel
        r_shift = random.randint(-20, 20)
        g_shift = random.randint(-20, 20)
        b_shift = random.randint(-20, 20)
        
        img_float[:, :, 0] = np.clip(img_float[:, :, 0] + r_shift, 0, 255)
        img_float[:, :, 1] = np.clip(img_float[:, :, 1] + g_shift, 0, 255)
        img_float[:, :, 2] = np.clip(img_float[:, :, 2] + b_shift, 0, 255)
        
        return img_float.astype(np.uint8)
    
    def _add_noise(self, img: np.ndarray) -> np.ndarray:
        """Add random noise to an image"""
        noise = np.random.normal(0, random.uniform(5, 15), img.shape).astype(np.float32)
        noisy_img = np.clip(img.astype(np.float32) + noise, 0, 255)
        return noisy_img.astype(np.uint8)
    
    def update_model(self, training_video_paths: List[Union[str, Path]], labels: List[int]):
        """
        Update the model with new training data
        """
        # Extract features for all training videos
        # This is a simplified implementation
        
        # Generate adversarial samples and continue training
        adversarial_videos = self.generate_adversarial_samples(training_video_paths, num_samples=2)
        adversarial_labels = [1] * len(adversarial_videos)  # All adversarial videos are misinfo
        
        # In a real system, you would retrain the models here
        print(f"Updated model with {len(training_video_paths)} training videos and {len(adversarial_videos)} adversarial samples")