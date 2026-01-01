"""
Integration Module for Adversarial Misinformation Defense Platform

This module provides integration capabilities with other Summit platform components,
including API endpoints, authentication, data sharing, and monitoring.
"""

import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, Union
from pathlib import Path
import time
import requests
from datetime import datetime

try:
    import jwt
    JWT_AVAILABLE = True
except ImportError:
    JWT_AVAILABLE = False

# Import platform components
from adversarial_misinfo_defense import (
    create_platform,
    create_enhanced_platform,
    AdversarialMisinfoDetector,
    EnsembleDetector,
    SecureInputValidator
)


class SummitIntegration:
    """
    Integration framework for connecting the Adversarial Misinformation Defense Platform
    with other Summit platform components
    """
    
    def __init__(self, 
                 summit_api_base_url: str = "http://localhost:8080/api",
                 auth_token: Optional[str] = None):
        """
        Initialize Summit integration
        
        Args:
            summit_api_base_url: Base URL for Summit API
            auth_token: Authentication token for Summit API
        """
        self.summit_api_base_url = summit_api_base_url
        self.auth_token = auth_token
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Initialize platform
        self.platform = create_platform()
        self.enhanced_platform = create_enhanced_platform()
        self.validator = SecureInputValidator()
        
        # Session for API calls
        self.session = requests.Session()
        if self.auth_token:
            self.session.headers.update({
                'Authorization': f'Bearer {self.auth_token}',
                'Content-Type': 'application/json'
            })
    
    def connect_to_summit_services(self) -> bool:
        """
        Connect to Summit platform services
        
        Returns:
            True if connection is successful
        """
        try:
            # Test connection to Summit API
            response = self.session.get(f"{self.summit_api_base_url}/health")
            if response.status_code == 200:
                self.logger.info("Successfully connected to Summit platform")
                return True
            else:
                self.logger.error(f"Failed to connect to Summit: {response.status_code}")
                return False
        except Exception as e:
            self.logger.error(f"Error connecting to Summit: {str(e)}")
            return False
    
    def analyze_content_with_summit_context(self, 
                                          content: Dict[str, Any], 
                                          context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Analyze content with Summit context information
        
        Args:
            content: Content to analyze
            context: Additional context from Summit platform
            
        Returns:
            Dictionary with analysis results including Summit context
        """
        # Validate content first
        validation_result = self.validate_content(content)
        if not validation_result['is_valid']:
            return {
                'error': 'Invalid content',
                'issues': validation_result['issues'],
                'timestamp': datetime.now().isoformat()
            }
        
        # Perform detection
        detector = self.platform['detector']
        detection_results = detector.detect(content)
        
        # If context is provided, enrich the results
        if context:
            detection_results['summit_context'] = context
            
            # Add information from Summit if available
            if 'source_reputation' in context:
                detection_results['source_reputation_score'] = context['source_reputation']
            
            if 'temporal_context' in context:
                detection_results['temporal_relevance'] = context['temporal_context']
        
        # Add integration metadata
        detection_results['integration_info'] = {
            'platform': 'adversarial-misinfo-defense',
            'version': '1.0.0',
            'integration_timestamp': datetime.now().isoformat(),
            'summit_api_base_url': self.summit_api_base_url
        }
        
        return detection_results
    
    def validate_content(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate content using platform's secure validation
        
        Args:
            content: Content to validate
            
        Returns:
            Validation results
        """
        results = {
            'is_valid': True,
            'issues': [],
            'validated_content': content
        }
        
        # Validate different content types if present
        if 'text' in content and content['text']:
            text_validation = self.validator.validate_text_input(content['text'])
            if not text_validation['is_valid']:
                results['is_valid'] = False
                results['issues'].extend(text_validation['issues'])
        
        if 'image_path' in content and content['image_path']:
            image_validation = self.validator.validate_file_path(
                content['image_path'], 
                ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
            )
            if not image_validation['is_valid']:
                results['is_valid'] = False
                results['issues'].extend(image_validation['issues'])
        
        if 'audio_path' in content and content['audio_path']:
            audio_validation = self.validator.validate_file_path(
                content['audio_path'], 
                ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a']
            )
            if not audio_validation['is_valid']:
                results['is_valid'] = False
                results['issues'].extend(audio_validation['issues'])
        
        # Sanitize the content
        results['validated_content'] = self.validator.sanitize_output(content)
        
        return results
    
    def send_detection_results_to_summit(self, 
                                       detection_results: Dict[str, Any], 
                                       collection_id: str = None) -> Dict[str, Any]:
        """
        Send detection results to Summit for storage and further processing
        
        Args:
            detection_results: Results from content analysis
            collection_id: Optional collection ID for grouping results
            
        Returns:
            API response from Summit
        """
        try:
            # Prepare payload
            payload = {
                'source_platform': 'adversarial-misinfo-defense',
                'detection_results': detection_results,
                'collection_id': collection_id,
                'timestamp': datetime.now().isoformat()
            }
            
            # Send to Summit
            response = self.session.post(
                f"{self.summit_api_base_url}/detections", 
                json=payload
            )
            
            if response.status_code in [200, 201]:
                self.logger.info("Detection results successfully sent to Summit")
                return {
                    'success': True,
                    'response': response.json(),
                    'status_code': response.status_code
                }
            else:
                self.logger.error(f"Failed to send results to Summit: {response.status_code}")
                return {
                    'success': False,
                    'error': response.text,
                    'status_code': response.status_code
                }
                
        except Exception as e:
            self.logger.error(f"Error sending results to Summit: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def retrieve_context_from_summit(self, 
                                   entity_ids: List[str], 
                                   context_types: List[str] = None) -> Dict[str, Any]:
        """
        Retrieve context information from Summit platform
        
        Args:
            entity_ids: IDs of entities to get context for
            context_types: Types of context to retrieve (e.g., reputation, history)
            
        Returns:
            Context information from Summit
        """
        try:
            params = {
                'entity_ids': entity_ids,
                'context_types': context_types or ['reputation', 'history', 'authenticity']
            }
            
            response = self.session.get(
                f"{self.summit_api_base_url}/context", 
                params=params
            )
            
            if response.status_code == 200:
                context_data = response.json()
                self.logger.info(f"Retrieved context for {len(entity_ids)} entities")
                return context_data
            else:
                self.logger.error(f"Failed to retrieve context: {response.status_code}")
                return {}
                
        except Exception as e:
            self.logger.error(f"Error retrieving context from Summit: {str(e)}")
            return {}
    
    def register_platform_with_summit(self) -> Dict[str, Any]:
        """
        Register this platform instance with Summit
        
        Returns:
            Registration result
        """
        try:
            payload = {
                'platform_name': 'adversarial-misinfo-defense',
                'version': '1.0.0',
                'capabilities': [
                    'text_detection',
                    'image_detection', 
                    'audio_detection',
                    'video_detection',
                    'meme_detection',
                    'deepfake_detection',
                    'ensemble_detection',
                    'adaptive_learning',
                    'real_time_processing'
                ],
                'api_endpoint': f"{self.summit_api_base_url}/adversarial-misinfo-defense",
                'health_check_endpoint': f"{self.summit_api_base_url}/health",
                'timestamp': datetime.now().isoformat()
            }
            
            response = self.session.post(
                f"{self.summit_api_base_url}/platforms/register", 
                json=payload
            )
            
            if response.status_code in [200, 201]:
                registration_data = response.json()
                self.logger.info("Platform successfully registered with Summit")
                return {
                    'success': True,
                    'registration_data': registration_data,
                    'status_code': response.status_code
                }
            else:
                self.logger.error(f"Failed to register platform: {response.status_code}")
                return {
                    'success': False,
                    'error': response.text,
                    'status_code': response.status_code
                }
                
        except Exception as e:
            self.logger.error(f"Error registering platform with Summit: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def async_analyze_content_stream(self, 
                                         content_stream: List[Dict[str, Any]], 
                                         batch_size: int = 10) -> List[Dict[str, Any]]:
        """
        Asynchronously analyze a stream of content with Summit integration
        
        Args:
            content_stream: List of content items to analyze
            batch_size: Size of each processing batch
            
        Returns:
            List of analysis results
        """
        results = []
        
        for i in range(0, len(content_stream), batch_size):
            batch = content_stream[i:i+batch_size]
            batch_results = []
            
            for content in batch:
                # Analyze content
                result = self.analyze_content_with_summit_context(content)
                batch_results.append(result)
                
                # Send to Summit for storage (non-blocking)
                asyncio.create_task(
                    self._send_result_async(result)
                )
            
            results.extend(batch_results)
            await asyncio.sleep(0.1)  # Small delay to prevent overwhelming
        
        return results
    
    async def _send_result_async(self, result: Dict[str, Any]):
        """
        Internal method to send results to Summit asynchronously
        """
        try:
            # This would be an actual async call in a real implementation
            # For now, we'll use the sync method in a coroutine
            return self.send_detection_results_to_summit(result)
        except Exception as e:
            self.logger.error(f"Error in async send: {str(e)}")


class SummitAPIAdapter:
    """
    Adapter class for making the platform's API compatible with Summit's expectations
    """
    
    def __init__(self, integration: SummitIntegration):
        """
        Initialize API adapter
        
        Args:
            integration: Summit integration instance
        """
        self.integration = integration
        self.logger = logging.getLogger(__name__)
        
    def format_detection_output_for_summit(self, 
                                         detection_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format detection results to match Summit platform expectations
        
        Args:
            detection_results: Raw detection results
            
        Returns:
            Formatted results for Summit
        """
        formatted = {
            'platform': 'adversarial-misinfo-defense',
            'version': '1.0.0',
            'detection_id': detection_results.get('detection_id', 
                                                f"amd_{int(time.time())}_{hash(str(detection_results)) % 10000}"),
            'timestamp': detection_results.get('timestamp', datetime.now().isoformat()),
            'risk_score': detection_results.get('overall_risk', 0.0),
            'confidence': detection_results.get('confidence', 0.0),
            'verdict': detection_results.get('final_verdict', 'unknown'),
            'explanation': detection_results.get('explanation', ''),
            'modality_results': self._format_modality_results(
                detection_results.get('modality_results', {})
            ),
            'metadata': {
                'processing_time': detection_results.get('processing_time', 0.0),
                'model_version': 'ensemble-1.0',
                'algorithm_used': 'multi_modal_ensemble'
            }
        }
        
        # Add any Summit-specific context that was included
        if 'summit_context' in detection_results:
            formatted['summit_context'] = detection_results['summit_context']
        
        return formatted
    
    def _format_modality_results(self, modality_results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format modality-specific results for Summit
        
        Args:
            modality_results: Raw modality results
            
        Returns:
            Formatted modality results
        """
        formatted = {}
        
        for modality, result in modality_results.items():
            formatted[modality] = {
                'risk_score': result.get('score', 0.0),
                'confidence': result.get('confidence', 0.0),
                'verdict': result.get('verdict', 'benign'),
                'details': result.get('details', {}),
                'processing_time': result.get('processing_time', 0.0)
            }
        
        return formatted
    
    def validate_summit_request(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate incoming requests from Summit platform
        
        Args:
            request_data: Request data from Summit
            
        Returns:
            Validation results
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'sanitized_data': request_data
        }
        
        # Check required fields
        required_fields = ['content']
        for field in required_fields:
            if field not in request_data:
                validation_result['is_valid'] = False
                validation_result['errors'].append(f"Missing required field: {field}")
        
        # Validate content structure
        if 'content' in request_data:
            content = request_data['content']
            if not isinstance(content, dict):
                validation_result['is_valid'] = False
                validation_result['errors'].append("Content must be a dictionary")
            
            # Validate specific content types if present
            if 'text' in content and not isinstance(content['text'], str):
                validation_result['is_valid'] = False
                validation_result['errors'].append("Text content must be a string")
        
        # Sanitize the request data
        validation_result['sanitized_data'] = self.integration.validator.sanitize_output(request_data)
        
        return validation_result


class CognitiveDefenseIntegrator:
    """
    Specialized integrator for connecting with Summit's cognitive defense capabilities
    """
    
    def __init__(self, integration: SummitIntegration):
        """
        Initialize cognitive defense integrator
        
        Args:
            integration: Summit integration instance
        """
        self.integration = integration
        self.logger = logging.getLogger(__name__)
        
    def assess_cognitive_attack_surface(self, 
                                      content: Dict[str, Any], 
                                      context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Assess content for cognitive attack patterns beyond just misinformation
        
        Args:
            content: Content to assess
            context: Additional context information
            
        Returns:
            Assessment results including cognitive attack vectors
        """
        # First run standard misinformation detection
        standard_results = self.integration.analyze_content_with_summit_context(content, context)
        
        # Enhance with cognitive attack assessment
        cognitive_results = {
            'cognitive_attack_indicators': {
                'emotional_manipulation': self._assess_emotional_manipulation(content),
                'cognitive_bias_exploitation': self._assess_bias_exploitation(content),
                'narrative_injection': self._assess_narrative_injection(content),
                'social_proof_manipulation': self._assess_social_proof_manipulation(content),
                'authority_exploitation': self._assess_authority_exploitation(content)
            },
            'cognitive_risk_score': 0.0,
            'recommended_interventions': []
        }
        
        # Calculate overall cognitive risk
        cognitive_indicators = cognitive_results['cognitive_attack_indicators']
        indicator_scores = [v.get('score', 0) for v in cognitive_indicators.values()]
        cognitive_results['cognitive_risk_score'] = sum(indicator_scores) / len(indicator_scores) if indicator_scores else 0.0
        
        # Suggest interventions based on detected patterns
        cognitive_results['recommended_interventions'] = self._recommend_interventions(cognitive_indicators)
        
        # Combine with standard results
        combined_results = standard_results.copy()
        combined_results['cognitive_assessment'] = cognitive_results
        
        # Update overall risk if cognitive risk is higher
        if cognitive_results['cognitive_risk_score'] > combined_results.get('overall_risk', 0.0):
            combined_results['overall_risk'] = cognitive_results['cognitive_risk_score']
            combined_results['final_verdict'] = 'malicious' if cognitive_results['cognitive_risk_score'] > 0.7 else (
                'suspicious' if cognitive_results['cognitive_risk_score'] > 0.4 else 'benign'
            )
            combined_results['explanation'] = f"Cognitive attack detected: {combined_results['explanation']}"
        
        return combined_results
    
    def _assess_emotional_manipulation(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess content for emotional manipulation patterns
        """
        score = 0.0
        indicators = []
        
        if 'text' in content and content['text']:
            text = content['text'].lower()
            
            # Look for emotional manipulation keywords/phrases
            emotional_patterns = [
                'shocking', 'unbelievable', 'you won\'t believe', 'incredible',
                'urgent', 'act now', 'limited time', 'everyone\'s talking about',
                'can\'t handle the truth', 'jaw-dropping', 'incredible discovery'
            ]
            
            found_patterns = [p for p in emotional_patterns if p in text]
            score = min(len(found_patterns) * 0.15, 1.0)
            
            if found_patterns:
                indicators.extend(found_patterns)
        
        return {
            'score': score,
            'indicators': indicators,
            'description': 'Content uses emotional triggers to manipulate response'
        }
    
    def _assess_bias_exploitation(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess content for cognitive bias exploitation
        """
        score = 0.0
        indicators = []
        
        if 'text' in content and content['text']:
            text = content['text'].lower()
            
            # Look for bias exploitation patterns
            bias_patterns = [
                'studies show', 'research proves', 'experts say', 'everyone knows',
                'it\'s obvious', 'clearly', 'of course', 'naturally',
                'nobody considers', 'ignored by mainstream'
            ]
            
            found_patterns = [p for p in bias_patterns if p in text]
            score = min(len(found_patterns) * 0.12, 1.0)
            
            if found_patterns:
                indicators.extend(found_patterns)
        
        return {
            'score': score,
            'indicators': indicators,
            'description': 'Content exploits cognitive biases to establish credibility'
        }
    
    def _assess_narrative_injection(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess content for narrative injection patterns
        """
        score = 0.0
        indicators = []
        
        if 'text' in content and content['text']:
            text = content['text']
            
            # Look for narrative patterns
            narrative_patterns = [
                'the real story', 'hidden truth', 'what they don\'t want you to know',
                'inside sources', 'leaked documents', 'whistleblower reveals',
                'conspiracy', 'cover-up', 'secret agenda'
            ]
            
            found_patterns = [p for p in narrative_patterns if p.lower() in text.lower()]
            score = min(len(found_patterns) * 0.18, 1.0)
            
            if found_patterns:
                indicators.extend(found_patterns)
        
        return {
            'score': score,
            'indicators': indicators,
            'description': 'Content introduces alternative narratives to redirect thinking'
        }
    
    def _assess_social_proof_manipulation(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess content for social proof manipulation
        """
        score = 0.0
        indicators = []
        
        if 'text' in content and content['text']:
            text = content['text']
            
            # Look for social proof manipulation
            social_proof_patterns = [
                'millions agree', 'everyone is saying', 'trending now',
                'viral sensation', 'goes against popular opinion',
                'unpopular truth', 'most people don\'t realize'
            ]
            
            found_patterns = [p for p in social_proof_patterns if p.lower() in text.lower()]
            score = min(len(found_patterns) * 0.14, 1.0)
            
            if found_patterns:
                indicators.extend(found_patterns)
        
        return {
            'score': score,
            'indicators': indicators,
            'description': 'Content manipulates social proof to establish validity'
        }
    
    def _assess_authority_exploitation(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess content for authority exploitation
        """
        score = 0.0
        indicators = []
        
        if 'text' in content and content['text']:
            text = content['text']
            
            # Look for authority exploitation
            authority_patterns = [
                'expert', 'doctor', 'professor', 'scientist', 'study shows',
                'research indicates', 'academic', 'published in', 'peer reviewed',
                'credentials', 'institute', 'university', 'laboratory'
            ]
            
            found_patterns = [p for p in authority_patterns if p.lower() in text.lower()]
            score = min(len(found_patterns) * 0.1, 1.0)
            
            if found_patterns:
                indicators.extend(found_patterns)
        
        return {
            'score': score,
            'indicators': indicators,
            'description': 'Content exploits authority to establish credibility'
        }
    
    def _recommend_interventions(self, cognitive_indicators: Dict[str, Any]) -> List[str]:
        """
        Recommend interventions based on detected cognitive attack patterns
        
        Args:
            cognitive_indicators: Dictionary of cognitive attack indicators
            
        Returns:
            List of recommended interventions
        """
        interventions = []
        
        for indicator_type, data in cognitive_indicators.items():
            if data['score'] > 0.5:  # Above threshold
                if indicator_type == 'emotional_manipulation':
                    interventions.append('Provide factual information without emotional framing')
                    interventions.append('Warn users about emotional manipulation techniques')
                elif indicator_type == 'cognitive_bias_exploitation':
                    interventions.append('Provide context that counters biased reasoning')
                    interventions.append('Educate about common cognitive biases')
                elif indicator_type == 'narrative_injection':
                    interventions.append('Present alternative narratives based on evidence')
                    interventions.append('Question the source and validity of the narrative')
                elif indicator_type == 'social_proof_manipulation':
                    interventions.append('Verify social proof claims independently')
                    interventions.append('Provide actual statistics or evidence')
                elif indicator_type == 'authority_exploitation':
                    interventions.append('Verify credentials and affiliations of cited authorities')
                    interventions.append('Check if sources are properly cited and reputable')
        
        return interventions


def create_summit_integration(api_base_url: str = "http://localhost:8080/api", 
                             auth_token: str = None) -> SummitIntegration:
    """
    Create and initialize a Summit integration instance
    
    Args:
        api_base_url: Base URL for Summit API
        auth_token: Authentication token for Summit API
    
    Returns:
        Initialized Summit integration instance
    """
    integration = SummitIntegration(api_base_url, auth_token)
    
    # Attempt to connect and register
    if integration.connect_to_summit_services():
        registration_result = integration.register_platform_with_summit()
        if registration_result.get('success'):
            logging.info("Platform successfully connected and registered with Summit")
        else:
            logging.warning("Platform connected but registration failed")
    else:
        logging.error("Failed to connect to Summit services")
    
    return integration


if __name__ == "__main__":
    # Example usage of Summit integration
    print("Initializing Summit integration...")
    
    # Create integration instance (using placeholder URL for demo)
    integration = SummitIntegration(
        summit_api_base_url="http://summit-api.local/api",
        auth_token="demo-token"
    )
    
    # Example content to analyze
    demo_content = {
        "text": "SHOCKING: Scientists have discovered that drinking water can cause immediate death!",
        "source_url": "http://fakescience.example.com"
    }
    
    # Analyze with Summit context (simulated)
    context = {
        "source_reputation": 0.2,
        "temporal_context": "Part of coordinated disinformation campaign",
        "previous_reports": ["similar_fake_news_1", "similar_fake_news_2"]
    }
    
    print("\nAnalyzing content with Summit context...")
    results = integration.analyze_content_with_summit_context(demo_content, context)
    print(f"Detection results: {json.dumps(results, indent=2)}")
    
    # Create cognitive defense integrator
    cognitive_integrator = CognitiveDefenseIntegrator(integration)
    
    print("\nPerforming cognitive attack assessment...")
    cognitive_results = cognitive_integrator.assess_cognitive_attack_surface(demo_content, context)
    print(f"Cognitive assessment: {json.dumps(cognitive_results, indent=2)}")
    
    print("\nSummit integration example completed!")