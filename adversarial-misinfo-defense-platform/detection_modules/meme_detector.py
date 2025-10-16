"""
Meme Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of adversarial meme-based misinformation including
template manipulation, caption deception, and coordinated campaign detection.
"""
import numpy as np
import torch
import torch.nn as nn
import cv2
from PIL import Image, ImageDraw, ImageFont
import pytesseract
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import logging
import random
import hashlib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import re


class MemeDetector:
    """
    Detection module for meme-based misinformation and adversarial samples
    """
    
    def __init__(self):
        """
        Initialize the meme detector
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Initialize detection models
        self.scaler = StandardScaler()
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        
        # Initialize adversarial GAN
        self.adversarial_gan = None
        
        # Known meme templates and patterns
        self.known_templates = {
            'distracted_boyfriend': ['distracted boyfriend', 'girlfriend looking', 'jealous'],
            'drake_pointing': ['drake pointing', 'no yes', 'reject approve'],
            'woman_yelling_cat': ['woman yelling', 'cat confused', 'argument'],
            'expanding_brain': ['expanding brain', 'levels of', 'understanding'],
            'change_my_mind': ['change my mind', 'skeptical', 'debate'],
            'this_is_fine': ['this is fine', 'dog burning', 'problematic'],
            'surprised_pikachu': ['surprised pikachu', 'shocked', 'unexpected'],
            'woman_cringing': ['woman cringing', 'awkward', 'embarrassed'],
            'running_away_balloon': ['running away', 'balloon', 'escaping'],
            'bernie_sanders': ['bernie sanders', 'mittens', 'chair', 'memes']
        }
        
        # Known misinformation phrases in memes
        self.misinfo_phrases = [
            'fake news',
            'they don\'t want you to know',
            'shocking truth',
            'banned by big tech',
            'government conspiracy',
            'cover up',
            'hidden agenda',
            'secret documents',
            'leaked footage',
            'inside source',
            'confirmed source',
            'scientific proof',
            'they profit from',
            'big pharma',
            'climate hoax',
            'election fraud',
            'rigged system',
            'establishment',
            'deep state',
            'shadow government'
        ]
        
        # Known misinformation patterns
        self.misinfo_patterns = [
            r'(?!.*\b(?:research|study|evidence)\b).*\b(incredibl|unbelievabl|shocking|astounding)\b',
            r'\b(they don\'t want you to know|hidden truth|suppressed|covered up)\b',
            r'\b(banned|censored|removed|taken down|deleted)\b.*\b(video|image|post|tweet)\b',
            r'\b(leak|leaked|leaking|inside source)\b',
            r'\b(big (pharma|tech|media|bank|oil|corporate))\b',
            r'\b(conspiracy|cover[-\s]?up|hoax|scam|fraud|lie(s)?)\b',
            r'\b(profit from|money from|benefit from)\b',
            r'\b(confirmed|verified|scientific proof|documented)\b(?!.*\b(?:peer[-\s]?reviewed|research|study)\b)'
        ]
        
        self.logger.info("MemeDetector initialized successfully")
    
    def load_image(self, image_path: Union[str, Path]) -> Optional[Image.Image]:
        """
        Load image from file path
        """
        try:
            image = Image.open(str(image_path))
            return image
        except Exception as e:
            self.logger.error(f"Error loading image {image_path}: {str(e)}")
            return None
    
    def extract_text_from_image(self, image: Image.Image) -> str:
        """
        Extract text from meme image using OCR
        """
        try:
            # Convert to grayscale for better OCR
            if image.mode != 'L':
                gray_image = image.convert('L')
            else:
                gray_image = image
            
            # Extract text using pytesseract
            text = pytesseract.image_to_string(gray_image)
            return text.strip()
        except Exception as e:
            self.logger.error(f"Error extracting text from image: {str(e)}")
            return ""
    
    def detect_known_templates(self, image: Image.Image) -> List[Dict[str, Any]]:
        """
        Detect known meme templates in the image
        """
        detected_templates = []
        
        # Extract text from image
        extracted_text = self.extract_text_from_image(image).lower()
        
        # Check for known template keywords
        for template_name, keywords in self.known_templates.items():
            matches = 0
            for keyword in keywords:
                if keyword.lower() in extracted_text:
                    matches += 1
            
            # If we match at least half the keywords, consider it a match
            if matches >= len(keywords) / 2:
                confidence = min(1.0, matches / len(keywords))
                detected_templates.append({
                    'template': template_name,
                    'confidence': confidence,
                    'matched_keywords': keywords[:matches]
                })
        
        return detected_templates
    
    def analyze_caption(self, caption: str) -> Dict[str, Any]:
        """
        Analyze meme caption for misinformation indicators
        """
        results = {
            'misinfo_phrases': [],
            'misinfo_patterns': [],
            'emotional_language': 0.0,
            'source_indicators': [],
            'urgency_indicators': [],
            'call_to_action': False,
            'overall_score': 0.0
        }
        
        caption_lower = caption.lower()
        
        # Check for known misinformation phrases
        for phrase in self.misinfo_phrases:
            if phrase.lower() in caption_lower:
                results['misinfo_phrases'].append(phrase)
        
        # Check for misinformation patterns using regex
        for pattern in self.misinfo_patterns:
            matches = re.finditer(pattern, caption_lower, re.IGNORECASE)
            for match in matches:
                results['misinfo_patterns'].append({
                    'pattern': pattern,
                    'match': match.group(),
                    'start': match.start(),
                    'end': match.end()
                })
        
        # Check for emotional language
        emotional_words = [
            'shocking', 'incredible', 'unbelievable', 'astounding', 'mind-blowing',
            'terrifying', 'horrifying', 'devastating', 'catastrophic', 'dangerous',
            'amazing', 'jaw-dropping', 'breathtaking', 'outrageous', 'shameful'
        ]
        
        emotional_count = sum(1 for word in emotional_words if word in caption_lower)
        results['emotional_language'] = min(1.0, emotional_count * 0.2)  # Scale factor
        
        # Check for source indicators
        source_indicators = [
            'source:', 'anonymous source', 'inside source', 'leaked', 'documented',
            'confirmed', 'verified', 'official', 'released', 'revealed'
        ]
        
        for indicator in source_indicators:
            if indicator.lower() in caption_lower:
                results['source_indicators'].append(indicator)
        
        # Check for urgency indicators
        urgency_words = [
            'urgent', 'immediate', 'breaking', 'now', 'today', 'right now',
            'act now', 'limited time', 'last chance', 'final warning'
        ]
        
        for word in urgency_words:
            if word in caption_lower:
                results['urgency_indicators'].append(word)
        
        # Check for call to action
        call_to_action_phrases = [
            'share this', 'tag someone', 'spread the word', 'retweet', 'repost',
            'tell everyone', 'make sure', 'don\'t ignore', 'wake up', 'you need to know'
        ]
        
        results['call_to_action'] = any(phrase in caption_lower for phrase in call_to_action_phrases)
        
        # Calculate overall score
        phrase_score = min(1.0, len(results['misinfo_phrases']) * 0.3)
        pattern_score = min(1.0, len(results['misinfo_patterns']) * 0.4)
        emotional_score = results['emotional_language']
        source_score = min(1.0, len(results['source_indicators']) * 0.25)
        urgency_score = min(1.0, len(results['urgency_indicators']) * 0.2)
        action_score = 0.5 if results['call_to_action'] else 0.0
        
        # Weighted combination
        results['overall_score'] = (
            0.3 * phrase_score +
            0.3 * pattern_score +
            0.15 * emotional_score +
            0.1 * source_score +
            0.1 * urgency_score +
            0.05 * action_score
        )
        
        return results
    
    def extract_visual_features(self, image: Image.Image) -> Dict[str, Any]:
        """
        Extract visual features from meme image
        """
        features = {}
        
        # Basic image properties
        features['width'] = image.width
        features['height'] = image.height
        features['aspect_ratio'] = image.width / image.height if image.height > 0 else 1.0
        features['mode'] = image.mode
        
        # Color analysis
        if image.mode == 'RGB':
            # Convert to numpy array for analysis
            img_array = np.array(image)
            features['avg_red'] = np.mean(img_array[:, :, 0])
            features['avg_green'] = np.mean(img_array[:, :, 1])
            features['avg_blue'] = np.mean(img_array[:, :, 2])
            features['brightness'] = np.mean(img_array)
            
            # Contrast analysis
            features['contrast'] = np.std(img_array)
        else:
            # Handle other modes
            gray_image = image.convert('L')
            img_array = np.array(gray_image)
            features['brightness'] = np.mean(img_array)
            features['contrast'] = np.std(img_array)
            features['avg_red'] = features['avg_green'] = features['avg_blue'] = 0
        
        # Edge analysis
        try:
            gray_image = image.convert('L')
            img_array = np.array(gray_image)
            edges = cv2.Canny(img_array, 50, 150)
            features['edge_density'] = np.sum(edges > 0) / (img_array.shape[0] * img_array.shape[1])
        except Exception as e:
            self.logger.error(f"Error in edge analysis: {str(e)}")
            features['edge_density'] = 0
        
        # Text overlay analysis
        features['text_area_ratio'] = self._estimate_text_area_ratio(image)
        
        return features
    
    def _estimate_text_area_ratio(self, image: Image.Image) -> float:
        """
        Estimate the ratio of image area occupied by text
        """
        try:
            # Use OCR to get bounding boxes of text
            gray_image = image.convert('L')
            img_array = np.array(gray_image)
            data = pytesseract.image_to_data(img_array, output_type=pytesseract.Output.DICT)
            
            total_area = image.width * image.height
            text_area = 0
            
            # Sum up areas of detected text boxes
            for i in range(len(data['text'])):
                if int(data['conf'][i]) > 30:  # Confidence threshold
                    width = data['width'][i]
                    height = data['height'][i]
                    text_area += width * height
            
            return min(1.0, text_area / total_area) if total_area > 0 else 0
        except Exception as e:
            self.logger.error(f"Error estimating text area ratio: {str(e)}")
            return 0.0  # Default to 0 if analysis fails
    
    def detect_misinfo(self, meme_paths: List[Union[str, Path]]) -> List[Dict[str, Any]]:
        """
        Main detection function for meme misinformation
        """
        results = []
        
        for path in meme_paths:
            try:
                # Open image
                image = self.load_image(path)
                if image is None:
                    results.append({
                        'meme_path': str(path),
                        'misinfo_score': 0.5,
                        'confidence': 0.0,
                        'is_misinfo': False,
                        'error': 'Could not load image'
                    })
                    continue
                
                # Extract text from image
                extracted_text = self.extract_text_from_image(image)
                
                # Detect known templates
                template_results = self.detect_known_templates(image)
                
                # Analyze caption
                caption_analysis = self.analyze_caption(extracted_text)
                
                # Extract visual features
                visual_features = self.extract_visual_features(image)
                
                # Calculate overall misinfo score
                template_score = min(1.0, len(template_results) * 0.2)  # Templates alone aren't necessarily bad
                caption_score = caption_analysis['overall_score']
                visual_score = visual_features.get('text_area_ratio', 0)  # More text area might indicate manipulation
                
                # Combined score with weighted importance
                combined_score = (
                    0.5 * caption_score +
                    0.3 * template_score +
                    0.2 * visual_score
                )
                
                # Calculate confidence
                confidence = self._calculate_confidence(template_results, caption_analysis, visual_features)
                
                result = {
                    'meme_path': str(path),
                    'extracted_text': extracted_text,
                    'template_matches': template_results,
                    'caption_analysis': caption_analysis,
                    'visual_features': visual_features,
                    'misinfo_score': combined_score,
                    'confidence': confidence,
                    'is_misinfo': combined_score > 0.5  # Threshold for flagging
                }
                
                results.append(result)
                
            except Exception as e:
                self.logger.error(f"Error analyzing meme {path}: {str(e)}")
                results.append({
                    'meme_path': str(path),
                    'misinfo_score': 0.5,
                    'confidence': 0.0,
                    'is_misinfo': False,
                    'error': str(e)
                })
        
        self.logger.info(f"Completed meme analysis with {len(results)} results")
        return results
    
    def _calculate_confidence(self, template_results: List[Dict[str, Any]], 
                             caption_analysis: Dict[str, Any], 
                             visual_features: Dict[str, Any]) -> float:
        """
        Calculate confidence based on analysis results
        """
        try:
            # Calculate confidence from different factors
            template_confidence = len(template_results) * 0.1  # Each template match adds 0.1 confidence
            caption_confidence = caption_analysis.get('overall_score', 0.0) * 0.8  # Caption score heavily weighted
            visual_confidence = visual_features.get('text_area_ratio', 0.0) * 0.1  # Visual features lightly weighted
            
            # Combine confidences
            total_confidence = min(1.0, template_confidence + caption_confidence + visual_confidence)
            
            return float(total_confidence)
        except Exception as e:
            self.logger.error(f"Error calculating confidence: {str(e)}")
            return 0.5  # Default confidence
    
    def generate_adversarial_samples(self, base_memes: List[Union[str, Path]], 
                                   num_samples: int = 5) -> List[str]:
        """
        Generate adversarial meme samples for training improvement
        """
        adversarial_memes = []
        
        for _ in range(num_samples):
            # Select a random base meme
            if base_memes:
                base_path = random.choice(base_memes)
                
                # Create adversarial variants
                adversarial_variants = [
                    self._add_fake_text_overlay(base_path),
                    self._modify_colors(base_path),
                    self._add_watermark(base_path),
                    self._apply_blur_effect(base_path),
                    self._add_border(base_path)
                ]
                
                # Randomly select one variant
                selected_variant = random.choice(adversarial_variants)
                adversarial_memes.append(selected_variant)
        
        self.logger.info(f"Generated {len(adversarial_memes)} adversarial meme samples")
        return adversarial_memes
    
    def _add_fake_text_overlay(self, image_path: Union[str, Path]) -> str:
        """
        Add fake text overlay to create adversarial sample
        """
        try:
            # Load image
            image = Image.open(str(image_path))
            
            # Create a copy to modify
            img_copy = image.copy()
            draw = ImageDraw.Draw(img_copy)
            
            # Try to get a font (fallback to default if needed)
            try:
                font = ImageFont.truetype("arial.ttf", 24)
            except:
                try:
                    font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
                except:
                    font = ImageFont.load_default()
            
            # Add random text
            fake_texts = [
                "SHOCKING TRUTH REVEALED!",
                "THEY DON'T WANT YOU TO KNOW",
                "BANNED BY BIG TECH",
                "INSIDE SOURCE CONFIRMS",
                "UNBELIEVABLE LEAK"
            ]
            
            text = random.choice(fake_texts)
            width, height = img_copy.size
            text_width, text_height = draw.textsize(text, font=font) if hasattr(draw, 'textsize') else (len(text)*12, 24)
            
            # Position text randomly but visibly
            x = random.randint(10, max(10, width - text_width - 10))
            y = random.randint(10, max(10, height - text_height - 10))
            
            # Draw text with outline for visibility
            draw.text((x-1, y-1), text, fill="black", font=font)
            draw.text((x+1, y-1), text, fill="black", font=font)
            draw.text((x-1, y+1), text, fill="black", font=font)
            draw.text((x+1, y+1), text, fill="black", font=font)
            draw.text((x, y), text, fill="white", font=font)
            
            # Save to temporary file
            output_path = f"/tmp/adversarial_text_{hashlib.md5(str(image_path).encode()).hexdigest()[:8]}.jpg"
            img_copy.save(output_path)
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error adding fake text overlay: {str(e)}")
            return str(image_path)  # Return original if modification fails
    
    def _modify_colors(self, image_path: Union[str, Path]) -> str:
        """
        Modify colors to create adversarial sample
        """
        try:
            # Load image
            image = Image.open(str(image_path))
            
            # Apply random color adjustments
            img_array = np.array(image)
            
            # Random color shifts
            r_shift = random.randint(-20, 20)
            g_shift = random.randint(-20, 20)
            b_shift = random.randint(-20, 20)
            
            if len(img_array.shape) == 3 and img_array.shape[2] >= 3:
                img_array[:, :, 0] = np.clip(img_array[:, :, 0].astype(np.int16) + r_shift, 0, 255)
                img_array[:, :, 1] = np.clip(img_array[:, :, 1].astype(np.int16) + g_shift, 0, 255)
                img_array[:, :, 2] = np.clip(img_array[:, :, 2].astype(np.int16) + b_shift, 0, 255)
            
            # Save modified image
            modified_image = Image.fromarray(img_array.astype(np.uint8))
            output_path = f"/tmp/adversarial_color_{hashlib.md5(str(image_path).encode()).hexdigest()[:8]}.jpg"
            modified_image.save(output_path)
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error modifying colors: {str(e)}")
            return str(image_path)  # Return original if modification fails
    
    def _add_watermark(self, image_path: Union[str, Path]) -> str:
        """
        Add watermark to create adversarial sample
        """
        try:
            # Load image
            image = Image.open(str(image_path))
            
            img_copy = image.copy()
            draw = ImageDraw.Draw(img_copy)
            
            # Try to get a font
            try:
                font = ImageFont.truetype("arial.ttf", 16)
            except:
                try:
                    font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
                except:
                    font = ImageFont.load_default()
            
            # Add watermark text
            watermark = random.choice(["FOR ENTERTAINMENT", "NOT REAL NEWS", "SATIRE"])
            width, height = img_copy.size
            text_width, text_height = draw.textsize(watermark, font=font) if hasattr(draw, 'textsize') else (len(watermark)*8, 16)
            
            # Position in corner
            x = width - text_width - 10
            y = height - text_height - 10
            
            # Draw semi-transparent text
            draw.text((x, y), watermark, fill=(255, 255, 255, 128), font=font)
            
            # Save watermarked image
            output_path = f"/tmp/adversarial_watermark_{hashlib.md5(str(image_path).encode()).hexdigest()[:8]}.jpg"
            img_copy.save(output_path)
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error adding watermark: {str(e)}")
            return str(image_path)  # Return original if modification fails
    
    def _apply_blur_effect(self, image_path: Union[str, Path]) -> str:
        """
        Apply blur effect to create adversarial sample
        """
        try:
            # Load image
            image = Image.open(str(image_path))
            
            # Convert to numpy array
            img_array = np.array(image)
            
            # Apply Gaussian blur with random kernel size
            kernel_size = random.choice([3, 5, 7])
            if kernel_size % 2 == 0:
                kernel_size += 1  # Ensure odd kernel size
            
            blurred = cv2.GaussianBlur(img_array, (kernel_size, kernel_size), 0)
            
            # Save blurred image
            blurred_image = Image.fromarray(blurred)
            output_path = f"/tmp/adversarial_blur_{hashlib.md5(str(image_path).encode()).hexdigest()[:8]}.jpg"
            blurred_image.save(output_path)
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error applying blur effect: {str(e)}")
            return str(image_path)  # Return original if modification fails
    
    def _add_border(self, image_path: Union[str, Path]) -> str:
        """
        Add border to create adversarial sample
        """
        try:
            # Load image
            image = Image.open(str(image_path))
            
            # Add a colored border
            border_color = (
                random.randint(0, 255),
                random.randint(0, 255),
                random.randint(0, 255)
            )
            
            border_width = random.randint(2, 10)
            bordered_image = ImageOps.expand(image, border=border_width, fill=border_color)
            
            # Save bordered image
            output_path = f"/tmp/adversarial_border_{hashlib.md5(str(image_path).encode()).hexdigest()[:8]}.jpg"
            bordered_image.save(output_path)
            return output_path
            
        except Exception as e:
            self.logger.error(f"Error adding border: {str(e)}")
            return str(image_path)  # Return original if modification fails


# Import ImageOps for the expand function
import PIL.ImageOps as ImageOps


# Convenience function for easy usage
def create_meme_detector() -> MemeDetector:
    """
    Factory function to create and initialize the meme detector
    """
    return MemeDetector()


__all__ = [
    'MemeDetector',
    'create_meme_detector'
]