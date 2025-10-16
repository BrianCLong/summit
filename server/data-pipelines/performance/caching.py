"""
High-Performance Caching System
Multi-level caching with Redis, in-memory, and file-based strategies
"""

import json
import pickle
import time
import hashlib
from typing import Dict, List, Any, Optional, Union, Callable, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
import threading
import weakref

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from ..utils.logging import get_logger

class CacheStrategy(Enum):
    """Cache eviction strategies"""
    LRU = "lru"              # Least Recently Used
    LFU = "lfu"              # Least Frequently Used
    FIFO = "fifo"            # First In, First Out
    TTL_ONLY = "ttl_only"    # Time To Live only
    HYBRID = "hybrid"        # LRU + TTL

class CacheLevel(Enum):
    """Cache levels in order of access speed"""
    MEMORY = "memory"        # In-process memory
    REDIS = "redis"          # Redis cache
    DISK = "disk"           # File-based cache

@dataclass
class CacheConfig:
    """Configuration for cache system"""
    # Cache levels to use
    enabled_levels: List[CacheLevel] = None
    
    # Memory cache settings
    memory_max_size: int = 1000  # Max items in memory
    memory_max_size_mb: int = 512  # Max memory usage in MB
    
    # Redis cache settings
    redis_url: Optional[str] = None
    redis_max_size: int = 10000  # Max items in Redis
    redis_ttl_seconds: int = 3600  # 1 hour default TTL
    
    # Disk cache settings
    disk_cache_dir: str = "./cache"
    disk_max_size_gb: int = 5  # Max disk cache size
    disk_ttl_seconds: int = 86400  # 24 hours default TTL
    
    # Strategy settings
    strategy: CacheStrategy = CacheStrategy.LRU
    default_ttl_seconds: int = 3600
    
    # Performance settings
    enable_compression: bool = True
    compression_threshold_bytes: int = 1024  # Compress items > 1KB
    enable_metrics: bool = True
    
    # Cache warming
    enable_preloading: bool = False
    preload_patterns: List[str] = None
    
    def __post_init__(self):
        if self.enabled_levels is None:
            self.enabled_levels = [CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.DISK]
        if self.preload_patterns is None:
            self.preload_patterns = []

@dataclass
class CacheStats:
    """Cache performance statistics"""
    hits: int = 0
    misses: int = 0
    sets: int = 0
    deletes: int = 0
    evictions: int = 0
    
    # Level-specific stats
    memory_hits: int = 0
    redis_hits: int = 0
    disk_hits: int = 0
    
    # Performance metrics
    avg_get_time_ms: float = 0.0
    avg_set_time_ms: float = 0.0
    total_size_bytes: int = 0
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': self.hit_rate,
            'sets': self.sets,
            'deletes': self.deletes,
            'evictions': self.evictions,
            'memory_hits': self.memory_hits,
            'redis_hits': self.redis_hits,
            'disk_hits': self.disk_hits,
            'avg_get_time_ms': self.avg_get_time_ms,
            'avg_set_time_ms': self.avg_set_time_ms,
            'total_size_bytes': self.total_size_bytes
        }

class CacheItem:
    """Individual cache item with metadata"""
    
    def __init__(self, key: str, value: Any, ttl_seconds: Optional[int] = None):
        self.key = key
        self.value = value
        self.created_at = time.time()
        self.accessed_at = self.created_at
        self.access_count = 1
        self.ttl_seconds = ttl_seconds
        self.size_bytes = self._calculate_size(value)
    
    def is_expired(self) -> bool:
        """Check if item has expired"""
        if self.ttl_seconds is None:
            return False
        return time.time() - self.created_at > self.ttl_seconds
    
    def touch(self):
        """Update access time and count"""
        self.accessed_at = time.time()
        self.access_count += 1
    
    def _calculate_size(self, value: Any) -> int:
        """Estimate size of cached value"""
        try:
            if isinstance(value, (str, bytes)):
                return len(value)
            elif isinstance(value, (int, float)):
                return 8
            elif isinstance(value, (list, tuple)):
                return sum(self._calculate_size(item) for item in value)
            elif isinstance(value, dict):
                return sum(self._calculate_size(k) + self._calculate_size(v) for k, v in value.items())
            else:
                # Fallback: return a default size
                return 1024
        except:
            return 1024  # Default estimate

class MemoryCache:
    """In-memory cache with configurable eviction strategy"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache: Dict[str, CacheItem] = {}
        self.access_order: List[str] = []  # For LRU
        self.lock = threading.RLock()
        self.logger = get_logger('memory-cache')
        
        self.stats = CacheStats()
        self.current_size_bytes = 0
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from memory cache"""
        with self.lock:
            if key not in self.cache:
                return None
            
            item = self.cache[key]
            
            # Check expiration
            if item.is_expired():
                self._remove_item(key)
                return None
            
            # Update access info
            item.touch()
            self._update_access_order(key)
            
            return item.value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set item in memory cache"""
        with self.lock:
            # Create cache item
            item = CacheItem(key, value, ttl_seconds)
            
            # Check if we need to evict
            if key not in self.cache:
                self._ensure_capacity(item.size_bytes)
            else:
                # Update existing item
                old_item = self.cache[key]
                self.current_size_bytes -= old_item.size_bytes
            
            # Store item
            self.cache[key] = item
            self.current_size_bytes += item.size_bytes
            self._update_access_order(key)
            
            return True
    
    def delete(self, key: str) -> bool:
        """Delete item from memory cache"""
        with self.lock:
            if key in self.cache:
                self._remove_item(key)
                return True
            return False
    
    def clear(self):
        """Clear all items from memory cache"""
        with self.lock:
            self.cache.clear()
            self.access_order.clear()
            self.current_size_bytes = 0
    
    def size(self) -> int:
        """Get number of items in cache"""
        return len(self.cache)
    
    def _ensure_capacity(self, new_item_size: int):
        """Ensure cache has capacity for new item"""
        max_size_bytes = self.config.memory_max_size_mb * 1024 * 1024
        
        # Evict items if necessary
        while (len(self.cache) >= self.config.memory_max_size or 
               self.current_size_bytes + new_item_size > max_size_bytes):
            
            if not self.cache:
                break
            
            evicted_key = self._select_eviction_candidate()
            if evicted_key:
                self._remove_item(evicted_key)
                self.stats.evictions += 1
            else:
                break
    
    def _select_eviction_candidate(self) -> Optional[str]:
        """Select item to evict based on strategy"""
        if not self.cache:
            return None
        
        if self.config.strategy == CacheStrategy.LRU:
            # Least recently used
            return self.access_order[0] if self.access_order else None
        
        elif self.config.strategy == CacheStrategy.LFU:
            # Least frequently used
            return min(self.cache.keys(), key=lambda k: self.cache[k].access_count)
        
        elif self.config.strategy == CacheStrategy.FIFO:
            # First in, first out
            return min(self.cache.keys(), key=lambda k: self.cache[k].created_at)
        
        elif self.config.strategy == CacheStrategy.TTL_ONLY:
            # Expire oldest items first
            expired_items = [k for k, v in self.cache.items() if v.is_expired()]
            if expired_items:
                return expired_items[0]
            return min(self.cache.keys(), key=lambda k: self.cache[k].created_at)
        
        else:  # HYBRID
            # Expire first, then LRU
            expired_items = [k for k, v in self.cache.items() if v.is_expired()]
            if expired_items:
                return expired_items[0]
            return self.access_order[0] if self.access_order else None
    
    def _update_access_order(self, key: str):
        """Update LRU access order"""
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)
    
    def _remove_item(self, key: str):
        """Remove item from cache"""
        if key in self.cache:
            item = self.cache[key]
            self.current_size_bytes -= item.size_bytes
            del self.cache[key]
        
        if key in self.access_order:
            self.access_order.remove(key)

class RedisCache:
    """Redis-based distributed cache"""
    
    def __init__(self, config: CacheConfig):
        if not REDIS_AVAILABLE:
            raise ImportError("redis package is required for Redis cache")
        
        self.config = config
        self.logger = get_logger('redis-cache')
        
        # Connect to Redis
        self.redis_client = redis.from_url(config.redis_url or "redis://localhost:6379/0")
        
        # Test connection
        try:
            self.redis_client.ping()
            self.logger.info("Connected to Redis cache")
        except Exception as e:
            self.logger.error(f"Failed to connect to Redis: {e}")
            raise
        
        self.stats = CacheStats()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from Redis cache"""
        try:
            cache_key = self._make_key(key)
            data = self.redis_client.get(cache_key)
            
            if data is None:
                return None
            
            # Deserialize
            value = self._deserialize(data)
            return value
            
        except Exception as e:
            self.logger.error(f"Redis get failed for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set item in Redis cache"""
        try:
            cache_key = self._make_key(key)
            data = self._serialize(value)
            
            ttl = ttl_seconds or self.config.redis_ttl_seconds
            
            result = self.redis_client.setex(cache_key, ttl, data)
            return bool(result)
            
        except Exception as e:
            self.logger.error(f"Redis set failed for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete item from Redis cache"""
        try:
            cache_key = self._make_key(key)
            result = self.redis_client.delete(cache_key)
            return result > 0
            
        except Exception as e:
            self.logger.error(f"Redis delete failed for key {key}: {e}")
            return False
    
    def clear(self):
        """Clear all items from Redis cache"""
        try:
            # Delete all keys with our prefix
            keys = self.redis_client.keys(f"{self._get_prefix()}*")
            if keys:
                self.redis_client.delete(*keys)
                
        except Exception as e:
            self.logger.error(f"Redis clear failed: {e}")
    
    def _make_key(self, key: str) -> str:
        """Create Redis key with prefix"""
        prefix = self._get_prefix()
        return f"{prefix}:{key}"
    
    def _get_prefix(self) -> str:
        """Get key prefix for this cache instance"""
        return "intelgraph:cache"
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for Redis storage"""
        import hashlib
        import os
        secret_key = os.environ.get('SUMMIT_SIGNING_KEY')
        if not secret_key:
            self.logger.error("SUMMIT_SIGNING_KEY environment variable not set. Cannot serialize.")
            raise ValueError("SUMMIT_SIGNING_KEY not set")

        pickled_data = pickle.dumps(value)
        signature = hashlib.sha256(secret_key.encode('utf-8') + pickled_data).hexdigest()
        data_to_store = signature.encode('utf-8') + b'\n' + pickled_data

        if self.config.enable_compression and len(data_to_store) > self.config.compression_threshold_bytes:
            import gzip
            compressed_data = gzip.compress(data_to_store)
            return b'compressed:' + compressed_data
        return data_to_store
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize value from Redis"""
        import hashlib
        import os
        secret_key = os.environ.get('SUMMIT_SIGNING_KEY')
        if not secret_key:
            self.logger.error("SUMMIT_SIGNING_KEY environment variable not set. Cannot deserialize.")
            raise ValueError("SUMMIT_SIGNING_KEY not set")

        if data.startswith(b'compressed:'):
            import gzip
            compressed_data = data[11:]  # Remove 'compressed:' prefix
            data = gzip.decompress(compressed_data)

        parts = data.split(b'\n', 1)
        if len(parts) != 2:
            self.logger.error("Invalid data format. Cannot deserialize.")
            raise ValueError("Invalid data format")

        signature, pickled_data = parts
        expected_signature = hashlib.sha256(secret_key.encode('utf-8') + pickled_data).hexdigest()

        if signature.decode('utf-8') != expected_signature:
            self.logger.error("Invalid signature. Data may be tampered.")
            raise ValueError("Invalid signature")

        return pickle.loads(pickled_data)

class DiskCache:
    """File-based cache for large or persistent data"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache_dir = Path(config.disk_cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger = get_logger('disk-cache')
        self.stats = CacheStats()
        
        # Create metadata file for tracking
        self.metadata_file = self.cache_dir / "cache_metadata.json"
        self.metadata = self._load_metadata()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from disk cache"""
        try:
            file_path = self._get_file_path(key)
            
            if not file_path.exists():
                return None
            
            # Check if expired
            if self._is_expired(key):
                self._remove_file(key)
                return None
            
            # Load from file
            with open(file_path, 'rb') as f:
                data = f.read()
            
            # Update access time
            self._update_metadata(key, access_time=time.time())
            
            return self._deserialize(data)
            
        except Exception as e:
            self.logger.error(f"Disk cache get failed for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set item in disk cache"""
        try:
            # Serialize value
            data = self._serialize(value)
            
            # Ensure capacity
            self._ensure_capacity(len(data))
            
            # Write to file
            file_path = self._get_file_path(key)
            with open(file_path, 'wb') as f:
                f.write(data)
            
            # Update metadata
            self._update_metadata(
                key,
                size_bytes=len(data),
                ttl_seconds=ttl_seconds or self.config.disk_ttl_seconds,
                created_time=time.time()
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Disk cache set failed for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete item from disk cache"""
        try:
            self._remove_file(key)
            return True
        except Exception as e:
            self.logger.error(f"Disk cache delete failed for key {key}: {e}")
            return False
    
    def clear(self):
        """Clear all items from disk cache"""
        try:
            for file_path in self.cache_dir.glob("cache_*"):
                file_path.unlink()
            
            self.metadata = {}
            self._save_metadata()
            
        except Exception as e:
            self.logger.error(f"Disk cache clear failed: {e}")
    
    def _get_file_path(self, key: str) -> Path:
        """Get file path for cache key"""
        # Hash key to avoid filesystem issues
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"cache_{key_hash}.dat"
    
    def _is_expired(self, key: str) -> bool:
        """Check if cache item is expired"""
        if key not in self.metadata:
            return True
        
        item_meta = self.metadata[key]
        ttl = item_meta.get('ttl_seconds', self.config.disk_ttl_seconds)
        created_time = item_meta.get('created_time', 0)
        
        return time.time() - created_time > ttl
    
    def _ensure_capacity(self, new_item_size: int):
        """Ensure disk cache has capacity"""
        max_size_bytes = self.config.disk_max_size_gb * 1024 * 1024 * 1024
        current_size = sum(item.get('size_bytes', 0) for item in self.metadata.values())
        
        # Remove expired items first
        expired_keys = [key for key in self.metadata.keys() if self._is_expired(key)]
        for key in expired_keys:
            self._remove_file(key)
        
        # Recalculate current size
        current_size = sum(item.get('size_bytes', 0) for item in self.metadata.values())
        
        # Evict items if still over capacity
        while current_size + new_item_size > max_size_bytes and self.metadata:
            # Remove least recently accessed item
            oldest_key = min(
                self.metadata.keys(),
                key=lambda k: self.metadata[k].get('access_time', 0)
            )
            self._remove_file(oldest_key)
            current_size = sum(item.get('size_bytes', 0) for item in self.metadata.values())
    
    def _remove_file(self, key: str):
        """Remove cache file and metadata"""
        file_path = self._get_file_path(key)
        if file_path.exists():
            file_path.unlink()
        
        if key in self.metadata:
            del self.metadata[key]
            self._save_metadata()
    
    def _update_metadata(self, key: str, **kwargs):
        """Update metadata for cache item"""
        if key not in self.metadata:
            self.metadata[key] = {}
        
        self.metadata[key].update(kwargs)
        self._save_metadata()
    
    def _load_metadata(self) -> Dict[str, Any]:
        """Load cache metadata from file"""
        try:
            if self.metadata_file.exists():
                with open(self.metadata_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            self.logger.warning(f"Could not load cache metadata: {e}")
        
        return {}
    
    def _save_metadata(self):
        """Save cache metadata to file"""
        try:
            with open(self.metadata_file, 'w') as f:
                json.dump(self.metadata, f, indent=2)
        except Exception as e:
            self.logger.error(f"Could not save cache metadata: {e}")
    
    def _serialize(self, value: Any) -> bytes:
        """Serialize value for disk storage"""
        import hashlib
        import os
        secret_key = os.environ.get('SUMMIT_SIGNING_KEY')
        if not secret_key:
            self.logger.error("SUMMIT_SIGNING_KEY environment variable not set. Cannot serialize.")
            raise ValueError("SUMMIT_SIGNING_KEY not set")

        pickled_data = pickle.dumps(value)
        signature = hashlib.sha256(secret_key.encode('utf-8') + pickled_data).hexdigest()
        data_to_store = signature.encode('utf-8') + b'\n' + pickled_data

        if self.config.enable_compression and len(data_to_store) > self.config.compression_threshold_bytes:
            import gzip
            return gzip.compress(data_to_store)
        return data_to_store
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize value from disk"""
        import hashlib
        import os
        secret_key = os.environ.get('SUMMIT_SIGNING_KEY')
        if not secret_key:
            self.logger.error("SUMMIT_SIGNING_KEY environment variable not set. Cannot deserialize.")
            raise ValueError("SUMMIT_SIGNING_KEY not set")

        try:
            # Try gzip decompression first
            import gzip
            data = gzip.decompress(data)
        except:
            # Not compressed
            pass

        parts = data.split(b'\n', 1)
        if len(parts) != 2:
            self.logger.error("Invalid data format. Cannot deserialize.")
            raise ValueError("Invalid data format")

        signature, pickled_data = parts
        expected_signature = hashlib.sha256(secret_key.encode('utf-8') + pickled_data).hexdigest()

        if signature.decode('utf-8') != expected_signature:
            self.logger.error("Invalid signature. Data may be tampered.")
            raise ValueError("Invalid signature")

        return pickle.loads(pickled_data)

class CacheManager:
    """
    Multi-level cache manager with automatic tier management
    """
    
    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.logger = get_logger('cache-manager')
        
        # Initialize cache levels
        self.caches: Dict[CacheLevel, Any] = {}
        
        if CacheLevel.MEMORY in self.config.enabled_levels:
            self.caches[CacheLevel.MEMORY] = MemoryCache(self.config)
        
        if CacheLevel.REDIS in self.config.enabled_levels and REDIS_AVAILABLE:
            try:
                self.caches[CacheLevel.REDIS] = RedisCache(self.config)
            except Exception as e:
                self.logger.warning(f"Could not initialize Redis cache: {e}")
        
        if CacheLevel.DISK in self.config.enabled_levels:
            self.caches[CacheLevel.DISK] = DiskCache(self.config)
        
        # Combined statistics
        self.global_stats = CacheStats()
        
        # Performance tracking
        self.get_times: List[float] = []
        self.set_times: List[float] = []
        
        self.logger.info(f"Initialized cache with levels: {list(self.caches.keys())}")
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache (tries all levels)"""
        start_time = time.time()
        
        try:
            # Try each cache level in order
            for level in [CacheLevel.MEMORY, CacheLevel.REDIS, CacheLevel.DISK]:
                if level not in self.caches:
                    continue
                
                cache = self.caches[level]
                value = cache.get(key)
                
                if value is not None:
                    # Cache hit - promote to higher levels
                    self._promote_to_higher_levels(key, value, level)
                    
                    # Update statistics
                    self.global_stats.hits += 1
                    if level == CacheLevel.MEMORY:
                        self.global_stats.memory_hits += 1
                    elif level == CacheLevel.REDIS:
                        self.global_stats.redis_hits += 1
                    elif level == CacheLevel.DISK:
                        self.global_stats.disk_hits += 1
                    
                    get_time = (time.time() - start_time) * 1000
                    self.get_times.append(get_time)
                    self._update_avg_get_time()
                    
                    return value
            
            # Cache miss
            self.global_stats.misses += 1
            return None
            
        except Exception as e:
            self.logger.error(f"Cache get failed for key {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set item in all cache levels"""
        start_time = time.time()
        
        try:
            success = False
            
            # Set in all configured cache levels
            for level, cache in self.caches.items():
                try:
                    if cache.set(key, value, ttl_seconds):
                        success = True
                except Exception as e:
                    self.logger.warning(f"Failed to set in {level.value} cache: {e}")
            
            if success:
                self.global_stats.sets += 1
                set_time = (time.time() - start_time) * 1000
                self.set_times.append(set_time)
                self._update_avg_set_time()
            
            return success
            
        except Exception as e:
            self.logger.error(f"Cache set failed for key {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete item from all cache levels"""
        try:
            success = False
            
            for level, cache in self.caches.items():
                try:
                    if cache.delete(key):
                        success = True
                except Exception as e:
                    self.logger.warning(f"Failed to delete from {level.value} cache: {e}")
            
            if success:
                self.global_stats.deletes += 1
            
            return success
            
        except Exception as e:
            self.logger.error(f"Cache delete failed for key {key}: {e}")
            return False
    
    def clear(self):
        """Clear all cache levels"""
        for level, cache in self.caches.items():
            try:
                cache.clear()
            except Exception as e:
                self.logger.warning(f"Failed to clear {level.value} cache: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        stats = self.global_stats.to_dict()
        
        # Add level-specific stats
        level_stats = {}
        for level, cache in self.caches.items():
            if hasattr(cache, 'stats'):
                level_stats[level.value] = cache.stats.to_dict()
            if hasattr(cache, 'size'):
                level_stats[level.value] = level_stats.get(level.value, {})
                level_stats[level.value]['size'] = cache.size()
        
        stats['levels'] = level_stats
        return stats
    
    def _promote_to_higher_levels(self, key: str, value: Any, found_level: CacheLevel):
        """Promote cache item to higher (faster) levels"""
        levels_to_promote = []
        
        if found_level == CacheLevel.DISK:
            if CacheLevel.REDIS in self.caches:
                levels_to_promote.append(CacheLevel.REDIS)
            if CacheLevel.MEMORY in self.caches:
                levels_to_promote.append(CacheLevel.MEMORY)
        elif found_level == CacheLevel.REDIS:
            if CacheLevel.MEMORY in self.caches:
                levels_to_promote.append(CacheLevel.MEMORY)
        
        # Promote to higher levels
        for level in levels_to_promote:
            try:
                self.caches[level].set(key, value)
            except Exception as e:
                self.logger.debug(f"Failed to promote to {level.value}: {e}")
    
    def _update_avg_get_time(self):
        """Update average get time"""
        if len(self.get_times) > 1000:
            self.get_times = self.get_times[-1000:]  # Keep last 1000 measurements
        
        if self.get_times:
            self.global_stats.avg_get_time_ms = sum(self.get_times) / len(self.get_times)
    
    def _update_avg_set_time(self):
        """Update average set time"""
        if len(self.set_times) > 1000:
            self.set_times = self.set_times[-1000:]  # Keep last 1000 measurements
        
        if self.set_times:
            self.global_stats.avg_set_time_ms = sum(self.set_times) / len(self.set_times)

# Utility functions and decorators
def cached(cache_manager: CacheManager, ttl_seconds: Optional[int] = None, key_func: Optional[Callable] = None):
    """
    Decorator for caching function results
    
    Args:
        cache_manager: CacheManager instance
        ttl_seconds: Time to live for cached results
        key_func: Function to generate cache key from arguments
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}={v}" for k, v in sorted(kwargs.items()))
                cache_key = ":".join(key_parts)
                cache_key = hashlib.md5(cache_key.encode()).hexdigest()
            
            # Try to get from cache
            result = cache_manager.get(cache_key)
            if result is not None:
                return result
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl_seconds)
            
            return result
        
        return wrapper
    return decorator

def create_query_cache(cache_manager: CacheManager) -> Callable:
    """Create a query result cache function"""
    
    def cache_query(query: str, params: Optional[Dict[str, Any]] = None, ttl_seconds: int = 3600):
        """Cache query results"""
        # Generate cache key from query and parameters
        key_data = {'query': query, 'params': params or {}}
        cache_key = f"query:{hashlib.md5(json.dumps(key_data, sort_keys=True).encode()).hexdigest()}"
        
        # Try to get from cache
        result = cache_manager.get(cache_key)
        if result is not None:
            return result
        
        return None, cache_key  # Return None and cache key for setting later
    
    return cache_query

def warm_cache(cache_manager: CacheManager, data_loader: Callable[[str], Any], keys: List[str]):
    """Warm cache with frequently accessed data"""
    logger = get_logger('cache-warmer')
    logger.info(f"Warming cache with {len(keys)} keys")
    
    for key in keys:
        try:
            # Check if already cached
            if cache_manager.get(key) is not None:
                continue
            
            # Load and cache data
            data = data_loader(key)
            if data is not None:
                cache_manager.set(key, data)
                
        except Exception as e:
            logger.warning(f"Failed to warm cache for key {key}: {e}")
    
    logger.info("Cache warming completed")