"""
Performance Optimization Module for Adversarial Misinformation Defense Platform

This module provides optimizations for improving the platform's performance,
efficiency, and scalability.
"""

import asyncio
import concurrent.futures
import threading
import time
import logging
from typing import Dict, List, Any, Callable, Optional
from pathlib import Path
import numpy as np
import psutil
import gc
from functools import wraps

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    import cupy as cp
    CUPY_AVAILABLE = True
except ImportError:
    CUPY_AVAILABLE = False


class PerformanceOptimizer:
    """
    Performance optimization framework for the platform
    """
    
    def __init__(self):
        """
        Initialize the performance optimizer
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        self.performance_metrics = {}
        
    def optimize_memory_usage(self):
        """
        Optimize memory usage through various techniques
        """
        # Force garbage collection
        gc.collect()
        
        # If using PyTorch, clear cache
        if TORCH_AVAILABLE and torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        self.logger.info("Memory optimization applied")
    
    def parallel_detector_processing(self, 
                                   detector_func: Callable, 
                                   data_list: List[Any], 
                                   max_workers: int = 4) -> List[Any]:
        """
        Process detection tasks in parallel to improve performance
        
        Args:
            detector_func: Detection function to execute in parallel
            data_list: List of data items to process
            max_workers: Maximum number of worker threads
            
        Returns:
            List of results from parallel processing
        """
        results = []
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all tasks
            future_to_data = {executor.submit(detector_func, data): data for data in data_list}
            
            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_data):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    self.logger.error(f"Error in parallel processing: {str(e)}")
                    results.append(None)  # Add None for failed processing
        
        return results
    
    def async_detector_processing(self, 
                                 detector_func: Callable, 
                                 data_list: List[Any]) -> List[Any]:
        """
        Process detection tasks asynchronously
        
        Args:
            detector_func: Detection function to execute asynchronously
            data_list: List of data items to process
            
        Returns:
            List of results from async processing
        """
        async def process_single_item(item):
            loop = asyncio.get_event_loop()
            return await loop.run_in_executor(None, detector_func, item)
        
        async def process_all():
            tasks = [process_single_item(item) for item in data_list]
            return await asyncio.gather(*tasks, return_exceptions=True)
        
        # Run the async processing
        results = asyncio.run(process_all())
        return results
    
    def batch_process_optimization(self, 
                                  detector_func: Callable, 
                                  data_list: List[Any], 
                                  batch_size: int = 10) -> List[Any]:
        """
        Process data in optimized batches to improve performance
        
        Args:
            detector_func: Detection function to execute
            data_list: List of data items to process
            batch_size: Size of each batch
            
        Returns:
            List of results from batch processing
        """
        results = []
        
        for i in range(0, len(data_list), batch_size):
            batch = data_list[i:i+batch_size]
            batch_results = []
            
            for data in batch:
                try:
                    result = detector_func(data)
                    batch_results.append(result)
                except Exception as e:
                    self.logger.error(f"Error processing batch item: {str(e)}")
                    batch_results.append(None)
            
            results.extend(batch_results)
        
        return results
    
    def cache_optimization(self, max_size: int = 1000):
        """
        Decorator for adding caching to functions to improve performance
        
        Args:
            max_size: Maximum size of the cache
        """
        def decorator(func):
            cache = {}
            cache_order = []  # Track order of cache entries for LRU
            
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Create a cache key from args and kwargs
                key = str(args) + str(sorted(kwargs.items()))
                
                if key in cache:
                    # Move to end to mark as recently used
                    cache_order.remove(key)
                    cache_order.append(key)
                    return cache[key]
                
                # Calculate result
                result = func(*args, **kwargs)
                
                # Add to cache
                if len(cache) >= max_size:
                    # Remove least recently used item
                    lru_key = cache_order.pop(0)
                    del cache[lru_key]
                
                cache[key] = result
                cache_order.append(key)
                
                return result
            
            # Add cache management methods
            wrapper.cache_clear = lambda: (cache.clear(), cache_order.clear())
            wrapper.cache_info = lambda: {
                'size': len(cache),
                'max_size': max_size,
                'keys': list(cache.keys())
            }
            
            return wrapper
        
        return decorator


class GPUAccelerator:
    """
    GPU acceleration for compute-intensive operations
    """
    
    def __init__(self):
        """
        Initialize GPU accelerator
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        self.gpu_available = self.check_gpu_availability()
    
    def check_gpu_availability(self) -> bool:
        """
        Check if GPU is available for acceleration
        
        Returns:
            True if GPU is available
        """
        cuda_available = False
        cupy_available = False
        
        if TORCH_AVAILABLE:
            cuda_available = torch.cuda.is_available()
            if cuda_available:
                self.logger.info(f"CUDA GPU available: {torch.cuda.get_device_name(0)}")
        
        if CUPY_AVAILABLE:
            cupy_available = True
            self.logger.info("CuPy GPU acceleration available")
        
        return cuda_available or cupy_available
    
    def transfer_to_gpu(self, data):
        """
        Transfer data to GPU if available
        
        Args:
            data: Data to transfer to GPU
            
        Returns:
            Data on GPU if available, otherwise original data
        """
        if not self.gpu_available:
            return data
        
        if TORCH_AVAILABLE and torch.is_tensor(data):
            if torch.cuda.is_available():
                return data.cuda()
        
        if CUPY_AVAILABLE and hasattr(data, '__array__'):
            try:
                return cp.asarray(data)
            except Exception:
                pass  # Fall back to CPU
        
        return data
    
    def gpu_accelerate_computation(self, computation_func: Callable, *args, **kwargs):
        """
        Apply GPU acceleration to a computation function
        
        Args:
            computation_func: Function to accelerate
            *args: Arguments to pass to the function
            **kwargs: Keyword arguments to pass to the function
            
        Returns:
            Result of the computation
        """
        if not self.gpu_available:
            # Fallback to CPU computation
            return computation_func(*args, **kwargs)
        
        # Attempt to move data to GPU before computation
        gpu_args = []
        for arg in args:
            gpu_args.append(self.transfer_to_gpu(arg))
        
        gpu_kwargs = {}
        for key, value in kwargs.items():
            gpu_kwargs[key] = self.transfer_to_gpu(value)
        
        # Perform computation on GPU
        result = computation_func(*gpu_args, **gpu_kwargs)
        
        # Transfer result back to CPU if it's a tensor/array
        if TORCH_AVAILABLE and torch.is_tensor(result):
            return result.cpu()
        elif CUPY_AVAILABLE and isinstance(result, cp.ndarray):
            return cp.asnumpy(result)
        else:
            return result


class ResourceMonitor:
    """
    Resource monitoring for performance tracking
    """
    
    def __init__(self):
        """
        Initialize resource monitor
        """
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        self.monitoring = False
        self.monitoring_data = {}
    
    def start_monitoring(self):
        """
        Start resource monitoring in a background thread
        """
        self.monitoring = True
        self.monitoring_thread = threading.Thread(target=self._monitor_resources, daemon=True)
        self.monitoring_thread.start()
        self.logger.info("Resource monitoring started")
    
    def stop_monitoring(self):
        """
        Stop resource monitoring
        """
        self.monitoring = False
        if hasattr(self, 'monitoring_thread'):
            self.monitoring_thread.join(timeout=1)
        self.logger.info("Resource monitoring stopped")
    
    def _monitor_resources(self):
        """
        Background thread function to monitor resources
        """
        while self.monitoring:
            try:
                # Monitor CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                
                # Monitor memory usage
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                
                # Monitor disk usage
                disk = psutil.disk_usage('/')
                disk_percent = (disk.used / disk.total) * 100
                
                # Store monitoring data
                timestamp = time.time()
                self.monitoring_data[timestamp] = {
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory_percent,
                    'disk_percent': disk_percent,
                    'timestamp': timestamp
                }
                
                time.sleep(1)  # Monitor every second
            except Exception as e:
                self.logger.error(f"Error in resource monitoring: {str(e)}")
                time.sleep(1)
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Get performance metrics from monitoring
        
        Returns:
            Dictionary with performance metrics
        """
        if not self.monitoring_data:
            return {
                'cpu_average': 0,
                'memory_average': 0,
                'disk_average': 0,
                'data_points': 0
            }
        
        cpu_values = [data['cpu_percent'] for data in self.monitoring_data.values()]
        memory_values = [data['memory_percent'] for data in self.monitoring_data.values()]
        disk_values = [data['disk_percent'] for data in self.monitoring_data.values()]
        
        return {
            'cpu_average': sum(cpu_values) / len(cpu_values),
            'memory_average': sum(memory_values) / len(memory_values),
            'disk_average': sum(disk_values) / len(disk_values),
            'data_points': len(self.monitoring_data),
            'time_range': {
                'start': min(self.monitoring_data.keys()),
                'end': max(self.monitoring_data.keys())
            }
        }


class OptimizedAdversarialDetector:
    """
    An optimized version of the adversarial detector with performance enhancements
    """
    
    def __init__(self):
        """
        Initialize the optimized detector
        """
        from .detection_modules.main_detector import AdversarialMisinfoDetector
        
        self.base_detector = AdversarialMisinfoDetector()
        self.optimizer = PerformanceOptimizer()
        self.gpu_accelerator = GPUAccelerator()
        self.resource_monitor = ResourceMonitor()
        
        # Initialize cached detection functions
        self.cached_text_detect = self.optimizer.cache_optimization(max_size=500)(
            self.base_detector.text_detector.detect_misinfo
        )
        
        self.cached_image_detect = self.optimizer.cache_optimization(max_size=200)(
            self.base_detector.image_detector.detect_manipulation
        )
    
    def detect_optimized(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Optimized detection method with caching and resource management
        
        Args:
            content: Content to analyze
            
        Returns:
            Detection results
        """
        start_time = time.time()
        
        # Use cached functions where possible
        results = {
            "overall_risk": 0.0,
            "confidence": 0.0,
            "modality_results": {},
            "final_verdict": "unknown",
            "explanation": "",
            "timestamp": np.datetime64("now"),
            "performance": {
                "execution_time": 0.0,
                "optimization_used": True
            }
        }

        individual_scores = []
        modality_results = {}

        # Analyze text if present (using cached function)
        if "text" in content and content["text"]:
            text_result = self.cached_text_detect(content["text"])
            modality_results["text"] = text_result
            if "score" in text_result:
                individual_scores.append(text_result["score"])

        # Analyze image if present (using cached function)
        if "image_path" in content and content["image_path"]:
            image_result = self.cached_image_detect(content["image_path"])
            modality_results["image"] = image_result
            if "score" in image_result:
                individual_scores.append(image_result["score"])

        # Analyze audio if present
        if "audio_path" in content and content["audio_path"]:
            audio_result = self.base_detector.audio_detector.detect_deepfake(content["audio_path"])
            modality_results["audio"] = audio_result
            if "score" in audio_result:
                individual_scores.append(audio_result["score"])

        # Analyze video if present
        if "video_path" in content and content["video_path"]:
            video_result = self.base_detector.video_detector.detect_deepfake(content["video_path"])
            modality_results["video"] = video_result
            if "score" in video_result:
                individual_scores.append(video_result["score"])

        # Analyze meme if present
        if "meme_path" in content and content["meme_path"]:
            meme_result = self.base_detector.meme_detector.detect_manipulation(content["meme_path"])
            modality_results["meme"] = meme_result
            if "score" in meme_result:
                individual_scores.append(meme_result["score"])

        # Analyze deepfake if present
        if "deepfake_path" in content and content["deepfake_path"]:
            deepfake_result = self.base_detector.deepfake_detector.detect_deepfake(content["deepfake_path"])
            modality_results["deepfake"] = deepfake_result
            if "score" in deepfake_result:
                individual_scores.append(deepfake_result["score"])

        results["modality_results"] = modality_results

        # Calculate overall risk based on individual scores
        if individual_scores:
            avg_score = sum(individual_scores) / len(individual_scores)
            results["overall_risk"] = avg_score

            # Determine final verdict
            if avg_score > 0.7:
                results["final_verdict"] = "malicious"
                results["explanation"] = "High risk detected across modalities"
            elif avg_score > 0.4:
                results["final_verdict"] = "suspicious"
                results["explanation"] = "Moderate risk detected, requires review"
            else:
                results["final_verdict"] = "benign"
                results["explanation"] = "Content appears legitimate"

            # Calculate confidence
            confidence_values = [
                res.get("confidence", 0.0)
                for res in modality_results.values()
            ]
            if confidence_values:
                results["confidence"] = sum(confidence_values) / len(confidence_values)

        execution_time = time.time() - start_time
        results["performance"]["execution_time"] = execution_time
        
        return results
    
    def batch_detect(self, content_list: List[Dict[str, Any]], batch_size: int = 10) -> List[Dict[str, Any]]:
        """
        Perform optimized batch detection
        
        Args:
            content_list: List of content to analyze
            batch_size: Size of each batch
            
        Returns:
            List of detection results
        """
        results = []
        
        # Process in batches to manage memory usage
        for i in range(0, len(content_list), batch_size):
            batch = content_list[i:i+batch_size]
            batch_results = self.optimizer.batch_process_optimization(
                self.detect_optimized, batch, batch_size=min(5, len(batch))
            )
            results.extend(batch_results)
            
            # Optimize memory between batches
            self.optimizer.optimize_memory_usage()
        
        return results


def optimize_platform_performance():
    """
    Apply comprehensive performance optimizations to the platform
    """
    optimizer = PerformanceOptimizer()
    gpu_accelerator = GPUAccelerator()
    resource_monitor = ResourceMonitor()
    
    print("Applying performance optimizations to the platform...")
    
    # Start resource monitoring
    resource_monitor.start_monitoring()
    
    # Apply memory optimizations
    optimizer.optimize_memory_usage()
    
    print("Performance optimizations applied:")
    print(f"  - GPU Acceleration Available: {gpu_accelerator.gpu_available}")
    print(f"  - Memory optimization: Applied")
    
    # Get performance metrics
    time.sleep(2)  # Allow some monitoring data to accumulate
    metrics = resource_monitor.get_performance_metrics()
    
    print(f"  - Average CPU Usage: {metrics['cpu_average']:.2f}%")
    print(f"  - Average Memory Usage: {metrics['memory_average']:.2f}%")
    print(f"  - Monitoring Data Points: {metrics['data_points']}")
    
    # Stop monitoring
    resource_monitor.stop_monitoring()
    
    return {
        'optimization_applied': True,
        'gpu_available': gpu_accelerator.gpu_available,
        'initial_performance_metrics': metrics
    }


if __name__ == "__main__":
    # Run performance optimization when executed as a script
    results = optimize_platform_performance()
    print("\nPlatform performance optimization complete!")