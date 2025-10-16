"""
Meme Detection Module for Adversarial Misinformation Defense Platform

This module implements detection of adversarial meme-based misinformation,
including caption analysis, template identification, and adversarial sample generation.
"""
import numpy as np
import cv2
import torch
import torch.nn as nn
from PIL import Image, ImageDraw, ImageFont
import pytesseract
from typing import List, Dict, Any, Optional, Union
from pathlib import Path
import re
import random
from collections import Counter
import requests
from io import BytesIO
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
import json


class AdversarialMemeGAN(nn.Module):
    """
    Simple GAN for generating adversarial meme samples for training
    """
    def __init__(self, text_vocab_size: int = 10000, img_size: int = 64):
        super(AdversarialMemeGAN, self).__init__()
        
        self.text_vocab_size = text_vocab_size
        self.img_size = img_size
        
        # Generator (generates image with text overlay)
        self.image_generator = nn.Sequential(
            nn.Linear(100, 128),
            nn.ReLU(),
            nn.Linear(128, 256),
            nn.BatchNorm1d(256),
            nn.ReLU(),
            nn.Linear(256, img_size * img_size * 3),
            nn.Tanh()
        )
        
        # Text generator
        self.text_generator = nn.Sequential(
            nn.Linear(100, 128),
            nn.ReLU(),
            nn.Linear(128, text_vocab_size),
            nn.Softmax(dim=-1)
        )
        
        # Discriminator (evaluates meme quality/misinformation potential)
        self.discriminator = nn.Sequential(
            nn.Linear(img_size * img_size * 3 + text_vocab_size, 512),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.LeakyReLU(0.2),
            nn.Dropout(0.3),
            nn.Linear(256, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        img_generated = self.image_generator(x)
        text_generated = self.text_generator(x)
        combined = torch.cat([img_generated, text_generated], dim=1)
        return self.discriminator(combined)


class MemeDetector:
    """
    Detection module for meme-based misinformation
    """
    
    def __init__(self):
        """
        Initialize the meme detector with default models
        """
        # Initialize TF-IDF vectorizer for text analysis
        self.tfidf = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
        self.classifier = MultinomialNB()
        
        # Initialize adversarial GAN
        self.adversarial_gan = AdversarialMemeGAN()
        
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
            r'\b(leak|leaked|leaking|inside source|anonymous source)\b',
            r'\b(big (pharma|tech|media|bank|oil|corporate))\b',
            r'\b(conspiracy|cover[-\s]?up|hoax|scam|fraud|lie(s)?)\b',
            r'\b(profit from|money from|benefit from)\b',
            r'\b(confirmed|verified|scientific proof|documented)\b(?!.*\b(?:peer[-\s]?reviewed|research|study)\b)'
        ]
    
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
        except:
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
        except:
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
        except:
            return 0.0  # Default to 0 if analysis fails
    
    def detect_misinfo(self, meme_paths: List[Union[str, Path]]) -> List[Dict[str, Any]]:
        """
        Main detection function for meme misinformation
        """
        results = []
        
        for path in meme_paths:
            # Open image
            image = Image.open(str(path))
            
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
            
            result = {
                'meme_path': str(path),
                'extracted_text': extracted_text,
                'template_matches': template_results,
                'caption_analysis': caption_analysis,
                'visual_features': visual_features,
                'misinfo_score': combined_score,
                'confidence': min(1.0, combined_score + 0.2),  # Base confidence
                'is_misinfo': combined_score > 0.4  # Threshold for flagging
            }
            
            results.append(result)
            
        return results
    
    def generate_adversarial_samples(self, base_memes: List[Union[str, Path]], 
                                   num_samples: int = 5) -> List[Image.Image]:
        """
        Generate adversarial meme samples for training improvement
        """
        adversarial_memes = []
        
        for _ in range(num_samples):
            # Select a random base meme
            base_path = random.choice(base_memes)
            base_image = Image.open(str(base_path))
            
            # Create adversarial variants
            adversarial_variants = [
                self._add_fake_text_overlay(base_image),
                self._modify_colors(base_image),
                self._add_watermark(base_image),
                self._apply_blur_effect(base_image),
                self._add_border(base_image)
            ]
            
            # Randomly select one variant
            selected_variant = random.choice(adversarial_variants)
            adversarial_memes.append(selected_variant)
        
        return adversarial_memes
    
    def _add_fake_text_overlay(self, image: Image.Image) -> Image.Image:
        """Add fake text overlay to create adversarial sample"""
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
        
        return img_copy
    
    def _modify_colors(self, image: Image.Image) -> Image.Image:
        """Modify colors to create adversarial sample"""
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
        
        return Image.fromarray(img_array.astype(np.uint8))
    
    def _add_watermark(self, image: Image.Image) -> Image.Image:
        """Add watermark to create adversarial sample"""
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
        
        return img_copy
    
    def _apply_blur_effect(self, image: Image.Image) -> Image.Image:
        """Apply blur effect to create adversarial sample"""
        # Convert to numpy array
        img_array = np.array(image)
        
        # Apply Gaussian blur with random kernel size
        kernel_size = random.choice([3, 5, 7])
        if kernel_size % 2 == 0:
            kernel_size += 1  # Ensure odd kernel size
        
        blurred = cv2.GaussianBlur(img_array, (kernel_size, kernel_size), 0)
        return Image.fromarray(blurred)
    
    def _add_border(self, image: Image.Image) -> Image.Image:
        """Add border to create adversarial sample"""
        # Add a colored border
        border_color = (
            random.randint(0, 255),
            random.randint(0, 255),
            random.randint(0, 255)
        )
        
        border_width = random.randint(2, 10)
        return ImageOps.expand(image, border=border_width, fill=border_color)
    
    def update_model(self, training_memes: List[Union[str, Path]], labels: List[int]):
        """
        Update the model with new training data
        """
        # Extract text from all training memes
        training_texts = []
        for path in training_memes:
            image = Image.open(str(path))
            text = self.extract_text_from_image(image)
            training_texts.append(text)
        
        # Fit classifier on training data
        try:
            X = self.tfidf.fit_transform(training_texts)
            self.classifier.fit(X, labels)
        except:
            # If fitting fails, continue without updating
            pass
        
        # Generate adversarial samples and continue training
        adversarial_memes = self.generate_adversarial_samples(training_memes, num_samples=3)
        adversarial_labels = [1] * len(adversarial_memes)  # All adversarial memes are misinfo
        
        # In a real system, you would retrain the models here
        print(f"Updated model with {len(training_memes)} training memes and {len(adversarial_memes)} adversarial samples")


# Import ImageOps for the expand function
import PIL.ImageOps as ImageOps