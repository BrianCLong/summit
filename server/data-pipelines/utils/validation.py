"""
Data Validation Utilities for IntelGraph Pipelines
Schema validation, data quality checks, and deduplication
"""

from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime, date
from dataclasses import dataclass
import re
import hashlib
from enum import Enum

from pydantic import BaseModel, ValidationError, Field, validator
import pandas as pd

class ValidationSeverity(Enum):
    """Severity levels for validation issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

@dataclass
class ValidationIssue:
    """Represents a data validation issue"""
    field: str
    severity: ValidationSeverity
    message: str
    value: Any = None
    rule: str = None

@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    issues: List[ValidationIssue]
    metadata: Dict[str, Any]
    
    @property
    def error_count(self) -> int:
        return len([i for i in self.issues if i.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]])
    
    @property
    def warning_count(self) -> int:
        return len([i for i in self.issues if i.severity == ValidationSeverity.WARNING])

# Pydantic models for entity validation
class PersonModel(BaseModel):
    """Validation model for Person entities"""
    full_name: str = Field(..., min_length=2, max_length=100)
    email: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    phone: Optional[str] = Field(None, regex=r'^\+?[\d\s\-\(\)]{7,15}$')
    organization: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    
    @validator('email')
    def validate_email_domain(cls, v):
        if v:
            # Check for common typos in email domains
            suspicious_domains = ['gmial.com', 'yahoo.co', 'hotmial.com']
            domain = v.split('@')[1] if '@' in v else ''
            if domain in suspicious_domains:
                raise ValueError(f'Suspicious email domain: {domain}')
        return v

class OrganizationModel(BaseModel):
    """Validation model for Organization entities"""
    company_name: str = Field(..., min_length=2, max_length=200)
    domain: Optional[str] = Field(None, regex=r'^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    industry: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, regex=r'^https?://.+')
    
class LocationModel(BaseModel):
    """Validation model for Location entities"""
    address: str = Field(..., min_length=5, max_length=200)
    city: Optional[str] = Field(None, max_length=50)
    country: str = Field(..., min_length=2, max_length=50)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

class DataValidator:
    """
    Comprehensive data validator with schema validation, quality checks, and deduplication
    """
    
    def __init__(self):
        self.validation_models = {
            'person': PersonModel,
            'organization': OrganizationModel,
            'location': LocationModel
        }
        
        # Cache for deduplication
        self.entity_hashes: Set[str] = set()
        
        # Quality metrics
        self.quality_metrics = {
            'completeness_threshold': 0.8,  # 80% of fields should be non-null
            'uniqueness_threshold': 0.95,   # 95% of records should be unique
            'consistency_threshold': 0.9    # 90% of similar fields should match
        }
    
    def validate_record(self, 
                       record: Dict[str, Any], 
                       entity_type: str,
                       strict: bool = False) -> ValidationResult:
        """
        Validate a single record against schema and quality rules
        
        Args:
            record: The data record to validate
            entity_type: Type of entity (person, organization, location)
            strict: If True, treat warnings as errors
        
        Returns:
            ValidationResult with validation status and issues
        """
        issues = []
        metadata = {
            'entity_type': entity_type,
            'validation_timestamp': datetime.now().isoformat(),
            'record_hash': self._generate_record_hash(record)
        }
        
        # Schema validation using Pydantic
        if entity_type in self.validation_models:
            try:
                model = self.validation_models[entity_type](**record)
                metadata['schema_valid'] = True
            except ValidationError as e:
                metadata['schema_valid'] = False
                for error in e.errors():
                    field = '.'.join(str(loc) for loc in error['loc'])
                    severity = ValidationSeverity.ERROR if strict else ValidationSeverity.WARNING
                    issues.append(ValidationIssue(
                        field=field,
                        severity=severity,
                        message=error['msg'],
                        value=record.get(field),
                        rule='schema_validation'
                    ))
        
        # Data quality checks
        quality_issues = self._check_data_quality(record, entity_type)
        issues.extend(quality_issues)
        
        # Completeness check
        completeness_score = self._calculate_completeness(record)
        metadata['completeness_score'] = completeness_score
        
        if completeness_score < self.quality_metrics['completeness_threshold']:
            issues.append(ValidationIssue(
                field='__completeness__',
                severity=ValidationSeverity.WARNING,
                message=f'Record completeness {completeness_score:.2%} below threshold {self.quality_metrics["completeness_threshold"]:.2%}',
                rule='completeness_check'
            ))
        
        # Duplication check
        record_hash = metadata['record_hash']
        if record_hash in self.entity_hashes:
            issues.append(ValidationIssue(
                field='__duplicate__',
                severity=ValidationSeverity.WARNING,
                message='Potential duplicate record detected',
                rule='duplicate_check'
            ))
        else:
            self.entity_hashes.add(record_hash)
        
        # Determine overall validity
        error_count = len([i for i in issues if i.severity in [ValidationSeverity.ERROR, ValidationSeverity.CRITICAL]])
        is_valid = error_count == 0
        
        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            metadata=metadata
        )
    
    def validate_batch(self, 
                      records: List[Dict[str, Any]], 
                      entity_type: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """
        Validate a batch of records
        
        Returns:
            Tuple of (valid_records, invalid_records, batch_stats)
        """
        valid_records = []
        invalid_records = []
        all_issues = []
        
        for i, record in enumerate(records):
            result = self.validate_record(record, entity_type)
            
            if result.is_valid:
                # Add validation metadata to record
                record['_validation'] = {
                    'validated_at': result.metadata['validation_timestamp'],
                    'completeness_score': result.metadata.get('completeness_score', 0),
                    'issues': len(result.issues)
                }
                valid_records.append(record)
            else:
                # Add error details to invalid record
                record['_validation_errors'] = [
                    {
                        'field': issue.field,
                        'severity': issue.severity.value,
                        'message': issue.message
                    }
                    for issue in result.issues
                ]
                invalid_records.append(record)
            
            all_issues.extend(result.issues)
        
        # Calculate batch statistics
        batch_stats = self._calculate_batch_stats(all_issues, len(records))
        
        return valid_records, invalid_records, batch_stats
    
    def _check_data_quality(self, record: Dict[str, Any], entity_type: str) -> List[ValidationIssue]:
        """
        Perform entity-specific data quality checks
        """
        issues = []
        
        if entity_type == 'person':
            issues.extend(self._check_person_quality(record))
        elif entity_type == 'organization':
            issues.extend(self._check_organization_quality(record))
        elif entity_type == 'location':
            issues.extend(self._check_location_quality(record))
        
        return issues
    
    def _check_person_quality(self, record: Dict[str, Any]) -> List[ValidationIssue]:
        """Quality checks specific to person records"""
        issues = []
        
        # Check for reasonable name patterns
        full_name = record.get('full_name', '')
        if full_name:
            if len(full_name.split()) < 2:
                issues.append(ValidationIssue(
                    field='full_name',
                    severity=ValidationSeverity.WARNING,
                    message='Name appears to be incomplete (single word)',
                    value=full_name,
                    rule='name_completeness'
                ))
            
            # Check for unusual characters
            if re.search(r'[0-9]', full_name):
                issues.append(ValidationIssue(
                    field='full_name',
                    severity=ValidationSeverity.WARNING,
                    message='Name contains numbers',
                    value=full_name,
                    rule='name_pattern'
                ))
        
        # Email-domain consistency check
        email = record.get('email', '')
        organization = record.get('organization', '')
        if email and organization and '@' in email:
            email_domain = email.split('@')[1].lower()
            org_words = organization.lower().replace(' ', '').replace('.', '')
            
            # Simple heuristic for domain matching
            if org_words not in email_domain and email_domain not in org_words:
                if not any(common in email_domain for common in ['gmail', 'yahoo', 'hotmail', 'outlook']):
                    issues.append(ValidationIssue(
                        field='email',
                        severity=ValidationSeverity.INFO,
                        message=f'Email domain "{email_domain}" may not match organization "{organization}"',
                        rule='email_org_consistency'
                    ))
        
        return issues
    
    def _check_organization_quality(self, record: Dict[str, Any]) -> List[ValidationIssue]:
        """Quality checks specific to organization records"""
        issues = []
        
        company_name = record.get('company_name', '')
        domain = record.get('domain', '')
        website = record.get('website', '')
        
        # Check domain consistency
        if domain and website:
            if domain not in website:
                issues.append(ValidationIssue(
                    field='domain',
                    severity=ValidationSeverity.WARNING,
                    message='Domain does not match website URL',
                    rule='domain_website_consistency'
                ))
        
        # Check for generic/placeholder names
        generic_names = ['company', 'corporation', 'business', 'enterprise', 'test', 'example']
        if any(generic in company_name.lower() for generic in generic_names):
            issues.append(ValidationIssue(
                field='company_name',
                severity=ValidationSeverity.WARNING,
                message='Company name appears to be generic or placeholder',
                value=company_name,
                rule='generic_name_check'
            ))
        
        return issues
    
    def _check_location_quality(self, record: Dict[str, Any]) -> List[ValidationIssue]:
        """Quality checks specific to location records"""
        issues = []
        
        # Coordinate validation
        latitude = record.get('latitude')
        longitude = record.get('longitude')
        
        if (latitude is None) != (longitude is None):
            issues.append(ValidationIssue(
                field='coordinates',
                severity=ValidationSeverity.WARNING,
                message='Only one coordinate (lat/lng) provided',
                rule='coordinate_completeness'
            ))
        
        # Check for suspicious coordinates (e.g., 0,0)
        if latitude == 0 and longitude == 0:
            issues.append(ValidationIssue(
                field='coordinates',
                severity=ValidationSeverity.WARNING,
                message='Coordinates appear to be null island (0,0)',
                rule='coordinate_validity'
            ))
        
        return issues
    
    def _calculate_completeness(self, record: Dict[str, Any]) -> float:
        """
        Calculate completeness score for a record
        """
        if not record:
            return 0.0
        
        # Count non-null, non-empty values
        non_empty_count = 0
        total_fields = 0
        
        for key, value in record.items():
            # Skip internal metadata fields
            if key.startswith('_'):
                continue
                
            total_fields += 1
            
            if value is not None and str(value).strip():
                non_empty_count += 1
        
        return non_empty_count / total_fields if total_fields > 0 else 0.0
    
    def _generate_record_hash(self, record: Dict[str, Any]) -> str:
        """
        Generate a hash for duplicate detection
        """
        # Create a normalized version of the record for hashing
        normalized = {}
        
        for key, value in record.items():
            if key.startswith('_'):
                continue  # Skip metadata fields
                
            if isinstance(value, str):
                # Normalize strings: lowercase, strip whitespace, remove extra spaces
                normalized[key] = ' '.join(value.lower().split())
            else:
                normalized[key] = value
        
        # Sort keys for consistent hashing
        sorted_items = sorted(normalized.items())
        hash_string = str(sorted_items)
        
        return hashlib.md5(hash_string.encode()).hexdigest()
    
    def _calculate_batch_stats(self, issues: List[ValidationIssue], total_records: int) -> Dict[str, Any]:
        """
        Calculate statistics for a batch validation
        """
        issue_counts = {}
        for severity in ValidationSeverity:
            issue_counts[severity.value] = len([i for i in issues if i.severity == severity])
        
        rule_counts = {}
        for issue in issues:
            rule = issue.rule or 'unknown'
            rule_counts[rule] = rule_counts.get(rule, 0) + 1
        
        return {
            'total_records': total_records,
            'total_issues': len(issues),
            'issue_counts': issue_counts,
            'rule_counts': rule_counts,
            'validation_timestamp': datetime.now().isoformat()
        }
    
    def generate_quality_report(self, batch_stats: Dict[str, Any]) -> str:
        """
        Generate a human-readable data quality report
        """
        report = f"""
Data Quality Report
==================

Total Records: {batch_stats['total_records']}
Total Issues: {batch_stats['total_issues']}

Issue Breakdown:
{'-' * 20}
"""
        
        for severity, count in batch_stats['issue_counts'].items():
            if count > 0:
                report += f"  {severity.upper()}: {count}\n"
        
        report += f"""
Rule Violations:
{'-' * 20}
"""
        
        for rule, count in batch_stats['rule_counts'].items():
            report += f"  {rule}: {count}\n"
        
        report += f"""
Generated: {batch_stats['validation_timestamp']}
"""
        
        return report