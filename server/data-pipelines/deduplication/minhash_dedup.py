"""
MinHash-based Deduplication System
Uses LSH (Locality Sensitive Hashing) for efficient duplicate detection across batches
"""

import hashlib
import pickle
import json
import numpy as np
from typing import Dict, List, Any, Optional, Set, Tuple, Union
from dataclasses import dataclass
from collections import defaultdict
from datetime import datetime
import redis
from pathlib import Path

try:
    from datasketch import MinHashLSH, MinHash
    DATASKETCH_AVAILABLE = True
except ImportError:
    DATASKETCH_AVAILABLE = False

from ..utils.logging import get_logger

@dataclass
class DuplicateGroup:
    """Represents a group of duplicate records"""
    canonical_id: str
    duplicate_ids: List[str]
    similarity_scores: Dict[str, float]
    confidence: float
    created_at: datetime

@dataclass
class DeduplicationResult:
    """Result of deduplication process"""
    total_records: int
    unique_records: int
    duplicate_groups: List[DuplicateGroup]
    processing_time_seconds: float
    deduplication_rate: float

class MinHashDeduplicator:
    """
    MinHash-based deduplicator for cross-batch duplicate detection
    """
    
    def __init__(self, 
                 num_perm: int = 128,
                 threshold: float = 0.8,
                 storage_backend: str = "redis",
                 redis_url: Optional[str] = None):
        
        if not DATASKETCH_AVAILABLE:
            raise ImportError("datasketch is required for MinHash deduplication. Install with: pip install datasketch")
        
        self.num_perm = num_perm
        self.threshold = threshold
        self.storage_backend = storage_backend
        self.logger = get_logger('minhash-deduplicator')
        
        # Initialize LSH index
        self.lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
        
        # Storage backend for persistence
        if storage_backend == "redis":
            self.redis_client = redis.from_url(redis_url or "redis://localhost:6379/0")
            self._load_from_redis()
        elif storage_backend == "file":
            self.storage_path = Path("minhash_index.pkl")
            self._load_from_file()
        
        self.record_hashes: Dict[str, str] = {}
        
    def _create_minhash(self, record: Dict[str, Any], include_fields: Optional[List[str]] = None) -> MinHash:
        """Create MinHash from record fields"""
        minhash = MinHash(num_perm=self.num_perm)
        
        # Normalize record for hashing
        normalized_record = self._normalize_record(record, include_fields)
        
        # Create shingles (n-grams) from normalized text
        shingles = self._create_shingles(normalized_record)
        
        for shingle in shingles:
            minhash.update(shingle.encode('utf8'))
        
        return minhash
    
    def _normalize_record(self, record: Dict[str, Any], include_fields: Optional[List[str]] = None) -> str:
        """Normalize record to a canonical string representation"""
        fields_to_include = include_fields or list(record.keys())
        
        # Filter and normalize fields
        normalized_parts = []
        for field in sorted(fields_to_include):  # Sort for consistency
            if field in record and not field.startswith('_'):
                value = record[field]
                if value is not None:
                    # Normalize string values
                    if isinstance(value, str):
                        # Remove extra whitespace, lowercase, remove punctuation
                        normalized = ' '.join(value.lower().split())
                        normalized = ''.join(c for c in normalized if c.isalnum() or c.isspace())
                        normalized_parts.append(f"{field}:{normalized}")
                    else:
                        normalized_parts.append(f"{field}:{str(value).lower()}")
        
        return ' '.join(normalized_parts)
    
    def _create_shingles(self, text: str, k: int = 3) -> Set[str]:
        """Create k-shingles from text"""
        words = text.split()
        shingles = set()
        
        # Word-level shingles
        for i in range(len(words) - k + 1):
            shingle = ' '.join(words[i:i + k])
            shingles.add(shingle)
        
        # Character-level shingles for short text
        if len(words) < k:
            for i in range(len(text) - k + 1):
                shingle = text[i:i + k]
                shingles.add(shingle)
        
        return shingles if shingles else {text}
    
    def add_record(self, record_id: str, record: Dict[str, Any], include_fields: Optional[List[str]] = None):
        """Add a record to the deduplication index"""
        minhash = self._create_minhash(record, include_fields)
        
        # Store record hash for retrieval
        record_hash = hashlib.sha256(json.dumps(record, sort_keys=True).encode()).hexdigest()
        self.record_hashes[record_id] = record_hash
        
        # Add to LSH index
        self.lsh.insert(record_id, minhash)
        
        # Persist if using storage backend
        if self.storage_backend == "redis":
            self._save_to_redis(record_id, minhash, record_hash)
        
        self.logger.debug(f"Added record {record_id} to deduplication index")
    
    def find_duplicates(self, record_id: str, record: Dict[str, Any], include_fields: Optional[List[str]] = None) -> List[str]:
        """Find duplicate records for a given record"""
        minhash = self._create_minhash(record, include_fields)
        
        # Query LSH index
        candidates = self.lsh.query(minhash)
        
        # Remove self if present
        candidates = [c for c in candidates if c != record_id]
        
        return candidates
    
    def deduplicate_batch(self, 
                         records: List[Dict[str, Any]], 
                         id_field: str = 'id',
                         include_fields: Optional[List[str]] = None) -> DeduplicationResult:
        """Deduplicate a batch of records"""
        start_time = datetime.now()
        
        duplicate_groups = []
        processed_ids = set()
        unique_records = 0
        
        for record in records:
            record_id = record.get(id_field)
            if not record_id or record_id in processed_ids:
                continue
            
            # Find duplicates for this record
            duplicates = self.find_duplicates(record_id, record, include_fields)
            
            if duplicates:
                # Create duplicate group
                similarity_scores = {}
                record_minhash = self._create_minhash(record, include_fields)
                
                for dup_id in duplicates:
                    if dup_id in self.record_hashes:
                        # Calculate similarity score
                        try:
                            dup_minhash = self._get_minhash_from_storage(dup_id)
                            if dup_minhash:
                                similarity = record_minhash.jaccard(dup_minhash)
                                similarity_scores[dup_id] = similarity
                        except Exception as e:
                            self.logger.warning(f"Could not calculate similarity for {dup_id}: {e}")
                
                group = DuplicateGroup(
                    canonical_id=record_id,
                    duplicate_ids=duplicates,
                    similarity_scores=similarity_scores,
                    confidence=max(similarity_scores.values()) if similarity_scores else 0.0,
                    created_at=datetime.now()
                )
                
                duplicate_groups.append(group)
                processed_ids.update([record_id] + duplicates)
            else:
                unique_records += 1
                processed_ids.add(record_id)
            
            # Add record to index for future batches
            self.add_record(record_id, record, include_fields)
        
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        # Calculate deduplication statistics
        total_duplicates = sum(len(group.duplicate_ids) for group in duplicate_groups)
        deduplication_rate = total_duplicates / len(records) if records else 0
        
        result = DeduplicationResult(
            total_records=len(records),
            unique_records=unique_records,
            duplicate_groups=duplicate_groups,
            processing_time_seconds=processing_time,
            deduplication_rate=deduplication_rate
        )
        
        self.logger.info(
            f"Deduplicated batch: {len(records)} records, "
            f"{len(duplicate_groups)} duplicate groups, "
            f"{deduplication_rate:.2%} duplication rate"
        )
        
        return result
    
    def get_canonical_record(self, duplicate_group: DuplicateGroup, records: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Get the canonical record from a duplicate group"""
        canonical_record = records.get(duplicate_group.canonical_id)
        
        if not canonical_record:
            return {}
        
        # Merge information from duplicates (optional enhancement)
        merged_record = canonical_record.copy()
        
        # Add deduplication metadata
        merged_record['_deduplication'] = {
            'canonical_id': duplicate_group.canonical_id,
            'duplicate_ids': duplicate_group.duplicate_ids,
            'confidence': duplicate_group.confidence,
            'deduplicated_at': duplicate_group.created_at.isoformat()
        }
        
        return merged_record
    
    def _save_to_redis(self, record_id: str, minhash: MinHash, record_hash: str):
        """Save MinHash to Redis"""
        try:
            minhash_key = f"minhash:{record_id}"
            hash_key = f"record_hash:{record_id}"
            
            # Serialize MinHash
            minhash_data = json.dumps({'hashvalues': minhash.hashvalues.tolist()}).encode('utf-8')
            
            self.redis_client.set(minhash_key, minhash_data, ex=86400 * 30)  # 30 days TTL
            self.redis_client.set(hash_key, record_hash, ex=86400 * 30)
            
        except Exception as e:
            self.logger.warning(f"Failed to save to Redis: {e}")
    
    def _load_from_redis(self):
        """Load existing MinHashes from Redis"""
        try:
            # Get all existing MinHash keys
            minhash_keys = self.redis_client.keys("minhash:*")
            
            for key in minhash_keys:
                record_id = key.decode().split(':', 1)[1]
                
                # Load MinHash
                minhash_data = self.redis_client.get(key)
                if minhash_data:
                    minhash_json = json.loads(minhash_data)
                    minhash = MinHash(num_perm=self.num_perm, hashvalues=minhash_json['hashvalues'])
                    self.lsh.insert(record_id, minhash)
                
                # Load record hash
                hash_key = f"record_hash:{record_id}"
                record_hash = self.redis_client.get(hash_key)
                if record_hash:
                    self.record_hashes[record_id] = record_hash.decode()
            
            self.logger.info(f"Loaded {len(minhash_keys)} records from Redis")
            
        except Exception as e:
            self.logger.warning(f"Failed to load from Redis: {e}")
    
    def _get_minhash_from_storage(self, record_id: str) -> Optional[MinHash]:
        """Get MinHash from storage backend"""
        if self.storage_backend == "redis":
            try:
                minhash_key = f"minhash:{record_id}"
                minhash_data = self.redis_client.get(minhash_key)
                if minhash_data:
                    minhash_json = json.loads(minhash_data)
                    return MinHash(num_perm=self.num_perm, hashvalues=minhash_json['hashvalues'])
            except Exception as e:
                self.logger.warning(f"Failed to load MinHash for {record_id}: {e}")
        
        return None
    
    def _save_to_file(self):
        """Save LSH index to file"""
        try:
            import hashlib
            import os
            secret_key = os.environ.get('SUMMIT_SIGNING_KEY')
            if not secret_key:
                self.logger.error("SUMMIT_SIGNING_KEY environment variable not set. Cannot save to file.")
                return

            data_to_pickle = {
                'lsh': self.lsh,
                'record_hashes': self.record_hashes
            }
            pickled_data = pickle.dumps(data_to_pickle)
            signature = hashlib.sha256(secret_key.encode('utf-8') + pickled_data).hexdigest()

            with open(self.storage_path, 'wb') as f:
                f.write(signature.encode('utf-8') + b'\n' + pickled_data)
        except Exception as e:
            self.logger.error(f"Failed to save to file: {e}")
    
    def _load_from_file(self):
        """Load LSH index from file"""
        try:
            if self.storage_path.exists():
                import hashlib
                import os
                secret_key = os.environ.get('SUMMIT_SIGNING_KEY')
                if not secret_key:
                    self.logger.error("SUMMIT_SIGNING_KEY environment variable not set. Cannot load from file.")
                    return

                with open(self.storage_path, 'rb') as f:
                    parts = f.read().split(b'\n', 1)
                    if len(parts) != 2:
                        self.logger.error("Invalid file format. Cannot load from file.")
                        return
                    signature, pickled_data = parts
                    expected_signature = hashlib.sha256(secret_key.encode('utf-8') + pickled_data).hexdigest()

                    if signature.decode('utf-8') != expected_signature:
                        self.logger.error("Invalid signature. File may be tampered.")
                        return

                    data = pickle.loads(pickled_data)
                    self.lsh = data.get('lsh', MinHashLSH(threshold=self.threshold, num_perm=self.num_perm))
                    self.record_hashes = data.get('record_hashes', {})
                    
                self.logger.info(f"Loaded {len(self.record_hashes)} records from file")
        except Exception as e:
            self.logger.warning(f"Failed to load from file: {e}")

class LSHIndex:
    """
    Wrapper around MinHashLSH for easier management
    """
    
    def __init__(self, threshold: float = 0.8, num_perm: int = 128):
        if not DATASKETCH_AVAILABLE:
            raise ImportError("datasketch is required")
        
        self.threshold = threshold
        self.num_perm = num_perm
        self.lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
        self.minhashes: Dict[str, MinHash] = {}
        self.logger = get_logger('lsh-index')
    
    def add(self, key: str, data: Union[str, List[str], Set[str]]):
        """Add data to LSH index"""
        minhash = MinHash(num_perm=self.num_perm)
        
        if isinstance(data, str):
            # Split string into tokens
            tokens = data.lower().split()
        elif isinstance(data, (list, set)):
            tokens = [str(token).lower() for token in data]
        else:
            tokens = [str(data).lower()]
        
        for token in tokens:
            minhash.update(token.encode('utf8'))
        
        self.lsh.insert(key, minhash)
        self.minhashes[key] = minhash
        
        self.logger.debug(f"Added {key} to LSH index")
    
    def query(self, data: Union[str, List[str], Set[str]]) -> List[str]:
        """Query LSH index for similar items"""
        minhash = MinHash(num_perm=self.num_perm)
        
        if isinstance(data, str):
            tokens = data.lower().split()
        elif isinstance(data, (list, set)):
            tokens = [str(token).lower() for token in data]
        else:
            tokens = [str(data).lower()]
        
        for token in tokens:
            minhash.update(token.encode('utf8'))
        
        return self.lsh.query(minhash)
    
    def similarity(self, key1: str, key2: str) -> float:
        """Calculate Jaccard similarity between two items"""
        if key1 in self.minhashes and key2 in self.minhashes:
            return self.minhashes[key1].jaccard(self.minhashes[key2])
        return 0.0
    
    def remove(self, key: str):
        """Remove item from index"""
        if key in self.minhashes:
            minhash = self.minhashes[key]
            self.lsh.remove(key, minhash)
            del self.minhashes[key]
            self.logger.debug(f"Removed {key} from LSH index")
    
    def size(self) -> int:
        """Get number of items in index"""
        return len(self.minhashes)

# Utility functions for common deduplication patterns
def deduplicate_entities_by_name(entities: List[Dict[str, Any]], threshold: float = 0.8) -> List[Dict[str, Any]]:
    """Deduplicate entities based on name similarity"""
    deduplicator = MinHashDeduplicator(threshold=threshold, storage_backend="memory")
    
    # Create a map of entities by ID for quick lookup
    entity_map = {entity.get('id', f'entity_{i}'): entity for i, entity in enumerate(entities)}
    
    # Deduplicate based on label/name fields
    result = deduplicator.deduplicate_batch(
        entities,
        include_fields=['label', 'name', 'full_name']
    )
    
    # Return unique entities
    unique_entities = []
    processed_ids = set()
    
    for group in result.duplicate_groups:
        canonical_entity = deduplicator.get_canonical_record(group, entity_map)
        unique_entities.append(canonical_entity)
        processed_ids.update([group.canonical_id] + group.duplicate_ids)
    
    # Add entities that had no duplicates
    for entity in entities:
        entity_id = entity.get('id', f'entity_{entities.index(entity)}')
        if entity_id not in processed_ids:
            unique_entities.append(entity)
    
    return unique_entities

def create_similarity_clusters(records: List[Dict[str, Any]], 
                             similarity_threshold: float = 0.7,
                             include_fields: Optional[List[str]] = None) -> List[List[Dict[str, Any]]]:
    """Create clusters of similar records"""
    deduplicator = MinHashDeduplicator(threshold=similarity_threshold, storage_backend="memory")
    
    # Add all records to index
    record_map = {}
    for i, record in enumerate(records):
        record_id = record.get('id', f'record_{i}')
        record_map[record_id] = record
        deduplicator.add_record(record_id, record, include_fields)
    
    # Find clusters
    clusters = []
    processed = set()
    
    for record in records:
        record_id = record.get('id', f'record_{records.index(record)}')
        if record_id in processed:
            continue
        
        # Find similar records
        similar = deduplicator.find_duplicates(record_id, record, include_fields)
        
        if similar:
            cluster = [record] + [record_map[sid] for sid in similar if sid in record_map]
            clusters.append(cluster)
            processed.add(record_id)
            processed.update(similar)
        else:
            clusters.append([record])
            processed.add(record_id)
    
    return clusters