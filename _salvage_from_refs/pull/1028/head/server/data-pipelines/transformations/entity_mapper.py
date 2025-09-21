"""
Entity Mapper for IntelGraph
Maps raw data records to IntelGraph Entity schema
"""

import uuid
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
from dataclasses import dataclass, field
import hashlib
import re

# New normalization functions
def normalize_name(value: Any) -> Optional[str]:
    """Normalize names for consistent ID generation"""
    if not value:
        return None
    name = str(value).lower().strip()
    name = re.sub(r'[^a-z0-9\s]', '', name) # Remove non-alphanumeric except spaces
    name = re.sub(r'\s+', ' ', name) # Replace multiple spaces with single
    return name

def normalize_address(value: Any) -> Optional[str]:
    """Normalize addresses for consistent ID generation"""
    if not value:
        return None
    address = str(value).lower().strip()
    address = re.sub(r'[.,#]', '', address) # Remove common punctuation
    address = re.sub(r'\s+', ' ', address) # Replace multiple spaces with single
    return address

@dataclass
class EntityMappingRule:
    """Configuration for mapping source fields to entity properties"""
    entity_type: str
    id_fields: List[str]  # Fields to use for generating entity ID
    label_field: str      # Field to use as entity label
    property_mappings: Dict[str, str]  # source_field -> entity_property
    filters: Dict[str, Any] = None     # Conditions for applying this rule
    transformations: Dict[str, Callable] = None  # Field transformations for properties
    id_field_normalizations: Dict[str, Callable] = field(default_factory=dict) # New: Normalizations for ID fields

class EntityMapper:
    """
    Maps raw data records to IntelGraph entity format
    Supports multiple entity types and flexible field mappings
    """
    
    def __init__(self, mapping_rules: List[EntityMappingRule]):
        self.mapping_rules = mapping_rules
        self.entity_cache = {}  # Cache for deduplication
        
    def transform_record(self, record: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Transform a single record into one or more entities
        Returns list of entities in IntelGraph format
        """
        entities = []
        
        for rule in self.mapping_rules:
            if self._record_matches_rule(record, rule):
                entity = self._apply_mapping_rule(record, rule)
                if entity:
                    entities.append(entity)
        
        return entities
    
    def transform_batch(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Transform a batch of records into entities
        Handles deduplication within the batch
        """
        all_entities = []
        entity_ids = set()
        
        for record in records:
            entities = self.transform_record(record)
            
            for entity in entities:
                entity_id = entity['id']
                if entity_id not in entity_ids:
                    all_entities.append(entity)
                    entity_ids.add(entity_id)
                else:
                    # Merge properties if entity already exists
                    existing_entity = next(e for e in all_entities if e['id'] == entity_id)
                    existing_entity['props'].update(entity['props'])
        
        return all_entities
    
    def _record_matches_rule(self, record: Dict[str, Any], rule: EntityMappingRule) -> bool:
        """
        Check if a record matches the filters for a mapping rule
        """
        if not rule.filters:
            return True
            
        for field, expected_value in rule.filters.items():
            record_value = record.get(field)
            
            if isinstance(expected_value, list):
                if record_value not in expected_value:
                    return False
            elif isinstance(expected_value, dict):
                # Handle complex filters like ranges, regex, etc.
                if 'regex' in expected_value:
                    if not record_value or not re.match(expected_value['regex'], str(record_value)):
                        return False
                elif 'range' in expected_value:
                    range_filter = expected_value['range']
                    if not (range_filter.get('min', float('-inf')) <= record_value <= range_filter.get('max', float('inf'))):
                        return False
            else:
                if record_value != expected_value:
                    return False
                    
        return True
    
    def _apply_mapping_rule(self, record: Dict[str, Any], rule: EntityMappingRule) -> Optional[Dict[str, Any]]:
        """
        Apply a mapping rule to create an entity from a record
        """
        try:
            # Generate entity ID from specified fields
            entity_id = self._generate_entity_id(record, rule.id_fields, rule.entity_type, rule.id_field_normalizations)
            
            # Get entity label
            label = self._get_field_value(record, rule.label_field)
            if not label:
                return None  # Skip entities without labels
            
            # Map properties
            props = {}
            for source_field, target_property in rule.property_mappings.items():
                value = self._get_field_value(record, source_field)
                if value is not None:
                    # Apply transformation if configured
                    if rule.transformations and source_field in rule.transformations:
                        value = rule.transformations[source_field](value)
                    props[target_property] = value
            
            # Add metadata
            props['_source'] = record.get('_ingestion', {}).get('source', 'unknown')
            props['_ingestion_timestamp'] = datetime.now().isoformat()
            
            # Create entity
            entity = {
                'id': entity_id,
                'type': rule.entity_type,
                'label': str(label),
                'props': props,
                'createdAt': datetime.now().isoformat(),
                'updatedAt': datetime.now().isoformat()
            }
            
            return entity
            
        except Exception as e:
            # Log error but continue processing
            print(f"Error applying mapping rule for entity type {rule.entity_type}: {e}")
            return None
    
    def _generate_entity_id(self, record: Dict[str, Any], id_fields: List[str], entity_type: str, normalizations: Dict[str, Callable]) -> str:
        """
        Generate a deterministic entity ID from specified fields with optional normalization
        """
        # Collect values from ID fields, applying normalization if specified
        id_components = []
        
        for field in id_fields:
            value = self._get_field_value(record, field)
            if value is not None:
                normalize_func = normalizations.get(field)
                if normalize_func:
                    value = normalize_func(value)
                if value is not None: # Check again after normalization
                    id_components.append(str(value))
        
        if not id_components:
            # Fallback to random UUID if no ID fields have values after normalization
            return str(uuid.uuid4())
        
        # Create deterministic ID by hashing the components
        id_string = f"{entity_type}:{'|'.join(id_components)}"
        id_hash = hashlib.sha256(id_string.encode()).hexdigest()[:16]
        
        return f"{entity_type.lower()}_{id_hash}"
    
    def _get_field_value(self, record: Dict[str, Any], field_path: str) -> Any:
        """
        Get field value supporting dot notation for nested fields
        """
        if not field_path:
            return None
            
        current = record
        for part in field_path.split('.'):
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                return None
                
        return current

# Predefined transformation functions (moved to top for clarity and reusability)
def clean_phone_number(value: Any) -> Optional[str]:
    """Clean and normalize phone numbers"""
    if not value:
        return None
    
    # Remove non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', str(value))
    
    # Basic validation
    if len(cleaned) < 7:
        return None
        
    return cleaned

def normalize_email(value: Any) -> Optional[str]:
    """Normalize email addresses"""
    if not value:
        return None
    
    email = str(value).lower().strip()
    
    # Basic email validation
    if '@' not in email or '.' not in email:
        return None
        
    return email
    
def parse_date(value: Any) -> Optional[str]:
    """Parse various date formats to ISO format"""
    if not value:
        return None
    
    try:
        from dateutil import parser
        parsed_date = parser.parse(str(value))
        return parsed_date.isoformat()
    except:
        return None

def normalize_country(value: Any) -> Optional[str]:
    """Normalize country names"""
    if not value:
        return None
    
    country = str(value).strip().title()
    
    # Common country name mappings
    country_mappings = {
        'Us': 'United States',
        'Usa': 'United States', 
        'United States Of America': 'United States',
        'Uk': 'United Kingdom',
        'Britain': 'United Kingdom',
        'Great Britain': 'United Kingdom'
    }
    
    return country_mappings.get(country, country)

# Example mapping rules
PERSON_MAPPING = EntityMappingRule(
    entity_type='PERSON',
    id_fields=['email', 'full_name'],
    label_field='full_name',
    property_mappings={
        'email': 'email',
        'phone': 'phone',
        'company': 'organization',
        'title': 'job_title',
        'location': 'location',
        'linkedin_url': 'linkedin_profile'
    },
    filters={'type': 'person'},
    transformations={
        'email': normalize_email,
        'phone': clean_phone_number
    },
    id_field_normalizations={
        'email': normalize_email,
        'full_name': normalize_name
    }
)

ORGANIZATION_MAPPING = EntityMappingRule(
    entity_type='ORGANIZATION',
    id_fields=['company_name', 'domain'],
    label_field='company_name',
    property_mappings={
        'company_name': 'name',
        'domain': 'domain',
        'industry': 'industry',
        'size': 'company_size',
        'website': 'website',
        'headquarters': 'location'
    },
    filters={'type': 'organization'},
    id_field_normalizations={
        'company_name': normalize_name, # Using name normalization for company names too
        'domain': lambda x: str(x).lower().strip() # Simple lowercase for domain
    }
)

LOCATION_MAPPING = EntityMappingRule(
    entity_type='LOCATION',
    id_fields=['address', 'city', 'country'],
    label_field='address',
    property_mappings={
        'address': 'address',
        'city': 'city',
        'state': 'state',
        'country': 'country',
        'postal_code': 'postal_code',
        'latitude': 'latitude',
        'longitude': 'longitude'
    },
    filters={'type': 'location'},
    transformations={
        'country': normalize_country
    },
    id_field_normalizations={
        'address': normalize_address,
        'city': normalize_name, # Simple name normalization for city
        'country': normalize_country
    }
)
