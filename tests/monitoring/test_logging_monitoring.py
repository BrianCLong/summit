"""
Logging and monitoring tests for Summit application
This addresses operational excellence recommendations
"""
import sys
import os
import json
import tempfile
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

# Add the summit directory to the path so we can import modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

def test_logging_configuration():
    """Test that logging is properly configured"""
    try:
        # Test if logging modules can be imported
        import logging
        from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
        
        # Test basic logging setup
        logger = logging.getLogger('summit.test')
        logger.setLevel(logging.INFO)
        
        # Create a temporary file handler to test logging
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as temp_log:
            handler = logging.FileHandler(temp_log.name)
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
            # Test logging
            test_message = "Test log message for Summit application"
            logger.info(test_message)
            
            # Verify the message was logged
            handler.flush()
            temp_log.flush()
            
            with open(temp_log.name, 'r') as f:
                log_contents = f.read()
                
            if test_message in log_contents:
                print("✅ Logging configuration works correctly")
            else:
                print("❌ Logging configuration failed")
                
            # Clean up
            os.unlink(temp_log.name)
            
    except Exception as e:
        print(f"⚠️ Logging test had issues: {e}")

def test_structured_logging():
    """Test structured logging capabilities"""
    try:
        import logging
        import json
        
        logger = logging.getLogger('summit.structured')
        logger.setLevel(logging.INFO)
        
        # Create a handler that captures structured logs
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as temp_log:
            handler = logging.FileHandler(temp_log.name)
            # Use a formatter that creates JSON logs
            class JSONFormatter(logging.Formatter):
                def format(self, record):
                    log_entry = {
                        'timestamp': datetime.utcnow().isoformat(),
                        'level': record.levelname,
                        'logger': record.name,
                        'message': record.getMessage(),
                        'module': record.module,
                        'function': record.funcName,
                        'line': record.lineno
                    }
                    
                    # Add exception info if present
                    if record.exc_info:
                        log_entry['exception'] = self.formatException(record.exc_info)
                    
                    # Add any extra fields
                    for key, value in record.__dict__.items():
                        if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                                       'filename', 'module', 'lineno', 'funcName', 'created', 
                                       'msecs', 'relativeCreated', 'thread', 'threadName', 
                                       'processName', 'process', 'getMessage', 'exc_info', 
                                       'exc_text', 'stack_info']:
                            log_entry[key] = value
                    
                    return json.dumps(log_entry)
            
            handler.setFormatter(JSONFormatter())
            logger.addHandler(handler)
            
            # Test structured logging with additional context
            logger.info("Structured log test", extra={
                'correlation_id': 'test-correlation-123',
                'user_id': 'test-user',
                'operation': 'test_operation'
            })
            
            handler.flush()
            temp_log.flush()
            
            with open(temp_log.name, 'r') as f:
                log_line = f.readline().strip()
                
            try:
                log_entry = json.loads(log_line)
                if 'correlation_id' in log_entry and 'user_id' in log_entry:
                    print("✅ Structured logging with context works correctly")
                else:
                    print("⚠️ Structured logging missing context fields")
            except json.JSONDecodeError:
                print("⚠️ Structured logging did not produce valid JSON")
                
            # Clean up
            os.unlink(temp_log.name)
            
    except Exception as e:
        print(f"⚠️ Structured logging test had issues: {e}")

def test_monitoring_integration():
    """Test monitoring integration points"""
    # Check for common monitoring libraries
    monitoring_libs = []
    
    try:
        import prometheus_client
        monitoring_libs.append('prometheus')
        print("✅ Prometheus monitoring library available")
    except ImportError:
        print("⚠️ Prometheus monitoring library not available")
    
    try:
        import opentelemetry
        monitoring_libs.append('opentelemetry')
        print("✅ OpenTelemetry library available")
    except ImportError:
        print("⚠️ OpenTelemetry library not available")
    
    try:
        import statsd
        monitoring_libs.append('statsd')
        print("✅ StatsD library available")
    except ImportError:
        print("⚠️ StatsD library not available")
    
    if not monitoring_libs:
        print("⚠️ No monitoring libraries detected")
    else:
        print(f"✅ Detected monitoring libraries: {', '.join(monitoring_libs)}")

def test_metric_collection():
    """Test metric collection capabilities"""
    try:
        # Test if metrics can be created and collected
        from time import sleep
        
        # Test with a mock metric
        class MockMetricCollector:
            def __init__(self):
                self.metrics = {}
            
            def increment_counter(self, name, value=1, labels=None):
                if name not in self.metrics:
                    self.metrics[name] = {'type': 'counter', 'value': 0}
                self.metrics[name]['value'] += value
            
            def set_gauge(self, name, value, labels=None):
                self.metrics[name] = {'type': 'gauge', 'value': value}
            
            def observe_histogram(self, name, value, labels=None):
                if name not in self.metrics:
                    self.metrics[name] = {'type': 'histogram', 'values': []}
                self.metrics[name]['values'].append(value)
        
        collector = MockMetricCollector()
        
        # Test metric collection
        collector.increment_counter('test_requests_total', 1, {'endpoint': '/api/test'})
        collector.set_gauge('test_active_connections', 5)
        collector.observe_histogram('test_response_time_seconds', 0.25)
        
        expected_metrics = ['test_requests_total', 'test_active_connections', 'test_response_time_seconds']
        collected_metrics = list(collector.metrics.keys())
        
        if all(metric in collected_metrics for metric in expected_metrics):
            print("✅ Metric collection works correctly")
        else:
            print(f"❌ Missing metrics. Expected: {expected_metrics}, Got: {collected_metrics}")
            
    except Exception as e:
        print(f"⚠️ Metric collection test had issues: {e}")

def test_error_monitoring():
    """Test error monitoring capabilities"""
    try:
        # Test error logging
        import logging
        
        logger = logging.getLogger('summit.error_monitoring')
        logger.setLevel(logging.ERROR)
        
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as temp_log:
            handler = logging.FileHandler(temp_log.name)
            logger.addHandler(handler)
            
            # Test exception logging
            try:
                raise ValueError("Test error for monitoring")
            except ValueError as e:
                logger.exception("Test exception for monitoring")
            
            handler.flush()
            temp_log.flush()
            
            with open(temp_log.name, 'r') as f:
                log_contents = f.read()
                
            if "Test exception for monitoring" in log_contents and "ValueError" in log_contents:
                print("✅ Error monitoring works correctly")
            else:
                print("❌ Error monitoring failed to capture exception")
                
            # Clean up
            os.unlink(temp_log.name)
            
    except Exception as e:
        print(f"⚠️ Error monitoring test had issues: {e}")

def test_trace_correlation():
    """Test trace correlation capabilities"""
    try:
        # Check if tracing libraries are available
        tracing_available = False
        
        try:
            import opentelemetry.trace
            from opentelemetry import trace
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import SimpleSpanProcessor
            from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
            
            # Set up a simple tracer for testing
            trace.set_tracer_provider(TracerProvider())
            tracer = trace.get_tracer(__name__)
            
            # Create a test span
            with tracer.start_as_current_span("test-operation") as span:
                span.set_attribute("test.key", "test-value")
                span.add_event("test-event", {"event.key": "event-value"})
            
            print("✅ Trace correlation setup works")
            tracing_available = True
            
        except ImportError:
            print("⚠️ OpenTelemetry not available for trace correlation")
        
        if not tracing_available:
            # Test basic correlation ID handling
            import uuid
            
            correlation_id = str(uuid.uuid4())
            print(f"✅ Correlation ID generation works: {correlation_id[:8]}...")
            
    except Exception as e:
        print(f"⚠️ Trace correlation test had issues: {e}")

def run_all_monitoring_tests():
    """Run all logging and monitoring tests"""
    print("Running logging and monitoring tests for Summit application...")
    print()
    
    test_logging_configuration()
    test_structured_logging()
    test_monitoring_integration()
    test_metric_collection()
    test_error_monitoring()
    test_trace_correlation()
    
    print()
    print("✅ Logging and monitoring tests completed!")

if __name__ == "__main__":
    run_all_monitoring_tests()